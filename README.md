# ⚽ Paris Sem Gol — Sistema de Gerenciamento de Time

> Sistema web interno para gestão do time de futebol amador **Paris Sem Gol**, centralizando elenco, financeiro, partidas, campeonatos, votação de MVP e o portal de transparência do clube.

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Perfis de Acesso](#perfis-de-acesso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Rodando o Projeto](#rodando-o-projeto)
- [API — Endpoints](#api--endpoints)
- [Modelos de Dados](#modelos-de-dados)
- [Regras de Negócio](#regras-de-negócio)

---

## Sobre o Projeto

O **Paris Sem Gol** é um time de futebol amador que se reúne toda semana (sábados). O sistema foi criado para organizar e centralizar todas as operações do clube em um único lugar, acessível via web no celular ou desktop — sem necessidade de instalação.

O clube opera com dois tipos de jogadores:

- **Mensalistas** — até 20 vagas por mês, com taxa fixa mensal.
- **Avulsos** — pagamento por partida, sem conta no sistema.

---

## Funcionalidades

- **Elenco** — cadastro de jogadores membros e avulsos, rating de habilidades (velocidade, finalização, passe, drible, defesa), upload de foto via Cloudinary e gestão de mensalistas do mês.
- **Partidas** — agendamento, controle de presença, sorteio de times equilibrado por rating (snake draft), registro de gols e rounds.
- **Votação MVP** — votação automática ao concluir cada partida; resultado revelado somente após o fechamento da sessão.
- **Financeiro** — mensalidades, transações de entrada/saída, venda de camisas e portal de transparência com evolução mensal do caixa.
- **Dashboard** — artilheiros do mês e da temporada, goleiros menos vazados, mais presentes, MVP consolidado, próxima partida e aniversariantes.
- **Premiações Mensais** — consolidação automática (ou manual) de MVP, artilheiro, melhor goleiro e mais presente do mês.
- **Ranking** — página de destaques com artilheiros, MVP, goleiros e presença, filtrável por mês ou temporada completa.
- **Campeonatos** — mini-campeonatos com formato de pontos corridos ou mata-mata, com tabela de classificação automática.
- **Eventos** — churrascos e confraternizações com controle de presença e pagamento.
- **Configurações do Clube** — mensalidade, taxa avulso, preço do churrasco e camisa, e logo do clube (editável apenas pelo Admin).
- **Recuperação de Senha** — fluxo completo por e-mail: solicitar redefinição, criar senha e redefinir senha via link.

---

## Stack Tecnológica

| Camada                   | Tecnologia                            |
| ------------------------ | ------------------------------------- |
| Frontend + Backend       | Next.js 16+ (App Router + API Routes) |
| Banco de dados           | Supabase (PostgreSQL)                 |
| ORM                      | Prisma 7 com `@prisma/adapter-pg`     |
| Autenticação             | Supabase Auth (JWT)                   |
| Armazenamento de imagens | Cloudinary                            |
| E-mail transacional      | Nodemailer                            |
| Deploy                   | Vercel                                |

---

## Perfis de Acesso

| Perfil       | Permissões                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Admin**    | Acesso total. Gerencia elenco, financeiro, partidas, campeonatos e configurações globais. Pode desativar contas. |
| **Co-admin** | Mesmo acesso do Admin, exceto configurações globais e desativação de contas.                                     |
| **Jogador**  | Leitura geral. Edita o próprio perfil, confirma presença e vota no MVP. Vê apenas as próprias mensalidades.      |

---

## Estrutura do Projeto

```
/
├── app/
│   ├── api/                  # API Routes (um módulo por pasta)
│   │   ├── _lib/
│   │   │   ├── auth.ts       # Helpers de autenticação e permissão
│   │   │   └── prisma-errors.ts  # Tratamento centralizado de erros do Prisma
│   │   ├── users/
│   │   ├── matches/
│   │   ├── mvp-voting/
│   │   ├── financial/
│   │   ├── dashboard/
│   │   ├── monthly-awards/
│   │   ├── highlights/       # Ranking de destaques mensal e da temporada
│   │   ├── tournaments/
│   │   ├── club-events/
│   │   ├── guest-players/
│   │   ├── monthly-roster/
│   │   ├── club-settings/
│   │   ├── auth/             # Recuperação e definição de senha
│   │   ├── upload/
│   │   └── upload-logo/      # Upload do logo do clube (Admin)
│   └── (pages)/              # Telas da aplicação
│       ├── rank/             # Página de ranking e destaques
│       ├── esqueci-senha/
│       ├── redefinir-senha/
│       └── criar-senha/
├── components/
│   ├── ui/                   # Componentes genéricos (shadcn/ui)
│   └── shared/               # Componentes reutilizáveis
├── config/
│   ├── prisma.ts             # Instância do Prisma com driver adapter
│   ├── cloudinary.ts         # Instância do Cloudinary
│   ├── nodemailer.ts         # Instância do Nodemailer
│   └── supabase/
│       ├── server.ts
│       ├── client.ts
│       └── admin.ts          # Client com service role (server-only)
├── lib/
│   ├── utils.ts
│   ├── get-session-user.ts
│   └── emailMessages.ts      # Templates de e-mail
├── hooks/                    # Custom hooks React
├── types/
│   └── index.ts              # Interfaces TypeScript do domínio
├── generated/
│   └── prisma/               # Client gerado pelo `prisma generate`
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## Pré-requisitos

- **Node.js** 18+
- **npm** ou **yarn**
- Conta no **Supabase** (projeto criado com banco PostgreSQL)
- Conta no **Cloudinary**
- Conta na **Vercel** (para deploy)

---

## Instalação e Configuração

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/paris-sem-gol.git
cd paris-sem-gol

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite o .env.local com suas credenciais (veja a seção abaixo)

# 4. Gere o client do Prisma
npx prisma generate

# 5. Aplique as migrations no banco
npx prisma migrate deploy
```

### Configuração do Prisma 7

O Prisma 7 utiliza driver adapters. Certifique-se de que o `schema.prisma` contém:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
  output          = "../generated/prisma"
}
```

E o `config/prisma.ts` instancia o client com:

```typescript
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

Dependências necessárias: `@prisma/adapter-pg` e `pg`.

---

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Banco de dados — Supabase PostgreSQL
DATABASE_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key

# ⚠️ Nunca use prefixo NEXT_PUBLIC_ nesta variável
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret

# Nodemailer (e-mail de recuperação de senha)
EMAIL_HOST=smtp.seu-provedor.com
EMAIL_PORT=587
EMAIL_USER=seu-email@dominio.com
EMAIL_PASS=sua-senha-smtp
```

> **Atenção:** `SUPABASE_SERVICE_ROLE_KEY` nunca deve ter o prefixo `NEXT_PUBLIC_`, pois isso a exporia ao cliente.

---

## Rodando o Projeto

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build
npm start
```

A aplicação estará disponível em `http://localhost:3000`.

---

## API — Endpoints

Todas as rotas estão em `/app/api/` e requerem autenticação via Supabase Auth (JWT). Erros do Prisma são tratados centralmente em `_lib/prisma-errors.ts`.

### Usuários

| Método | Endpoint                 | Descrição                                                                        | Permissão        |
| ------ | ------------------------ | -------------------------------------------------------------------------------- | ---------------- |
| GET    | `/api/users`             | Lista jogadores. Filtros: `role`, `position`, `is_goalkeeper`, `includeInactive` | Todos            |
| POST   | `/api/users`             | Cria jogador + rating padrão em transação                                        | Admin / Co-admin |
| GET    | `/api/users/:id`         | Perfil completo com ratings                                                      | Todos            |
| PATCH  | `/api/users/:id`         | Atualiza perfil (jogador edita o próprio; admin edita `role` e `is_active`)      | Variável         |
| DELETE | `/api/users/:id`         | Soft delete (`is_active = false`)                                                | Admin            |
| GET    | `/api/users/:id/ratings` | Rating detalhado do jogador                                                      | Todos            |
| PATCH  | `/api/users/:id/ratings` | Atualiza atributos de rating                                                     | Admin / Co-admin |

### Partidas

| Método | Endpoint                          | Descrição                                                                 |
| ------ | --------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/matches`                    | Lista partidas. Filtros: `status`, `month`, `year`                        |
| POST   | `/api/matches`                    | Cria partida                                                              |
| GET    | `/api/matches/:id`                | Detalhes: times, jogadores, gols, rounds, sessão MVP                      |
| PATCH  | `/api/matches/:id`                | Atualiza status/local/data. Ao concluir, cria sessão MVP                  |
| DELETE | `/api/matches/:id`                | Remove partida (cascade)                                                  |
| POST   | `/api/matches/:id/players`        | Adiciona presença (membro ou avulso)                                      |
| DELETE | `/api/matches/:id/players`        | Remove presença                                                           |
| POST   | `/api/matches/:id/goals`          | Registra gol                                                              |
| DELETE | `/api/matches/:id/goals`          | Remove gol                                                                |
| POST   | `/api/matches/:id/goals-conceded` | Registra gols sofridos por goleiro                                        |
| POST   | `/api/matches/:id/rounds`         | Cria round com times e resultado                                          |
| POST   | `/api/matches/:id/draw`           | Executa sorteio snake draft. Parâmetros: `team_count` (2–4), `team_names` |

### Votação MVP

| Método | Endpoint                        | Descrição                                                                      |
| ------ | ------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/mvp-voting/:matchId`      | Sessão, status e se o jogador já votou. Resultados visíveis só após fechamento |
| POST   | `/api/mvp-voting/:matchId/vote` | Registra voto. Fecha sessão automaticamente se todos votarem                   |

### Financeiro

| Método | Endpoint                          | Descrição                                                      |
| ------ | --------------------------------- | -------------------------------------------------------------- |
| GET    | `/api/financial/monthly-fees`     | Lista mensalidades (jogador vê só as próprias)                 |
| POST   | `/api/financial/monthly-fees`     | Gera cobrança (bloqueia goleiro com 422)                       |
| PATCH  | `/api/financial/monthly-fees/:id` | Atualiza status e `paid_at`                                    |
| GET    | `/api/financial/transactions`     | Lista transações                                               |
| POST   | `/api/financial/transactions`     | Registra transação (entrada ou saída)                          |
| GET    | `/api/financial/jersey-sales`     | Lista vendas de camisa                                         |
| POST   | `/api/financial/jersey-sales`     | Cria venda de camisa                                           |
| PATCH  | `/api/financial/jersey-sales/:id` | Atualiza status de pagamento e entrega                         |
| GET    | `/api/financial/summary`          | Resumo anual para o portal de transparência. Parâmetro: `year` |

### Dashboard e Premiações

| Método | Endpoint              | Descrição                                                                      |
| ------ | --------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/dashboard`      | Artilheiros, goleiros, presenças, MVP, próxima partida, aniversariantes, caixa |
| GET    | `/api/monthly-awards` | Premiações consolidadas do mês                                                 |
| POST   | `/api/monthly-awards` | Consolida premiações (automático + sobrescrita manual). Upsert por mês/ano     |

### Autenticação

| Método | Endpoint                    | Descrição                                                           |
| ------ | --------------------------- | ------------------------------------------------------------------- |
| POST   | `/api/auth/reset-password`  | Envia e-mail com link de redefinição de senha                       |
| POST   | `/api/auth/set-password`    | Define a senha inicial de um novo jogador via link                  |

### Ranking e Destaques

| Método | Endpoint                              | Descrição                                                  |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/highlights/monthly`             | Destaques do mês (MVP, artilheiros, presença)              |
| GET    | `/api/highlights/monthly/mvp`         | Ranking de MVP do mês com paginação                        |
| GET    | `/api/highlights/monthly/scorers`     | Ranking de artilheiros do mês com paginação                |
| GET    | `/api/highlights/monthly/presence`    | Ranking de presença do mês com paginação                   |
| GET    | `/api/highlights/season`              | Destaques da temporada (MVP, artilheiros, presença)        |
| GET    | `/api/highlights/season/scorers`      | Ranking de artilheiros da temporada com paginação          |
| GET    | `/api/highlights/season/presence`     | Ranking de presença da temporada com paginação             |

### Outros Módulos

| Método                | Endpoint                                    | Descrição                                              |
| --------------------- | ------------------------------------------- | ------------------------------------------------------ |
| GET/POST              | `/api/guest-players`                        | Lista e cria jogadores avulsos                         |
| GET/PATCH             | `/api/guest-players/:id`                    | Perfil e atualização do avulso                         |
| GET/POST              | `/api/monthly-roster`                       | Mensalistas do mês (bloqueia 21º com 422)              |
| GET/POST/PATCH/DELETE | `/api/tournaments` e `/api/tournaments/:id` | CRUD de campeonatos                                    |
| GET/POST/PATCH        | `/api/club-events` e `/api/club-events/:id` | CRUD de eventos/churrascos                             |
| POST                  | `/api/club-events/:id/attendees`            | Adiciona presente no evento                            |
| GET                   | `/api/club-settings`                        | Configurações globais do clube                         |
| PATCH                 | `/api/club-settings`                        | Atualiza configurações (Admin apenas)                  |
| POST                  | `/api/upload`                               | Upload de foto para Cloudinary (JPG/PNG/WebP, máx 5MB) |
| POST                  | `/api/upload-logo`                          | Substitui o logo do clube — salvo em `public/logo.png` (Admin) |

---

## Modelos de Dados

| Tabela                   | Descrição                                                                        |
| ------------------------ | -------------------------------------------------------------------------------- |
| `users`                  | Jogadores membros com perfil, posição, role e status                             |
| `guest_players`          | Jogadores avulsos (sem login)                                                    |
| `player_ratings`         | Rating 1:1 com `users`: velocidade, finalização, passe, drible, defesa e overall |
| `monthly_roster`         | Mensalistas selecionados por mês/ano (único por user + mês + ano)                |
| `matches`                | Partidas com data, local, status e vínculo opcional com torneio                  |
| `match_players`          | Presença em partidas (membro ou avulso)                                          |
| `match_teams`            | Times sorteados por partida                                                      |
| `match_rounds`           | Rounds: times da casa, visitante e vencedor                                      |
| `goals`                  | Gols por partida (membro ou avulso)                                              |
| `goals_conceded`         | Gols sofridos por goleiro                                                        |
| `mvp_voting_sessions`    | Sessão MVP por partida com prazo de 24h                                          |
| `mvp_votes`              | Votos (único por partida + eleitor)                                              |
| `monthly_fees`           | Mensalidades com status e data de pagamento                                      |
| `financial_transactions` | Transações financeiras categorizadas                                             |
| `jersey_sales`           | Vendas de camisa com status de pagamento e entrega                               |
| `monthly_awards`         | Premiações mensais consolidadas                                                  |
| `tournaments`            | Campeonatos (pontos corridos ou mata-mata)                                       |
| `tournament_teams`       | Times do campeonato com pontuação e saldo de gols                                |
| `club_events`            | Eventos especiais (churrascos, confraternizações)                                |
| `event_attendees`        | Presença em eventos com valor e status de pagamento                              |
| `club_settings`          | Configurações globais do clube (único registro)                                  |

---

## Regras de Negócio

### Elenco

- Limite de **20 mensalistas ativos** por mês. A 21ª inclusão retorna erro `422`.
- **Goleiro fixo** (`is_goalkeeper = true`) é isento de mensalidade e taxa avulso — o sistema bloqueia cobranças e exibe o badge _Isento_.
- Desativação de jogador é sempre **soft delete** (`is_active = false`); o histórico de partidas, gols e financeiro é preservado.
- Ao criar um novo jogador, o sistema gera automaticamente o registro de rating com todos os atributos em **5** (padrão).

### Financeiro

- O valor da mensalidade é lido dinamicamente das configurações do clube; alterações valem apenas para novas cobranças.
- Status de mensalidade: `pending`, `paid`, `late`, `cancelled`. A marcação como `late` é manual pelo Admin.
- Apenas o Admin pode alterar configurações globais.

### Partidas e Sorteio

- O sorteio usa **snake draft por overall rating**. Goleiros são separados dos jogadores de linha e distribuídos um por time. Suporta de 2 a 4 times (padrão: 4).
- Ao concluir uma partida (`status → completed`), o sistema cria automaticamente uma **sessão de votação MVP** com prazo de 24h.
- Não é possível adicionar ou remover presença em partidas com status `completed` ou `cancelled`.

### Votação MVP

- Apenas jogadores membros presentes podem votar; avulsos não votam.
- Cada jogador vota **uma única vez** por partida. Voto duplo retorna erro `409`.
- Jogador não pode votar em si mesmo (validação no frontend).
- A sessão fecha automaticamente quando todos os elegíveis votarem **ou** após 24h.
- Resultados ficam **ocultos** até o fechamento da sessão.
- Em caso de empate, ambos os jogadores são exibidos com a mesma posição.

---

## Requisitos Não Funcionais

| Aspecto             | Detalhe                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Usabilidade**     | Interface mobile-first. Bottom navigation no mobile, sidebar no desktop.                                                                 |
| **Performance**     | Carregamento em até 2s em 4G. Dashboard usa `Promise.all` para requisições paralelas.                                                    |
| **Segurança**       | JWT via Supabase Auth. Rotas protegidas por middleware Next.js. RLS habilitado no Supabase. `service_role_key` nunca exposta ao cliente. |
| **Confiabilidade**  | Transações Prisma garantem atomicidade em operações críticas (criar jogador + rating, concluir partida + abrir votação MVP).             |
| **Escalabilidade**  | Suporta até 40 usuários e 3+ anos de histórico sem degradação. Índices otimizados para queries frequentes.                               |
| **Disponibilidade** | Vercel + Supabase com uptime mínimo de 99%.                                                                                              |
| **Acessibilidade**  | Suporte a tema claro e escuro. Fonte mínima 14px. Contraste adequado. Labels em todos os campos.                                         |
| **Imagens**         | Armazenadas no Cloudinary. Máx 5MB. Redimensionadas para 400×400px com crop face. Formato automático (WebP quando suportado).            |

---

_Paris Sem Gol · Sistema de Gerenciamento de Time · v3.0 · Uso interno do clube_
