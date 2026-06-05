import { createServerSupabaseClient } from "@/config/supabase/server";
import { prisma } from "@/config/prisma";

export async function getSessionUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;

  return prisma.users.findUnique({
    where: { email: user.email },
    select: {
      id: true,
      name: true,
      nickname: true,
      email: true,
      role: true,
      photo_url: true,
    },
  });
}
