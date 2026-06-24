import { getSessionUser } from "@/lib/get-session-user";
import { CampeonatoDetalhesClient } from "./CampeonatoDetalhesClient";

export const metadata = {
  title: "Detalhes do Campeonato",
};

export default async function CampeonatoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const ehAdmin = user?.role === "admin" || user?.role === "co_admin";

  return <CampeonatoDetalhesClient id={id} ehAdmin={ehAdmin} />;
}
