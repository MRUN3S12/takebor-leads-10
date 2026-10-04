import type { Snapshot } from "./tse";

// Modelo de chances (Monte Carlo estratificado por UF).
//
// Para cada estrato (UF, ou o "resto" do país quando nem todas as UFs foram
// lidas) estimamos quantos votos válidos ainda faltam e como eles se dividem:
//   restante = eleitores não apurados × comparecimento × taxa de válidos
//   divisão  = divisão atual dos votos daquele estrato
// Em cada simulação, perturbamos:
//   - o comparecimento de cada estrato (±4%);
//   - a divisão dos votos restantes em cada estrato (±10% relativo por
//     candidato — o que falta apurar costuma ser diferente do que já entrou);
//   - um desvio nacional comum a todos os estratos (±5% relativo por candidato).
// A chance é a fração das simulações em que o evento acontece.

export const UFS = [
  "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg", "pa",
  "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to", "zz",
];

const SIGMA_ESTRATO = 0.1;
const SIGMA_ESTRATO_VAZIO = 0.25;
const SIGMA_NACIONAL = 0.05;
const SIGMA_COMPARECIMENTO = 0.04;
const SIGMA_SEM_UF = 0.15;

interface Estrato {
  votos: number[];
  restanteEleitores: number;
  comparecimento: number;
  validosTaxa: number;
  sigma: number;
}

export interface ChanceCandidato {
  numero: string;
  nome: string;
  vence1t: number;
  vai2t: number;
  primeiro: number;
  /** Intervalo de 90% do % final de votos válidos */
  p05: number;
  p50: number;
  p95: number;
}

export interface Chances {
  simulacoes: number;
  estratos: number;
  ufsLidas: number;
  decideNo1: number;
  segundoTurno: number;
  candidatos: ChanceCandidato[];
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number) {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function taxas(comparecimento: number, apurado: number, validos: number, padrao: { c: number; v: number }) {
  return {
    c: apurado > 0 && comparecimento > 0 ? Math.min(1, comparecimento / apurado) : padrao.c,
    v: comparecimento > 0 && validos > 0 ? validos / comparecimento : padrao.v,
  };
}

function montarEstratos(nacional: Snapshot, ufs: Snapshot[], numeros: string[]): Estrato[] {
  const tNac = taxas(nacional.comparecimento, nacional.eleitoradoApurado, nacional.validos, { c: 0.8, v: 0.95 });
  const votosDe = (s: Snapshot) => numeros.map((n) => s.candidatos.find((c) => c.numero === n)?.votos ?? 0);

  if (ufs.length === 0) {
    return [
      {
        votos: votosDe(nacional),
        restanteEleitores: nacional.eleitoradoNaoApurado,
        comparecimento: tNac.c,
        validosTaxa: tNac.v,
        sigma: SIGMA_SEM_UF,
      },
    ];
  }

  const estratos: Estrato[] = ufs.map((u) => {
    const t = taxas(u.comparecimento, u.eleitoradoApurado, u.validos, tNac);
    const votos = votosDe(u);
    return {
      votos,
      restanteEleitores: u.eleitoradoNaoApurado,
      comparecimento: t.c,
      validosTaxa: t.v,
      sigma: votos.some((v) => v > 0) ? SIGMA_ESTRATO : SIGMA_ESTRATO_VAZIO,
    };
  });

  // UFs que não vieram: o que sobra do total nacional vira um estrato só.
  if (ufs.length < UFS.length) {
    const soma = (f: (s: Snapshot) => number) => ufs.reduce((a, u) => a + f(u), 0);
    const votosNac = votosDe(nacional);
    const votosUfs = numeros.map((_, i) => estratos.reduce((a, e) => a + e.votos[i], 0));
    const resto = votosNac.map((v, i) => Math.max(0, v - votosUfs[i]));
    const restoEleitores = Math.max(0, nacional.eleitoradoNaoApurado - soma((u) => u.eleitoradoNaoApurado));
    if (restoEleitores > 0 || resto.some((v) => v > 0)) {
      estratos.push({
        votos: resto,
        restanteEleitores: restoEleitores,
        comparecimento: tNac.c,
        validosTaxa: tNac.v,
        sigma: SIGMA_SEM_UF,
      });
    }
  }
  return estratos;
}

export function calcularChances(
  nacional: Snapshot,
  ufs: Snapshot[],
  segundoTurno: boolean,
  simulacoes = 4000,
): Chances | null {
  const cands = nacional.candidatos.filter((c) => c.valido);
  if (cands.length === 0) return null;
  const numeros = cands.map((c) => c.numero);
  const k = numeros.length;
  const estratos = montarEstratos(nacional, ufs, numeros);

  // Divisão de referência para estratos ainda sem votos: a nacional.
  const totalNac = cands.reduce((a, c) => a + c.votos, 0) || 1;
  const shareNac = cands.map((c) => c.votos / totalNac);
  const shares = estratos.map((e) => {
    const t = e.votos.reduce((a, b) => a + b, 0);
    return t > 0 ? e.votos.map((v) => v / t) : shareNac;
  });

  const r = rng(hash(`${nacional.totalizadoEm}|${nacional.validos}|${ufs.length}`));
  const vence1t = new Array(k).fill(0);
  const vai2t = new Array(k).fill(0);
  const primeiro = new Array(k).fill(0);
  let decide = 0;
  const TOP_PCT = Math.min(k, 6);
  const finais: number[][] = Array.from({ length: TOP_PCT }, () => []);
  const finalVotos = new Array(k);
  const pert = new Array(k);
  const z = new Array(k);

  for (let s = 0; s < simulacoes; s++) {
    for (let i = 0; i < k; i++) {
      z[i] = gauss(r) * SIGMA_NACIONAL;
      finalVotos[i] = 0;
    }
    for (let j = 0; j < estratos.length; j++) {
      const e = estratos[j];
      for (let i = 0; i < k; i++) finalVotos[i] += e.votos[i];
      if (e.restanteEleitores <= 0) continue;
      const comp = Math.min(1, Math.max(0, e.comparecimento * (1 + gauss(r) * SIGMA_COMPARECIMENTO)));
      const restante = e.restanteEleitores * comp * e.validosTaxa;
      let soma = 0;
      for (let i = 0; i < k; i++) {
        pert[i] = shares[j][i] * Math.exp(gauss(r) * e.sigma + z[i]);
        soma += pert[i];
      }
      if (soma <= 0) continue;
      for (let i = 0; i < k; i++) finalVotos[i] += (restante * pert[i]) / soma;
    }

    let total = 0;
    let a = 0;
    let b = -1;
    for (let i = 0; i < k; i++) {
      total += finalVotos[i];
      if (finalVotos[i] > finalVotos[a]) a = i;
    }
    for (let i = 0; i < k; i++) if (i !== a && (b < 0 || finalVotos[i] > finalVotos[b])) b = i;

    primeiro[a]++;
    if (!segundoTurno || finalVotos[a] > total / 2) {
      vence1t[a]++;
      decide++;
    } else {
      vai2t[a]++;
      if (b >= 0) vai2t[b]++;
    }
    for (let i = 0; i < TOP_PCT; i++) finais[i].push(total > 0 ? (finalVotos[i] / total) * 100 : 0);
  }

  const q = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((x, y) => x - y);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  };

  return {
    simulacoes,
    estratos: estratos.length,
    ufsLidas: ufs.length,
    decideNo1: decide / simulacoes,
    segundoTurno: 1 - decide / simulacoes,
    candidatos: cands.map((c, i) => ({
      numero: c.numero,
      nome: c.nome,
      vence1t: vence1t[i] / simulacoes,
      vai2t: vai2t[i] / simulacoes,
      primeiro: primeiro[i] / simulacoes,
      p05: i < TOP_PCT ? q(finais[i], 0.05) : c.pct,
      p50: i < TOP_PCT ? q(finais[i], 0.5) : c.pct,
      p95: i < TOP_PCT ? q(finais[i], 0.95) : c.pct,
    })),
  };
}
