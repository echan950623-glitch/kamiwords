import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    console.error('【Auth Callback】缺少 code 參數:', {
      url: request.url,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('【Auth Callback】exchangeCodeForSession 失敗:', {
        message: error.message,
        status: error.status,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (error) {
    console.error('【Auth Callback】未預期錯誤:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.redirect(`${origin}/login?error=server_error`)
  }
}
