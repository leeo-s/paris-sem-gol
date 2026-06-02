import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'

// Verifica autenticação via Supabase e retorna o usuário ou resposta de erro
export async function verificarAutenticacao() {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            usuarioAutenticado: null,
            respostaErroAuth: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }),
        }
    }

    return { usuarioAutenticado: user, respostaErroAuth: null }
}

// Busca o perfil do usuário no banco para verificar role e status
export async function buscarPerfilUsuario(userId: string) {
    return prisma.users.findUnique({
        where: { id: userId },
        select: { role: true, is_active: true },
    })
}

// Verifica se a role pertence a admin ou co-admin
export function ehAdminOuCoAdmin(role: string | undefined | null): boolean {
    return ['admin', 'co_admin'].includes(role ?? '')
}

// Verifica se a role é estritamente admin
export function ehAdmin(role: string | undefined | null): boolean {
    return role === 'admin'
}