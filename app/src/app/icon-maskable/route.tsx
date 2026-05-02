import { ImageResponse } from 'next/og'

export const runtime = 'edge'

/**
 * Maskable icon — Android adaptive icon 用
 *
 * 規格：512×512，內容必須在中央 80% safe zone 內（避免被圓形/水滴/方形 mask 切到）。
 * 設計：紅底滿版（mask 切外圍 OK）+ 中央 60% 鳥居 emoji + 圓角內框作 safe-zone 提示
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#C63A2A',
          width: '512px',
          height: '512px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 240,
        }}
      >
        ⛩
      </div>
    ),
    { width: 512, height: 512 }
  )
}