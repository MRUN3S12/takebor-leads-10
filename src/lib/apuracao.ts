import type { Candidato, Snapshot } from "./tse";

// Análise de irreversibilidade.
//
// Dois níveis de "votos que ainda podem entrar":
//  - matemático: TODO o eleitorado ainda não apurado comparece e vota válido.
//    Se um resultado se mantém nesse cenário, ele é impossível de reverter.
//  - realista: eleitorado não apurado × (comparecimento atual + 5 p.p.) × taxa
//    de votos válidos atual. Folga confortável, mas não é uma garantia absoluta.

export type Nivel = "matematico" | "realista";

export interface Fato {
  /** Chave estável usada para disparar o alerta uma única vez */
  chave: string;
  nivel: Nivel | "tse";
  titulo: string;
  detalhe: string;
}

export interface Analise {
  restanteMax: number;
  restanteRealista: number;
  /** Votos que entraram desde o snapshot anterior, por candidato (% do lote) */
  tendenciaLote: Map<string, number> | null;
  /** Projeção final assumindo que o restante segue o último lote (ou o atual) */
  projecao: Array<{ numero: string; nome: string; votos: number; pct: number }>;
  /** % líquido dos votos restantes que o 2º precisa tirar do 1º para virar */
  viradaNecessaria: number | null;
  /** % dos votos restantes que o líder precisa para passar de 50% */
  lider50Necessario: number | null;
  fatos: Fato[];
  /** Situação de cada candidato no cenário matemático */
  status: Map<string, string>;
}

const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export function votosRestantes(s: Snapshot) {
  const ena = s.eleitoradoNaoApurado;
  const comparecimentoTaxa = s.eleitoradoApurado > 0 ? s.comparecimento / s.eleitoradoApurado : 0.8;
  const validosTaxa = s.comparecimento > 0 ? s.validos / s.comparecimento : 0.95;
  return {
    restanteMax: ena,
    restanteRealista: Math.round(ena * Math.min(1, comparecimentoTaxa + 0.05) * validosTaxa),
  };
}

/** Candidato i não pode mais cair abaixo do 2º lugar? */
function garantidoTop2(v: number[], i: number, R: number): boolean {
  const outros = v.filter((_, j) => j !== i).sort((a, b) => b - a);
  if (outros.length < 2) return true;
  const custo = Math.max(0, v[i] - outros[0] + 1) + Math.max(0, v[i] - outros[1] + 1);
  return custo > R;
}

/** Candidato i já não tem como chegar ao 2º lugar? */
function eliminadoTop2(v: number[], i: number, R: number): boolean {
  return v.filter((x, j) => j !== i && x > v[i] + R).length >= 2;
}

function analisarCenario(
  cands: Candidato[],
  validos: number,
  R: number,
  nivel: Nivel,
  segundoTurno: boolean,
): { fatos: Fato[]; status: Map<string, string> } {
  const fatos: Fato[] = [];
  const status = new Map<string, string>();
  if (cands.length === 0) return { fatos, status };
  const v = cands.map((c) => c.votos);
  const [l, s] = cands;
  const sufixo = nivel === "matematico" ? "" : "-realista";
  const qual = nivel === "matematico" ? "Matematicamente" : "Praticamente";
  const cenario =
    nivel === "matematico"
      ? `mesmo que todos os ${R.toLocaleString("pt-BR")} eleitores restantes votem contra`
      : `considerando ~${R.toLocaleString("pt-BR")} votos válidos restantes estimados`;

  const primeiroTravado = !s || l.votos > s.votos + R;

  if (segundoTurno) {
    const venceNo1o = l.votos > (validos + R) / 2;
    const ninguemChega50 = 2 * l.votos + R <= validos;

    if (venceNo1o) {
      fatos.push({
        chave: `vence-1t-${l.numero}${sufixo}`,
        nivel,
        titulo: `${qual} eleito: ${l.nome} vence no 1º turno`,
        detalhe: `${l.nome} terá mais de 50% dos votos válidos ${cenario}.`,
      });
      status.set(l.numero, "Eleito");
      cands.slice(1).forEach((c) => status.set(c.numero, "Não eleito"));
      return { fatos, status };
    }

    if (ninguemChega50) {
      fatos.push({
        chave: `tem-2t${sufixo}`,
        nivel,
        titulo: `${qual} certo: vai haver 2º turno`,
        detalhe: `Nenhum candidato consegue mais passar de 50% dos votos válidos ${cenario}.`,
      });
    }

    const vagas = cands.filter((_, i) => garantidoTop2(v, i, R));
    vagas.forEach((c) => {
      // Só é "vaga no 2º turno" se não houver chance do líder levar no 1º.
      const titulo = ninguemChega50
        ? `${qual} garantido no 2º turno: ${c.nome}`
        : `${c.nome} não sai mais do top 2`;
      fatos.push({
        chave: `top2-${c.numero}${ninguemChega50 ? "" : "-parcial"}${sufixo}`,
        nivel,
        titulo,
        detalhe: `${c.nome} não pode mais ser ultrapassado por dois adversários ${cenario}.`,
      });
    });

    if (ninguemChega50 && vagas.length >= 2) {
      fatos.push({
        chave: `confronto-${vagas[0].numero}-${vagas[1].numero}${sufixo}`,
        nivel,
        titulo: `${qual} definido: 2º turno entre ${vagas[0].nome} e ${vagas[1].nome}`,
        detalhe: `Os dois finalistas não podem mais mudar ${cenario}.`,
      });
    }

    cands.forEach((c, i) => {
      if (eliminadoTop2(v, i, R)) status.set(c.numero, "Eliminado");
      else if (garantidoTop2(v, i, R)) status.set(c.numero, ninguemChega50 ? "No 2º turno" : "Top 2 garantido");
      else status.set(c.numero, "Em disputa");
    });
  } else {
    if (primeiroTravado) {
      fatos.push({
        chave: `vence-${l.numero}${sufixo}`,
        nivel,
        titulo: `${qual} eleito: ${l.nome}`,
        detalhe: `${l.nome} não pode mais ser alcançado ${cenario}.`,
      });
    }
    cands.forEach((c, i) =>
      status.set(c.numero, i === 0 && primeiroTravado ? "Eleito" : v[0] > c.votos + R ? "Não eleito" : "Em disputa"),
    );
  }

  if (primeiroTravado && s) {
    fatos.push({
      chave: `1lugar-${l.numero}${sufixo}`,
      nivel,
      titulo: `${qual} irreversível: ${l.nome} termina em 1º lugar`,
      detalhe: `A vantagem de ${(l.votos - s.votos).toLocaleString("pt-BR")} votos sobre ${s.nome} não pode mais ser tirada ${cenario}.`,
    });
  }

  return { fatos, status };
}

export function analisar(s: Snapshot, anterior: Snapshot | null, segundoTurno: boolean): Analise {
  const { restanteMax, restanteRealista } = votosRestantes(s);
  const cands = s.candidatos.filter((c) => c.valido);
  const fatos: Fato[] = [];

  // Sinais oficiais do TSE
  if (s.pctSecoes >= 100 || (s.secoesTotal > 0 && s.secoesTotalizadas >= s.secoesTotal)) {
    fatos.push({ chave: "apuracao-100", nivel: "tse", titulo: "Apuração concluída: 100% das seções", detalhe: "Resultado final." });
  }
  if (s.matematicamenteDefinido) {
    fatos.push({
      chave: "tse-md",
      nivel: "tse",
      titulo: "TSE: resultado matematicamente definido",
      detalhe: "O próprio TSE sinalizou que o resultado não muda mais.",
    });
  }
  cands
    .filter((c) => c.eleito)
    .forEach((c) =>
      fatos.push({ chave: `tse-eleito-${c.numero}`, nivel: "tse", titulo: `TSE declara ${c.nome} eleito`, detalhe: c.situacao }),
    );

  const mat = analisarCenario(cands, s.validos, restanteMax, "matematico", segundoTurno);
  const real = analisarCenario(cands, s.validos, restanteRealista, "realista", segundoTurno);
  fatos.push(...mat.fatos);
  // Fatos realistas só interessam enquanto o equivalente matemático não saiu.
  const chavesMat = new Set(mat.fatos.map((f) => f.chave));
  fatos.push(...real.fatos.filter((f) => !chavesMat.has(f.chave.replace("-realista", ""))));

  // Tendência do último lote de votos
  let tendenciaLote: Map<string, number> | null = null;
  if (anterior) {
    const delta = new Map<string, number>();
    let total = 0;
    for (const c of cands) {
      const ant = anterior.candidatos.find((a) => a.numero === c.numero)?.votos ?? 0;
      const d = Math.max(0, c.votos - ant);
      delta.set(c.numero, d);
      total += d;
    }
    if (total > 0) {
      tendenciaLote = new Map([...delta].map(([k, d]) => [k, (d / total) * 100]));
    }
  }

  const projVotos = cands.map((c) => {
    const share = tendenciaLote?.get(c.numero) ?? (s.validos > 0 ? (c.votos / s.validos) * 100 : 0);
    return { numero: c.numero, nome: c.nome, votos: c.votos + (restanteRealista * share) / 100 };
  });
  const projTotal = projVotos.reduce((a, c) => a + c.votos, 0) || 1;
  const projecao = projVotos
    .map((p) => ({ ...p, votos: Math.round(p.votos), pct: (p.votos / projTotal) * 100 }))
    .sort((a, b) => b.votos - a.votos);

  const [l, sg] = cands;
  const viradaNecessaria = l && sg && restanteRealista > 0 ? ((l.votos - sg.votos) / restanteRealista) * 100 : null;
  const lider50Necessario =
    l && restanteRealista > 0 ? (((s.validos + restanteRealista) / 2 - l.votos) / restanteRealista) * 100 : null;

  return {
    restanteMax,
    restanteRealista,
    tendenciaLote,
    projecao,
    viradaNecessaria,
    lider50Necessario,
    fatos,
    status: mat.status,
  };
}

export function resumoFalado(s: Snapshot, max = 3): string {
  const partes = s.candidatos
    .filter((c) => c.valido)
    .slice(0, max)
    .map((c) => `${c.nome}, ${pct(c.pct)}`);
  return `Com ${pct(s.pctSecoes)} das seções apuradas: ${partes.join("; ")}.`;
}

export { pct as formatPct };
