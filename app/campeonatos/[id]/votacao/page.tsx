import { getSessionUser } from "@/lib/get-session-user";
import { VotacaoCampeonatoClient } from "./VotacaoCampeonatoClient";

export default async function VotacaoCampeonatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await getSessionUser();
  const ehAdmin = usuario?.role === "admin" || usuario?.role === "co_admin";

  return <VotacaoCampeonatoClient tournamentId={id} ehAdmin={ehAdmin} />;
}
