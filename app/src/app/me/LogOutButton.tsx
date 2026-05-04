'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogOutButton() {
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
      className="w-full h-12 flex items-center justify-center font-pixel text-base font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: '#7E1D14', color: '#F8D7D3', textShadow: '1px 1px 0 #4A0F08' }}
    >
      {isLoading ? '登出中…' : '登出'}
    </button>
  )
}
