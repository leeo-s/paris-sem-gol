import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session-user";
import { prisma } from "@/config/prisma";
import { SortearCampeonatoClient } from "./SortearCampeonatoClient";

export default async function SortearCampeonatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuarioSessao = await getSessionUser();
  const ehAdmin =
    usuarioSessao?.role === "admin" || usuarioSessao?.role === "co_admin";

  if (!ehAdmin) redirect(`/campeonatos/${id}`);

  const campeonato = await prisma.tournaments.findUnique({
    where: { id },
    select: { squad_size: true, status: true },
  });

  if (!campeonato || campeonato.status !== "registration") {
    redirect(`/campeonatos/${id}`);
  }

  return (
    <SortearCampeonatoClient
      tournamentId={id}
      squadSize={campeonato.squad_size}
    />
  );
}
