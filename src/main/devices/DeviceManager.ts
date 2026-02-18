import { BrowserWindow } from 'electron'
import { AgDiscovery } from './discovery/AgDiscovery'
import { TgxlDiscovery } from './discovery/TgxlDiscovery'
import { PgxlDiscovery } from './discovery/PgxlDiscovery'
import { AgClient } from './ag/AgClient'
import { TgxlClient } from './tgxl/TgxlClient'
import { PgxlClient } from './pgxl/PgxlClient'
import { IPC_CHANNELS } from '../../shared/ipc-types'
import type { AgPort } from './ag/AgTypes'

export class DeviceManager {
  private win: BrowserWindow | null = null
  private agClient: AgClient | null = null
  private tgxlClient: TgxlClient | null = null
  private pgxlClient: PgxlClient | null = null
  private agDiscovery: AgDiscovery
  private tgxlDiscovery: TgxlDiscovery
  private pgxlDiscovery: PgxlDiscovery

  constructor() {
    this.agDiscovery = new AgDiscovery()
    this.tgxlDiscovery = new TgxlDiscovery()
    this.pgxlDiscovery = new PgxlDiscovery()
    this.setupDiscovery()
  }

  setWindow(win: BrowserWindow): void {
    this.win = win
  }

  // AG commands
  async setAgAntenna(port: AgPort, antenna: number): Promise<void> {
    if (!this.agClient) throw new Error('AG not connected')
    await this.agClient.setAntenna(port, antenna)
  }

  async setAgPort(port: AgPort, antenna: number): Promise<void> {
    if (!this.agClient) throw new Error('AG not connected')
    await this.agClient.setPort(port, antenna)
  }

  // TGXL commands
  async setTgxlOperate(on: boolean): Promise<void> {
    if (!this.tgxlClient) throw new Error('TGXL not connected')
    await this.tgxlClient.setOperate(on)
  }

  async setTgxlBypass(on: boolean): Promise<void> {
    if (!this.tgxlClient) throw new Error('TGXL not connected')
    await this.tgxlClient.setBypass(on)
  }

  async tgxlAutotune(): Promise<void> {
    if (!this.tgxlClient) throw new Error('TGXL not connected')
    await this.tgxlClient.autotune()
  }

  async tgxlTuneRelay(relay: 1 | 2 | 3, move: number): Promise<void> {
    if (!this.tgxlClient) throw new Error('TGXL not connected')
    await this.tgxlClient.tuneRelay(relay, move)
  }

  async tgxlActivateChannel(ch: 1 | 2): Promise<void> {
    if (!this.tgxlClient) throw new Error('TGXL not connected')
    await this.tgxlClient.activateChannel(ch)
  }

  async tgxlActivateAnt(ant: 1 | 2 | 3): Promise<void> {
    if (!this.tgxlClient) throw new Error('TGXL not connected')
    await this.tgxlClient.activateAnt(ant)
  }

  // PGXL commands
  async setPgxlOperate(on: boolean): Promise<void> {
    if (!this.pgxlClient) throw new Error('PGXL not connected')
    await this.pgxlClient.setOperate(on)
  }

  // Connection methods
  async connectAg(ip: string, authCode?: string): Promise<void> {
    if (this.agClient) {
      this.agClient.disconnect()
    }
    this.agClient = new AgClient()
    this.setupAgClient(this.agClient)
    await this.agClient.connect(ip, authCode)
  }

  async connectTgxl(ip: string, authCode?: string): Promise<void> {
    if (this.tgxlClient) {
      this.tgxlClient.disconnect()
    }
    this.tgxlClient = new TgxlClient()
    this.setupTgxlClient(this.tgxlClient)
    await this.tgxlClient.connect(ip, authCode)
  }

  async connectPgxl(ip: string): Promise<void> {
    if (this.pgxlClient) {
      this.pgxlClient.disconnect()
    }
    this.pgxlClient = new PgxlClient()
    this.setupPgxlClient(this.pgxlClient)
    await this.pgxlClient.connect(ip)
  }

  start(): void {
    this.agDiscovery.start()
    this.tgxlDiscovery.start()
    this.pgxlDiscovery.start()
  }

  stop(): void {
    this.agDiscovery.stop()
    this.tgxlDiscovery.stop()
    this.pgxlDiscovery.stop()
    if (this.agClient) {
      this.agClient.disconnect()
      this.agClient = null
    }
    if (this.tgxlClient) {
      this.tgxlClient.disconnect()
      this.tgxlClient = null
    }
    if (this.pgxlClient) {
      this.pgxlClient.disconnect()
      this.pgxlClient = null
    }
  }

  private send(channel: string, data: unknown): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, data)
    }
  }

  private setupDiscovery(): void {
    this.agDiscovery.on('discovered', (device) => {
      this.send(IPC_CHANNELS.AG_DISCOVERED, { device })
      // Auto-connect on discovery (LAN — no auth needed)
      if (!this.agClient) this.connectAg(device.ip).catch(() => {})
    })

    this.tgxlDiscovery.on('discovered', (device) => {
      this.send(IPC_CHANNELS.TGXL_DISCOVERED, { device })
      if (!this.tgxlClient) this.connectTgxl(device.ip).catch(() => {})
    })

    this.pgxlDiscovery.on('discovered', (device) => {
      this.send(IPC_CHANNELS.PGXL_DISCOVERED, { device })
      // Auto-connect on discovery
      if (!this.pgxlClient) this.connectPgxl(device.ip).catch(() => {})
    })
  }

  private setupAgClient(client: AgClient): void {
    client.on('error', (err: Error) => console.error('[AG]', err.message))
    client.on('connected', async () => {
      // Always mark as connected first so the UI transitions out of "connecting".
      // Then attempt to fetch initial state; partial failures are non-fatal because
      // async status pushes (portUpdate / antennaUpdate) will fill in the gaps.
      let antennas: Awaited<ReturnType<typeof client.listAntennas>> = []
      let portA: Awaited<ReturnType<typeof client.getPort>> = { port: 'A', band: '0', antenna: 0 }
      let portB: Awaited<ReturnType<typeof client.getPort>> = { port: 'B', band: '0', antenna: 0 }
      try { antennas = await client.listAntennas() } catch { /* pushed later */ }
      try { portA    = await client.getPort('A')   } catch { /* pushed later */ }
      try { portB    = await client.getPort('B')   } catch { /* pushed later */ }
      this.send(IPC_CHANNELS.AG_STATE, {
        state: {
          ip: client.ip,
          port: 9007,
          name: '',
          serial: '',
          version: '',
          connected: true,
          antennas,
          ports: [portA, portB],
          groups: [],
          outputs: [],
        },
      })
    })

    client.on('disconnected', () => {
      this.send(IPC_CHANNELS.AG_STATE, {
        state: {
          ip: '',
          port: 9007,
          name: '',
          serial: '',
          version: '',
          connected: false,
          antennas: [],
          ports: [],
          groups: [],
          outputs: [],
        },
      })
    })

    client.on('portUpdate', (portState) => {
      this.send(IPC_CHANNELS.AG_STATE, {
        state: { connected: true, ports: [portState] },
      })
    })

    client.on('antennaUpdate', (antennas) => {
      this.send(IPC_CHANNELS.AG_STATE, {
        state: { connected: true, antennas },
      })
    })
  }

  private setupTgxlClient(client: TgxlClient): void {
    client.on('error', (err: Error) => console.error('[TGXL]', err.message))
    client.on('connected', async () => {
      try {
        const status = await client.getStatus()
        this.send(IPC_CHANNELS.TGXL_STATUS, {
          state: { ip: '', connected: true, status },
        })
      } catch {
        this.send(IPC_CHANNELS.TGXL_STATUS, {
          state: { ip: '', connected: true, status: null },
        })
      }
    })

    client.on('disconnected', () => {
      this.send(IPC_CHANNELS.TGXL_STATUS, {
        state: { ip: '', connected: false, status: null },
      })
    })

    client.on('status', (status) => {
      this.send(IPC_CHANNELS.TGXL_STATUS, {
        state: { ip: '', connected: true, status },
      })
    })

    client.on('message', (text: string) => {
      this.send(IPC_CHANNELS.DEVICE_MESSAGE, {
        message: {
          deviceType: 'TGXL',
          deviceIp: '',
          text,
          timestamp: Date.now(),
        },
      })
    })
  }

  private setupPgxlClient(client: PgxlClient): void {
    client.on('error', (err: Error) => console.error('[PGXL]', err.message))
    client.on('connected', () => {
      this.send(IPC_CHANNELS.PGXL_STATE, {
        state: { ip: '', connected: true, operatingState: 'UNKNOWN', meter: null },
      })
    })

    client.on('disconnected', () => {
      this.send(IPC_CHANNELS.PGXL_STATE, {
        state: { ip: '', connected: false, operatingState: 'UNKNOWN', meter: null },
      })
    })

    client.on('state', (operatingState) => {
      this.send(IPC_CHANNELS.PGXL_STATE, {
        state: { ip: '', connected: true, operatingState, meter: null },
      })
    })

    client.on('meter', (meter) => {
      this.send(IPC_CHANNELS.PGXL_STATE, {
        state: { ip: '', connected: true, operatingState: 'UNKNOWN', meter },
      })
    })
  }
}
