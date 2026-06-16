import { ImageResponse } from 'next/og'

// Metadados da imagem do ícone (favicon gerado dinamicamente)
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Gera um favicon simples com uma bola de futebol (emoji), substituindo o ícone padrão
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 28,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⚽
      </div>
    ),
    {
      ...size,
    }
  )
}
