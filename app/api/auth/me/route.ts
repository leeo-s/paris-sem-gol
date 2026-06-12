import { getSessionUser } from "@/lib/get-session-user";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
