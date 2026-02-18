import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/ipc-types'

// Map from original callback → ipcRenderer wrapper so off() can remove the right listener.
type AnyFn = (...args: unknown[]) => void
const wrappers = new Map<AnyFn, AnyFn>()

const api: ElectronAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    const wrapper: AnyFn = (_, ...args) => callback(...args)
    wrappers.set(callback, wrapper)
    ipcRenderer.on(channel, wrapper as never)
  },
  off: (channel, callback) => {
    const wrapper = wrappers.get(callback)
    if (wrapper) {
      ipcRenderer.removeListener(channel, wrapper as never)
      wrappers.delete(callback)
    }
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
