import { cn } from '@/lib/utils'
import Image from 'next/image'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AvatarKind = 'member' | 'gk' | 'guest'

interface AvatarProps {
  src?:       string | null
  name:       string
  size?:      AvatarSize
  kind?:      AvatarKind
  className?: string
}

// Dimensões e tamanho de fonte por variante de tamanho
const sizeClasses: Record<AvatarSize, { wrap: string; text: string; px: number }> = {
  xs: { wrap: 'w-[26px] h-[26px]', text: 'text-[10px]', px: 26 },
  sm: { wrap: 'w-8 h-8',           text: 'text-[12px]', px: 32 },
  md: { wrap: 'w-10 h-10',         text: 'text-[14px]', px: 40 },
  lg: { wrap: 'w-14 h-14',         text: 'text-[19px]', px: 56 },
  xl: { wrap: 'w-[76px] h-[76px]', text: 'text-[26px]', px: 76 },
}

// Cor de fundo por tipo de jogador: mensalista, goleiro fixo ou avulso
const kindClasses: Record<AvatarKind, string> = {
  member: 'bg-navy-600 text-white',
  gk:     'bg-gold text-[#3a2a00]',
  guest:  'bg-surface-3 text-ink-2 border border-border-strong',
}

// Extrai as iniciais (até 2 palavras) do nome completo
function gerarIniciais(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((palavra) => palavra[0])
    .join('')
    .toUpperCase()
}

// Avatar circular com fallback de iniciais coloridas por tipo de jogador
export function Avatar({ src, name, size = 'md', kind = 'member', className }: AvatarProps) {
  const { wrap, text, px } = sizeClasses[size]
  return (
    <span
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 overflow-hidden font-semibold select-none',
        wrap,
        !src && kindClasses[kind],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={name} width={px} height={px} className="object-cover w-full h-full" />
      ) : (
        <span className={text}>{gerarIniciais(name)}</span>
      )}
    </span>
  )
}
