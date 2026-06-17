import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { supabaseAdmin } from "@/config/supabase/admin";
import sendEmail from "@/config/nodemailer";
import { messageCreateAccount } from "@/lib/emailMessages";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from "../_lib/auth";
import { tratarErroPrisma } from "../_lib/prisma-errors";

// GET /api/users — lista jogadores com filtros, busca e paginação
// Aceita ?all=true para retornar todos os usuários ativos sem paginação (usado em selects do sistema)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;

    // Modo simplificado: retorna todos os usuários ativos como {id, name, nickname} sem paginação
    if (searchParams.get("all") === "true") {
      const todosUsuarios = await prisma.users.findMany({
        where: { is_active: true },
        select: { id: true, name: true, nickname: true },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(todosUsuarios);
    }

    const filtroRole = searchParams.get("role") ?? undefined;
    const filtroPosition = searchParams.get("position") ?? undefined;
    const filtroGoalkeeper = searchParams.get("is_goalkeeper");
    const incluirInativos = searchParams.get("includeInactive") === "true";
    const filtroEspecial = searchParams.get("filter") ?? undefined;
    const busca = searchParams.get("search") ?? undefined;
    const pagina = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const tamanhoPagina = 10;

    const perfilSolicitante = await buscarPerfilUsuario(user.id);
    const deveIncluirInativos =
      ehAdminOuCoAdmin(perfilSolicitante?.role) && incluirInativos;

    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth() + 1;
    const anoAtual = dataAtual.getFullYear();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      is_active: deveIncluirInativos ? undefined : true,
      ...(filtroRole && {
        role: filtroRole as "admin" | "co_admin" | "player",
      }),
      ...(filtroPosition && { position: filtroPosition }),
      ...(filtroGoalkeeper !== null &&
        filtroGoalkeeper !== undefined && {
          is_goalkeeper: filtroGoalkeeper === "true",
        }),
      ...(busca && {
        OR: [
          { name: { contains: busca, mode: "insensitive" } },
          { nickname: { contains: busca, mode: "insensitive" } },
        ],
      }),
      ...(filtroEspecial === "inadimplente" && {
        // Mesma lógica do BadgeMensalidade: não-goleiro, ativo no elenco e sem mensalidade paga
        is_goalkeeper: false,
        monthly_roster: {
          some: { month: mesAtual, year: anoAtual, status: "active" },
        },
        NOT: {
          monthly_fees: {
            some: { month: mesAtual, year: anoAtual, status: "paid" },
          },
        },
      }),
    };

    const [jogadores, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          role: true,
          photo_url: true,
          birth_date: true,
          phone: true,
          position: true,
          is_goalkeeper: true,
          is_active: true,
          invited_at: true,
          first_login_at: true,
          created_at: true,
          // Avaliação geral do jogador
          player_ratings: { select: { overall: true } },
          // Situação da mensalidade no mês corrente
          monthly_fees: {
            where: { month: mesAtual, year: anoAtual },
            select: { status: true },
            take: 1,
            orderBy: { created_at: "desc" },
          },
          // Presença no elenco do mês atual para derivar o status de ativo
          monthly_roster: {
            where: { month: mesAtual, year: anoAtual },
            select: { status: true },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      prisma.users.count({ where }),
    ]);

    // Substitui is_active pelo status computado: ativo permanente OU no elenco do mês com status active
    const jogadoresMapeados = jogadores.map(
      ({
        monthly_roster: rosterMesAtual,
        is_active: isAtivoPermanente,
        ...dadosJogador
      }) => ({
        ...dadosJogador,
        is_active: isAtivoPermanente || rosterMesAtual[0]?.status === "active",
      }),
    );

    return NextResponse.json({
      data: jogadores,
      total,
      page: pagina,
      pageSize: tamanhoPagina,
    });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST /api/users — cria jogador no Supabase Auth, na tabela users e insere o rating inicial
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verifica se o solicitante tem permissão de admin ou co-admin
    const perfilSolicitante = await buscarPerfilUsuario(user.id);
    if (!perfilSolicitante || !ehAdminOuCoAdmin(perfilSolicitante.role)) {
      return NextResponse.json(
        { error: "Sem permissão para realizar esta ação" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name,
      nickname,
      email,
      role,
      birth_date,
      phone,
      position,
      is_goalkeeper,
      ratings, // rating inicial escolhido pelo admin no momento da criação
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nome e email são obrigatórios" },
        { status: 400 },
      );
    }

    const [shooting, passing, dribbling, defending, physical, speed, overall] =
      ratings;

    // Verifica se o email já existe no Supabase Auth para evitar duplicatas
    const { data: listaUsuarios } = await supabaseAdmin.auth.admin.listUsers();
    const emailJaExiste = listaUsuarios?.users?.some((u) => u.email === email);
    if (emailJaExiste) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 409 },
      );
    }

    // Cria o usuário imediatamente no Supabase Auth com senha temporária aleatória.
    // Usamos createUser em vez de inviteUserByEmail porque precisamos do UUID
    // gerado agora para usá-lo como chave primária na tabela users.
    // A senha temporária é descartável — o usuário vai redefinir via email.
    const senhaTemporariaAleatoria = "psg@123";
    const { data: usuarioCriadoNoAuth, error: erroAoCriarNoAuth } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senhaTemporariaAleatoria,
        email_confirm: true, // marca o email como confirmado para não bloquear o login após redefinir
        user_metadata: { name },
      });

    if (erroAoCriarNoAuth || !usuarioCriadoNoAuth?.user) {
      console.error(
        "[POST /api/users] Erro ao criar usuário no Supabase Auth:",
        erroAoCriarNoAuth,
      );
      return NextResponse.json(
        { error: "Erro ao criar usuário na autenticação" },
        { status: 500 },
      );
    }

    const idDoNovoUsuario = usuarioCriadoNoAuth.user.id;

    // Cria o jogador na tabela users e o rating inicial dentro de uma transação.
    // Se qualquer etapa falhar, o Prisma desfaz tudo — mas o usuário já foi criado
    // no Auth acima, então em caso de falha aqui precisamos removê-lo manualmente.
    let novoJogador;
    try {
      novoJogador = await prisma.$transaction(async (tx) => {
        const jogadorCriado = await tx.users.create({
          data: {
            id: idDoNovoUsuario, // mesmo UUID do Supabase Auth para manter consistência
            name,
            nickname: nickname ?? null,
            email,
            password_hash: "supabase_auth", // campo legado — autenticação é gerenciada pelo Supabase Auth
            role: role ?? "player",
            birth_date: birth_date ? new Date(birth_date) : null,
            phone: phone ?? null,
            position: position ?? null,
            is_goalkeeper: is_goalkeeper ?? false,
            invited_at: new Date(),
          },
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            role: true,
            position: true,
            is_goalkeeper: true,
            is_active: true,
            invited_at: true,
            created_at: true,
          },
        });

        // Insere o rating com o valor escolhido pelo admin, ou 5 como fallback
        await tx.player_ratings.create({
          data: {
            user_id: jogadorCriado.id,
            dribbling: dribbling ?? 5,
            defense: defending ?? 5,
            physical: physical ?? 5,
            speed: speed ?? 5,
            finishing: shooting ?? 5,
            passing: passing ?? 5,
          },
        });

        return jogadorCriado;
      });
    } catch (erroDoBanco) {
      // Se a criação no banco falhar, remove o usuário do Supabase Auth
      // para evitar que fique um usuário "fantasma" sem registro na tabela users
      await supabaseAdmin.auth.admin.deleteUser(idDoNovoUsuario);
      throw erroDoBanco;
    }

    // Envia email para o usuário definir sua própria senha
    // const { data: convite, error: erroAoEnviarEmail } =
    //   await supabaseAdmin.auth.resetPasswordForEmail(email, {
    //     redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/criar-senha`,
    //   });

    const emailMessage = messageCreateAccount({
      username: novoJogador.nickname ? novoJogador.nickname : novoJogador.name,
      userPassword: senhaTemporariaAleatoria,
    });

    try {
      const { response } = await sendEmail({
        email: novoJogador.email,
        subject: "Conta Criada",
        message: emailMessage,
      });
    } catch (err) {
      console.warn("Erro ao enviar o email de cadastro: ", err);
    }

    // if (erroAoEnviarEmail) {
    //   // Não bloqueia a resposta — o usuário foi criado com sucesso.
    //   // O admin pode reenviar o email manualmente depois se necessário.
    //   console.warn(
    //     "[POST /api/users] Usuário criado, mas falha ao enviar email de redefinição de senha:",
    //     erroAoEnviarEmail,
    //   );
    // }

    return NextResponse.json(
      { ...novoJogador, mensagem: `Convite enviado para ${email}` },
      { status: 201 },
    );
  } catch (error) {
    const respostaPrisma = tratarErroPrisma(error);
    if (respostaPrisma) return respostaPrisma;

    console.error("[POST /api/users]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
