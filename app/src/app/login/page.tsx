import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: '登入流程不完整，請重試',
  auth_failed: '驗證失敗，請重試',
  server_error: '伺服器錯誤，請稍後再試',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  // 已登入直接跳首頁
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const errorMessage = searchParams.error
    ? (ERROR_MESSAGES[searchParams.error] ?? '登入失敗，請重試')
    : null

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      {/* Logo 區 */}
      <div className="flex flex-col items-center gap-3 mb-12">
        <span className="text-7xl">⛩️</span>
        <h1 className="text-3xl font-bold tracking-widest text-stone-100">
          KamiWords
        </h1>
        <p className="text-stone-400 text-sm tracking-wide">神明單字</p>
      </div>

      {/* 標語 */}
      <div className="text-center mb-10 space-y-2">
        <p className="text-stone-300 text-base">從伏見稻荷大社開始</p>
        <p className="text-stone-500 text-sm">點亮燈籠，讓狐狸陪你學日文</p>
      </div>

      {/* 登入區 */}
      <div className="w-full max-w-xs flex flex-col gap-4">
        <GoogleSignInButton />

        {errorMessage && (
          <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-4 py-3">
            <p className="text-red-400 text-sm text-center">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* 說明文字 */}
      <p className="mt-10 text-stone-600 text-xs text-center max-w-xs leading-relaxed">
        登入即代表你同意我們的服務條款。你的學習資料會安全地儲存在雲端。
      </p>
    </main>
  )
}
