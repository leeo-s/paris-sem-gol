import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session-user";

export default async function NovoJogadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "co_admin")) {
    redirect("/jogadores");
  }

  return <>{children}</>;
}
