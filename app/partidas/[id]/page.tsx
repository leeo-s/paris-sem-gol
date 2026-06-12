import { getSessionUser } from "@/lib/get-session-user";
import { PartidaDetalhesClient } from "./PartidaDetalhesClient";

export default async function PartidaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const ehAdmin = user?.role === "admin" || user?.role === "co_admin";

  return <PartidaDetalhesClient matchId={id} ehAdmin={ehAdmin} />;
}
