import type { ComponentType } from 'react'
import { TgxlPanel } from '../tgxl/TgxlPanel'
import { PgxlPanel } from '../pgxl/PgxlPanel'
import { AgPanel } from '../ag/AgPanel'

export interface WidgetDefinition {
  id: string
  label: string
  defaultDockedSize: number
  defaultFloatSize: { w: number; h: number }
  component: ComponentType
}

export const widgetRegistry: Record<string, WidgetDefinition> = {
  tgxl: {
    id: 'tgxl',
    label: 'Tuner Genius XL',
    defaultDockedSize: 33,
    defaultFloatSize: { w: 420, h: 500 },
    component: TgxlPanel,
  },
  pgxl: {
    id: 'pgxl',
    label: 'Power Genius XL',
    defaultDockedSize: 33,
    defaultFloatSize: { w: 420, h: 500 },
    component: PgxlPanel,
  },
  ag: {
    id: 'ag',
    label: 'Antenna Genius',
    defaultDockedSize: 34,
    defaultFloatSize: { w: 480, h: 560 },
    component: AgPanel,
  },
}

export const widgetOrder = ['tgxl', 'pgxl', 'ag']
