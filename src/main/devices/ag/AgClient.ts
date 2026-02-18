import { EventEmitter } from 'events'
import { TcpConnection } from '../connection/TcpConnection'
import { CommandQueue } from '../connection/CommandQueue'
import { AG_CODES, TIMEOUTS } from '../../../shared/constants'
import type { AntennaInfo, PortState, GroupState, OutputState } from '../../../shared/device-types'
import type { AgPort, AgSubscriptionType } from './AgTypes'

// Hardware-confirmed command syntax (v4.1.16):
//   Terminator : CRLF (not bare CR as documented)
//   antenna list: "antenna N name=X tx=Y rx=Z ..." (not "ant=N name=X")
//   port get    : "port get 1" / "port get 2" (numeric, not port=A/B)
//   port response: "port N auto=X source=Y band=Z rxant=A txant=B ..."
//   port set    : "port set 1 txant=N rxant=N" (sets both tx and rx antenna)
//   keepalive   : "keepalive enable" works fine over CRLF
//   sub commands: return error codes on v4.1.16 — treated as best-effort

// Port mapping: 'A' → 1, 'B' → 2
const PORT_NUM: Record<AgPort, number> = { A: 1, B: 2 }

export class AgClient extends EventEmitter {
  private tcp: TcpConnection | null = null
  private queue = new CommandQueue()
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null
  private _ip = ''
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

  // List all 8 antennas
  // Response line format: "antenna N name=X tx=YYYY rx=ZZZZ inband=W hotkey=V"
  async listAntennas(): Promise<AntennaInfo[]> {
    const result = await this.sendCommand('antenna list')
    const antennas: AntennaInfo[] = []
    for (const line of result.lines) {
      // Extract antenna number from "antenna N name=X ..."
      const numMatch = line.match(/^antenna\s+(\d+)\s+/)
      if (!numMatch) continue
      const number = parseInt(numMatch[1], 10)
      const params = this.parseKvLine(line)
      antennas.push({
        number,
        name: params.name || `Antenna ${number}`,
      })
    }
    return antennas
  }

  // Set antenna for a port (sets both txant and rxant)
  // Hardware confirmed: "port set 1 txant=N rxant=N" → R|0|
  async setAntenna(port: AgPort, antennaNum: number): Promise<void> {
    const n = PORT_NUM[port]
    await this.sendCommand(`port set ${n} txant=${antennaNum} rxant=${antennaNum}`)
  }

  // Get current state of a port
  // Hardware confirmed: "port get 1" → "port N auto=X source=Y band=Z rxant=A txant=B ..."
  async getPort(port: AgPort): Promise<PortState> {
    const n = PORT_NUM[port]
    const result = await this.sendCommand(`port get ${n}`)
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

  // best-effort — sub commands return error codes on v4.1.16
  async subscribe(type: AgSubscriptionType): Promise<void> {
    await this.sendCommand(`sub ${type}`)
  }

  async ping(): Promise<void> {
    await this.sendCommand('ping')
  }

  private async onConnected(authCode?: string): Promise<void> {
    try {
      if (authCode) {
        const authResult = await this.sendCommand(`auth code=${authCode}`)
        if (authResult.code === AG_CODES.AUTH_FAIL) {
          this.emit('error', new Error('AG authentication failed'))
          this.disconnect()
          return
        }
      }

      // Keepalive confirmed working on v4.1.16 with CRLF
      try {
        await this.sendCommand('keepalive enable', { timeoutMs: 2000 })
      } catch {
        // Non-fatal: LAN connections are tolerant without keepalive
      }
      this.startKeepalive()

      // Sub commands return error codes on v4.1.16 — non-fatal
      try { await this.subscribe('port') } catch { /* non-fatal */ }
      try { await this.subscribe('antenna') } catch { /* non-fatal */ }

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
    // Ignore version banner (e.g. "V4.1.16 AG")
    if (/^V\d+\.\d+/.test(line)) return

    if (this.queue.processLine(line)) return

    // Async status pushes: "S0|port N auto=X ..." or "S0|antenna N name=X ..."
    const statusMatch = line.match(/^S0\|(\w+)\s+(.*)$/)
    if (statusMatch) {
      const objectType = statusMatch[1]
      const paramStr = statusMatch[2]

      if (objectType === 'port') {
        // "port N auto=X source=Y band=Z rxant=A txant=B ..."
        const numMatch = paramStr.match(/^(\d+)\s+/)
        const portNum = numMatch ? parseInt(numMatch[1], 10) : 0
        const port: AgPort = portNum === 2 ? 'B' : 'A'
        const params = this.parseKvLine(paramStr)
        const state: PortState = {
          port,
          band: params.band || '0',
          antenna: parseInt(params.txant, 10) || 0,
        }
        this.emit('portUpdate', state)
      } else if (objectType === 'antenna') {
        this.listAntennas()
          .then(antennas => this.emit('antennaUpdate', antennas))
          .catch(() => {})
      }
    }
  }

  private sendCommand(cmd: string, opts?: { timeoutMs?: number }): Promise<{ code: number; lines: string[] }> {
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
