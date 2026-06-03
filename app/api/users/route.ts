import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'

// Client admin do Supabase com service_role — necessário para inviteUserByEmail
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET /api/users — lista jogadores com filtros opcionais por role, posição e status de goleiro
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const filtroRole = searchParams.get('role') ?? undefined
        const filtroPosition = searchParams.get('position') ?? undefined
        const filtroGoalkeeper = searchParams.get('is_goalkeeper')
        const incluirInativos = searchParams.get('includeInactive') === 'true'

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        const deveIncluirInativos = ehAdminOuCoAdmin(perfilSolicitante?.role) && incluirInativos

        const jogadores = await prisma.users.findMany({
            where: {
                is_active: deveIncluirInativos ? undefined : true,
                ...(filtroRole && { role: filtroRole as 'admin' | 'co_admin' | 'player' }),
                ...(filtroPosition && { position: filtroPosition }),
                ...(filtroGoalkeeper !== null && { is_goalkeeper: filtroGoalkeeper === 'true' }),
            },
            select: {
                id: true,
                name: true,
                nickname: true,
                email: true,
                role: true,
                photo_url: true,
                birth_date: true,
                phone: true,
                position: true,
                is_goalkeeper: true,
                is_active: true,
                invited_at: true,
                first_login_at: true,
                created_at: true,
            },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json(jogadores)
    } catch (error) {
        console.error('[GET /api/users]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/users — cria jogador na tabela, envia convite por email via Supabase Auth
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!perfilSolicitante || !ehAdminOuCoAdmin(perfilSolicitante.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const body = await request.json()
        const { name, nickname, email, role, birth_date, phone, position, is_goalkeeper } = body

        if (!name || !email) {
            return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
        }

        // Verifica se o email já existe no Supabase Auth para evitar duplicatas
        const { data: usuariosExistentes } = await supabaseAdmin.auth.admin.listUsers()
        const emailJaExiste = usuariosExistentes?.users?.some(u => u.email === email)
        if (emailJaExiste) {
            return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
        }

        // Envia o convite via Supabase Auth
        // O Supabase envia o email automaticamente com o link de definição de senha
        // O redirectTo define para onde o usuário vai após clicar no link do email
        const { data: convite, error: erroConvite } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/definir-senha`,
                data: { name }, // metadados extras passados para o user_metadata do Supabase
            }
        )

        if (erroConvite || !convite?.user) {
            console.error('[POST /api/users] Erro ao enviar convite:', erroConvite)
            return NextResponse.json({ error: 'Erro ao enviar convite por email' }, { status: 500 })
        }

        // Cria o jogador na tabela public.users usando o mesmo UUID gerado pelo Supabase Auth
        // Isso garante que o id do Supabase Auth e da nossa tabela são sempre iguais
        const novoJogador = await prisma.$transaction(async (tx) => {
            const jogadorCriado = await tx.users.create({
                data: {
                    id: convite.user.id, // UUID do Supabase Auth
                    name,
                    nickname: nickname ?? null,
                    email,
                    password_hash: 'supabase_auth', // campo legado — autenticação é via Supabase Auth
                    role: role ?? 'player',
                    birth_date: birth_date ? new Date(birth_date) : null,
                    phone: phone ?? null,
                    position: position ?? null,
                    is_goalkeeper: is_goalkeeper ?? false,
                    invited_at: new Date(),
                },
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                    email: true,
                    role: true,
                    position: true,
                    is_goalkeeper: true,
                    is_active: true,
                    invited_at: true,
                    created_at: true,
                },
            })

            // Cria rating inicial com todos os atributos em 5 (padrão)
            await tx.player_ratings.create({
                data: { user_id: jogadorCriado.id },
            })

            return jogadorCriado
        })

        return NextResponse.json(
            { ...novoJogador, mensagem: `Convite enviado para ${email}` },
            { status: 201 }
        )
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/users]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
