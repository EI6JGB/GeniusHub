import { EventEmitter } from 'events'
import { TcpConnection } from '../connection/TcpConnection'
import { CommandQueue } from '../connection/CommandQueue'
import { AG_CODES, TIMEOUTS } from '../../../shared/constants'
import type { AntennaInfo, PortState, GroupState, OutputState } from '../../../shared/device-types'
import type { AgPort, AgSubscriptionType } from './AgTypes'

export class AgClient extends EventEmitter {
  private tcp: TcpConnection | null = null
  private queue = new CommandQueue()
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null
  private _ip = ''
  get ip(): string { return this._ip }

  async connect(ip: string, authCode?: string): Promise<void> {
    this._ip = ip
    this.tcp = new TcpConnection(ip, 9007, { terminator: 'cr' })

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

  async getInfo(): Promise<Record<string, string>> {
    const result = await this.sendCommand('info')
    return this.parseKv(result.lines)
  }

  async listAntennas(): Promise<AntennaInfo[]> {
    const result = await this.sendCommand('antenna list')
    const antennas: AntennaInfo[] = []
    for (const line of result.lines) {
      const params = this.parseKvLine(line)
      if (params.ant) {
        antennas.push({
          number: parseInt(params.ant, 10),
          name: params.name || `Antenna ${params.ant}`,
        })
      }
    }
    return antennas
  }

  async setAntenna(port: AgPort, antennaNum: number): Promise<void> {
    await this.sendCommand(`antenna set port=${port} ant=${antennaNum}`)
  }

  async getPort(port: AgPort): Promise<PortState> {
    const result = await this.sendCommand(`port get port=${port}`)
    const params = this.parseKv(result.lines)
    return {
      port,
      band: params.band || '',
      antenna: parseInt(params.ant, 10) || 0,
    }
  }

  async setPort(port: AgPort, antenna: number): Promise<void> {
    await this.sendCommand(`port set port=${port} ant=${antenna}`)
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

  async subscribe(type: AgSubscriptionType): Promise<void> {
    await this.sendCommand(`sub ${type}`)
  }

  async ping(): Promise<void> {
    await this.sendCommand('ping')
  }

  private async onConnected(authCode?: string): Promise<void> {
    try {
      // Auth if code provided
      if (authCode) {
        const authResult = await this.sendCommand(`auth code=${authCode}`)
        if (authResult.code === AG_CODES.AUTH_FAIL) {
          this.emit('error', new Error('AG authentication failed'))
          this.disconnect()
          return
        }
      }

      // Enable keepalive
      await this.sendCommand('keepalive enable')
      this.startKeepalive()

      // Subscribe to updates
      await this.subscribe('port')
      await this.subscribe('antenna')

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
    // Try command response first
    if (this.queue.processLine(line)) return

    // Async status lines: S0|<type> <params>
    const statusMatch = line.match(/^S0\|(\w+)\s+(.*)$/)
    if (statusMatch) {
      const objectType = statusMatch[1]
      const paramStr = statusMatch[2]
      const params = this.parseKvLine(paramStr)

      if (objectType === 'port') {
        const state: PortState = {
          port: (params.port as 'A' | 'B') || 'A',
          band: params.band || '',
          antenna: parseInt(params.ant, 10) || 0,
        }
        this.emit('portUpdate', state)
      } else if (objectType === 'antenna') {
        // Re-fetch full list on antenna change notification
        this.listAntennas()
          .then(antennas => this.emit('antennaUpdate', antennas))
          .catch(() => {})
      }
    }
  }

  private sendCommand(cmd: string): Promise<{ code: number; lines: string[] }> {
    if (!this.tcp) return Promise.reject(new Error('Not connected'))
    return this.queue.send(cmd, (seq) => {
      this.tcp!.send(`C${seq}|${cmd}\r`)
    })
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
