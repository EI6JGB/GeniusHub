export type AgPort = 'A' | 'B'
export type AgSubscriptionType = 'port' | 'relay' | 'antenna' | 'output' | 'group'

export interface AgRawStatus {
  objectType: string
  params: Record<string, string>
}
