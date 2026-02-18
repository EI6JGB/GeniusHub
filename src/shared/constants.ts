// Device TCP/UDP ports
export const PORTS = {
  AG_DISCOVERY: 9007,
  AG_CONTROL: 9007,
  TGXL_DISCOVERY: 9010,
  TGXL_CONTROL: 9010,
  PGXL_CONTROL: 9008,
  // TODO: Verify PGXL VITA49 UDP metering port against hardware capture
  PGXL_VITA49_UDP: 9009,
} as const

// Sequence number range (1-255 cycling)
export const SEQ = {
  MIN: 1,
  MAX: 255,
} as const

// Timeouts (ms)
export const TIMEOUTS = {
  COMMAND: 5000,
  RECONNECT_INITIAL: 1000,
  RECONNECT_MAX: 30000,
  AG_KEEPALIVE_INTERVAL: 1000, // AG disconnects after 5s silence; 1s gives 4s of jitter tolerance
  DISCOVERY_DEDUP_TTL: 10000,  // Re-emit discovery if IP changes within this window
} as const

// AG response codes
export const AG_CODES = {
  OK: 0x00,
  AUTH_FAIL: 0xff,
} as const

// TGXL response codes
export const TGXL_CODES = {
  OK: 0,
} as const

// VITA49 packet structure constants
// TODO: All byte offsets below need verification against a real PGXL hardware capture
export const VITA49 = {
  HEADER_SIZE: 28, // Standard VITA49 header bytes
  // Field offsets within payload (0 = first byte after header)
  OFFSET_FWD_POWER: 0,    // TODO: verify
  OFFSET_REFL_POWER: 4,   // TODO: verify
  OFFSET_TEMPERATURE: 8,  // TODO: verify
  OFFSET_SWR: 12,          // TODO: verify
} as const
