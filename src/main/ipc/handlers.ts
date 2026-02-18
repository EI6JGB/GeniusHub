import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { IPC_CHANNELS, DEFAULT_SETTINGS } from '../../shared/ipc-types'
import type { AppSettings } from '../../shared/ipc-types'
import { DeviceManager } from '../devices/DeviceManager'

// Simple JSON-based settings store (avoids ESM-only electron-store v10 in CJS context)
function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function readSettings(): AppSettings {
  try {
    const data = fs.readFileSync(settingsPath(), 'utf8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function writeSetting(key: string, value: string): void {
  const current = readSettings()
  const updated = { ...current, [key]: value }
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(updated, null, 2))
}

export function registerHandlers(deviceManager: DeviceManager): void {
  // AG commands
  ipcMain.handle(IPC_CHANNELS.AG_SET_ANTENNA, (_, args) =>
    deviceManager.setAgAntenna(args.port, args.antenna)
  )
  ipcMain.handle(IPC_CHANNELS.AG_SET_PORT, (_, args) =>
    deviceManager.setAgPort(args.port, args.antenna)
  )

  // TGXL commands
  ipcMain.handle(IPC_CHANNELS.TGXL_OPERATE, (_, args) =>
    deviceManager.setTgxlOperate(args.on)
  )
  ipcMain.handle(IPC_CHANNELS.TGXL_BYPASS, (_, args) =>
    deviceManager.setTgxlBypass(args.on)
  )
  ipcMain.handle(IPC_CHANNELS.TGXL_AUTOTUNE, () =>
    deviceManager.tgxlAutotune()
  )
  ipcMain.handle(IPC_CHANNELS.TGXL_TUNE_RELAY, (_, args) =>
    deviceManager.tgxlTuneRelay(args.relay, args.move)
  )
  ipcMain.handle(IPC_CHANNELS.TGXL_ACTIVATE_CHANNEL, (_, args) =>
    deviceManager.tgxlActivateChannel(args.channel)
  )
  ipcMain.handle(IPC_CHANNELS.TGXL_ACTIVATE_ANT, (_, args) =>
    deviceManager.tgxlActivateAnt(args.ant)
  )

  // PGXL commands
  ipcMain.handle(IPC_CHANNELS.PGXL_OPERATE, (_, args) =>
    deviceManager.setPgxlOperate(args.on)
  )

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => readSettings())
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_, args: { key: string; value: string }) => {
    writeSetting(args.key, args.value)
  })
  ipcMain.handle(IPC_CHANNELS.SETTINGS_DISCOVER, () => {
    const s = readSettings()
    if (s.pgxlIp) deviceManager.connectPgxl(s.pgxlIp)
    if (s.tgxlIp) deviceManager.connectTgxl(s.tgxlIp, s.tgxlAuth)
    if (s.agIp) deviceManager.connectAg(s.agIp, s.agAuth)
  })
}
