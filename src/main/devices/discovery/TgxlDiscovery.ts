import { EventEmitter } from 'events'
import { UdpDiscovery } from './UdpDiscovery'
import { PORTS } from '../../../shared/constants'
import type { TgxlDiscoveredDevice } from '../../../shared/device-types'

export class TgxlDiscovery extends EventEmitter {
  private udp: UdpDiscovery
  private seen = new Map<string, string>() // serial → ip

  constructor() {
    super()
    this.udp = new UdpDiscovery(PORTS.TGXL_DISCOVERY)

    this.udp.on('message', (msg: string) => {
      if (!msg.startsWith('TunerGenius ')) return
      const device = this.parse(msg)
      if (!device) return

      const prev = this.seen.get(device.serial)
      if (prev === device.ip) return // duplicate, skip

      this.seen.set(device.serial, device.ip)
      this.emit('discovered', device)
    })

    this.udp.on('error', (err: Error) => this.emit('error', err))
  }

  start(): void {
    this.udp.start()
  }

  stop(): void {
    this.udp.stop()
  }

  private parse(msg: string): TgxlDiscoveredDevice | null {
    const kv = (key: string): string => {
      const m = msg.match(new RegExp(`${key}=(\\S+)`))
      return m ? m[1] : ''
    }

    const ip = kv('ip')
    const serial = kv('serial')
    if (!ip || !serial) return null

    return {
      ip,
      port: PORTS.TGXL_CONTROL,
      version: kv('v'),
      serial,
      nickname: kv('nickname'),
    }
  }
}
