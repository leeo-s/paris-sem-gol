'use client'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/config/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Note } from '@/components/ui/note'
import { IconAlertCircle } from '@tabler/icons-react'

// Página de login com autenticação via Supabase
export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [erro,     setErro]     = useState('')
  const [carregando, setCarregando] = useState(false)
  const router   = useRouter()
  const supabase = createBrowserSupabaseClient()

  // Autentica com Supabase e redireciona para o dashboard em caso de sucesso
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Email ou senha inválidos.')
      setCarregando(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">

        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy mb-4">
            <span className="font-cond font-bold text-[22px] text-gold leading-none">PSG</span>
          </div>
          <h1 className="font-cond font-bold text-30 text-navy uppercase tracking-[.02em]">
            Paris Sem Gol
          </h1>
          <p className="text-ink-3 text-[13.5px] mt-1">Sistema de gestão do clube</p>
        </div>

        {/* Card de formulário */}
        <div className="bg-surface border border-border rounded-2xl p-7 shadow-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            {/* Mensagem de erro de autenticação */}
            {erro && (
              <Note tone="red" icon={<IconAlertCircle size={16} />}>
                {erro}
              </Note>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={carregando}
            >
              {carregando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}
