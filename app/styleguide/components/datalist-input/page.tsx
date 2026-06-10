"use client"

import { useState } from "react"
import { DatalistInput, type ItemDaLista } from "@/components/DatalistInput"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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

/* ── dados de demonstração ── */

const jogadoresPsg: ItemDaLista[] = [
  { id: "1", name: "Gianluigi Donnarumma" },
  { id: "2", name: "Achraf Hakimi" },
  { id: "3", name: "Marquinhos" },
  { id: "4", name: "Lucas Beraldo" },
  { id: "5", name: "Nuno Mendes" },
  { id: "6", name: "Vitinha" },
  { id: "7", name: "João Neves" },
  { id: "8", name: "Fabian Ruiz" },
  { id: "9", name: "Bradley Barcola" },
  { id: "10", name: "Ousmane Dembélé" },
  { id: "11", name: "Kylian Mbappé" },
]

const competicoes: ItemDaLista[] = [
  { id: "ligue1", name: "Ligue 1" },
  { id: "ucl", name: "UEFA Champions League" },
  { id: "cdl", name: "Coupe de la Ligue" },
  { id: "cdf", name: "Coupe de France" },
  { id: "trophee", name: "Trophée des Champions" },
]

/* ── page ── */

export default function DatalistInputShowcasePage() {
  const [darkMode, setDarkMode] = useState(false)
  const [jogadorSelecionado, setJogadorSelecionado] = useState<string | null>(null)
  const [competicaoSelecionada, setCompeticaoSelecionada] = useState<string | null>(null)
  const [valorControlado, setValorControlado] = useState<string | null>(null)

  function toggleDark() {
    setDarkMode((v) => !v)
    document.documentElement.classList.toggle("dark")
  }

  // Resolve o nome do jogador a partir do ID para exibição no resultado
  const nomeJogadorSelecionado = jogadoresPsg.find((j) => j.id === jogadorSelecionado)?.name

  return (
    <div className="px-10 py-10 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="font-heading text-5xl tracking-widest uppercase text-foreground">
            Datalist Input
          </h1>
          <p className="text-muted-foreground mt-1">
            DatalistInput · Paris Sem Gol Design System
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleDark} className="mt-1">
          {darkMode ? "☀ Light" : "☾ Dark"}
        </Button>
      </div>

      {/* ── Basic ── */}
      <Section title="Basic">
        <p className="text-sm text-muted-foreground mb-4">
          Exibe o <code className="font-mono text-xs">name</code> do item no input, mas armazena o{" "}
          <code className="font-mono text-xs">id</code> como valor. Somente itens da lista podem ser
          selecionados — digitar um nome inválido não persiste nenhum valor.
        </p>
        <div className="flex flex-col gap-3 max-w-xs">
          <Label htmlFor="jogador-basico">Jogador</Label>
          <DatalistInput
            items={jogadoresPsg}
            placeholder="Buscar jogador..."
          />
        </div>
        <Code>{`import { DatalistInput } from "@/components/DatalistInput"

const jogadores = [
  { id: "1", name: "Kylian Mbappé" },
  { id: "2", name: "Ousmane Dembélé" },
]

<DatalistInput
  items={jogadores}
  placeholder="Buscar jogador..."
/>`}</Code>
      </Section>

      {/* ── Controlled ── */}
      <Section title="Controlled">
        <p className="text-sm text-muted-foreground mb-4">
          Use <code className="font-mono text-xs">value</code> (ID) e{" "}
          <code className="font-mono text-xs">onValueChange</code> para controlar o estado externamente.
          O handler recebe o <code className="font-mono text-xs">id</code> do item selecionado ou{" "}
          <code className="font-mono text-xs">null</code> quando limpo.
        </p>
        <div className="flex flex-col gap-3 max-w-xs">
          <Label>Jogador</Label>
          <DatalistInput
            items={jogadoresPsg}
            value={jogadorSelecionado}
            onValueChange={setJogadorSelecionado}
            placeholder="Buscar jogador..."
          />
          {/* Mostra o resultado da seleção */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-h-5">
            {jogadorSelecionado ? (
              <>
                <span>ID selecionado:</span>
                <Badge variant="outline" className="font-mono">
                  {jogadorSelecionado}
                </Badge>
                <span className="text-foreground">{nomeJogadorSelecionado}</span>
              </>
            ) : (
              <span>Nenhum jogador selecionado</span>
            )}
          </div>
        </div>
        <Code>{`const [jogador, setJogador] = useState<string | null>(null)

<DatalistInput
  items={jogadores}
  value={jogador}
  onValueChange={setJogador}  // recebe o id ou null
  placeholder="Buscar jogador..."
/>

// jogador = "11" quando Kylian Mbappé está selecionado`}</Code>
      </Section>

      {/* ── Preselected ── */}
      <Section title="Valor Pré-selecionado">
        <p className="text-sm text-muted-foreground mb-4">
          Passe um <code className="font-mono text-xs">id</code> válido como{" "}
          <code className="font-mono text-xs">value</code> para iniciar com um item já selecionado.
          O botão limpar aparece automaticamente.
        </p>
        <div className="flex flex-col gap-3 max-w-xs">
          <Label>Competição</Label>
          <DatalistInput
            items={competicoes}
            value={competicaoSelecionada ?? "ucl"}
            onValueChange={setCompeticaoSelecionada}
            placeholder="Selecionar competição..."
          />
        </div>
        <Code>{`// Passe o id como valor inicial
<DatalistInput
  items={competicoes}
  value="ucl"
  onValueChange={setCompeticao}
  placeholder="Selecionar competição..."
/>`}</Code>
      </Section>

      {/* ── Disabled ── */}
      <Section title="Disabled">
        <p className="text-sm text-muted-foreground mb-4">
          A prop <code className="font-mono text-xs">disabled</code> bloqueia toda interação com o input.
        </p>
        <div className="flex flex-col gap-6 max-w-xs">
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground">Sem seleção</Label>
            <DatalistInput
              items={jogadoresPsg}
              disabled
              placeholder="Desabilitado..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground">Com seleção</Label>
            <DatalistInput
              items={jogadoresPsg}
              value="3"
              disabled
              placeholder="Desabilitado..."
            />
          </div>
        </div>
        <Code>{`<DatalistInput
  items={jogadores}
  disabled
  placeholder="Desabilitado..."
/>`}</Code>
      </Section>

      {/* ── Interactive Demo ── */}
      <Section title="Demo Interativa">
        <p className="text-sm text-muted-foreground mb-4">
          Selecione um jogador e uma competição. Use o botão{" "}
          <code className="font-mono text-xs">Limpar</code> para resetar ambos.
        </p>
        <div className="rounded-xl border border-border p-6 bg-card space-y-5">
          <p className="font-heading tracking-widest uppercase text-xs text-muted-foreground">
            Estatísticas · PSG 2024/25
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Jogador</Label>
              <DatalistInput
                items={jogadoresPsg}
                value={valorControlado}
                onValueChange={setValorControlado}
                placeholder="Buscar jogador..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Competição</Label>
              <DatalistInput
                items={competicoes}
                placeholder="Selecionar..."
              />
            </div>
          </div>

          {/* Resultado da seleção */}
          <div className="pt-2 border-t border-border text-sm space-y-1">
            <p className="text-muted-foreground">
              Jogador selecionado:{" "}
              <span className="text-foreground font-medium">
                {valorControlado
                  ? jogadoresPsg.find((j) => j.id === valorControlado)?.name
                  : "—"}
              </span>
            </p>
            {valorControlado && (
              <p className="text-muted-foreground font-mono text-xs">
                id = <span className="text-foreground">{valorControlado}</span>
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setValorControlado(null)}
          >
            Limpar
          </Button>
        </div>
      </Section>

      {/* ── Props & API ── */}
      <Section title="Props & API">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prop</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Padrão</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                {
                  prop: "items",
                  type: "ItemDaLista[]",
                  defaultValue: "—",
                  desc: "Lista de opções. Cada item precisa de id e name.",
                },
                {
                  prop: "value",
                  type: "string | null",
                  defaultValue: "undefined",
                  desc: "ID do item selecionado (modo controlado).",
                },
                {
                  prop: "onValueChange",
                  type: "(id: string | null) => void",
                  defaultValue: "undefined",
                  desc: "Chamado com o id ao selecionar, ou null ao limpar.",
                },
                {
                  prop: "placeholder",
                  type: "string",
                  defaultValue: '"Selecionar..."',
                  desc: "Texto exibido quando nenhum item está selecionado.",
                },
                {
                  prop: "emptyMessage",
                  type: "string",
                  defaultValue: '"Nenhum item encontrado."',
                  desc: "Texto exibido quando a busca não tem resultados.",
                },
                {
                  prop: "disabled",
                  type: "boolean",
                  defaultValue: "false",
                  desc: "Desabilita toda interação com o componente.",
                },
                {
                  prop: "className",
                  type: "string",
                  defaultValue: "undefined",
                  desc: "Classes extras aplicadas ao InputGroup raiz.",
                },
              ].map((row) => (
                <TableRow key={row.prop}>
                  <TableCell className="font-mono text-xs font-medium">{row.prop}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.type}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.defaultValue}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          O tipo <code className="font-mono text-xs">ItemDaLista</code> pode ser importado diretamente:
        </p>
        <Code>{`import { DatalistInput, type ItemDaLista } from "@/components/DatalistInput"

// ItemDaLista = { id: string; name: string }`}</Code>
      </Section>

      {/* ── Accessibility ── */}
      <Section title="Acessibilidade">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>
            O input renderiza com <code className="font-mono text-xs">role="combobox"</code> e{" "}
            <code className="font-mono text-xs">aria-expanded</code> gerenciados automaticamente pelo
            @base-ui.
          </li>
          <li>
            Navegação por teclado: <code className="font-mono text-xs">↓ ↑</code> para mover entre
            itens, <code className="font-mono text-xs">Enter</code> para selecionar,{" "}
            <code className="font-mono text-xs">Escape</code> para fechar.
          </li>
          <li>
            O botão limpar é acessível por teclado e tem{" "}
            <code className="font-mono text-xs">aria-label</code> fornecido pelo base-ui.
          </li>
          <li>
            Use sempre um <code className="font-mono text-xs">{"<Label>"}</code> associado com{" "}
            <code className="font-mono text-xs">htmlFor</code> ou envolvendo o input para
            garantir que leitores de tela anunciem corretamente o campo.
          </li>
          <li>
            A lista de opções usa <code className="font-mono text-xs">role="listbox"</code> com{" "}
            <code className="font-mono text-xs">aria-selected</code> no item ativo.
          </li>
        </ul>
      </Section>

    </div>
  )
}
