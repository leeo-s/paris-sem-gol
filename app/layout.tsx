import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

// Fonte principal do sistema — Barlow Regular, Medium, SemiBold e Bold
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

// Fonte condensada para números grandes e títulos em destaque
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Paris Sem Gol',
  description: 'Sistema de Gerenciamento de Time',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      // Para tema escuro, adicione data-theme="dark" aqui ou via ThemeProvider
    >
      <body className={`${barlow.variable} ${barlowCondensed.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
