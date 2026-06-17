"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import logoImg from "@/public/logo.png";
import { Avatar } from "@/components/ui/avatar";
import { Mail, Send } from "lucide-react";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  // Solicita o envio do código de recuperação e redireciona para a página de verificação
  async function handleEnviarCodigo() {
    if (!email.trim()) {
      setErro("Informe seu email.");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.error || "Erro ao enviar código. Tente novamente.");
        setCarregando(false);
        return;
      }

      // Salva o email na sessão para exibir na próxima página sem expor na URL
      sessionStorage.setItem("psg_reset_email", email);
      router.push("/redefinir-senha");
    } catch {
      setErro("Erro ao enviar código. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Painel de marca — idêntico ao login */}
      <div className="bg-sidebar relative flex flex-col items-center justify-center overflow-hidden py-10 md:py-0 md:w-95 md:min-h-screen">
        <div className="absolute bottom-20 -left-8 size-48 rounded-full bg-purple-900/50 blur-3xl hidden md:block" />
        <div className="absolute bottom-4 left-12 size-36 rounded-full bg-indigo-900/40 blur-2xl hidden md:block" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <Avatar className="size-20 md:size-24 after:hidden">
            <Image
              src={logoImg}
              alt="Paris Sem Gol"
              width={96}
              height={96}
              className="aspect-square size-full rounded-full object-cover"
              priority
            />
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

      {/* Área do formulário */}
      <div className="flex-1 flex items-start md:items-center justify-center bg-background p-4 md:p-12 pt-6 md:pt-0">
        <div className="w-full max-w-sm">
          {/* Cabeçalho desktop */}
          <div className="hidden md:block mb-8">
            <h1 className="font-heading text-4xl text-foreground tracking-wide leading-none">
              RECUPERAR SENHA
            </h1>
            <p className="text-gold text-sm mt-2">
              Insira seu email para receber o código de recuperação.
            </p>
          </div>

          {/* Card no mobile, transparente no desktop */}
          <div className="bg-card border border-border rounded-xl p-6 md:bg-transparent md:border-none md:rounded-none md:p-0">
            {/* Cabeçalho mobile */}
            <h2 className="font-heading text-2xl text-foreground tracking-wide mb-5 md:hidden">
              RECUPERAR SENHA
            </h2>

            <div className="flex flex-col gap-4">
              {/* Campo de email */}
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
                    onKeyDown={(e) => e.key === "Enter" && handleEnviarCodigo()}
                  />
                </div>
              </div>

              {erro && <p className="text-destructive text-sm">{erro}</p>}

              <Button
                onClick={handleEnviarCodigo}
                disabled={carregando}
                className="w-full h-10 mt-1"
              >
                <Send />
                {carregando ? "Enviando..." : "Enviar código de recuperação"}
              </Button>

              {/* Link de volta para o login */}
              <p className="text-center text-sm text-muted-foreground">
                Lembrou sua senha?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-gold hover:underline underline-offset-4"
                >
                  Fazer login
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
