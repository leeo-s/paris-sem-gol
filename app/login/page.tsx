"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/config/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou senha inválidos");
      setLoading(false);
      return;
    }

    // Busca o perfil do usuário via API para verificar se é o primeiro acesso
    const resposta = await fetch("/api/auth/me");
    const perfilUsuario = resposta.ok ? await resposta.json() : null;

    // Primeiro login: redireciona para cadastrar senha pessoal
    if (!perfilUsuario?.first_login_at) {
      router.push("/criar-senha");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Branding panel */}
      <div className="bg-sidebar relative flex flex-col items-center justify-center overflow-hidden py-10 md:py-0 md:w-95 md:min-h-screen">
        {/* Decorative circles (desktop only) */}
        <div className="absolute bottom-20 -left-8 size-48 rounded-full bg-purple-900/50 blur-3xl hidden md:block" />
        <div className="absolute bottom-4 left-12 size-36 rounded-full bg-indigo-900/40 blur-2xl hidden md:block" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <Avatar className="size-20 md:size-24 after:hidden">
            <AvatarImage src="/logo.png" alt="Paris Sem Gol" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground font-heading text-xl">
              PSG
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="font-heading text-4xl md:text-5xl text-sidebar-foreground tracking-wider leading-tight">
              PARIS <br className="hidden md:block" />
              SEM GOL
            </h2>
          </div>
        </div>

        <p className="absolute bottom-4 left-4 text-sidebar-foreground/40 text-xs hidden md:block">
          v3.0 · Next.js · Supabase
        </p>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-start md:items-center justify-center bg-background p-4 md:p-12 pt-6 md:pt-0">
        <div className="w-full max-w-sm">
          {/* Desktop heading */}
          <div className="hidden md:block mb-8">
            <h1 className="font-heading text-4xl text-foreground tracking-wide leading-none">
              BEM-VINDO DE VOLTA
            </h1>
            <p className="text-gold text-sm mt-2">
              Entre com as credenciais enviadas pelo administrador.
            </p>
          </div>

          {/* Card wrapper: styled as card on mobile, transparent on desktop */}
          <div className="bg-card border border-border rounded-xl p-6 md:bg-transparent md:border-none md:rounded-none md:p-0">
            {/* Mobile heading */}
            <h2 className="font-heading text-2xl text-foreground tracking-wide mb-5 md:hidden">
              FAZER LOGIN
            </h2>

            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 pl-9"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pl-9 pr-10"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  className="text-sm text-gold hover:underline underline-offset-4"
                >
                  Esqueci minha senha
                </button>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-10 mt-1"
              >
                <LogIn />
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
