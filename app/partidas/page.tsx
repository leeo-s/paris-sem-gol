import { getSessionUser } from "@/lib/get-session-user";
import { PartidasClient } from "./PartidasClient";

export default async function PartidasPage() {
  const user = await getSessionUser();
  const ehAdmin = user?.role === "admin" || user?.role === "co_admin";

  // Passa o ID do usuário logado para que o client identifique participações em partidas
  return <PartidasClient ehAdmin={ehAdmin} currentUserId={user?.id ?? null} />;
}
