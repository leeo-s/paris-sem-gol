"use client"

import { useState } from "react"
import { Progress as ProgressRoot } from "@base-ui/react/progress"
import { Button } from "@/components/ui/button"
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
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

/* ── color variant helper ── */

function ColoredProgress({
  value,
  indicatorClass,
  trackClass = "h-2",
}: {
  value: number
  indicatorClass: string
  trackClass?: string
}) {
  return (
    <ProgressRoot.Root value={value} className="w-full">
      <ProgressRoot.Track
        className={`relative flex w-full items-center overflow-x-hidden rounded-full bg-muted ${trackClass}`}
      >
        <ProgressRoot.Indicator
          className={`h-full transition-all ${indicatorClass}`}
        />
      </ProgressRoot.Track>
    </ProgressRoot.Root>
  )
}

/* ── data ── */

const matchStats = [
  { label: "Posse de Bola", value: 68 },
  { label: "Finalizações", value: 14, max: 25 },
  { label: "Chutes a Gol", value: 7, max: 25 },
  { label: "Passes Certos", value: 87 },
]

const topScorers = [
  { name: "Kylian Mbappé", goals: 27, max: 30 },
  { name: "Ousmane Dembélé", goals: 14, max: 30 },
  { name: "Vitinha", goals: 6, max: 30 },
  { name: "Marquinhos", goals: 3, max: 30 },
]

/* ── page ── */

export default function ProgressShowcasePage() {
  const [darkMode, setDarkMode] = useState(false)
  const [interactiveValue, setInteractiveValue] = useState(45)

  function toggleDark() {
    setDarkMode((v) => !v)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <div className="px-10 py-10 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="font-heading text-5xl tracking-widest uppercase text-foreground">
            Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Progress · Paris Sem Gol Design System
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleDark} className="mt-1">
          {darkMode ? "☀ Light" : "☾ Dark"}
        </Button>
      </div>

      {/* ── Basic ── */}
      <Section title="Basic">
        <p className="text-sm text-muted-foreground mb-4">
          Render a progress bar with a <code className="font-mono text-xs">value</code> between 0 and 100.
          The track fills using the <code className="font-mono text-xs">bg-primary</code> token.
        </p>
        <div className="space-y-4">
          <Progress value={0} />
          <Progress value={33} />
          <Progress value={66} />
          <Progress value={100} />
        </div>
        <Code>{`import { Progress } from "@/components/ui/progress"

<Progress value={33} />
<Progress value={66} />
<Progress value={100} />`}
        </Code>
      </Section>

      {/* ── With Label & Value ── */}
      <Section title="With Label & Value">
        <p className="text-sm text-muted-foreground mb-4">
          Use <code className="font-mono text-xs">ProgressLabel</code> and{" "}
          <code className="font-mono text-xs">ProgressValue</code> as children to add a labelled header row.
          Both render inline before the track.
        </p>
        <div className="space-y-5">
          <Progress value={68}>
            <ProgressLabel>Posse de Bola</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={42}>
            <ProgressLabel>Chutes a Gol</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={91}>
            <ProgressLabel>Passes Certos</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
        <Code>{`import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"

<Progress value={68}>
  <ProgressLabel>Posse de Bola</ProgressLabel>
  <ProgressValue />
</Progress>`}
        </Code>
      </Section>

      {/* ── Color Variants ── */}
      <Section title="Color Variants">
        <p className="text-sm text-muted-foreground mb-4">
          For custom indicator colors, compose{" "}
          <code className="font-mono text-xs">ProgressRoot.Root</code>,{" "}
          <code className="font-mono text-xs">ProgressRoot.Track</code>, and{" "}
          <code className="font-mono text-xs">ProgressRoot.Indicator</code> directly from{" "}
          <code className="font-mono text-xs">@base-ui/react/progress</code>.
        </p>
        <div className="space-y-4">
          {[
            { label: "Primary (Navy)", cls: "bg-primary", value: 72 },
            { label: "Gold (Brand)", cls: "bg-gold", value: 58 },
            { label: "Success", cls: "bg-success", value: 85 },
            { label: "Warning", cls: "bg-warning", value: 44 },
            { label: "Destructive", cls: "bg-destructive", value: 22 },
            { label: "Info", cls: "bg-info", value: 63 },
          ].map(({ label, cls, value }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="w-36 text-sm text-muted-foreground shrink-0">{label}</span>
              <ColoredProgress value={value} indicatorClass={cls} />
              <span className="w-8 text-xs text-muted-foreground tabular-nums text-right">{value}%</span>
            </div>
          ))}
        </div>
        <Code>{`import { Progress as ProgressRoot } from "@base-ui/react/progress"

<ProgressRoot.Root value={85} className="w-full">
  <ProgressRoot.Track className="relative flex h-2 w-full items-center overflow-x-hidden rounded-full bg-muted">
    <ProgressRoot.Indicator className="h-full bg-success transition-all" />
  </ProgressRoot.Track>
</ProgressRoot.Root>`}
        </Code>
      </Section>

      {/* ── Sizes ── */}
      <Section title="Sizes">
        <p className="text-sm text-muted-foreground mb-4">
          Control bar thickness by passing a height class to the track. The default is{" "}
          <code className="font-mono text-xs">h-1</code>.
        </p>
        <div className="space-y-5">
          {[
            { label: "xs — h-0.5", cls: "h-0.5", value: 60 },
            { label: "sm — h-1 (default)", cls: "h-1", value: 60 },
            { label: "md — h-2", cls: "h-2", value: 60 },
            { label: "lg — h-4", cls: "h-4", value: 60 },
            { label: "xl — h-6", cls: "h-6", value: 60 },
          ].map(({ label, cls, value }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="w-36 text-xs text-muted-foreground font-mono shrink-0">{label}</span>
              <ColoredProgress value={value} indicatorClass="bg-primary" trackClass={cls} />
            </div>
          ))}
        </div>
        <Code>{`// Pass a height class to the track to change size
<ProgressRoot.Track className="relative flex h-4 w-full items-center overflow-x-hidden rounded-full bg-muted">
  <ProgressRoot.Indicator className="h-full bg-primary transition-all" />
</ProgressRoot.Track>`}
        </Code>
      </Section>

      {/* ── Match Stats Use Case ── */}
      <Section title="Match Stats">
        <p className="text-sm text-muted-foreground mb-4">
          A real-world PSG use case: match statistics displayed as labelled progress bars.
          Values are percentages; use <code className="font-mono text-xs">Math.round((v / max) * 100)</code> to convert raw counts.
        </p>
        <div className="rounded-xl border border-border p-6 bg-card space-y-5">
          <p className="font-heading tracking-widest uppercase text-xs text-muted-foreground">PSG × Marseille · Ligue 1</p>
          {matchStats.map(({ label, value }) => (
            <Progress key={label} value={value}>
              <ProgressLabel>{label}</ProgressLabel>
              <ProgressValue />
            </Progress>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border p-6 bg-card space-y-4">
          <p className="font-heading tracking-widest uppercase text-xs text-muted-foreground">Artilharia · 2024/25</p>
          {topScorers.map(({ name, goals, max }) => {
            const pct = Math.round((goals / max) * 100)
            return (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground tabular-nums">{goals} gols</span>
                </div>
                <ColoredProgress value={pct} indicatorClass="bg-gold" trackClass="h-2" />
              </div>
            )
          })}
        </div>
        <Code>{`// With raw count values
const pct = Math.round((goals / max) * 100)

<Progress value={pct}>
  <ProgressLabel>{name}</ProgressLabel>
  <ProgressValue />
</Progress>`}
        </Code>
      </Section>

      {/* ── Interactive ── */}
      <Section title="Interactive Demo">
        <p className="text-sm text-muted-foreground mb-4">
          Drag the slider to update the progress value in real time.
        </p>
        <div className="space-y-6">
          <Progress value={interactiveValue}>
            <ProgressLabel>Completado</ProgressLabel>
            <ProgressValue />
          </Progress>
          <input
            type="range"
            min={0}
            max={100}
            value={interactiveValue}
            onChange={(e) => setInteractiveValue(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex gap-2">
            {[0, 25, 50, 75, 100].map((v) => (
              <Button
                key={v}
                variant="outline"
                size="sm"
                onClick={() => setInteractiveValue(v)}
                className={interactiveValue === v ? "border-primary" : ""}
              >
                {v}%
              </Button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Props & API ── */}
      <Section title="Props & API">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Prop</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { comp: "Progress", prop: "value", type: "number", desc: "Current value (0–100). Controls indicator width." },
                { comp: "Progress", prop: "children", type: "ReactNode", desc: "Optional ProgressLabel / ProgressValue rendered before the track." },
                { comp: "Progress", prop: "className", type: "string", desc: "Extra classes on the root flex container." },
                { comp: "ProgressLabel", prop: "className", type: "string", desc: "Label text rendered left of the value." },
                { comp: "ProgressValue", prop: "className", type: "string", desc: "Auto-formatted value text (e.g. '66%')." },
                { comp: "ProgressTrack", prop: "className", type: "string", desc: "Track bar. Override h-* to change size." },
                { comp: "ProgressIndicator", prop: "className", type: "string", desc: "Fill bar. Override bg-* to change color." },
              ].map((row) => (
                <TableRow key={`${row.comp}-${row.prop}`}>
                  <TableCell className="font-mono text-xs font-medium">{row.comp}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.prop}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* ── Accessibility ── */}
      <Section title="Accessibility">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>The root renders a <code className="font-mono text-xs">div</code> with <code className="font-mono text-xs">role="progressbar"</code>, <code className="font-mono text-xs">aria-valuenow</code>, <code className="font-mono text-xs">aria-valuemin</code>, and <code className="font-mono text-xs">aria-valuemax</code> automatically via @base-ui.</li>
          <li>Use <code className="font-mono text-xs">ProgressLabel</code> to provide a human-readable label — it is associated via <code className="font-mono text-xs">aria-labelledby</code>.</li>
          <li>For indeterminate states, pass <code className="font-mono text-xs">value={null}</code>; @base-ui will set <code className="font-mono text-xs">aria-valuenow</code> to <code className="font-mono text-xs">undefined</code>.</li>
          <li>Indicator uses <code className="font-mono text-xs">transition-all</code> — ensure <code className="font-mono text-xs">prefers-reduced-motion</code> is respected in production.</li>
        </ul>
      </Section>

    </div>
  )
}
