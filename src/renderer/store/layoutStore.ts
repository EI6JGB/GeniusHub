import { create } from 'zustand'
import type { IJsonModel } from 'flexlayout-react'

export const defaultLayout: IJsonModel = {
  global: {
    tabSetMinWidth: 200,
    tabSetMinHeight: 100,
    splitterSize: 6,
    tabSetEnableMaximize: true,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 33,
        children: [
          { type: 'tab', name: 'Tuner Genius XL', component: 'tgxl' },
        ],
      },
      {
        type: 'tabset',
        weight: 33,
        children: [
          { type: 'tab', name: 'Power Genius XL', component: 'pgxl' },
        ],
      },
      {
        type: 'tabset',
        weight: 34,
        children: [
          { type: 'tab', name: 'Antenna Genius', component: 'ag' },
        ],
      },
    ],
  },
}

interface LayoutState {
  layout: IJsonModel
  setLayout: (layout: IJsonModel) => void
  resetLayout: () => void
  load: () => Promise<void>
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  layout: defaultLayout,

  setLayout: (layout) => {
    set({ layout })
    try {
      window.electronAPI?.invoke('settings:set', { key: 'workspaceLayout', value: JSON.stringify(layout) })
    } catch { /* ignore */ }
  },

  resetLayout: () => {
    set({ layout: defaultLayout })
    try {
      window.electronAPI?.invoke('settings:set', { key: 'workspaceLayout', value: JSON.stringify(defaultLayout) })
    } catch { /* ignore */ }
  },

  load: async () => {
    try {
      const raw = await window.electronAPI?.invoke<string>('settings:get', 'workspaceLayout')
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw) as IJsonModel
        // Validate it's a flexlayout IJsonModel (has a layout property), not the old PanelConfig[] format
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.layout) {
          set({ layout: parsed })
        }
      }
    } catch { /* use defaults */ }
  },
}))
