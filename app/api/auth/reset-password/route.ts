import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import sendEmail from "@/config/nodemailer";
import { messageResetPassword } from "@/lib/emailMessages";
import { supabaseAdmin } from "@/config/supabase/admin";

// Chave secreta para assinar os tokens de redefinição de senha
const SEGREDO_RESET =
  process.env.RESET_PASSWORD_SECRET ?? "psg-reset-fallback-secret";

// Nomes dos cookies usados ao longo do fluxo de recuperação
const COOKIE_TOKEN_RECUPERACAO = "psg_reset_token";
const COOKIE_TOKEN_VERIFICADO = "psg_reset_verified";

// Durações em milissegundos para os dois estágios do fluxo
const EXPIRACAO_CODIGO_MS = 15 * 60 * 1000; // 15 min para inserir o código
const EXPIRACAO_VERIFICADO_MS = 30 * 60 * 1000; // 30 min para criar a nova senha

// Usa o protocolo real da requisição para definir o flag Secure do cookie.
// Basear em NODE_ENV quebra acesso via HTTP em rede local (ex: npm run start + IP).
function cookieSeguro(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto === "https";
  return request.nextUrl.protocol === "https:";
}

// Assina um payload JSON com HMAC-SHA256 e retorna string base64url
function criarToken(payload: object): string {
  const dadosCodificados = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const assinatura = crypto
    .createHmac("sha256", SEGREDO_RESET)
    .update(dadosCodificados)
    .digest("base64url");
  return `${dadosCodificados}.${assinatura}`;
}

// Verifica a assinatura HMAC do token e retorna o payload ou null se inválido
function verificarToken<T>(token: string): T | null {
  const ultimoPonto = token.lastIndexOf(".");
  if (ultimoPonto === -1) return null;

  const dadosCodificados = token.slice(0, ultimoPonto);
  const assinaturaRecebida = token.slice(ultimoPonto + 1);
  const assinaturaEsperada = crypto
    .createHmac("sha256", SEGREDO_RESET)
    .update(dadosCodificados)
    .digest("base64url");

  // Comparação de tempo constante para evitar timing attacks
  const bufRecebida = Buffer.from(assinaturaRecebida);
  const bufEsperada = Buffer.from(assinaturaEsperada);
  if (bufRecebida.length !== bufEsperada.length) return null;
  if (!crypto.timingSafeEqual(bufRecebida, bufEsperada)) return null;

  try {
    return JSON.parse(
      Buffer.from(dadosCodificados, "base64url").toString(),
    ) as T;
  } catch {
    return null;
  }
}

// Verifica em qual etapa do fluxo o usuário se encontra com base nos cookies presentes
export async function GET() {
  const gerenciadorCookies = await cookies();

  const tokenVerificado = gerenciadorCookies.get(COOKIE_TOKEN_VERIFICADO)?.value;
  if (tokenVerificado) {
    const payload = verificarToken<{ email: string; exp: number }>(tokenVerificado);
    if (payload && payload.exp > Date.now()) {
      return NextResponse.json({ estado: "codigo_verificado" });
    }
  }

  const tokenRecuperacao = gerenciadorCookies.get(COOKIE_TOKEN_RECUPERACAO)?.value;
  if (tokenRecuperacao) {
    const payload = verificarToken<{ email: string; codigo: string; exp: number }>(tokenRecuperacao);
    if (payload && payload.exp > Date.now()) {
      return NextResponse.json({ estado: "aguardando_codigo" });
    }
  }

  return NextResponse.json({ estado: "expirado" });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  // Etapa 1 — solicitar envio do código de recuperação por email
  if (action === "request") {
    const { email } = body;

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email obrigatório" },
        { status: 400 },
      );
    }

    // Confirma que o email existe no sistema antes de gerar o código
    const { data: listaUsuarios } =
      await supabaseAdmin.auth.admin.listUsers();
    const usuarioExiste = listaUsuarios?.users?.some(
      (u) => u.email === email,
    );

    if (!usuarioExiste) {
      return NextResponse.json(
        { error: "Email não encontrado no sistema" },
        { status: 404 },
      );
    }

    // Gera código numérico aleatório de 6 dígitos
    const codigoGerado = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const tokenRecuperacao = criarToken({
      email,
      codigo: codigoGerado,
      exp: Date.now() + EXPIRACAO_CODIGO_MS,
    });

    // Armazena o token assinado em cookie httpOnly para validar na próxima etapa
    const gerenciadorCookies = await cookies();
    gerenciadorCookies.set(COOKIE_TOKEN_RECUPERACAO, tokenRecuperacao, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: EXPIRACAO_CODIGO_MS / 1000,
      secure: cookieSeguro(request),
    });

    // Envia o código para o email do usuário
    await sendEmail({
      email,
      subject: "Redefinição de senha — Paris Sem Gol",
      message: messageResetPassword({ userCode: codigoGerado }),
    });

    return NextResponse.json({ success: true });
  }

  // Etapa 2 — validar o código recebido por email
  if (action === "verify") {
    const { code } = body;
    const gerenciadorCookies = await cookies();
    const valorToken = gerenciadorCookies.get(COOKIE_TOKEN_RECUPERACAO)?.value;

    if (!valorToken) {
      return NextResponse.json(
        { error: "Solicitação inválida ou expirada. Solicite um novo código." },
        { status: 400 },
      );
    }

    const payload = verificarToken<{
      email: string;
      codigo: string;
      exp: number;
    }>(valorToken);

    // Rejeita se a assinatura for inválida, o código não bater ou o token tiver expirado
    if (!payload || payload.exp < Date.now() || payload.codigo !== code) {
      return NextResponse.json(
        { error: "Código inválido ou expirado. Solicite um novo código." },
        { status: 400 },
      );
    }

    // Cria token de sessão verificada que autoriza redefinir a senha
    const tokenVerificado = criarToken({
      email: payload.email,
      exp: Date.now() + EXPIRACAO_VERIFICADO_MS,
    });

    gerenciadorCookies.set(COOKIE_TOKEN_VERIFICADO, tokenVerificado, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: EXPIRACAO_VERIFICADO_MS / 1000,
      secure: cookieSeguro(request),
    });

    // Remove o cookie do código após validação bem-sucedida
    gerenciadorCookies.delete(COOKIE_TOKEN_RECUPERACAO);

    return NextResponse.json({ success: true });
  }

  // Etapa 3 — redefinir a senha usando a sessão verificada
  if (action === "reset") {
    const { password, confirmPassword } = body;
    const gerenciadorCookies = await cookies();
    const valorTokenVerificado = gerenciadorCookies.get(
      COOKIE_TOKEN_VERIFICADO,
    )?.value;

    if (!valorTokenVerificado) {
      return NextResponse.json(
        { error: "Sessão expirada. Solicite a recuperação novamente." },
        { status: 400 },
      );
    }

    const payload = verificarToken<{ email: string; exp: number }>(
      valorTokenVerificado,
    );

    if (!payload || payload.exp < Date.now()) {
      return NextResponse.json(
        { error: "Sessão expirada. Solicite a recuperação novamente." },
        { status: 400 },
      );
    }

    if (!password || password !== confirmPassword) {
      return NextResponse.json(
        { error: "As senhas não conferem" },
        { status: 400 },
      );
    }

    // Busca o usuário pelo email para obter o ID necessário para atualizar via admin
    const { data: listaUsuarios } =
      await supabaseAdmin.auth.admin.listUsers();
    const usuario = listaUsuarios?.users?.find(
      (u) => u.email === payload.email,
    );

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Atualiza a senha diretamente via Supabase Admin sem exigir sessão ativa
    const { error: erroAtualizacao } =
      await supabaseAdmin.auth.admin.updateUserById(usuario.id, { password });

    if (erroAtualizacao) {
      console.error(
        "[reset-password] Erro ao atualizar senha:",
        erroAtualizacao,
      );
      return NextResponse.json(
        { error: "Erro ao redefinir a senha. Tente novamente." },
        { status: 500 },
      );
    }

    // Remove o cookie de sessão verificada após a redefinição concluída
    gerenciadorCookies.delete(COOKIE_TOKEN_VERIFICADO);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
