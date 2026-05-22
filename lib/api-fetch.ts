"use client"

import { createClient } from '@/lib/supabase/client'

// Drop-in fetch wrapper that adds Authorization: Bearer <token> automatically.
// Required because the Supabase browser client now uses localStorage (not cookies)
// for session storage, so API routes can't read the session from cookies.
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

  return fetch(url, { ...options, headers })
}
