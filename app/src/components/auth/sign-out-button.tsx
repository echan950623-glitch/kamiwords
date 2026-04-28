'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignOut() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('【登出】失敗:', {
          message: error.message,
          timestamp: new Date().toISOString(),
        })
      }

      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('【登出】未預期錯誤:', {
        message: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      })
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="text-xs text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
    >
      {isLoading ? '登出中…' : '登出'}
    </button>
  )
}
