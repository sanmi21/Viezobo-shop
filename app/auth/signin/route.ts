import { NextResponse, type NextRequest } from 'next/server'

import { hasSupabaseEnv } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL('/?auth_error=not-configured', request.url))
  }

  const supabase = await createClient()
  const callback = new URL('/auth/callback', request.nextUrl.origin)
  callback.searchParams.set('next', next)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  })

  if (error || !data.url) {
    return NextResponse.redirect(new URL('/?auth_error=oauth-start-failed', request.url))
  }

  return NextResponse.redirect(data.url)
}
