import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Singleton — one client, one auto-refresh timer, one auth state machine.
let _client: ReturnType<typeof createSupabaseClient<Database>> | null = null

// VS Code webview suspends network connections when the window loses focus.
// A hanging fetch never rejects — it just blocks indefinitely. This wrapper
// aborts any request that hasn't resolved in 10 seconds so callers' catch
// blocks fire instead of spinning forever.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 10000)
  return fetch(input as RequestInfo, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(id))
}

export function createClient() {
  if (_client) return _client

  _client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'nexus-hr-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: typeof window !== 'undefined' ? fetchWithTimeout : fetch,
      },
    }
  )

  return _client
}
