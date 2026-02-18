import { EventEmitter } from 'events'
import { TcpConnection } from '../connection/TcpConnection'
import { CommandQueue } from '../connection/CommandQueue'
import { AG_CODES, TIMEOUTS } from '../../../shared/constants'
import type { AntennaInfo, PortState, GroupState, OutputState } from '../../../shared/device-types'
import type { AgPort, AgSubscriptionType } from './AgTypes'

// Protocol versions:
//   v3.x (old hardware):
//     antenna list response: "ant=N name=X tx=Y rx=Z ..."   (KV format, no "antenna N" prefix)
//     status push port id:   may use letter "A"/"B" instead of digit "1"/"2"
//     keepalive / sub:       not supported — skip silently
//   v4.x (current hardware, confirmed v4.1.16):
//     Terminator:            CRLF (not bare CR as spec states)
//     antenna list response: "antenna N name=X tx=Y rx=Z inband=W ..."
//     port get command:      "port get 1" / "port get 2" (numeric)
//     port response:         "port N auto=X source=Y band=Z rxant=A txant=B ..."
//     port set command:      "port set 1 txant=N rxant=N"
//     sub command:           "sub port all" / "sub antenna all"  (scope required)
//     keepalive:             "keepalive enable" → ping every 1 s (5 s timeout)
//
// firmwareMajor is set from the "V<a.b.c> AG" banner sent on TCP connect.
// TCP in-order delivery guarantees the banner arrives before any command response,
// so by the time the first await returns firmwareMajor is already correct.

// Port mapping: 'A' → 1, 'B' → 2
const PORT_NUM: Record<AgPort, number> = { A: 1, B: 2 }

export class AgClient extends EventEmitter {
  private tcp: TcpConnection | null = null
  private queue = new CommandQueue()
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null
  private _ip = ''
  private firmwareMajor = 4   // updated from "V<a.b.c> AG" banner; defaults to v4
  get ip(): string { return this._ip }

  async connect(ip: string, authCode?: string): Promise<void> {
    this._ip = ip
    // Hardware confirmed: AG firmware v4.1.16 requires CRLF (not bare CR as spec states)
    this.tcp = new TcpConnection(ip, 9007)

    this.tcp.on('line', (line: string) => this.handleLine(line))
    this.tcp.on('connected', () => this.onConnected(authCode))
    this.tcp.on('disconnected', () => this.onDisconnected())
    this.tcp.on('error', (err: Error) => this.emit('error', err))

    this.tcp.connect()
  }

  disconnect(): void {
    this.stopKeepalive()
    this.queue.clear()
    if (this.tcp) {
      this.tcp.disconnect()
      this.tcp = null
    }
  }

  // List all antennas.
  // v4.x response line: "antenna N name=X tx=Y rx=Z inband=W ..."
  // v3.x response line: "ant=N name=X tx=Y rx=Z ..."   (pure KV, no positional prefix)
  async listAntennas(): Promise<AntennaInfo[]> {
    const result = await this.sendCommand('antenna list')
    const antennas: AntennaInfo[] = []
    for (const line of result.lines) {
      const numMatch = line.match(/^antenna\s+(\d+)\s+/)
      if (numMatch) {
        // v4.x format
        const number = parseInt(numMatch[1], 10)
        const params = this.parseKvLine(line)
        antennas.push({ number, name: params.name || `Antenna ${number}` })
      } else {
        // v3.x format: "ant=N name=X ..."
        const params = this.parseKvLine(line)
        if (params.ant) {
          const number = parseInt(params.ant, 10)
          antennas.push({ number, name: params.name || `Antenna ${number}` })
        }
      }
    }
    return antennas
  }

  // Set antenna for a port (sets both txant and rxant)
  // Hardware confirmed: "port set 1 txant=N rxant=N" → R|0|
  async setAntenna(port: AgPort, antennaNum: number): Promise<void> {
    const n = PORT_NUM[port]
    await this.sendCommand(`port set ${n} txant=${antennaNum} rxant=${antennaNum}`)
  }

  // Get current state of a port.
  // "port get N" returns a SINGLE content line with NO empty terminator following it:
  //   R<seq>|0|port 1 auto=1 source=AUTO band=7 rxant=1 txant=1 tx=0 inhibit=0
  // resolveOnContent=true makes CommandQueue resolve immediately on that line
  // instead of waiting for the empty-message final line that never arrives.
  async getPort(port: AgPort): Promise<PortState> {
    const n = PORT_NUM[port]
    const result = await this.sendCommand(`port get ${n}`, { resolveOnContent: true })
    const params = this.parseKv(result.lines)
    return {
      port,
      band: params.band || '0',   // numeric band index; 0 = None
      antenna: parseInt(params.txant, 10) || 0,
    }
  }

  async setPort(port: AgPort, antenna: number): Promise<void> {
    await this.setAntenna(port, antenna)
  }

  async listOutputs(): Promise<OutputState[]> {
    const result = await this.sendCommand('output list')
    const outputs: OutputState[] = []
    for (const line of result.lines) {
      const params = this.parseKvLine(line)
      if (params.id) {
        outputs.push({
          id: parseInt(params.id, 10),
          name: params.name || '',
          active: params.active === '1',
        })
      }
    }
    return outputs
  }

  async listGroups(): Promise<GroupState[]> {
    const result = await this.sendCommand('group list')
    const groups: GroupState[] = []
    for (const line of result.lines) {
      const params = this.parseKvLine(line)
      if (params.id) {
        groups.push({
          id: parseInt(params.id, 10),
          name: params.name || '',
          antennas: params.antennas ? params.antennas.split(',').map(Number) : [],
        })
      }
    }
    return groups
  }

  // best-effort — v3.x firmware doesn't support sub at all; v4.x requires a scope argument
  async subscribe(type: AgSubscriptionType, scope?: string): Promise<void> {
    const cmd = scope ? `sub ${type} ${scope}` : `sub ${type}`
    await this.sendCommand(cmd)
  }

  async ping(): Promise<void> {
    await this.sendCommand('ping')
  }

  private async onConnected(authCode?: string): Promise<void> {
    // Reset firmware version to default on each new connection so that a
    // reconnect to a different-version device picks up the new banner.
    this.firmwareMajor = 4

    try {
      if (authCode) {
        const authResult = await this.sendCommand(`auth code=${authCode}`)
        if (authResult.code === AG_CODES.AUTH_FAIL) {
          this.emit('error', new Error('AG authentication failed'))
          this.disconnect()
          return
        }
      }

      // "keepalive enable" is v4.x only; v3.x will return an error which we ignore.
      // The await yields the event loop, ensuring the firmware banner (sent by the
      // device on connect) has been received and firmwareMajor set before we proceed.
      try {
        await this.sendCommand('keepalive enable', { timeoutMs: 2000 })
      } catch {
        // Non-fatal
      }

      // Only v4.x has a forced disconnect after 5 s of silence; start pings only then.
      // v3.x has no keepalive timeout so the timer isn't needed (and ping may not exist).
      if (this.firmwareMajor >= 4) {
        this.startKeepalive()
      }

      // Sub commands: v4.x requires scope ("sub port all"); v3.x doesn't support sub.
      if (this.firmwareMajor >= 4) {
        try { await this.subscribe('port', 'all') } catch { /* non-fatal */ }
        try { await this.subscribe('antenna', 'all') } catch { /* non-fatal */ }
      }

      this.emit('connected')
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
  }

  private onDisconnected(): void {
    this.stopKeepalive()
    this.queue.clear()
    this.emit('disconnected')
  }

  private handleLine(line: string): void {
    // Capture firmware version from banner sent immediately on connect.
    // e.g. "V4.1.16 AG" or "V3.1.5 AG AUTH"
    const bannerMatch = line.match(/^V(\d+)\./)
    if (bannerMatch) {
      this.firmwareMajor = parseInt(bannerMatch[1], 10)
      return
    }

    if (this.queue.processLine(line)) return

    // Async status pushes from the device.
    if (!line.startsWith('S0|')) return
    const payload = line.slice(3)

    // v4.x format: "port N auto=X source=Y band=Z rxant=A txant=B ..."
    //              "antenna N name=X ..."
    // v3.x format: "port=A auto=X ..." or "ant=N name=X ..."
    const newStyleMatch = payload.match(/^(\w+)\s+(.*)$/)
    if (newStyleMatch) {
      const objectType = newStyleMatch[1]
      const paramStr = newStyleMatch[2]

      if (objectType === 'port') {
        // Port id may be a digit (v4.x: "1"/"2") or a letter (v3.x: "A"/"B")
        const numMatch = paramStr.match(/^(\d+)\s+/)
        const letterMatch = paramStr.match(/^([AB])\s+/)
        const portNum = numMatch
          ? parseInt(numMatch[1], 10)
          : letterMatch && letterMatch[1] === 'B' ? 2 : 1
        const port: AgPort = portNum === 2 ? 'B' : 'A'
        const params = this.parseKvLine(paramStr)
        this.emit('portUpdate', { port, band: params.band || '0', antenna: parseInt(params.txant, 10) || 0 })
      } else if (objectType === 'antenna') {
        this.listAntennas().then(a => this.emit('antennaUpdate', a)).catch(() => {})
      }
      return
    }

    // v3.x KV-only status: "ant=N name=X ..." or "port=A band=Z ..."
    const params = this.parseKvLine(payload)
    if (params.ant !== undefined) {
      this.listAntennas().then(a => this.emit('antennaUpdate', a)).catch(() => {})
    } else if (params.port !== undefined) {
      const port: AgPort = params.port === 'B' || params.port === '2' ? 'B' : 'A'
      this.emit('portUpdate', { port, band: params.band || '0', antenna: parseInt(params.txant, 10) || 0 })
    }
  }

  private sendCommand(cmd: string, opts?: { timeoutMs?: number; resolveOnContent?: boolean }): Promise<{ code: number; lines: string[] }> {
    if (!this.tcp) return Promise.reject(new Error('Not connected'))
    return this.queue.send(cmd, (seq) => {
      this.tcp!.send(`C${seq}|${cmd}\r\n`)
    }, opts)
  }

  private startKeepalive(): void {
    this.stopKeepalive()
    this.keepaliveTimer = setInterval(() => {
      this.sendCommand('ping').catch(() => {})
    }, TIMEOUTS.AG_KEEPALIVE_INTERVAL)
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer)
      this.keepaliveTimer = null
    }
  }

  private parseKvLine(str: string): Record<string, string> {
    const result: Record<string, string> = {}
    const re = /(\w+)=(\S+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(str)) !== null) {
      result[m[1]] = m[2]
    }
    return result
  }

  private parseKv(lines: string[]): Record<string, string> {
    const result: Record<string, string> = {}
    for (const line of lines) {
      Object.assign(result, this.parseKvLine(line))
    }
    return result
  }
}
