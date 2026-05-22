import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Extracts and verifies the Supabase JWT from the Authorization: Bearer header.
// Used by all API routes instead of cookie-based createServerClient(), because
// the browser client now stores sessions in localStorage (not cookies) to work
// reliably in the VS Code webview.
export async function getApiUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user } } = await admin.auth.getUser(token)
  return user ?? null
}
