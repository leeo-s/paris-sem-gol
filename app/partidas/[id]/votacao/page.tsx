import { getSessionUser } from "@/lib/get-session-user";
import { VotacaoClient } from "./VotacaoClient";

export default async function VotacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await getSessionUser();
  const ehAdmin = usuario?.role === "admin" || usuario?.role === "co_admin";

  return (
    <VotacaoClient
      matchId={id}
      userId={usuario?.id ?? ""}
      ehAdmin={ehAdmin}
    />
  );
}
