import { getSessionUser } from "@/lib/get-session-user";
import { CampeonatosClient } from "./CampeonatosClient";

export const metadata = {
  title: "Campeonatos",
};

export default async function CampeonatosPage() {
  const user = await getSessionUser();
  const ehAdmin = user?.role === "admin" || user?.role === "co_admin";

  return <CampeonatosClient ehAdmin={ehAdmin} />;
}
