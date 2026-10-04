import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPct, type Analise } from "@/lib/apuracao";
import type { Chances } from "@/lib/modelo";

const CORES = ["#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#ea580c", "#64748b"];

/** Chance em %. Só mostra 0% ou 100% quando a conta matemática já fechou. */
function chance(p: number, travado?: 0 | 1) {
  if (travado === 1) return "100%";
  if (travado === 0) return "0%";
  if (p >= 0.995) return ">99%";
  if (p > 0 && p < 0.005) return "<1%";
  if (p === 0) return "<1%";
  return `${Math.round(p * 100)}%`;
}

function Barra({ p, cor }: { p: number; cor: string }) {
  return (
    <div className="h-1.5 mt-1 rounded bg-muted overflow-hidden">
      <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, p * 100))}%`, background: cor }} />
    </div>
  );
}

export function PainelChances({ chances, analise, segundoTurno }: { chances: Chances; analise: Analise; segundoTurno: boolean }) {
  const chaves = new Set(analise.fatos.filter((f) => f.nivel === "matematico" || f.nivel === "tse").map((f) => f.chave));
  const temSegundo = [...chaves].some((c) => c === "tem-2t");
  const decidido = [...chaves].some((c) => c.startsWith("vence-") || c.startsWith("tse-eleito"));
  const travadoDecide: 0 | 1 | undefined = decidido ? 1 : temSegundo ? 0 : undefined;

  const travas = (numero: string) => {
    const st = analise.status.get(numero);
    return {
      vence: st === "Eleito" ? 1 : st === "Eliminado" || st === "Não eleito" || st === "No 2º turno" || temSegundo ? 0 : undefined,
      vai2t: st === "No 2º turno" ? 1 : st === "Eliminado" || decidido ? 0 : undefined,
    } as { vence?: 0 | 1; vai2t?: 0 | 1 };
  };

  // Mostra quem tem alguma chance relevante (e no mínimo os 4 primeiros).
  const lista = chances.candidatos.filter((c, i) => i < 4 || c.vence1t >= 0.001 || c.vai2t >= 0.001 || c.primeiro >= 0.001);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chances</CardTitle>
        <CardDescription>
          {chances.simulacoes.toLocaleString("pt-BR")} simulações do restante da apuração,{" "}
          {chances.ufsLidas > 0 ? `estado por estado (${chances.ufsLidas} UFs lidas)` : "pelo total nacional"}. É uma estimativa
          estatística, não uma certeza.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {segundoTurno && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>
                Decide no 1º turno <strong className="text-lg">{chance(chances.decideNo1, travadoDecide)}</strong>
              </span>
              <span>
                <strong className="text-lg">{chance(chances.segundoTurno, travadoDecide === undefined ? undefined : travadoDecide === 1 ? 0 : 1)}</strong> Vai ter 2º turno
              </span>
            </div>
            <div className="flex h-3 rounded overflow-hidden bg-muted">
              <div className="bg-green-600" style={{ width: `${chances.decideNo1 * 100}%` }} />
              <div className="bg-slate-400" style={{ width: `${chances.segundoTurno * 100}%` }} />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead className="text-right">{segundoTurno ? "Vence no 1º turno" : "Vence"}</TableHead>
                {segundoTurno && <TableHead className="text-right">Vai ao 2º turno</TableHead>}
                <TableHead className="text-right">Termina em 1º</TableHead>
                <TableHead className="text-right">% final provável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c, i) => {
                const t = travas(c.numero);
                const cor = CORES[i % CORES.length];
                return (
                  <TableRow key={c.numero}>
                    <TableCell className="font-medium min-w-[140px]">{c.nome}</TableCell>
                    <TableCell className="text-right tabular-nums min-w-[90px]">
                      <span className="font-semibold">{chance(c.vence1t, t.vence)}</span>
                      <Barra p={t.vence ?? c.vence1t} cor={cor} />
                    </TableCell>
                    {segundoTurno && (
                      <TableCell className="text-right tabular-nums min-w-[90px]">
                        <span className="font-semibold">{chance(c.vai2t, t.vai2t)}</span>
                        <Barra p={t.vai2t ?? c.vai2t} cor={cor} />
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">{chance(c.primeiro)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                      {i < 6 ? `${formatPct(c.p05)} – ${formatPct(c.p95)}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Como é calculado: para cada estado, os votos que faltam = eleitores não apurados × comparecimento × votos válidos, divididos como os
          votos já apurados ali. Cada simulação sorteia variações: ±4% no comparecimento, ±10% na divisão dos votos restantes de cada estado e
          ±5% de tendência nacional por candidato. "% final provável" é o intervalo em que caem 90% das simulações. Chances só viram 0% ou
          100% quando a conta matemática fecha.
        </p>
      </CardContent>
    </Card>
  );
}
