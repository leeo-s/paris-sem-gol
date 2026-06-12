"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/* ── helpers ── */

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

/* ── mock data ── */

const players = [
  { name: "Gianluigi Donnarumma", position: "GK", matches: 28, goals: 0, assists: 0, yellowCards: 1 },
  { name: "Marquinhos", position: "CB", matches: 30, goals: 3, assists: 2, yellowCards: 4 },
  { name: "Achraf Hakimi", position: "RB", matches: 32, goals: 4, assists: 9, yellowCards: 5 },
  { name: "Nuno Mendes", position: "LB", matches: 26, goals: 1, assists: 5, yellowCards: 3 },
  { name: "Vitinha", position: "CM", matches: 34, goals: 6, assists: 7, yellowCards: 6 },
  { name: "João Neves", position: "CM", matches: 31, goals: 2, assists: 4, yellowCards: 7 },
  { name: "Ousmane Dembélé", position: "RW", matches: 33, goals: 14, assists: 10, yellowCards: 2 },
  { name: "Kylian Mbappé", position: "ST", matches: 29, goals: 27, assists: 8, yellowCards: 1 },
]

const topScorers = players.slice(0, 4)

/* ── page ── */

export default function TableShowcasePage() {
  const [darkMode, setDarkMode] = useState(false)

  function toggleDark() {
    setDarkMode((v) => !v)
    document.documentElement.classList.toggle("dark")
  }

  const totalGoals = players.reduce((sum, p) => sum + p.goals, 0)
  const totalAssists = players.reduce((sum, p) => sum + p.assists, 0)

  return (
    <div className="px-10 py-10 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="font-heading text-5xl tracking-widest uppercase text-foreground">
            Table
          </h1>
          <p className="text-muted-foreground mt-1">
            Table · Paris Sem Gol Design System
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleDark} className="mt-1">
          {darkMode ? "☀ Light" : "☾ Dark"}
        </Button>
      </div>

      {/* ── Basic Table ── */}
      <Section title="Basic Table">
        <p className="text-sm text-muted-foreground mb-4">
          Standard table with header, body, and caption. Rows have hover state via <code className="font-mono text-xs">hover:bg-muted/50</code>.
        </p>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableCaption>Estatísticas da temporada 2024/25</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead className="text-right">Partidas</TableHead>
                <TableHead className="text-right">Gols</TableHead>
                <TableHead className="text-right">Assistências</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topScorers.map((player) => (
                <TableRow key={player.name}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-muted-foreground">{player.position}</TableCell>
                  <TableCell className="text-right">{player.matches}</TableCell>
                  <TableCell className="text-right">{player.goals}</TableCell>
                  <TableCell className="text-right">{player.assists}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Code>{`import {
  Table, TableBody, TableCaption, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

<Table>
  <TableCaption>Estatísticas da temporada 2024/25</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Jogador</TableHead>
      <TableHead className="text-right">Gols</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {players.map((player) => (
      <TableRow key={player.name}>
        <TableCell className="font-medium">{player.name}</TableCell>
        <TableCell className="text-right">{player.goals}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>`}
        </Code>
      </Section>

      {/* ── With Footer ── */}
      <Section title="With Footer">
        <p className="text-sm text-muted-foreground mb-4">
          Use <code className="font-mono text-xs">TableFooter</code> for totals or summaries. Renders with <code className="font-mono text-xs">bg-muted/50</code> by default.
        </p>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead className="text-right">Gols</TableHead>
                <TableHead className="text-right">Assistências</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.name}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="text-muted-foreground">{player.position}</TableCell>
                  <TableCell className="text-right">{player.goals}</TableCell>
                  <TableCell className="text-right">{player.assists}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">{totalGoals}</TableCell>
                <TableCell className="text-right">{totalAssists}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <Code>{`<TableFooter>
  <TableRow>
    <TableCell colSpan={2}>Total</TableCell>
    <TableCell className="text-right">{totalGoals}</TableCell>
    <TableCell className="text-right">{totalAssists}</TableCell>
  </TableRow>
</TableFooter>`}
        </Code>
      </Section>

      {/* ── Status badges ── */}
      <Section title="With Status Badges">
        <p className="text-sm text-muted-foreground mb-4">
          Compose with inline badge styles using CSS variables for semantic color.
        </p>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead className="text-right">Partidas</TableHead>
                <TableHead className="text-right">Cartões Amarelos</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.slice(0, 6).map((player) => {
                const suspended = player.yellowCards >= 6
                const warning = player.yellowCards >= 4 && player.yellowCards < 6
                return (
                  <TableRow key={player.name}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell className="text-muted-foreground">{player.position}</TableCell>
                    <TableCell className="text-right">{player.matches}</TableCell>
                    <TableCell className="text-right">{player.yellowCards}</TableCell>
                    <TableCell>
                      {suspended ? (
                        <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                          Suspenso
                        </span>
                      ) : warning ? (
                        <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                          Atenção
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          Disponível
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <Code>{`{suspended ? (
  <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
    Suspenso
  </span>
) : warning ? (
  <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
    Atenção
  </span>
) : (
  <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
    Disponível
  </span>
)}`}
        </Code>
      </Section>

      {/* ── Empty State ── */}
      <Section title="Empty State">
        <p className="text-sm text-muted-foreground mb-4">
          When the table has no rows, use a full-width cell to communicate the empty state.
        </p>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead className="text-right">Gols</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <Code>{`<TableBody>
  <TableRow>
    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
      Nenhum resultado encontrado.
    </TableCell>
  </TableRow>
</TableBody>`}
        </Code>
      </Section>

      {/* ── Props & API ── */}
      <Section title="Props & API">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Element</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Table", el: "<table>", desc: "Root. Wrapped in overflow-x-auto container." },
                { name: "TableHeader", el: "<thead>", desc: "Header section. Adds border-b to rows." },
                { name: "TableBody", el: "<tbody>", desc: "Body section. Removes border on last row." },
                { name: "TableFooter", el: "<tfoot>", desc: "Footer section. bg-muted/50 background." },
                { name: "TableRow", el: "<tr>", desc: "Row. hover:bg-muted/50, selected state via data-[state=selected]." },
                { name: "TableHead", el: "<th>", desc: "Header cell. h-10, font-medium, whitespace-nowrap." },
                { name: "TableCell", el: "<td>", desc: "Body cell. p-2, align-middle, whitespace-nowrap." },
                { name: "TableCaption", el: "<caption>", desc: "Caption. Appears below the table, text-muted-foreground." },
              ].map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-mono text-xs font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.el}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          All components accept <code className="font-mono text-xs">className</code> and forward all native HTML element props.
        </p>
      </Section>

      {/* ── Accessibility ── */}
      <Section title="Accessibility">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>Use <code className="font-mono text-xs">TableCaption</code> to give the table an accessible description visible to screen readers.</li>
          <li><code className="font-mono text-xs">TableHead</code> renders as <code className="font-mono text-xs">&lt;th&gt;</code> — correct semantics for column headers without extra ARIA.</li>
          <li>For row selection, set <code className="font-mono text-xs">aria-label="Select row"</code> on checkboxes and use <code className="font-mono text-xs">data-[state=selected]</code> for visual feedback.</li>
          <li>The outer container enables horizontal scroll — keyboard users can scroll via Shift+scroll or focus within the table.</li>
        </ul>
      </Section>

    </div>
  )
}
