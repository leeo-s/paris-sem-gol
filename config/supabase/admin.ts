import { createClient } from "@supabase/supabase-js";

// Cria cliente Supabase com a service role key, que bypassa o RLS e tem
// permissão para operações administrativas como criar/deletar usuários no Auth.
// ATENÇÃO: nunca importe este cliente em código de frontend ou componentes client-side.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role — diferente da anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      flowType: "pkce",
    },
  },
);
