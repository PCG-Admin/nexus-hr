import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Singleton — one client, one auto-refresh timer, one auth state machine.
// Multiple createBrowserClient instances (from @supabase/ssr) each start their
// own refresh cycle and race each other over the same localStorage key, causing
// hangs in VS Code webview where there are no cookies to arbitrate between them.
let _client: ReturnType<typeof createSupabaseClient<Database>> | null = null

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
    }
  )

  return _client
}
