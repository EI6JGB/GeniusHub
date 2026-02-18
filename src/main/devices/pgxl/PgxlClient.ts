import { EventEmitter } from 'events'
import dgram from 'dgram'
import { TcpConnection } from '../connection/TcpConnection'
import { CommandQueue } from '../connection/CommandQueue'
import { PORTS, VITA49 } from '../../../shared/constants'
import type { PgxlOperatingState, PgxlMeterData } from '../../../shared/device-types'

export class PgxlClient extends EventEmitter {
  private tcp: TcpConnection | null = null
  private queue = new CommandQueue()
  private meterSocket: dgram.Socket | null = null
  private _ip = ''
  get ip(): string { return this._ip }

  async connect(ip: string): Promise<void> {
    this._ip = ip
    this.tcp = new TcpConnection(ip, PORTS.PGXL_CONTROL, { terminator: 'crlf' })

    this.tcp.on('line', (line: string) => this.handleLine(line))
    this.tcp.on('connected', () => {
      this.startMeterListener()
      this.emit('connected')
    })
    this.tcp.on('disconnected', () => {
      this.stopMeterListener()
      this.queue.clear()
      this.emit('disconnected')
    })
    this.tcp.on('error', (err: Error) => this.emit('error', err))

    this.tcp.connect()
  }

  disconnect(): void {
    this.stopMeterListener()
    this.queue.clear()
    if (this.tcp) {
      this.tcp.disconnect()
      this.tcp = null
    }
  }

  async setOperate(on: boolean): Promise<void> {
    await this.sendCommand('operate', on ? '1' : '0')
  }

  private handleLine(line: string): void {
    // Ignore the unsolicited version banner sent by PGXL on connect (e.g. "V3.8.9")
    if (/^V\d+\.\d+/.test(line)) return

    // Try command response (single-line style: R<seq>|0|key=val ...)
    if (this.queue.processLine(line)) return

    // Parse async state updates
    const stateMatch = line.match(/state=(\w+)/i)
    if (stateMatch) {
      const raw = stateMatch[1].toUpperCase()
      let state: PgxlOperatingState = 'UNKNOWN'
      if (raw === 'STANDBY') state = 'STANDBY'
      else if (raw === 'IDLE') state = 'IDLE'
      else if (raw === 'TRANSMIT_A') state = 'TRANSMIT_A'
      else if (raw === 'TRANSMIT_B') state = 'TRANSMIT_B'
      this.emit('state', state)
    }
  }

  private sendCommand(key: string, value: string): Promise<{ code: number; lines: string[] }> {
    if (!this.tcp) return Promise.reject(new Error('Not connected'))
    // PGXL uses single-line responses (R<seq>|0|data) — resolveOnContent skips empty-body wait
    return this.queue.send(`${key}=${value}`, (seq) => {
      this.tcp!.send(`C${seq}|${key}=${value}\r\n`)
    }, { resolveOnContent: true })
  }

  private startMeterListener(): void {
    this.stopMeterListener()

    this.meterSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

    this.meterSocket.on('message', (msg: Buffer) => {
      this.parseVita49(msg)
    })

    this.meterSocket.on('error', (err: Error) => {
      this.emit('error', err)
    })

    this.meterSocket.bind(PORTS.PGXL_VITA49_UDP)
  }

  private stopMeterListener(): void {
    if (this.meterSocket) {
      this.meterSocket.close()
      this.meterSocket = null
    }
  }

  private parseVita49(packet: Buffer): void {
    if (packet.length < VITA49.HEADER_SIZE + 16) return

    const payload = packet.slice(VITA49.HEADER_SIZE)

    const meter: PgxlMeterData = {
      fwdPower: payload.readFloatBE(VITA49.OFFSET_FWD_POWER),         // TODO: verify offset against hardware capture
      reflPower: payload.readFloatBE(VITA49.OFFSET_REFL_POWER),       // TODO: verify offset against hardware capture
      temperature: payload.readFloatBE(VITA49.OFFSET_TEMPERATURE),    // TODO: verify offset against hardware capture
      swr: payload.readFloatBE(VITA49.OFFSET_SWR),                    // TODO: verify offset against hardware capture
    }

    this.emit('meter', meter)
  }
}
