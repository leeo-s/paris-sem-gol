import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from "../../_lib/auth";
import { tratarErroPrisma } from "../../_lib/prisma-errors";
import type { payment_status } from "@/generated/prisma";

// GET /api/financial/monthly-fees — lista mensalidades com filtros de mês, ano e status
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
    const mes = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : undefined;
    const ano = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;
    const status = searchParams.get("status") ?? undefined;
    const userId = searchParams.get("user_id") ?? undefined;

    const mensalidades = await prisma.monthly_fees.findMany({
      where: {
        // Qualquer usuário autenticado pode ver a listagem completa; userId é filtro opcional
        ...(userId && { user_id: userId }),
        ...(mes && { month: mes }),
        ...(ano && { year: ano }),
        ...(status && { status: status as payment_status }),
      },
      include: {
        users: {
          select: { id: true, name: true, nickname: true, is_goalkeeper: true },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(mensalidades);
  } catch (error) {
    console.error("[GET /api/financial/monthly-fees]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST /api/financial/monthly-fees — gera cobrança de mensalidade para um jogador no mês
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
    const { user_id, month, year, notes } = body;

    if (!user_id || !month || !year) {
      return NextResponse.json(
        { error: "user_id, month e year são obrigatórios" },
        { status: 400 },
      );
    }

    // Verifica se o jogador é goleiro fixo — goleiros são isentos de mensalidade (RN-07)
    const jogador = await prisma.users.findUnique({
      where: { id: user_id },
      select: { is_goalkeeper: true, is_active: true },
    });

    if (!jogador || !jogador.is_active) {
      return NextResponse.json(
        { error: "Jogador não encontrado ou inativo" },
        { status: 404 },
      );
    }

    if (jogador.is_goalkeeper) {
      return NextResponse.json(
        { error: "Goleiros fixos são isentos de mensalidade" },
        { status: 422 },
      );
    }

    // Busca o valor configurado nas settings do clube
    const configuracoes = await prisma.club_settings.findFirst();
    const valorMensalidade = configuracoes?.monthly_fee ?? 80.0;

    const novaMensalidade = await prisma.monthly_fees.create({
      data: {
        user_id,
        month,
        year,
        amount: valorMensalidade,
        notes,
      },
      include: {
        users: { select: { id: true, name: true, nickname: true } },
      },
    });

    return NextResponse.json(novaMensalidade, { status: 201 });
  } catch (error) {
    const respostaPrisma = tratarErroPrisma(error);
    if (respostaPrisma) return respostaPrisma;

    console.error("[POST /api/financial/monthly-fees]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
