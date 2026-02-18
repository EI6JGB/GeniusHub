import { EventEmitter } from 'events'
import { UdpDiscovery } from './UdpDiscovery'
import { PORTS } from '../../../shared/constants'
import type { AgDiscoveredDevice } from '../../../shared/device-types'

export class AgDiscovery extends EventEmitter {
  private udp: UdpDiscovery
  private seen = new Map<string, string>() // serial → ip

  constructor() {
    super()
    this.udp = new UdpDiscovery(PORTS.AG_DISCOVERY)

    this.udp.on('message', (msg: string) => {
      if (!msg.startsWith('AG ')) return
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

  private parse(msg: string): AgDiscoveredDevice | null {
    const kv = (key: string): string => {
      const m = msg.match(new RegExp(`${key}=(\\S+)`))
      return m ? m[1] : ''
    }

    const ip = kv('ip')
    const serial = kv('serial')
    if (!ip || !serial) return null

    return {
      ip,
      port: parseInt(kv('port'), 10) || PORTS.AG_CONTROL,
      version: kv('v'),
      serial,
      name: kv('name'),
      numPorts: parseInt(kv('ports'), 10) || 0,
      numAntennas: parseInt(kv('antennas'), 10) || 0,
      mode: kv('mode'),
      uptime: parseInt(kv('uptime'), 10) || 0,
    }
  }
}
