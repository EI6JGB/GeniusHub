import type {
  AgDeviceState,
  AgDiscoveredDevice,
  TgxlDeviceState,
  TgxlDiscoveredDevice,
  PgxlState,
  PgxlDiscoveredDevice,
  DeviceMessage,
} from './device-types'

// ─── IPC Channel Names ────────────────────────────────────────────────────────
// Main → Renderer (send / on)
export const IPC_CHANNELS = {
  // Device state pushes (main → renderer)
  AG_STATE:       'device:ag:state',
  AG_DISCOVERED:  'device:ag:discovered',
  TGXL_STATUS:    'device:tgxl:status',
  TGXL_DISCOVERED:'device:tgxl:discovered',
  PGXL_STATE:     'device:pgxl:state',
  PGXL_DISCOVERED:'device:pgxl:discovered',
  DEVICE_MESSAGE: 'device:message',

  // Commands (renderer → main, invoke/handle)
  AG_SET_ANTENNA: 'ag:setAntenna',
  AG_SET_PORT:    'ag:setPort',

  TGXL_OPERATE:       'tgxl:operate',
  TGXL_BYPASS:        'tgxl:bypass',
  TGXL_AUTOTUNE:      'tgxl:autotune',
  TGXL_TUNE_RELAY:    'tgxl:tuneRelay',
  TGXL_ACTIVATE_CHANNEL: 'tgxl:activateChannel',
  TGXL_ACTIVATE_ANT:  'tgxl:activateAnt',

  PGXL_OPERATE: 'pgxl:operate',

  SETTINGS_GET:     'settings:get',
  SETTINGS_SET:     'settings:set',
  SETTINGS_DISCOVER:'settings:discover',
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

// ─── Payload Types ────────────────────────────────────────────────────────────

// Main → Renderer payloads
export interface IpcAgStatePayload { state: AgDeviceState }
export interface IpcAgDiscoveredPayload { device: AgDiscoveredDevice }
export interface IpcTgxlStatusPayload { state: TgxlDeviceState }
export interface IpcTgxlDiscoveredPayload { device: TgxlDiscoveredDevice }
export interface IpcPgxlStatePayload { state: PgxlState }
export interface IpcPgxlDiscoveredPayload { device: PgxlDiscoveredDevice }
export interface IpcDeviceMessagePayload { message: DeviceMessage }

// Renderer → Main command payloads (invoke args)
export interface AgSetAntennaArgs { port: 'A' | 'B'; antenna: number }
export interface AgSetPortArgs { port: 'A' | 'B'; band?: string; antenna?: number }

export interface TgxlOperateArgs { on: boolean }
export interface TgxlBypassArgs { on: boolean }
export interface TgxlTuneRelayArgs { relay: 1 | 2 | 3; move: number }
export interface TgxlActivateChannelArgs { channel: 1 | 2 }
export interface TgxlActivateAntArgs { ant: 1 | 2 | 3 }

export interface PgxlOperateArgs { on: boolean }

export interface SettingsSetArgs { key: string; value: string }

// ─── AppSettings (stored via electron-store) ─────────────────────────────────
export interface AppSettings {
  tgxlIp: string
  tgxlAuth: string
  pgxlIp: string
  agIp: string
  agAuth: string
  theme: 'dark'
}

export const DEFAULT_SETTINGS: AppSettings = {
  tgxlIp: '',
  tgxlAuth: '',
  pgxlIp: '',
  agIp: '',
  agAuth: '',
  theme: 'dark',
}

// ─── ElectronAPI interface (declared on window by preload) ───────────────────
export interface ElectronAPI {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>
  on(channel: string, callback: (...args: unknown[]) => void): void
  off(channel: string, callback: (...args: unknown[]) => void): void
}
