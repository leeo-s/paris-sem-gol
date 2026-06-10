import { prisma } from "@/config/prisma"
import { createServerSupabaseClient } from "@/config/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from "../../_lib/auth"
import { tratarErroPrisma } from "../../_lib/prisma-errors"

// GET /api/monthly-roster/manage?month=X&year=Y
// Retorna todos os usuários ativos com seu status no elenco do mês e o valor da mensalidade
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas admins gerenciam o elenco mensal
    const perfilSolicitante = await buscarPerfilUsuario(user.id)
    if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
      return NextResponse.json(
        { error: "Sem permissão para realizar esta ação" },
        { status: 403 },
      )
    }

    const { searchParams } = request.nextUrl
    const mes = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()))

    if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Mês ou ano inválidos" }, { status: 400 })
    }

    // Busca todos os dados em paralelo para melhor performance
    const [todosUsuariosAtivos, elencoDoMes, configuracoes] = await Promise.all([
      prisma.users.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          nickname: true,
          position: true,
          is_goalkeeper: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.monthly_roster.findMany({
        where: { month: mes, year: ano },
        select: { id: true, user_id: true },
      }),
      prisma.club_settings.findFirst(),
    ])

    // Cria um mapa de user_id → roster_id para consulta rápida
    const mapaElenco = new Map(elencoDoMes.map((entrada) => [entrada.user_id, entrada.id]))

    // Mescla os dados dos usuários com o status de elenco do mês
    const usuariosComStatus = todosUsuariosAtivos.map((usuario) => ({
      id: usuario.id,
      name: usuario.name,
      nickname: usuario.nickname,
      position: usuario.position,
      is_goalkeeper: usuario.is_goalkeeper,
      in_roster: mapaElenco.has(usuario.id),
      roster_id: mapaElenco.get(usuario.id) ?? null,
    }))

    return NextResponse.json({
      monthly_fee: configuracoes?.monthly_fee ?? 80.0,
      users: usuariosComStatus,
    })
  } catch (error) {
    console.error("[GET /api/monthly-roster/manage]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST /api/monthly-roster/manage
// Sincroniza o elenco do mês com a lista de user_ids fornecida:
// adiciona quem está na lista mas não no elenco, remove quem está no elenco mas não na lista
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const perfilSolicitante = await buscarPerfilUsuario(user.id)
    if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
      return NextResponse.json(
        { error: "Sem permissão para realizar esta ação" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { user_ids, month, year } = body as {
      user_ids: string[]
      month: number
      year: number
    }

    if (!Array.isArray(user_ids) || !month || !year) {
      return NextResponse.json(
        { error: "user_ids, month e year são obrigatórios" },
        { status: 400 },
      )
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Mês inválido" }, { status: 400 })
    }

    // Valida o limite de 20 mensalistas não-goleiros por mês
    const usuariosSelecionados = await prisma.users.findMany({
      where: { id: { in: user_ids }, is_active: true },
      select: { id: true, is_goalkeeper: true },
    })

    const totalNaoGoleiros = usuariosSelecionados.filter((u) => !u.is_goalkeeper).length
    if (totalNaoGoleiros > 20) {
      return NextResponse.json(
        { error: "Limite de 20 mensalistas não-goleiros por mês atingido" },
        { status: 422 },
      )
    }

    // Busca o estado atual do elenco e as configurações em paralelo
    const [elencoAtual, configuracoes] = await Promise.all([
      prisma.monthly_roster.findMany({
        where: { month, year },
        select: { id: true, user_id: true },
      }),
      prisma.club_settings.findFirst(),
    ])

    const valorMensalidade = configuracoes?.monthly_fee ?? 80.0

    // Calcula quais usuários devem ser adicionados e quais devem ser removidos
    const idsNoElencoAtual = new Set(elencoAtual.map((e) => e.user_id))
    const idsSelecionados = new Set(user_ids)

    const idsParaAdicionar = user_ids.filter((id) => !idsNoElencoAtual.has(id))
    const entradaParaRemover = elencoAtual.filter((e) => !idsSelecionados.has(e.user_id))
    const idsUsuariosParaRemover = entradaParaRemover.map((e) => e.user_id)

    // Separa os novos usuários em goleiros e não-goleiros — goleiros entram só no roster, sem mensalidade
    const mapaIsGoleiro = new Map(usuariosSelecionados.map((u) => [u.id, u.is_goalkeeper]))
    const naoGoleirosParaAdicionar = idsParaAdicionar.filter((id) => !mapaIsGoleiro.get(id))

    // Executa todas as alterações de forma atômica
    await prisma.$transaction(async (tx) => {
      // Remove do elenco e apaga as mensalidades dos usuários desmarcados
      if (idsUsuariosParaRemover.length > 0) {
        await tx.monthly_roster.deleteMany({
          where: { user_id: { in: idsUsuariosParaRemover }, month, year },
        })
        await tx.monthly_fees.deleteMany({
          where: { user_id: { in: idsUsuariosParaRemover }, month, year },
        })
      }

      // Insere no elenco todos os novos usuários selecionados (incluindo goleiros)
      if (idsParaAdicionar.length > 0) {
        await tx.monthly_roster.createMany({
          data: idsParaAdicionar.map((userId) => ({ user_id: userId, month, year })),
          skipDuplicates: true,
        })

        // Cria mensalidade apenas para não-goleiros — trigger do banco bloqueia inserção para goleiros
        if (naoGoleirosParaAdicionar.length > 0) {
          await tx.monthly_fees.createMany({
            data: naoGoleirosParaAdicionar.map((userId) => ({
              user_id: userId,
              month,
              year,
              amount: valorMensalidade,
            })),
            skipDuplicates: true,
          })
        }
      }
    })

    return NextResponse.json({
      adicionados: idsParaAdicionar.length,
      removidos: idsUsuariosParaRemover.length,
    })
  } catch (error) {
    const respostaPrisma = tratarErroPrisma(error)
    if (respostaPrisma) return respostaPrisma

    console.error("[POST /api/monthly-roster/manage]", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
