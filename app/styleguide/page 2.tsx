"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

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

function TokenSwatch({
  variable,
  label,
  textColor = "text-foreground",
}: {
  variable: string
  label: string
  textColor?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 rounded-lg border border-border shadow-sm"
        style={{ background: `var(${variable})` }}
      />
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{variable}</p>
    </div>
  )
}

function RadiusSwatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-16 h-16 bg-primary ${className} flex items-center justify-center`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function ShadowSwatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`w-24 h-16 bg-card rounded-lg ${className}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

/* ── page ── */

export default function StyleguidePage() {
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
            Design Tokens
          </h1>
          <p className="text-muted-foreground mt-1">Paris Sem Gol · Design System</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDark}
          className="mt-1"
        >
          {darkMode ? "☀ Light Mode" : "☾ Dark Mode"}
        </Button>
      </div>

      {/* ── 1. Colors: Brand ── */}
      <Section title="Brand Colors">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <TokenSwatch variable="--primary" label="Primary · Navy" />
          <TokenSwatch variable="--accent" label="Accent · Gold" />
          <TokenSwatch variable="--destructive" label="Destructive · Red" />
        </div>
      </Section>

      {/* ── 2. Colors: Background & Surface ── */}
      <Section title="Background & Surface">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <TokenSwatch variable="--background" label="Background" />
          <TokenSwatch variable="--card" label="Card" />
          <TokenSwatch variable="--popover" label="Popover" />
          <TokenSwatch variable="--muted" label="Muted" />
        </div>
      </Section>

      {/* ── 3. Colors: Text ── */}
      <Section title="Text Colors">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <TokenSwatch variable="--foreground" label="Foreground" />
          <TokenSwatch variable="--muted-foreground" label="Muted Foreground" />
          <TokenSwatch variable="--primary-foreground" label="Primary Foreground" />
          <TokenSwatch variable="--accent-foreground" label="Accent Foreground" />
        </div>
      </Section>

      {/* ── 4. Semantic Colors ── */}
      <Section title="Semantic Colors">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <TokenSwatch variable="--success" label="Success · Green" />
          <TokenSwatch variable="--warning" label="Warning · Amber" />
          <TokenSwatch variable="--info" label="Info · Blue" />
          <TokenSwatch variable="--destructive" label="Error · Red" />
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Badge className="bg-[--success] text-[--success-foreground] hover:bg-[--success]/80">Pago</Badge>
          <Badge className="bg-[--warning] text-[--warning-foreground] hover:bg-[--warning]/80">Pendente</Badge>
          <Badge className="bg-[--info] text-[--info-foreground] hover:bg-[--info]/80">Info</Badge>
          <Badge variant="destructive">Erro</Badge>
          <Badge className="bg-[--accent] text-[--accent-foreground] hover:bg-[--accent]/80">Isento (GK)</Badge>
        </div>
      </Section>

      {/* ── 5. Sidebar Palette ── */}
      <Section title="Sidebar Palette">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <TokenSwatch variable="--sidebar" label="Sidebar BG" />
          <TokenSwatch variable="--sidebar-accent" label="Sidebar Hover" />
          <TokenSwatch variable="--sidebar-primary" label="Sidebar Active (Gold)" />
          <TokenSwatch variable="--sidebar-border" label="Sidebar Border" />
        </div>
      </Section>

      {/* ── 6. Chart Colors ── */}
      <Section title="Chart Colors">
        <div className="grid grid-cols-5 gap-4">
          <TokenSwatch variable="--chart-1" label="Chart 1" />
          <TokenSwatch variable="--chart-2" label="Chart 2" />
          <TokenSwatch variable="--chart-3" label="Chart 3" />
          <TokenSwatch variable="--chart-4" label="Chart 4" />
          <TokenSwatch variable="--chart-5" label="Chart 5" />
        </div>
      </Section>

      {/* ── 7. Typography ── */}
      <Section title="Typography">
        <div className="space-y-6 p-6 bg-card rounded-xl border border-border">
          {/* Heading font */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Bebas Neue · Heading Font</p>
            <p className="font-heading text-6xl tracking-widest uppercase leading-none">Paris Sem Gol</p>
            <p className="font-heading text-4xl tracking-widest uppercase">Dashboard · Elenco · Finanças</p>
            <p className="font-heading text-2xl tracking-widest uppercase">Artilheiros · MVP do Mês</p>
            <p className="font-heading text-xl tracking-wider uppercase">Próxima Partida · Aniversariantes</p>
          </div>

          <div className="border-t border-border" />

          {/* Body font */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">DM Sans · Body Font</p>
            <p className="text-2xl font-semibold">Sua pelada, profissional.</p>
            <p className="text-xl font-medium">Diego Andrade · Atacante · #9</p>
            <p className="text-base">Membro desde Março 2024 · 23 gols na temporada · 94% de presença</p>
            <p className="text-sm text-muted-foreground">Mensalidade paga em 02/05/2026 via Pix · R$ 30,00</p>
            <p className="text-xs text-muted-foreground">v3.0 · Next.js · Supabase</p>
          </div>

          <div className="border-t border-border" />

          {/* Weight scale */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">DM Sans · Weight Scale</p>
            <div className="space-y-1">
              <p className="text-base font-light">Light 300 · Informação secundária</p>
              <p className="text-base font-normal">Regular 400 · Texto corrido padrão</p>
              <p className="text-base font-medium">Medium 500 · Labels e destaques leves</p>
              <p className="text-base font-semibold">Semibold 600 · Valores e títulos de seção</p>
              <p className="text-base font-bold">Bold 700 · Números e calls to action</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 8. Border Radius ── */}
      <Section title="Border Radius">
        <div className="flex flex-wrap gap-8 items-end p-6 bg-card rounded-xl border border-border">
          <RadiusSwatch label="rounded-sm" className="rounded-sm" />
          <RadiusSwatch label="rounded-md" className="rounded-md" />
          <RadiusSwatch label="rounded-lg" className="rounded-lg" />
          <RadiusSwatch label="rounded-xl" className="rounded-xl" />
          <RadiusSwatch label="rounded-2xl" className="rounded-2xl" />
          <RadiusSwatch label="rounded-full" className="rounded-full" />
        </div>
      </Section>

      {/* ── 9. Shadows ── */}
      <Section title="Shadows">
        <div className="flex flex-wrap gap-8 items-end p-8 bg-background rounded-xl border border-border">
          <ShadowSwatch label="shadow-none" className="" />
          <ShadowSwatch label="shadow-sm" className="shadow-sm" />
          <ShadowSwatch label="shadow" className="shadow" />
          <ShadowSwatch label="shadow-md" className="shadow-md" />
          <ShadowSwatch label="shadow-lg" className="shadow-lg" />
          <ShadowSwatch label="shadow-xl" className="shadow-xl" />
        </div>
      </Section>

      {/* ── 10. Buttons ── */}
      <Section title="Buttons">
        <div className="space-y-4 p-6 bg-card rounded-xl border border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Variants</p>
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Sizes</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">★</Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">States</p>
            <div className="flex flex-wrap gap-3">
              <Button>Sortear Times</Button>
              <Button disabled>Disabled</Button>
              <Button className="bg-[--accent] text-[--accent-foreground] hover:bg-[--accent]/80">Gold Accent</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 11. Cards ── */}
      <Section title="Cards">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>MVP do Mês · Maio</CardTitle>
              <CardDescription>3× Craque da Partida em Maio</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-[--accent]">91</p>
              <p className="text-sm text-muted-foreground mt-1">Diego Andrade</p>
            </CardContent>
            <CardFooter>
              <Badge className="bg-[--accent] text-[--accent-foreground]">Craque do Mês</Badge>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saldo Financeiro</CardTitle>
              <CardDescription>Maio 2026 · Caixa total: R$ 3.480</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-bold text-foreground">R$ 1.240</p>
              <p className="text-sm text-[--success] font-medium">↑ R$ 1.530 receitas</p>
              <p className="text-sm text-destructive font-medium">↓ R$ 290 despesas</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── 12. Badges ── */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-3 p-6 bg-card rounded-xl border border-border">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge className="bg-[--success] text-[--success-foreground]">Pago ✓</Badge>
          <Badge className="bg-[--warning] text-[--warning-foreground]">Pendente</Badge>
          <Badge className="bg-[--accent] text-[--accent-foreground]">Isento (GK)</Badge>
          <Badge className="bg-[--primary] text-[--primary-foreground]">Ativo</Badge>
          <Badge variant="outline" className="border-[--accent] text-[--accent]">Em Aberto</Badge>
        </div>
      </Section>

      {/* ── 13. Alerts ── */}
      <Section title="Alerts">
        <div className="space-y-3">
          <Alert>
            <AlertTitle>Votação em andamento</AlertTitle>
            <AlertDescription>
              9 de 14 jogadores já votaram. Resultado visível apenas para o admin até o encerramento.
            </AlertDescription>
          </Alert>
          <Alert className="border-[--success] bg-[--success]/10 text-[--success]">
            <AlertTitle>Mensalidade confirmada</AlertTitle>
            <AlertDescription className="text-foreground">
              Pagamento de R$ 30,00 via Pix registrado para Diego Andrade em 02/05/2026.
            </AlertDescription>
          </Alert>
          <Alert className="border-destructive bg-destructive/10">
            <AlertTitle className="text-destructive">Inadimplente</AlertTitle>
            <AlertDescription>
              Paulo Rodrigues está com mensalidade pendente há 2 meses.
            </AlertDescription>
          </Alert>
          <Alert className="border-[--warning] bg-[--warning]/10">
            <AlertTitle className="text-[--warning-foreground]">Atenção</AlertTitle>
            <AlertDescription>
              Partida do dia 07/Jun está em aberto. Confirme presença até sexta.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      {/* ── 14. Radio Group ── */}
      <Section title="Radio Group">
        <div className="p-6 bg-card rounded-xl border border-border space-y-4">
          <div>
            <p className="text-sm font-medium mb-3">Mensalidade</p>
            <RadioGroup defaultValue="mensalista" className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mensalista" id="mensalista" />
                <Label htmlFor="mensalista">Mensalista · R$ 30/mês</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="isento" id="isento" />
                <Label htmlFor="isento">Isento · Sem cobrança</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Forma de Pagamento</p>
            <RadioGroup defaultValue="pix" className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix">Pix</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dinheiro" id="dinheiro" />
                <Label htmlFor="dinheiro">Dinheiro</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transferencia" id="transferencia" />
                <Label htmlFor="transferencia">Transferência</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </Section>

    </div>
  )
}
