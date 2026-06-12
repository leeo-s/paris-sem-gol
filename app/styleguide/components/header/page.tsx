import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-heading text-2xl tracking-widest uppercase text-foreground mb-6 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 rounded-lg bg-muted p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  )
}

const MOCK_USER = { name: "Diego Andrade", initials: "DA", playerNumber: 9 }
const MOCK_DATE = "Junho 2026"

const PAGE_EXAMPLES = ["Dashboard", "Partidas", "Jogadores", "Classificação", "Torneios"]

function DesktopHeaderPreview({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex h-16 items-center justify-between border-b border-border px-6 bg-card">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="size-7 rounded flex items-center justify-center gap-0.5 flex-col">
            <div className="h-px w-4 bg-foreground/30 rounded" />
            <div className="h-px w-4 bg-foreground/30 rounded" />
            <div className="h-px w-4 bg-foreground/30 rounded" />
          </div>
          <h1 className="font-heading text-2xl tracking-wide text-foreground">
            {title.toUpperCase()}
          </h1>
        </div>
        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-foreground">{MOCK_USER.name}</span>
            <span className="text-xs text-muted-foreground">Jogador #{MOCK_USER.playerNumber}</span>
          </div>
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary text-primary-foreground font-heading text-sm">
              {MOCK_USER.initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="h-20 bg-background flex items-center justify-center text-sm text-muted-foreground">
        Conteúdo da página
      </div>
    </div>
  )
}

function MobileHeaderPreview({ title }: { title: string }) {
  return (
    <div className="max-w-sm mx-auto rounded-xl border border-border overflow-hidden">
      <div className="flex h-14 items-center justify-between border-b border-border px-4 bg-card">
        <div className="flex flex-col leading-none">
          <h1 className="font-heading text-xl tracking-wide text-foreground">
            {title.toUpperCase()}
          </h1>
          <span className="text-xs text-muted-foreground mt-0.5">{MOCK_DATE}</span>
        </div>
        <Avatar className="size-9 after:hidden">
          <AvatarImage src="/logo.png" alt="Paris Sem Gol" />
          <AvatarFallback className="bg-sidebar text-sidebar-foreground font-heading text-xs">
            PSG
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="h-20 bg-background flex items-center justify-center text-sm text-muted-foreground">
        Conteúdo da página
      </div>
    </div>
  )
}

export default function HeaderShowcasePage() {
  return (
    <div className="px-10 py-10 max-w-5xl">
      <div className="mb-12">
        <h1 className="font-heading text-5xl tracking-widest uppercase text-foreground">
          App Header
        </h1>
        <p className="text-muted-foreground mt-1">
          Desktop com info do usuário · Mobile com data e logo · Paris Sem Gol Design System
        </p>
      </div>

      <Section title="Desktop Header">
        <p className="text-sm text-muted-foreground mb-4">
          Mostra o título da página à esquerda (com sidebar trigger) e o nome, número e avatar
          do usuário logado à direita. O título é derivado automaticamente do pathname.
        </p>
        <div className="space-y-4">
          {PAGE_EXAMPLES.map((title) => (
            <div key={title}>
              <p className="text-xs text-muted-foreground mb-1.5 font-mono">{title}</p>
              <DesktopHeaderPreview title={title} />
            </div>
          ))}
        </div>
        <Code>{`import { AppHeader } from "@/components/AppHeader"

// Dentro do SidebarInset no layout:
<SidebarInset className="flex flex-col min-h-svh">
  <AppHeader />
  <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
    {children}
  </main>
</SidebarInset>

// AppHeader lê o pathname automaticamente e busca o usuário via supabase.auth.getSession()
// Espera user_metadata.full_name e opcionalmente user_metadata.player_number`}
        </Code>
      </Section>

      <Section title="Mobile Header">
        <p className="text-sm text-muted-foreground mb-4">
          Mostra o título e o mês/ano atual à esquerda, e o logo do PSG à direita.
          O sidebar trigger fica oculto — a navegação mobile é feita pelo BottomNav.
        </p>
        <MobileHeaderPreview title="Dashboard" />
        <Code>{`// O AppHeader é responsivo — nenhum componente extra necessário.
// Abaixo de md:, exibe o layout mobile automaticamente.`}
        </Code>
      </Section>

      <Section title="Props & API">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Componente</th>
                <th className="px-4 py-2 text-left font-semibold">Props</th>
                <th className="px-4 py-2 text-left font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 font-mono text-xs">AppHeader</td>
                <td className="px-4 py-2 font-mono text-xs">—</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  Sem props. Usa <code className="font-mono">usePathname()</code> para o título
                  e <code className="font-mono">supabase.auth.getSession()</code> para nome e
                  número do jogador via <code className="font-mono">user_metadata</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Acessibilidade">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>
            O título usa tag semântica <code className="font-mono text-xs">h1</code> — um por página.
          </li>
          <li>
            O SidebarTrigger mantém <code className="font-mono text-xs">aria-label</code> via shadcn.
          </li>
          <li>
            O avatar do usuário exibe iniciais como fallback acessível quando não há foto.
          </li>
        </ul>
      </Section>
    </div>
  )
}
