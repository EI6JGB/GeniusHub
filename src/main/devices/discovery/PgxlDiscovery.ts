import { UdpDiscovery } from './UdpDiscovery'
import type { PgxlDiscoveredDevice } from '../../../shared/device-types'
import { PORTS } from '../../../shared/constants'

export class PgxlDiscovery extends UdpDiscovery {
  // Serial → last known IP for deduplication
  private seen = new Map<string, string>()

  constructor() {
    super(PORTS.PGXL_CONTROL)
    this.on('message', (msg: string) => this.parse(msg))
  }

  // Broadcast format (confirmed from hardware):
  // PowerGeniusXL ip=10.3.4.56 v=3.8.9 serial=10-200/24-0019 nickname=PowerGeniusXL
  private parse(msg: string): void {
    if (!msg.startsWith('PowerGeniusXL')) return

    const get = (key: string) => msg.match(new RegExp(`${key}=([^\\s]+)`))?.[1] ?? ''

    const ip       = get('ip')
    const version  = get('v')
    const serial   = get('serial')
    const nickname = get('nickname')

    if (!ip || !serial) return

    // Re-emit only on first sight or IP change
    if (this.seen.get(serial) === ip) return
    this.seen.set(serial, ip)

    const device: PgxlDiscoveredDevice = { ip, port: PORTS.PGXL_CONTROL, version, serial, nickname }
    this.emit('discovered', device)
  }
}
