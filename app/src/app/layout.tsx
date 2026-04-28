import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '700'],
  display: 'swap',
})


export const metadata: Metadata = {
  title: 'KamiWords｜神明單字',
  description: '以日本神社參拜為主題的日文單字學習 PWA',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#C63A2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" className={notoSansJP.variable}>
      <body className="font-sans antialiased bg-stone-950 text-stone-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
