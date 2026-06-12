import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session-user";
import { PlacarClient } from "./PlacarClient";

// Página de placar — acessível apenas por admin e co-admin
export default async function PlacarPage({
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

  return <PlacarClient matchId={id} />;
}
