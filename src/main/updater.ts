import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

export function initUpdater(win: BrowserWindow): void {
  autoUpdater.checkForUpdatesAndNotify()
  autoUpdater.on('update-available', () => {
    win.webContents.send('update:available')
  })
}
