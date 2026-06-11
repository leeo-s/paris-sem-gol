import { getSessionUser } from "@/lib/get-session-user";
import { PartidasClient } from "./PartidasClient";

export default async function PartidasPage() {
  const user = await getSessionUser();
  const ehAdmin = user?.role === "admin" || user?.role === "co_admin";

  return <PartidasClient ehAdmin={ehAdmin} />;
}
