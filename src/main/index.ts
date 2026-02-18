import { app, BrowserWindow } from 'electron'
import path from 'path'
import { DeviceManager } from './devices/DeviceManager'
import { registerHandlers } from './ipc/handlers'
import { buildMenu } from './menu'

const isDev = !app.isPackaged

let win: BrowserWindow | null = null
const deviceManager = new DeviceManager()

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0c10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'GeniusHub',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  deviceManager.setWindow(win)
  buildMenu(win)

  win.on('closed', () => {
    win = null
  })
}

app.whenReady().then(() => {
  registerHandlers(deviceManager)
  createWindow()
  deviceManager.start()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    deviceManager.stop()
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) createWindow()
})

app.on('before-quit', () => deviceManager.stop())
