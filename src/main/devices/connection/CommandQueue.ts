import { SEQ, TIMEOUTS } from '../../../shared/constants'

interface PendingCommand {
  resolve: (result: { code: number; lines: string[] }) => void
  reject: (err: Error) => void
  lines: string[]
  timer: ReturnType<typeof setTimeout>
  resolveOnContent: boolean  // true = resolve immediately on any R<seq>|code|msg line (PGXL style)
}

export class CommandQueue {
  private seq: number = SEQ.MIN
  private pending = new Map<number, PendingCommand>()

  private nextSeq(): number {
    const current = this.seq
    this.seq = this.seq >= SEQ.MAX ? SEQ.MIN : this.seq + 1
    return current
  }

  send(
    cmd: string,
    sendFn: (seq: number) => void,
    options?: { timeoutMs?: number; resolveOnContent?: boolean }
  ): Promise<{ code: number; lines: string[] }> {
    const seq = this.nextSeq()
    const timeoutMs = options?.timeoutMs ?? TIMEOUTS.COMMAND
    const resolveOnContent = options?.resolveOnContent ?? false

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq)
        reject(new Error(`Command timeout (seq=${seq}): ${cmd}`))
      }, timeoutMs)

      this.pending.set(seq, { resolve, reject, lines: [], timer, resolveOnContent })
      sendFn(seq)
    })
  }

  processLine(line: string): boolean {
    // Match response pattern: R<seq>|<code>|<message>
    const match = line.match(/^R(\d+)\|([0-9a-fA-Fx]+)\|(.*)$/)
    if (!match) return false

    const seq = parseInt(match[1], 10)
    const codeStr = match[2]
    const message = match[3]

    const pending = this.pending.get(seq)
    if (!pending) return false

    // Normalize code: handle hex (0x00) or decimal
    const code = codeStr.startsWith('0x')
      ? parseInt(codeStr, 16)
      : parseInt(codeStr, 10)

    if (message === '' || pending.resolveOnContent) {
      // Final line: empty body (AG/TGXL multi-line style) OR
      // resolveOnContent: any non-empty response line is the complete reply (PGXL single-line style)
      if (message !== '') pending.lines.push(message)
      clearTimeout(pending.timer)
      this.pending.delete(seq)
      pending.resolve({ code, lines: pending.lines })
    } else {
      // Accumulate multi-line response (AG/TGXL)
      pending.lines.push(message)
    }

    return true
  }

  clear(): void {
    for (const [seq, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(`Queue cleared (seq=${seq})`))
    }
    this.pending.clear()
  }
}
