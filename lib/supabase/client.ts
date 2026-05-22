import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'nexus-hr-auth',
        // Use localStorage so session survives VS Code webview redirects.
        // Supabase's default cookie-based storage breaks in the VS Code
        // simple browser because Set-Cookie headers from server redirects
        // are not reliably persisted in the webview.
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  )
}
