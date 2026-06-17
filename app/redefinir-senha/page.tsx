"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import logoImg from "@/public/logo.png";
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
  Mail,
} from "lucide-react";

// Regras de validação de senha aplicadas em tempo real
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

export default function RedefinirSenhaPage() {
  const [emailRecuperacao, setEmailRecuperacao] = useState("");

  // Estado do código de verificação
  const [codigo, setCodigo] = useState("");
  const [codigoVerificado, setCodigoVerificado] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState("");

  // Estado dos campos de nova senha
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erroSenha, setErroSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const router = useRouter();

  // Lê o email salvo e verifica o estado do fluxo no servidor para restaurar
  // o passo correto caso a página tenha sido recarregada pelo browser mobile
  useEffect(() => {
    const emailSalvo = sessionStorage.getItem("psg_reset_email") ?? "";
    setEmailRecuperacao(emailSalvo);

    fetch("/api/auth/reset-password")
      .then((r) => r.json())
      .then((dados) => {
        if (dados.estado === "codigo_verificado") {
          setCodigoVerificado(true);
        }
      })
      .catch(() => {});
  }, []);

  // Dispara a verificação automaticamente quando os 6 dígitos são preenchidos
  useEffect(() => {
    if (codigo.length === 6 && !codigoVerificado) {
      verificarCodigo();
    }
  }, [codigo]);

  // Envia o código para a API validar e liberar a sessão de redefinição
  async function verificarCodigo() {
    setVerificandoCodigo(true);
    setErroCodigo("");

    try {
      const resposta = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: codigo }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErroCodigo(dados.error || "Código inválido. Tente novamente.");
        setCodigo("");
        return;
      }

      setCodigoVerificado(true);
    } catch {
      setErroCodigo("Erro ao verificar código. Tente novamente.");
      setCodigo("");
    } finally {
      setVerificandoCodigo(false);
    }
  }

  // Garante que o campo aceite apenas dígitos e respeite o limite de 6 caracteres
  // Limpa o erro ao digitar para que o usuário possa tentar novamente
  function handleChangeCodigo(e: React.ChangeEvent<HTMLInputElement>) {
    const apenasDigitos = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCodigo(apenasDigitos);
    if (erroCodigo) setErroCodigo("");
  }

  // Avalia cada regra de senha em tempo real contra o valor digitado
  const validacaoRegras = REGRAS_SENHA.map((regra) => ({
    ...regra,
    valida: regra.regex.test(senha),
  }));

  const senhaValida = validacaoRegras.every((r) => r.valida);
  const senhasIguais = confirmarSenha.length > 0 && senha === confirmarSenha;
  const podeRedefinir = senhaValida && senhasIguais && !carregando;

  // Envia a nova senha para a API após o código ter sido verificado
  async function handleRedefinirSenha() {
    if (!podeRedefinir) return;

    setCarregando(true);
    setErroSenha("");

    try {
      const resposta = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          password: senha,
          confirmPassword: confirmarSenha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErroSenha(
          dados.error || "Erro ao redefinir senha. Tente novamente.",
        );
        setCarregando(false);
        return;
      }

      // Limpa o email da sessão após o fluxo ser concluído com sucesso
      sessionStorage.removeItem("psg_reset_email");
      setSucesso(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setErroSenha("Erro ao redefinir senha. Tente novamente.");
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
              REDEFINIR SENHA
            </h1>
            <p className="text-gold text-sm mt-2">
              {codigoVerificado
                ? "Código confirmado. Defina sua nova senha."
                : "Insira o código de 6 dígitos enviado para seu email."}
            </p>
          </div>

          {/* Card no mobile, transparente no desktop */}
          <div className="bg-card border border-border rounded-xl p-6 md:bg-transparent md:border-none md:rounded-none md:p-0">
            {/* Cabeçalho mobile */}
            <h2 className="font-heading text-2xl text-foreground tracking-wide mb-5 md:hidden">
              REDEFINIR SENHA
            </h2>

            {sucesso ? (
              /* Estado de sucesso — exibido antes do redirect para o login */
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ShieldCheck className="size-12 text-green-500" />
                <p className="font-heading text-xl text-foreground tracking-wide">
                  SENHA REDEFINIDA!
                </p>
                <p className="text-muted-foreground text-sm">
                  Redirecionando para o login…
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Mensagem informativa — visível apenas antes de verificar o código */}
                {!codigoVerificado && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <Mail className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Enviamos um código de recuperação para{" "}
                      <span className="font-medium text-foreground">
                        {emailRecuperacao || "seu email"}
                      </span>
                      . Verifique sua caixa de entrada ou sua caixa de span.
                    </p>
                  </div>
                )}

                {/* Campo do código de verificação */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="codigo">Código de verificação</Label>
                  <div className="relative">
                    {/* Ícone dinâmico reflete o estado atual do código */}
                    {verificandoCodigo ? (
                      <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
                    ) : codigoVerificado ? (
                      <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-green-500" />
                    ) : (
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    )}
                    <Input
                      id="codigo"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={codigo}
                      onChange={handleChangeCodigo}
                      disabled={codigoVerificado || verificandoCodigo}
                      maxLength={6}
                      className="h-10 pl-9 tracking-widest text-center font-mono text-lg"
                    />
                  </div>

                  {erroCodigo && (
                    <p className="text-destructive text-sm flex items-center gap-1.5">
                      <XCircle className="size-3.5 shrink-0" />
                      {erroCodigo}
                    </p>
                  )}

                  {codigoVerificado && (
                    <p className="text-green-500 text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      Código confirmado com sucesso
                    </p>
                  )}
                </div>

                {/* Campos de senha — visíveis somente após o código ser verificado */}
                {codigoVerificado && (
                  <>
                    {/* Campo: nova senha com checklist de regras */}
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

                      {/* Checklist de regras de senha exibido após o usuário começar a digitar */}
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

                    {/* Campo: confirmação de senha */}
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
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleRedefinirSenha()
                          }
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

                      {/* Indicador visual de compatibilidade entre as senhas */}
                      {confirmarSenha.length > 0 && (
                        <p
                          className={`text-xs flex items-center gap-1.5 mt-0.5 ${
                            senhasIguais ? "text-green-500" : "text-destructive"
                          }`}
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

                    {erroSenha && (
                      <p className="text-destructive text-sm">{erroSenha}</p>
                    )}

                    <Button
                      onClick={handleRedefinirSenha}
                      disabled={!podeRedefinir}
                      className="w-full h-10 mt-1"
                    >
                      <KeyRound />
                      {carregando ? "Redefinindo…" : "Redefinir Senha"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
