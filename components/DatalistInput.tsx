"use client"

import * as React from "react"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxCollection,
  ComboboxEmpty,
} from "@/components/ui/combobox"

// Formato esperado para cada item da lista
export interface ItemDaLista {
  id: string
  name: string
  /** Texto secundário opcional (ex: apelido), exibido menor e mais claro abaixo do nome */
  nickname?: string | null
}

// Formato interno compatível com o auto-detect { value, label } do base-ui
interface ItemInterno {
  value: string
  label: string
  nickname?: string | null
}

export interface DatalistInputProps {
  /** Lista de opções disponíveis */
  items: ItemDaLista[]
  /** ID do item selecionado (modo controlado) */
  value?: string | null
  /** Chamado com o ID quando o usuário seleciona um item, ou null quando limpa */
  onValueChange?: (id: string | null) => void
  placeholder?: string
  /** Mensagem exibida quando a busca não retorna resultados */
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

// Compara dois itens internos pelo ID para evitar falhas com igualdade por referência
function itensSaoIguais(a: ItemInterno, b: ItemInterno): boolean {
  return a.value === b.value
}

export function DatalistInput({
  items,
  value,
  onValueChange,
  placeholder = "Selecionar...",
  emptyMessage = "Nenhum item encontrado.",
  disabled = false,
  className,
}: DatalistInputProps) {
  // Converte os itens para o formato { value, label } reconhecido pelo base-ui
  const itensMapeados = React.useMemo<ItemInterno[]>(
    () =>
      items.map((item) => ({
        value: item.id,
        label: item.name,
        nickname: item.nickname,
      })),
    [items]
  )

  // Localiza o objeto interno correspondente ao ID controlado externamente
  const valorSelecionado = React.useMemo(
    () => itensMapeados.find((item) => item.value === value) ?? null,
    [itensMapeados, value]
  )

  // Extrai apenas o ID do objeto retornado pelo Combobox antes de repassar ao handler
  function handleMudancaDeValor(novoValor: ItemInterno | null) {
    onValueChange?.(novoValor?.value ?? null)
  }

  return (
    <Combobox
      items={itensMapeados}
      value={valorSelecionado}
      onValueChange={handleMudancaDeValor}
      isItemEqualToValue={itensSaoIguais}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={!!value}
        className={className}
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          {/* Usa render prop para que o base-ui gerencie a filtragem internamente */}
          <ComboboxCollection>
            {(item: ItemInterno) => (
              <ComboboxItem key={item.value} value={item}>
                <span className="flex flex-col">
                  <span>{item.label}</span>
                  {/* Apelido exibido em fonte menor e cor mais fraca, quando disponível */}
                  {item.nickname && (
                    <span className="text-xs text-muted-foreground">
                      {item.nickname}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
