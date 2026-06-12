"use client"

import { useState } from "react"
import { PlayerAvatar, AvatarGroup, AvatarGroupCount } from "@/components/PlayerAvatar"
import { Button } from "@/components/ui/button"

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

/* ── mock players ── */

const players = [
  { name: "Diego Andrade", position: "Atacante" },
  { name: "Lucas Ferreira", position: "Meia" },
  { name: "Rafael Costa", position: "Zagueiro" },
  { name: "Bruno Mendes", position: "Lateral" },
  { name: "Mateus Silva", position: "Goleiro" },
  { name: "Carlos Rocha", position: "Meia" },
]

/* ── page ── */

export default function AvatarShowcasePage() {
  const [darkMode, setDarkMode] = useState(false)

  function toggleDark() {
    setDarkMode((v) => !v)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <div className="px-10 py-10 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="font-heading text-5xl tracking-widest uppercase text-foreground">
            Avatar
          </h1>
          <p className="text-muted-foreground mt-1">
            PlayerAvatar · Paris Sem Gol Design System
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleDark} className="mt-1">
          {darkMode ? "☀ Light" : "☾ Dark"}
        </Button>
      </div>

      {/* ── Sizes ── */}
      <Section title="Sizes">
        <div className="flex flex-wrap items-end gap-6 p-6 bg-card rounded-xl border border-border">
          {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <PlayerAvatar name="Diego Andrade" size={size} />
              <span className="text-xs text-muted-foreground font-mono">{size}</span>
            </div>
          ))}
        </div>
        <Code>{`<PlayerAvatar name="Diego Andrade" size="xs" />
<PlayerAvatar name="Diego Andrade" size="sm" />
<PlayerAvatar name="Diego Andrade" size="md" />   {/* default */}
<PlayerAvatar name="Diego Andrade" size="lg" />
<PlayerAvatar name="Diego Andrade" size="xl" />
<PlayerAvatar name="Diego Andrade" size="2xl" />`}
        </Code>
      </Section>

      {/* ── With photo ── */}
      <Section title="With Photo">
        <div className="flex flex-wrap items-end gap-6 p-6 bg-card rounded-xl border border-border">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <PlayerAvatar
                name="shadcn"
                src="https://github.com/shadcn.png"
                size={size}
              />
              <span className="text-xs text-muted-foreground font-mono">{size}</span>
            </div>
          ))}
        </div>
        <Code>{`<PlayerAvatar
  name="Diego Andrade"
  src="/players/diego.jpg"
  size="lg"
/>`}
        </Code>
      </Section>

      {/* ── Variants ── */}
      <Section title="Variants">
        <div className="flex flex-wrap gap-10 p-6 bg-card rounded-xl border border-border">
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar name="Diego Andrade" size="xl" variant="round" />
            <span className="text-xs text-muted-foreground">round (default)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar
              name="Diego Andrade"
              src="https://github.com/shadcn.png"
              size="xl"
              variant="round"
            />
            <span className="text-xs text-muted-foreground">round · with photo</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar name="Diego Andrade" size="xl" variant="square" />
            <span className="text-xs text-muted-foreground">square</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar
              name="Diego Andrade"
              src="https://github.com/shadcn.png"
              size="xl"
              variant="square"
            />
            <span className="text-xs text-muted-foreground">square · with photo</span>
          </div>
        </div>
        <Code>{`<PlayerAvatar name="Diego Andrade" variant="round" />  {/* default */}
<PlayerAvatar name="Diego Andrade" variant="square" />`}
        </Code>
      </Section>

      {/* ── Status ── */}
      <Section title="Status Indicator">
        <p className="text-sm text-muted-foreground mb-4">
          Dot badge using <code className="font-mono text-xs">AvatarBadge</code>. Green = confirmed presence, grey = absent.
        </p>
        <div className="flex flex-wrap gap-10 p-6 bg-card rounded-xl border border-border">
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar name="Diego Andrade" size="lg" status="active" />
            <span className="text-xs text-muted-foreground">active</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar name="Lucas Ferreira" size="lg" status="inactive" />
            <span className="text-xs text-muted-foreground">inactive</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar name="Rafael Costa" size="lg" />
            <span className="text-xs text-muted-foreground">no status</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <PlayerAvatar
              name="shadcn"
              src="https://github.com/shadcn.png"
              size="lg"
              status="active"
            />
            <span className="text-xs text-muted-foreground">photo + active</span>
          </div>
        </div>
        <Code>{`<PlayerAvatar name="Diego Andrade" status="active" />
<PlayerAvatar name="Lucas Ferreira" status="inactive" />`}
        </Code>
      </Section>

      {/* ── Fallback initials ── */}
      <Section title="Fallback Initials">
        <p className="text-sm text-muted-foreground mb-4">
          Auto-derived from the player name. Up to 2 words used. Navy background matches brand primary.
        </p>
        <div className="flex flex-wrap gap-4 p-6 bg-card rounded-xl border border-border">
          {players.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-2">
              <PlayerAvatar name={p.name} size="md" />
              <span className="text-xs text-muted-foreground">{p.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Avatar Group ── */}
      <Section title="Avatar Group">
        <p className="text-sm text-muted-foreground mb-4">
          Stacked avatars with overlap ring. Use <code className="font-mono text-xs">AvatarGroupCount</code> for overflow.
        </p>
        <div className="space-y-6 p-6 bg-card rounded-xl border border-border">
          {/* Simple group */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Confirmed · 5 players</p>
            <AvatarGroup>
              {players.slice(0, 5).map((p) => (
                <PlayerAvatar key={p.name} name={p.name} size="sm" status="active" />
              ))}
            </AvatarGroup>
          </div>
          {/* Group with overflow count */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Team · 4 visible + overflow</p>
            <AvatarGroup>
              {players.slice(0, 4).map((p) => (
                <PlayerAvatar key={p.name} name={p.name} size="md" />
              ))}
              <AvatarGroupCount>+8</AvatarGroupCount>
            </AvatarGroup>
          </div>
        </div>
        <Code>{`import { PlayerAvatar, AvatarGroup, AvatarGroupCount } from "@/components/PlayerAvatar"

// Stacked group
<AvatarGroup>
  <PlayerAvatar name="Diego Andrade" size="sm" />
  <PlayerAvatar name="Lucas Ferreira" size="sm" />
  <PlayerAvatar name="Rafael Costa" size="sm" />
</AvatarGroup>

// With overflow count
<AvatarGroup>
  <PlayerAvatar name="Diego Andrade" />
  <PlayerAvatar name="Lucas Ferreira" />
  <AvatarGroupCount>+8</AvatarGroupCount>
</AvatarGroup>`}
        </Code>
      </Section>

      {/* ── Real world usage ── */}
      <Section title="Real World Usage">
        <div className="space-y-3 p-6 bg-card rounded-xl border border-border">
          {players.slice(0, 4).map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 py-1">
              <PlayerAvatar
                name={p.name}
                size="md"
                status={i % 3 === 2 ? "inactive" : "active"}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.position}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {i % 3 === 2 ? "Ausente" : "Confirmado"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Props table ── */}
      <Section title="Props & API">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Prop</th>
                <th className="px-4 py-2 text-left font-semibold">Type</th>
                <th className="px-4 py-2 text-left font-semibold">Default</th>
                <th className="px-4 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 font-mono text-xs">name</td>
                <td className="px-4 py-2 font-mono text-xs">string</td>
                <td className="px-4 py-2 text-muted-foreground">—</td>
                <td className="px-4 py-2 text-muted-foreground">Full name. Used for alt text and fallback initials (first 2 words).</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">src</td>
                <td className="px-4 py-2 font-mono text-xs">string?</td>
                <td className="px-4 py-2 text-muted-foreground">undefined</td>
                <td className="px-4 py-2 text-muted-foreground">Photo URL. Shows fallback initials if omitted or if load fails.</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">size</td>
                <td className="px-4 py-2 font-mono text-xs">"xs" | "sm" | "md" | "lg" | "xl" | "2xl"</td>
                <td className="px-4 py-2 text-muted-foreground">"md"</td>
                <td className="px-4 py-2 text-muted-foreground">Avatar diameter. xs=24px sm=32px md=40px lg=56px xl=80px 2xl=96px.</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">variant</td>
                <td className="px-4 py-2 font-mono text-xs">"round" | "square"</td>
                <td className="px-4 py-2 text-muted-foreground">"round"</td>
                <td className="px-4 py-2 text-muted-foreground">Shape. round=fully circular, square=rounded-lg corners.</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">status</td>
                <td className="px-4 py-2 font-mono text-xs">"active" | "inactive"?</td>
                <td className="px-4 py-2 text-muted-foreground">undefined</td>
                <td className="px-4 py-2 text-muted-foreground">Dot badge. active=green (confirmed presence), inactive=grey.</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">className</td>
                <td className="px-4 py-2 font-mono text-xs">string?</td>
                <td className="px-4 py-2 text-muted-foreground">undefined</td>
                <td className="px-4 py-2 text-muted-foreground">Passed to the root Avatar element for additional overrides.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Accessibility ── */}
      <Section title="Accessibility">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>The <code className="font-mono text-xs">name</code> prop is passed as <code className="font-mono text-xs">alt</code> on the image for screen readers.</li>
          <li>Fallback initials are rendered inside <code className="font-mono text-xs">AvatarFallback</code> — visually present but the root element has no explicit aria-label (wrap in a parent with <code className="font-mono text-xs">title</code> if needed).</li>
          <li>Status dot is decorative — pair with visible text when using in a list (e.g. "Confirmado" label alongside the avatar).</li>
        </ul>
      </Section>

    </div>
  )
}
