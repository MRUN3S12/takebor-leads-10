// Leitura dos arquivos JSON públicos do app "Resultados" do TSE
// (resultados.tse.jus.br/oficial). Os mesmos arquivos que o app oficial consome.

export interface TseConfig {
  /** Código da eleição (ex.: 6257) */
  eleicao: string;
  /** UF em minúsculas ("br" para o resultado nacional) */
  uf: string;
  /** Código do cargo (1 = Presidente, 3 = Governador, 5 = Senador...) */
  cargo: string;
  /** Pasta do ciclo eleitoral (ex.: "ele2026"); vazio = detectar automaticamente */
  ciclo: string;
}

export interface Candidato {
  seq: number;
  numero: string;
  nome: string;
  coligacao: string;
  vice: string;
  votos: number;
  /** % dos votos válidos, como informado pelo TSE */
  pct: number;
  /** Marcado como eleito pelo TSE */
  eleito: boolean;
  /** Situação textual do TSE ("Eleito", "2º turno", "Não eleito"...) */
  situacao: string;
  valido: boolean;
}

export interface Snapshot {
  fetchedAt: number;
  /** Data/hora da totalização informada pelo TSE (dt + ht) */
  totalizadoEm: string;
  pctSecoes: number;
  secoesTotalizadas: number;
  secoesTotal: number;
  eleitorado: number;
  eleitoradoApurado: number;
  eleitoradoNaoApurado: number;
  comparecimento: number;
  abstencao: number;
  brancos: number;
  nulos: number;
  validos: number;
  /** TSE sinalizou que o resultado está matematicamente definido */
  matematicamenteDefinido: boolean;
  candidatos: Candidato[];
}

const BASE = "https://resultados.tse.jus.br/oficial";

export const CARGOS: Record<string, string> = {
  "1": "Presidente",
  "3": "Governador",
  "5": "Senador",
  "6": "Deputado Federal",
  "7": "Deputado Estadual",
  "11": "Prefeito",
};

/** Cargos decididos por maioria absoluta dos votos válidos (com 2º turno). */
export function cargoTemSegundoTurno(cargo: string): boolean {
  return cargo === "1" || cargo === "3" || cargo === "11";
}

/**
 * Aceita a URL do app oficial, ex.:
 * https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/resultados
 */
export function parseTseAppUrl(url: string): Partial<TseConfig> | null {
  const eleicao = url.match(/eleicao\/(\d+)/i)?.[1];
  if (!eleicao) return null;
  const uf = url.match(/\/uf\/([a-z]{2})/i)?.[1]?.toLowerCase();
  const cargo = url.match(/\/cargo\/(\d+)/i)?.[1];
  return { eleicao, uf: uf ?? "br", cargo: cargo ?? "1" };
}

export function resultadoUrl(cfg: TseConfig, ciclo: string): string {
  const uf = cfg.uf.toLowerCase();
  const cargo = cfg.cargo.padStart(4, "0");
  const ele = cfg.eleicao.padStart(6, "0");
  return `${BASE}/${ciclo}/${cfg.eleicao}/dados-simplificados/${uf}/${uf}-c${cargo}-e${ele}-r.json`;
}

/** Números do TSE vêm como string ("57259504", "48,43"). */
export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string" || v.trim() === "") return 0;
  const s = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const isSim = (v: unknown) => typeof v === "string" && /^s/i.test(v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseResultado(raw: any): Snapshot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidatos: Candidato[] = (raw.cand ?? []).map((c: any) => ({
    seq: num(c.seq),
    numero: String(c.n ?? ""),
    nome: String(c.nm ?? ""),
    coligacao: String(c.cc ?? ""),
    vice: String(c.nv ?? ""),
    votos: num(c.vap),
    pct: num(c.pvap),
    eleito: isSim(c.e),
    situacao: String(c.st ?? ""),
    valido: !c.dvt || /v[áa]lido/i.test(c.dvt),
  }));
  candidatos.sort((a, b) => b.votos - a.votos || a.seq - b.seq);

  const somaValidos = candidatos.filter((c) => c.valido).reduce((s, c) => s + c.votos, 0);
  const eleitorado = num(raw.e);
  const eleitoradoApurado = num(raw.ea);
  const ena = raw.ena !== undefined ? num(raw.ena) : Math.max(0, eleitorado - eleitoradoApurado);

  return {
    fetchedAt: Date.now(),
    totalizadoEm: [raw.dt, raw.ht].filter(Boolean).join(" "),
    pctSecoes: num(raw.pst),
    secoesTotalizadas: num(raw.st),
    secoesTotal: num(raw.s),
    eleitorado,
    eleitoradoApurado,
    eleitoradoNaoApurado: ena,
    comparecimento: num(raw.c),
    abstencao: num(raw.a),
    brancos: num(raw.vb),
    nulos: num(raw.tvn ?? raw.vn),
    validos: somaValidos || num(raw.vv ?? raw.vvc),
    matematicamenteDefinido: isSim(raw.md),
    candidatos,
  };
}

// ---------------------------------------------------------------------------
// Busca com fallback de CORS. O site do TSE normalmente libera CORS, mas se o
// navegador bloquear, tentamos proxies públicos e lembramos qual funcionou.

export type Fetcher = (url: string) => Promise<unknown>;

const PROXIES: Array<{ nome: string; wrap: (u: string) => string }> = [
  { nome: "direto", wrap: (u) => u },
  { nome: "corsproxy.io", wrap: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
  { nome: "allorigins", wrap: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
];

let proxyPreferido = 0;
export let ultimoProxyUsado = "direto";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const fetchTse: Fetcher = async (url) => {
  const ordem = [proxyPreferido, ...PROXIES.map((_, i) => i).filter((i) => i !== proxyPreferido)];
  const erros: string[] = [];
  for (const i of ordem) {
    try {
      const data = await fetchJson(PROXIES[i].wrap(url));
      proxyPreferido = i;
      ultimoProxyUsado = PROXIES[i].nome;
      return data;
    } catch (e) {
      erros.push(`${PROXIES[i].nome}: ${(e as Error).message}`);
      // 404 direto significa que o arquivo não existe; proxies não vão ajudar.
      if (i === 0 && /HTTP 404/.test((e as Error).message)) break;
    }
  }
  throw new Error(erros.join(" | "));
};

const cicloCache = new Map<string, string>();

/** Descobre a pasta do ciclo (ex.: "ele2026") a partir do config público do TSE. */
export async function descobrirCiclo(eleicao: string, fetcher: Fetcher = fetchTse): Promise<string | null> {
  if (cicloCache.has(eleicao)) return cicloCache.get(eleicao)!;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg: any = await fetcher(`${BASE}/comum/config/ele-c.json`);
    const ciclo = typeof cfg?.c === "string" ? cfg.c : null;
    const temEleicao = JSON.stringify(cfg?.pl ?? []).includes(`"${eleicao}"`);
    if (ciclo && temEleicao) {
      cicloCache.set(eleicao, ciclo);
      return ciclo;
    }
  } catch {
    /* sem config: usa o padrão */
  }
  return null;
}
