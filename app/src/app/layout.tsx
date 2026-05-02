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
  metadataBase: new URL('https://kamiwords.vercel.app'),
  title: 'KamiWords｜神明單字',
  description: '以日本神社參拜為主題的日文單字學習 PWA — 點亮燈籠、收集御朱印、養成你的狐狸',
  manifest: '/manifest.json',
  applicationName: 'KamiWords',
  appleWebApp: {
    capable: true,
    title: 'KamiWords',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    title: 'KamiWords｜神明單字',
    description: '以日本神社參拜為主題的日文單字學習 PWA',
    siteName: 'KamiWords',
  },
}

export const viewport: Viewport = {
  themeColor: '#C63A2A',
  width: 'device-width',
  initialScale: 1,
  // 不限制 maximumScale / userScalable — 讓 user 可放大看小字（a11y 最佳實踐）
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
