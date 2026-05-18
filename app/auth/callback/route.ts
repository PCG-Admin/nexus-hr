import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type === 'recovery') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })

    if (!error) {
      // Session is now established — send user to set their password
      return NextResponse.redirect(`${origin}/auth/set-password`)
    }

    console.error('OTP verification error:', error)
  }

  // Invalid or expired link
  return NextResponse.redirect(`${origin}/?error=invalid_link`)
}
