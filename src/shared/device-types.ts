// ─── Antenna Genius 8x2 ───────────────────────────────────────────────────────

export interface AntennaInfo {
  number: number    // 1-8
  name: string
}

export interface PortState {
  port: 'A' | 'B'
  band: string      // e.g. "40m", "15m", "" if unknown
  antenna: number   // 1-8, 0 if none selected
}

export interface GroupState {
  id: number
  name: string
  antennas: number[]
}

export interface OutputState {
  id: number
  name: string
  active: boolean
}

export interface FlexState {
  id: number
  name: string
  value: string
}

export interface AgDeviceState {
  ip: string
  port: number
  name: string
  serial: string
  version: string
  connected: boolean
  antennas: AntennaInfo[]
  ports: PortState[]
  groups: GroupState[]
  outputs: OutputState[]
}

export interface AgDiscoveredDevice {
  ip: string
  port: number
  version: string
  serial: string
  name: string
  numPorts: number
  numAntennas: number
  mode: string
  uptime: number
}

// ─── Tuner Genius XL ─────────────────────────────────────────────────────────

export interface TgxlStatus {
  // Power readings
  fwd: number           // Forward power in watts
  peak: number          // Peak power in watts
  swr: number           // SWR; -60.0 = open/infinite (show as ∞)

  // PTT states
  pttA: boolean
  pttB: boolean

  // Band selections
  bandA: number
  bandB: number

  // Operating mode flags
  operateMode: boolean  // true = operate, false = bypass/standby
  bypassMode: boolean

  // Active channel (1 or 2)
  channelA: number
  channelB: number

  // Active antenna selection per channel
  antA: number
  antB: number
}

export interface TgxlDeviceState {
  ip: string
  connected: boolean
  status: TgxlStatus | null
}

export interface TgxlDiscoveredDevice {
  ip: string
  port: number
  version: string
  serial: string
  nickname: string
}

// ─── Power Genius XL ─────────────────────────────────────────────────────────

export type PgxlOperatingState =
  | 'STANDBY'
  | 'IDLE'
  | 'TRANSMIT_A'
  | 'TRANSMIT_B'
  | 'UNKNOWN'

export interface PgxlMeterData {
  fwdPower: number      // Watts
  reflPower: number     // Watts
  temperature: number   // °C
  swr: number
}

export interface PgxlState {
  ip: string
  connected: boolean
  operatingState: PgxlOperatingState
  meter: PgxlMeterData | null
}

export interface PgxlDiscoveredDevice {
  ip: string
  port: number
  version: string
  serial: string
  nickname: string
}

// ─── Device message (M| warning from TGXL) ───────────────────────────────────

export interface DeviceMessage {
  deviceType: 'TGXL' | 'PGXL' | 'AG'
  deviceIp: string
  text: string
  timestamp: number
}
