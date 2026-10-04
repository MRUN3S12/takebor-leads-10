import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPct } from "@/lib/apuracao";
import type { Snapshot } from "@/lib/tse";

const REGIOES: Array<{ nome: string; ufs: string[] }> = [
  { nome: "Norte", ufs: ["ac", "ap", "am", "pa", "ro", "rr", "to"] },
  { nome: "Nordeste", ufs: ["al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se"] },
  { nome: "Centro-Oeste", ufs: ["df", "go", "mt", "ms"] },
  { nome: "Sudeste", ufs: ["es", "mg", "rj", "sp"] },
  { nome: "Sul", ufs: ["pr", "rs", "sc"] },
  { nome: "Exterior", ufs: ["zz"] },
];

/** % das seções apuradas em cada região, somando os arquivos por UF. */
export function PainelRegioes({ ufs }: { ufs: Snapshot[] }) {
  const linhas = REGIOES.map((r) => {
    const doGrupo = ufs.filter((u) => r.ufs.includes(u.abrangencia));
    const total = doGrupo.reduce((a, u) => a + u.secoesTotal, 0);
    const apuradas = doGrupo.reduce((a, u) => a + u.secoesTotalizadas, 0);
    return { nome: r.nome, pct: total > 0 ? (apuradas / total) * 100 : null };
  }).filter((l) => l.pct !== null) as Array<{ nome: string; pct: number }>;

  if (linhas.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Apuração por região</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {linhas.map((l) => (
          <div key={l.nome}>
            <div className="flex justify-between text-sm mb-1">
              <span>{l.nome}</span>
              <span className="font-semibold tabular-nums">{formatPct(l.pct)}</span>
            </div>
            <Progress value={l.pct} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
