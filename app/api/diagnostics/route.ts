import { NextRequest, NextResponse } from 'next/server'

// Receives diagnostic events from the client and prints them to the Next.js terminal.
// Remove this route once the loading-state root cause is confirmed and fixed.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ts, event, ...rest } = body as Record<string, unknown>

    const lines = Object.entries(rest)
      .map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`)
      .join('\n')

    const divider = '─'.repeat(60)
    console.log(`\n${divider}`)
    console.log(`  [DIAG] ${event}  @  ${ts}`)
    if (lines) console.log(lines)
    console.log(divider)
  } catch {
    // malformed body — ignore
  }

  return NextResponse.json({ ok: true })
}
