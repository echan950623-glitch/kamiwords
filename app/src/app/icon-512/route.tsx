import { ImageResponse } from 'next/og'

export const runtime = 'edge'

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
          fontSize: 320,
          borderRadius: 100,
        }}
      >
        ⛩
      </div>
    ),
    { width: 512, height: 512 }
  )
}
