import dgram from 'dgram'
import { EventEmitter } from 'events'

export class UdpDiscovery extends EventEmitter {
  private port: number
  private socket: dgram.Socket | null = null

  constructor(port: number) {
    super()
    this.port = port
  }

  start(): void {
    if (this.socket) return

    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

    this.socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      this.emit('message', msg.toString('utf8').trim(), rinfo)
    })

    this.socket.on('error', (err: Error) => {
      this.emit('error', err)
    })

    this.socket.bind(this.port, () => {
      this.socket?.setBroadcast(true)
    })
  }

  stop(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }
}
