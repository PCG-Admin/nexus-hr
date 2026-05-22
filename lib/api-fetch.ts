"use client"

import { createClient } from '@/lib/supabase/client'

// Drop-in fetch wrapper that adds Authorization: Bearer <token> automatically.
// Required because the Supabase browser client uses localStorage (not cookies)
// for session storage, so API routes can't read the session from cookies.
// Includes a 10-second abort timeout — same reason as fetchWithTimeout in client.ts:
// VS Code webview suspends network on focus loss, causing requests to hang forever.
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 10000)

  return fetch(url, { ...options, headers, signal: controller.signal })
    .finally(() => clearTimeout(id))
}
