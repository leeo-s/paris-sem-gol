import { getSessionUser } from "@/lib/get-session-user";
import { TorneioPartidaClient } from "./TorneioPartidaClient";

export const metadata = { title: "Jogo do Campeonato" };

export default async function TorneioPartidaPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;
  const user = await getSessionUser();
  const ehAdmin = user?.role === "admin" || user?.role === "co_admin";

  return (
    <TorneioPartidaClient
      tournamentId={id}
      matchId={matchId}
      ehAdmin={ehAdmin}
    />
  );
}
