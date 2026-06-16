import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TRANSACOES_POR_PAGINA = 10;

// GET /api/users/:id/transactions — lista paginada das movimentações financeiras do jogador
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const { searchParams } = request.nextUrl;
    const pagina = Math.max(
      1,
      parseInt(searchParams.get("page") ?? "1", 10) || 1,
    );
    const pular = (pagina - 1) * TRANSACOES_POR_PAGINA;

    // Busca a página de transações e o total em paralelo
    const [transacoes, total] = await Promise.all([
      prisma.financial_transactions.findMany({
        where: { user_id: id },
        orderBy: { reference_date: "desc" },
        skip: pular,
        take: TRANSACOES_POR_PAGINA,
        select: {
          id: true,
          type: true,
          category: true,
          amount: true,
          description: true,
          reference_date: true,
          payment_method: true,
        },
      }),
      prisma.financial_transactions.count({ where: { user_id: id } }),
    ]);

    return NextResponse.json({
      transacoes,
      total,
      totalPaginas: Math.ceil(total / TRANSACOES_POR_PAGINA),
    });
  } catch (error) {
    console.error("[GET /api/users/:id/transactions]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
