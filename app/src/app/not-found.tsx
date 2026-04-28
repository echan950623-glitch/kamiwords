import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4">
      <span className="text-6xl">⛩️</span>
      <h1 className="font-pixel text-2xl text-stone-300">找不到此頁面</h1>
      <p className="font-pixel text-stone-500 text-sm">此神社路徑不存在</p>
      <Link
        href="/"
        className="font-pixel text-sm text-amber-400 hover:text-amber-300 underline transition-colors"
      >
        回首頁
      </Link>
    </div>
  )
}
