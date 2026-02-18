import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/ipc-types'

const api: ElectronAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback as never)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
