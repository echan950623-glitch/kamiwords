'use client'

import { usePageTransition } from '@/contexts/page-transition'

interface TransitionLinkProps {
  href: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

/**
 * <Link> 的 drop-in 替換：點擊時先顯示全屏過場 overlay，再 router.push。
 * 用 <a> 保留語意（hover 顯示 URL、右鍵新分頁可正常跳轉）。
 */
export function TransitionLink({ href, className, style, children }: TransitionLinkProps) {
  const { navigate } = usePageTransition()

  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={(e) => {
        e.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </a>
  )
}
