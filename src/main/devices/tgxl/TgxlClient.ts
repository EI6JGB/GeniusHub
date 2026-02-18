import { EventEmitter } from 'events'
import { TcpConnection } from '../connection/TcpConnection'
import { CommandQueue } from '../connection/CommandQueue'
import type { TgxlStatus } from '../../../shared/device-types'

export class TgxlClient extends EventEmitter {
  private tcp: TcpConnection | null = null
  private queue = new CommandQueue()
  private _ip = ''
  get ip(): string { return this._ip }

  async connect(ip: string, authCode?: string): Promise<void> {
    this._ip = ip
    this.tcp = new TcpConnection(ip, 9010, { terminator: 'lf' })

    this.tcp.on('line', (line: string) => this.handleLine(line))
    this.tcp.on('connected', () => this.onConnected(authCode))
    this.tcp.on('disconnected', () => this.onDisconnected())
    this.tcp.on('error', (err: Error) => this.emit('error', err))

    this.tcp.connect()
  }

  disconnect(): void {
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

  async getStatus(): Promise<TgxlStatus> {
    const result = await this.sendCommand('status')
    const params = this.parseKv(result.lines)
    return this.buildStatus(params)
  }

  async setOperate(on: boolean): Promise<void> {
    await this.sendCommand(`operate set=${on ? 1 : 0}`)
  }

  async setBypass(on: boolean): Promise<void> {
    await this.sendCommand(`bypass set=${on ? 1 : 0}`)
  }

  async activateChannel(ch: 1 | 2): Promise<void> {
    await this.sendCommand(`activate ch=${ch}`)
  }

  async activateAnt(ant: 1 | 2 | 3): Promise<void> {
    await this.sendCommand(`activate ant=${ant}`)
  }

  async autotune(): Promise<void> {
    await this.sendCommand('autotune')
  }

  async tuneRelay(relay: 1 | 2 | 3, move: number): Promise<void> {
    await this.sendCommand(`tune relay=${relay} move=${move}`)
  }

  async save(): Promise<void> {
    await this.sendCommand('save')
  }

  private async onConnected(authCode?: string): Promise<void> {
    try {
      if (authCode) {
        await this.sendCommand(`auth ${authCode}`)
      }
      this.emit('connected')
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
  }

  private onDisconnected(): void {
    this.queue.clear()
    this.emit('disconnected')
  }

  private handleLine(line: string): void {
    // Try command response first
    if (this.queue.processLine(line)) return

    // Async status line: S7|status fwd=... peak=... swr=...
    if (line.startsWith('S7|')) {
      const paramStr = line.slice(3)
      // Strip leading "status " if present
      const stripped = paramStr.startsWith('status ') ? paramStr.slice(7) : paramStr
      const params = this.parseKvLine(stripped)
      const status = this.buildStatus(params)
      this.emit('status', status)
      return
    }

    // Message lines: M|<text>
    if (line.startsWith('M|')) {
      this.emit('message', line.slice(2))
      return
    }
  }

  private sendCommand(cmd: string): Promise<{ code: number; lines: string[] }> {
    if (!this.tcp) return Promise.reject(new Error('Not connected'))
    return this.queue.send(cmd, (seq) => {
      this.tcp!.send(`C${seq}|${cmd}\n`)
    })
  }

  private buildStatus(params: Record<string, string>): TgxlStatus {
    return {
      fwd: parseFloat(params.fwd) || 0,
      peak: parseFloat(params.peak) || 0,
      swr: parseFloat(params.swr) || 0,
      pttA: params.pttA === '1',
      pttB: params.pttB === '1',
      bandA: parseInt(params.bandA, 10) || 0,
      bandB: parseInt(params.bandB, 10) || 0,
      operateMode: params.operate === '1',
      bypassMode: params.bypass === '1',
      channelA: parseInt(params.channelA, 10) || 0,
      channelB: parseInt(params.channelB, 10) || 0,
      antA: parseInt(params.antA, 10) || 0,
      antB: parseInt(params.antB, 10) || 0,
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
