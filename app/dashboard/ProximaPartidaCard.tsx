"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, MapPin } from "lucide-react";

// Helpers para formatar a data da partida
function abreviarMes(numeroMes: number) {
  return new Date(2000, numeroMes - 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

type ProximaPartida = {
  id: string;
  match_date: string;
  location: string | null;
  status: string;
  usuarioPodeConfirmar: boolean;
  usuarioJaConfirmou: boolean;
};

// Exibe o card da próxima partida com botão de confirmar/cancelar presença
export function ProximaPartidaCard({ match }: { match: ProximaPartida | null }) {
  const router = useRouter();
  const [confirmado, setConfirmado] = useState(match?.usuarioJaConfirmou ?? false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!match) {
    return (
      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50 mb-1">
            Próxima Partida
          </p>
          <p className="text-sm text-primary-foreground/70">
            Nenhuma partida agendada
          </p>
        </CardContent>
      </Card>
    );
  }

  const dataPartida = new Date(match.match_date);
  const dia = dataPartida.getUTCDate().toString().padStart(2, "0");
  const mes = abreviarMes(dataPartida.getUTCMonth() + 1);

  // Alterna a presença do usuário: confirma ou cancela conforme o estado atual
  async function alternarPresenca() {
    const partida = match;
    if (!partida) return;
    setCarregando(true);
    setErro(null);

    const metodo = confirmado ? "DELETE" : "POST";

    try {
      const resposta = await fetch(`/api/matches/${partida.id}/attendance`, {
        method: metodo,
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErro(corpo.error ?? "Erro ao atualizar presença");
        return;
      }

      setConfirmado(!confirmado);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // Classes e ícone do botão variam de acordo com o estado de confirmação
  const classesBotao = confirmado
    ? "hidden sm:flex bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30 hover:text-destructive gap-1.5 shrink-0"
    : "hidden sm:flex bg-gold border-gold text-gold-foreground hover:bg-gold/90 hover:text-gold-foreground gap-1.5 shrink-0";

  const classesBotaoMobile = confirmado
    ? "sm:hidden mt-3 w-full bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30 hover:text-destructive gap-1.5"
    : "sm:hidden mt-3 w-full bg-gold border-gold text-gold-foreground hover:bg-gold/90 hover:text-gold-foreground gap-1.5";

  const IconeBotao = carregando ? Loader2 : confirmado ? XCircle : CheckCircle;
  const textoBotao = confirmado ? "Cancelar Presença" : "Confirmar Presença";

  // Redireciona para a página da partida ao clicar no card
  function navegarParaPartida() {
    if (!match) return;
    router.push(`/partidas/${match.id}`);
  }

  // Impede que o clique nos botões de presença propague para o card
  function impedirPropagacao(evento: React.MouseEvent) {
    evento.stopPropagation();
  }

  return (
    <Card
      className="bg-primary text-primary-foreground border-none cursor-pointer"
      onClick={navegarParaPartida}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-4">
          {/* Caixa com a data da partida */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-sidebar-accent px-4 py-2.5 shrink-0 min-w-[60px] text-center">
            <span className="font-heading text-3xl leading-none text-primary-foreground">
              {dia}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-primary-foreground/70 mt-0.5">
              {mes}
            </span>
          </div>

          {/* Informações da partida */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50 mb-0.5">
              Próxima Partida
            </p>
            <h2 className="font-heading text-xl md:text-2xl leading-tight text-primary-foreground">
              Pelada Semanal
            </h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {match.location && (
                <span className="flex items-center gap-1 text-xs text-primary-foreground/60">
                  <MapPin className="size-3" />
                  {match.location}
                </span>
              )}
            </div>
          </div>

          {/* Botão desktop — visível apenas se o usuário pode confirmar */}
          {match.usuarioPodeConfirmar && (
            <Button
              size="sm"
              variant="outline"
              className={classesBotao}
              onClick={(e) => { impedirPropagacao(e); alternarPresenca(); }}
              disabled={carregando}
            >
              <IconeBotao className={`size-3.5 ${carregando ? "animate-spin" : ""}`} />
              {textoBotao}
            </Button>
          )}
        </div>

        {/* Botão mobile — visível apenas se o usuário pode confirmar */}
        {match.usuarioPodeConfirmar && (
          <Button
            size="sm"
            variant="outline"
            className={classesBotaoMobile}
            onClick={(e) => { impedirPropagacao(e); alternarPresenca(); }}
            disabled={carregando}
          >
            <IconeBotao className={`size-3.5 ${carregando ? "animate-spin" : ""}`} />
            {textoBotao}
          </Button>
        )}

        {/* Mensagem de erro inline caso a requisição falhe */}
        {erro && (
          <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-1.5">
            {erro}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
