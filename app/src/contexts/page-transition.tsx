'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { PageTransitionOverlay } from '@/components/page-transition-overlay'

interface PageTransitionContextType {
  navigate: (href: string) => void
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  navigate: () => {},
})

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // pathname 變了 = navigation 完成，收起 overlay
  useEffect(() => {
    setIsTransitioning(false)
    if (safetyRef.current) clearTimeout(safetyRef.current)
  }, [pathname])

  const navigate = useCallback(
    (href: string) => {
      setIsTransitioning(true)
      // 安全閥：最多等 5 秒，避免卡死
      if (safetyRef.current) clearTimeout(safetyRef.current)
      safetyRef.current = setTimeout(() => setIsTransitioning(false), 5000)
      router.push(href)
    },
    [router]
  )

  return (
    <PageTransitionContext.Provider value={{ navigate }}>
      {children}
      {isTransitioning && <PageTransitionOverlay />}
    </PageTransitionContext.Provider>
  )
}

export function usePageTransition() {
  return useContext(PageTransitionContext)
}
