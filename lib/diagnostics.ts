"use client"

// Diagnostic layer — observes auth state, tab visibility, and token expiry.
// Sends timestamped events to /api/diagnostics so they appear in the Next.js terminal.
// Add initDiagnostics() once in AuthProvider. Remove when root cause is confirmed.

import { createClient } from './supabase/client'

let _initialized = false

async function send(event: string, data: Record<string, unknown>) {
  const payload = { ts: new Date().toISOString(), event, ...data }

  // Browser console — always visible in DevTools
  console.log(
    `%c[NEXUS DIAG] ${event}`,
    'color:#f59e0b;font-weight:bold;',
    payload,
  )

  // Server endpoint — appears in Next.js terminal
  try {
    await fetch('/api/diagnostics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Never let diagnostic failures affect the app
  }
}

function tokenInfo(session: { expires_at?: number } | null) {
  if (!session?.expires_at) return { expiresAt: null, expiresInSeconds: null, isExpired: null }
  const expiresInSeconds = Math.round(session.expires_at - Date.now() / 1000)
  return {
    expiresAt: new Date(session.expires_at * 1000).toISOString(),
    expiresInSeconds,
    isExpired: expiresInSeconds < 0,
  }
}

export function initDiagnostics() {
  if (typeof window === 'undefined') return
  if (_initialized) return
  _initialized = true

  const supabase = createClient()

  // Snapshot current session state on startup
  supabase.auth.getSession().then(({ data: { session } }) => {
    send('DIAG_INIT', {
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      localStorageKeyExists: !!localStorage.getItem('nexus-hr-auth'),
      ...tokenInfo(session),
    })
  })

  // Every Supabase auth event: SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, etc.
  supabase.auth.onAuthStateChange((event, session) => {
    send('AUTH_STATE_CHANGE', {
      event,
      hasSession: !!session,
      userId: session?.user?.id ?? null,
      ...tokenInfo(session),
    })
  })

  // Tab visibility — runs before auth.tsx's own handler (capture: true)
  let hiddenAt = 0
  document.addEventListener(
    'visibilitychange',
    async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        send('TAB_HIDDEN', {})
        return
      }

      const hiddenForSeconds = hiddenAt > 0 ? Math.round((Date.now() - hiddenAt) / 1000) : null
      const { data: { session } } = await supabase.auth.getSession()

      send('TAB_VISIBLE', {
        hiddenForSeconds,
        hasSession: !!session,
        userId: session?.user?.id ?? null,
        localStorageKeyExists: !!localStorage.getItem('nexus-hr-auth'),
        ...tokenInfo(session),
      })
    },
    { capture: true },
  )
}
