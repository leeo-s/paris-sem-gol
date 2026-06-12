import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session-user";
import { SortearClient } from "./SortearClient";

// Página de sorteio de times — acessível apenas por admin e co-admin
export default async function SortearPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuarioSessao = await getSessionUser();
  const ehAdmin =
    usuarioSessao?.role === "admin" || usuarioSessao?.role === "co_admin";

  // Redireciona jogadores comuns de volta para os detalhes da partida
  if (!ehAdmin) redirect(`/partidas/${id}`);

  return <SortearClient matchId={id} />;
}
