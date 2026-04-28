import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#C63A2A',
          width: '192px',
          height: '192px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 120,
          borderRadius: 40,
        }}
      >
        ⛩
      </div>
    ),
    { width: 192, height: 192 }
  )
}
