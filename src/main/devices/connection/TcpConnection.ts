import net from 'net'
import { EventEmitter } from 'events'
import { TIMEOUTS } from '../../../shared/constants'

export interface TcpConnectionOptions {
  terminator?: 'lf' | 'cr' | 'crlf'
  reconnectDelay?: number
}

export class TcpConnection extends EventEmitter {
  private host: string
  private port: number
  private socket: net.Socket | null = null
  private buffer = ''
  private _isConnected = false
  private deliberately = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay: number

  constructor(host: string, port: number, options?: TcpConnectionOptions) {
    super()
    this.host = host
    this.port = port
    this.reconnectDelay = options?.reconnectDelay ?? TIMEOUTS.RECONNECT_INITIAL
  }

  get isConnected(): boolean {
    return this._isConnected
  }

  connect(): void {
    this.deliberately = false
    this.clearReconnect()

    this.socket = new net.Socket()

    this.socket.on('connect', () => {
      this._isConnected = true
      this.reconnectDelay = TIMEOUTS.RECONNECT_INITIAL
      this.emit('connected')
    })

    this.socket.on('data', (data: Buffer) => {
      this.buffer += data.toString('utf8')
      this.processBuffer()
    })

    this.socket.on('close', () => {
      this._isConnected = false
      this.buffer = ''
      this.emit('disconnected')
      if (!this.deliberately) {
        this.scheduleReconnect()
      }
    })

    this.socket.on('error', (err: Error) => {
      this.emit('error', err)
    })

    this.socket.connect(this.port, this.host)
  }

  disconnect(): void {
    this.deliberately = true
    this.clearReconnect()
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    this._isConnected = false
    this.buffer = ''
  }

  send(data: string): void {
    if (this.socket && this._isConnected) {
      this.socket.write(data)
    }
  }

  private processBuffer(): void {
    // Split on any of \r\n, \r, or \n
    const lines = this.buffer.split(/\r\n|\r|\n/)
    // Last element is either empty (if buffer ended with a terminator) or a partial line
    this.buffer = lines.pop()!
    for (const line of lines) {
      if (line.length > 0) {
        this.emit('line', line)
      }
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnect()
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, this.reconnectDelay)
    // Exponential backoff: double delay, cap at max
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, TIMEOUTS.RECONNECT_MAX)
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
