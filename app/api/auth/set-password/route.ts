import { createServerSupabaseClient } from '@/config/supabase/server'
import { prisma } from '@/config/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// POST /api/auth/set-password — define a senha no primeiro acesso após o convite
// O usuário chega aqui já autenticado via link do email (o Supabase troca o token por sessão automaticamente)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        // O link do convite já autentica o usuário — se não tiver sessão, o link é inválido ou expirou
        if (!user) {
            return NextResponse.json(
                { error: 'Link inválido ou expirado. Solicite um novo convite ao administrador.' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { password, confirmPassword } = body

        if (!password || !confirmPassword) {
            return NextResponse.json(
                { error: 'Senha e confirmação são obrigatórios' },
                { status: 400 }
            )
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'As senhas não coincidem' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'A senha deve ter no mínimo 8 caracteres' },
                { status: 400 }
            )
        }

        // Atualiza a senha no Supabase Auth
        const { error: erroSenha } = await supabase.auth.updateUser({ password })

        if (erroSenha) {
            console.error('[POST /api/auth/set-password] Erro ao definir senha:', erroSenha)
            return NextResponse.json(
                { error: 'Erro ao definir senha. Tente novamente.' },
                { status: 500 }
            )
        }

        // Registra o timestamp do primeiro login na nossa tabela
        await prisma.users.update({
            where: { id: user.id },
            data: { first_login_at: new Date() },
        })

        return NextResponse.json({ mensagem: 'Senha definida com sucesso! Bem-vindo ao Paris Sem Gol.' })
    } catch (error) {
        console.error('[POST /api/auth/set-password]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
