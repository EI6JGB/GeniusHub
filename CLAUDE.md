# GeniusHub — Developer Notes

## Project Overview
Cross-platform Electron desktop app controlling 4O3A/Expert Electronics Genius ham radio devices:
- **Tuner Genius XL (TGXL)** — TCP/UDP port 9010, LF-terminated commands
- **Power Genius XL (PGXL)** — TCP port 9008 CRLF-terminated, VITA49 UDP metering
- **Antenna Genius 8x2 (AG)** — TCP/UDP port 9007, CR-terminated commands

## Architecture
- All device networking in **main process** (Node.js `net` + `dgram`)
- Renderer is pure React — no direct socket access
- IPC via contextBridge (preload.ts)
- State managed by Zustand stores in renderer

## Build
```bash
npm run dev          # Vite dev server (renderer only)
npm run dev:electron # Electron (loads http://localhost:5173)
npm run build        # Build renderer + main
npm run dist         # Build + package with electron-builder
```

## Key Design Decisions
1. **Two tsconfigs**: `tsconfig.json` (renderer, ESNext/bundler) and `tsconfig.main.json` (main, CommonJS/node)
2. **CommandQueue**: Resolves on `R<seq>|0|` with empty body — the final-line signal
3. **Terminators**: TGXL=LF, AG=CR, PGXL=CRLF — TcpConnection splits on any
4. **AG keepalive**: 1-second ping interval (5s firmware timeout)
5. **PGXL VITA49**: Field offsets tagged TODO — need hardware capture to verify
6. **Settings**: electron-store (JSON file), no backend

## Device Ports
- TGXL discovery: UDP 9010, control: TCP 9010
- PGXL control: TCP 9008, metering: UDP (verify port)
- AG discovery: UDP 9007, control: TCP 9007

## Colour Tokens
- Port A: #1e88e5 (blue)
- Port B: #43a047 (green)
- TX active: #ff5722 (orange)
- Base bg: #0a0c10

## PGXL Notes
VITA49 packet structure is standard; exact byte offsets for fwdPower/reflPower/temperature/swr
fields are tagged as `// TODO: verify offset against hardware capture` in PgxlClient.ts.
Do not guess offsets — they must be verified with a real PGXL.
