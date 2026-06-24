import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from "../_lib/auth";
import { tratarErroPrisma } from "../_lib/prisma-errors";
import type { match_status } from "@/generated/prisma";

// GET /api/matches — lista partidas com filtros opcionais de status e período
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const mes = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : undefined;
    const ano = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;

    // Monta filtro de data quando informado
    let filtroData = {};
    if (mes && ano) {
      filtroData = {
        match_date: {
          gte: new Date(ano, mes - 1, 1),
          lte: new Date(ano, mes, 0),
        },
      };
    }

    const partidas = await prisma.matches.findMany({
      where: {
        bracket_key: null,
        ...(status && { status: status as match_status }),
        ...filtroData,
      },
      include: {
        users: { select: { id: true, name: true } },
        match_players: {
          select: {
            id: true,
            user_id: true,
            guest_player_id: true,
            is_goalkeeper: true,
            confirmed: true,
          },
        },
        mvp_voting_sessions: {
          select: {
            id: true,
            is_closed: true,
            closes_at: true,
            total_votes_cast: true,
          },
        },
        goals: {
          include: {
            users: { select: { id: true, name: true, nickname: true } },
            guest_players: { select: { id: true, name: true } },
          },
        },
        goals_conceded: {
          include: {
            users: { select: { id: true, name: true, nickname: true } },
            guest_players: { select: { id: true, name: true } },
          },
        },
        mvp_votes: {
          include: {
            users_mvp_votes_voted_user_idTousers: {
              select: { id: true, name: true, nickname: true },
            },
          },
        },
      },
      orderBy: { match_date: "desc" },
    });

    // Serializa o campo time (Date do Prisma @db.Time) para string "HH:MM:SS"
    const partidasSerializadas = partidas.map((partida) => ({
      ...partida,
      time: partida.time
        ? `${String(partida.time.getUTCHours()).padStart(2, "0")}:${String(partida.time.getUTCMinutes()).padStart(2, "0")}:${String(partida.time.getUTCSeconds()).padStart(2, "0")}`
        : null,
    }));

    return NextResponse.json(partidasSerializadas);
  } catch (error) {
    console.error("[GET /api/matches]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST /api/matches — cria uma nova partida (pelada do sábado ou evento especial)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const perfilSolicitante = await buscarPerfilUsuario(user.id);
    if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
      return NextResponse.json(
        { error: "Sem permissão para realizar esta ação" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { match_date, location, title } = body;

    if (!match_date) {
      return NextResponse.json(
        { error: "Data da partida é obrigatória" },
        { status: 400 },
      );
    }

    const dataPartida = new Date(match_date);
    const mesPartida = dataPartida.getUTCMonth() + 1;
    const anoPartida = dataPartida.getUTCFullYear();

    const novaPartida = await prisma.matches.create({
      data: {
        match_date: dataPartida,
        location,
        title,
        created_by: user.id,
      },
    });

    // Busca mensalistas ativos do mês da partida para confirmação automática
    const mensalistas = await prisma.monthly_roster.findMany({
      where: { month: mesPartida, year: anoPartida, status: "active" },
      select: { user_id: true },
    });

    // Busca todos os goleiros ativos do clube
    const goleirosAtivos = await prisma.users.findMany({
      where: { is_goalkeeper: true, is_active: true },
      select: { id: true },
    });

    // Monta conjuntos de IDs para facilitar a verificação de sobreposição
    const idsMensalistas = new Set(mensalistas.map((m) => m.user_id));
    const idsGoleiros = new Set(goleirosAtivos.map((g) => g.id));

    // Unifica mensalistas e goleiros em uma única lista sem duplicatas,
    // marcando corretamente quem é goleiro
    const todosIds = new Set([...idsMensalistas, ...idsGoleiros]);
    const jogadoresParaInserir = Array.from(todosIds).map((userId) => ({
      match_id: novaPartida.id,
      user_id: userId,
      confirmed: true,
      is_goalkeeper: idsGoleiros.has(userId),
    }));

    if (jogadoresParaInserir.length > 0) {
      await prisma.match_players.createMany({
        data: jogadoresParaInserir,
        skipDuplicates: true,
      });
    }

    return NextResponse.json(novaPartida, { status: 201 });
  } catch (error) {
    const respostaPrisma = tratarErroPrisma(error);
    if (respostaPrisma) return respostaPrisma;

    console.error("[POST /api/matches]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
