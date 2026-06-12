"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/config/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";

// Regras de validação aplicadas visualmente em tempo real
const REGRAS_SENHA = [
  { id: "tamanho", texto: "Mínimo 8 caracteres", regex: /.{8,}/ },
  { id: "maiuscula", texto: "Pelo menos 1 letra maiúscula", regex: /[A-Z]/ },
  { id: "numero", texto: "Pelo menos 1 número", regex: /[0-9]/ },
  {
    id: "especial",
    texto: "Pelo menos 1 caractere especial",
    regex: /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/,
  },
];

export default function CriarSenhaPage() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Estados de controle da autenticação pelo link do email
  const [sessaoCarregada, setSessaoCarregada] = useState(false);
  const [erroSessao, setErroSessao] = useState<string | null>(null);

  const router = useRouter();

  // Autentica o usuário assim que a página carrega.
  // Suporta dois modos: link de email (tokens no hash) ou primeiro login (sessão já ativa).
  useEffect(() => {
    const autenticarPeloLink = async () => {
      // Tokens chegam no hash fragment (#) após o Supabase processar o link de redefinição.
      // O hash não é enviado ao servidor — precisa ser lido pelo browser via window.location.hash.
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      const supabase = createBrowserSupabaseClient();

      // Sem tokens no hash: verifica se o usuário já está logado (fluxo de primeiro login)
      if (!accessToken || !refreshToken) {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setSessaoCarregada(true);
        } else {
          setErroSessao(
            "Link inválido ou expirado. Solicite um novo convite ao administrador.",
          );
        }
        return;
      }

      // Com tokens: estabelece a sessão a partir do link de redefinição de senha
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setErroSessao(
          "Link expirado ou inválido. Solicite um novo convite ao administrador.",
        );
        return;
      }

      setSessaoCarregada(true);
    };

    autenticarPeloLink();
  }, []); // sem dependência de searchParams — lê o hash diretamente

  // Avalia cada regra contra o valor atual da senha
  const validacaoRegras = REGRAS_SENHA.map((regra) => ({
    ...regra,
    valida: regra.regex.test(senha),
  }));

  const senhaValida = validacaoRegras.every((r) => r.valida);
  const senhasIguais = confirmarSenha.length > 0 && senha === confirmarSenha;
  const podeEnviar = senhaValida && senhasIguais && !carregando;

  async function handleSubmit() {
    if (!podeEnviar) return;

    setCarregando(true);
    setErro("");

    const resposta = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: senha,
        confirmPassword: confirmarSenha,
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      setErro(dados.error || "Erro ao definir senha. Tente novamente.");
      setCarregando(false);
      return;
    }

    setSucesso(true);
    // Redireciona para o dashboard após confirmação visual de sucesso
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  // Exibe erro se os tokens forem inválidos ou ausentes
  if (erroSessao) {
    setTimeout(() => router.push("/login"), 1400);

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center p-8">
          <XCircle className="size-12 text-destructive" />
          <p className="font-heading text-xl text-foreground tracking-wide">
            LINK INVÁLIDO
          </p>
          <p className="text-muted-foreground text-sm max-w-xs">{erroSessao}</p>
        </div>
      </div>
    );
  }

  // Aguarda a sessão ser estabelecida antes de exibir o formulário
  if (!sessaoCarregada) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-6 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground text-sm">Verificando link…</p>
        </div>
      </div>
    );
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
              src="/logo.png"
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
              CRIAR SENHA
            </h1>
            <p className="text-gold text-sm mt-2">
              Defina sua senha de acesso ao sistema.
            </p>
          </div>

          {/* Card no mobile, transparente no desktop */}
          <div className="bg-card border border-border rounded-xl p-6 md:bg-transparent md:border-none md:rounded-none md:p-0">
            {/* Cabeçalho mobile */}
            <h2 className="font-heading text-2xl text-foreground tracking-wide mb-5 md:hidden">
              CRIAR SENHA
            </h2>

            {sucesso ? (
              /* Estado de sucesso — exibido antes do redirect */
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ShieldCheck className="size-12 text-green-500" />
                <p className="font-heading text-xl text-foreground tracking-wide">
                  SENHA CRIADA!
                </p>
                <p className="text-muted-foreground text-sm">
                  Redirecionando para o dashboard…
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Campo: nova senha */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="senha">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="h-10 pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={
                        mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {mostrarSenha ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* Checklist de regras — visível após o usuário começar a digitar */}
                  {senha.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-1">
                      {validacaoRegras.map((regra) => (
                        <li
                          key={regra.id}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {regra.valida ? (
                            <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="size-3.5 text-destructive shrink-0" />
                          )}
                          <span
                            className={
                              regra.valida
                                ? "text-green-500"
                                : "text-muted-foreground"
                            }
                          >
                            {regra.texto}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Campo: confirmar senha */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmar-senha">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="confirmar-senha"
                      type={mostrarConfirmar ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      className="h-10 pl-9 pr-10"
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={
                        mostrarConfirmar ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {mostrarConfirmar ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* Indicador de senhas iguais */}
                  {confirmarSenha.length > 0 && (
                    <p
                      className={`text-xs flex items-center gap-1.5 mt-0.5 ${senhasIguais ? "text-green-500" : "text-destructive"}`}
                    >
                      {senhasIguais ? (
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      ) : (
                        <XCircle className="size-3.5 shrink-0" />
                      )}
                      {senhasIguais
                        ? "As senhas coincidem"
                        : "As senhas não coincidem"}
                    </p>
                  )}
                </div>

                {/* Erro retornado pela API */}
                {erro && <p className="text-destructive text-sm">{erro}</p>}

                <Button
                  onClick={handleSubmit}
                  disabled={!podeEnviar}
                  className="w-full h-10 mt-1"
                >
                  <KeyRound />
                  {carregando ? "Salvando…" : "Criar Senha"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
