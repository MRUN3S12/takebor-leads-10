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
  /** Código da abrangência ("br", "sp"...) */
  abrangencia: string;
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

/** Caminhos possíveis do arquivo de resultado, do formato mais novo ao mais antigo. */
export function resultadoUrls(cfg: TseConfig, ciclo: string): string[] {
  const uf = cfg.uf.toLowerCase();
  const cargo = cfg.cargo.padStart(4, "0");
  const ele = cfg.eleicao.padStart(6, "0");
  const dir = `${BASE}/${ciclo}/${cfg.eleicao}`;
  return [
    // 2026: <ciclo>/<eleicao>/dados/<uf>/<uf>-c<cargo>-e<eleicao>-u.json
    `${dir}/dados/${uf}/${uf}-c${cargo}-e${ele}-u.json`,
    // 2022: <ciclo>/<eleicao>/dados-simplificados/<uf>/<uf>-c<cargo>-e<eleicao>-r.json
    `${dir}/dados-simplificados/${uf}/${uf}-c${cargo}-e${ele}-r.json`,
  ];
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseCandidato(c: any, coligacao: string): Candidato {
  const vice = (c.vs ?? []).find((v: any) => v.tp === "v");
  return {
    seq: num(c.seq),
    numero: String(c.n ?? ""),
    nome: String(c.nmu || c.nm || ""),
    coligacao: String(c.cc ?? coligacao),
    vice: String(c.nv ?? vice?.nmu ?? vice?.nm ?? ""),
    votos: num(c.vap),
    pct: num(c.pvapn ?? c.pvap),
    eleito: isSim(c.e),
    situacao: String(c.st ?? ""),
    valido: !c.dvt || /v[áa]lido/i.test(c.dvt),
  };
}

/**
 * Aceita os dois formatos do TSE:
 *  - 2026 ("-u.json"): candidatos em carg[].agr[].par[].cand[] e totais em
 *    objetos s (seções), e (eleitorado) e v (votos);
 *  - 2022 ("-r.json"): candidatos em cand[] e totais soltos na raiz.
 */
export function parseResultado(raw: any, cargo?: string): Snapshot {
  let candidatos: Candidato[];
  if (Array.isArray(raw.carg)) {
    const carg = raw.carg.find((c: any) => !cargo || String(c.cd) === cargo) ?? raw.carg[0];
    candidatos = (carg?.agr ?? []).flatMap((a: any) =>
      (a.par ?? []).flatMap((p: any) => (p.cand ?? []).map((c: any) => parseCandidato(c, a.com || a.nm || ""))),
    );
  } else {
    candidatos = (raw.cand ?? []).map((c: any) => parseCandidato(c, ""));
  }
  candidatos.sort((a, b) => b.votos - a.votos || a.seq - b.seq);

  // No formato 2026 os totais ficam em sub-objetos; no antigo, na raiz.
  const s = typeof raw.s === "object" && raw.s ? raw.s : raw;
  const e = typeof raw.e === "object" && raw.e ? raw.e : raw;
  const v = typeof raw.v === "object" && raw.v ? raw.v : raw;

  const somaValidos = candidatos.filter((c) => c.valido).reduce((acc, c) => acc + c.votos, 0);
  const eleitorado = num(e.te ?? raw.e);
  const eleitoradoApurado = num(e.est ?? raw.ea);
  const naoApurado = e.esnt ?? raw.ena;
  const ena = naoApurado !== undefined ? num(naoApurado) : Math.max(0, eleitorado - eleitoradoApurado);

  return {
    fetchedAt: Date.now(),
    totalizadoEm: [raw.dt, raw.ht].filter(Boolean).join(" "),
    abrangencia: String(raw.cdabr ?? "").toLowerCase(),
    pctSecoes: num(s.pstn ?? s.pst),
    secoesTotalizadas: num(s.st),
    secoesTotal: num(s.ts ?? raw.s),
    eleitorado,
    eleitoradoApurado,
    eleitoradoNaoApurado: ena,
    comparecimento: num(e.c ?? raw.c),
    abstencao: num(e.a ?? raw.a),
    brancos: num(v.vb),
    nulos: num(v.tvn ?? v.vn),
    validos: somaValidos || num(v.vv ?? v.vvc),
    matematicamenteDefinido: isSim(raw.md),
    candidatos,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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

const urlFuncionou = new Map<string, string>();

/** Busca o resultado tentando cada formato de caminho; lembra o que funcionou. */
export async function fetchResultado(urls: string[], fetcher: Fetcher = fetchTse): Promise<unknown> {
  const chave = urls.join("|");
  const conhecida = urlFuncionou.get(chave);
  const ordem = conhecida ? [conhecida, ...urls.filter((u) => u !== conhecida)] : urls;
  const erros: string[] = [];
  for (const u of ordem) {
    try {
      const data = await fetcher(u);
      urlFuncionou.set(chave, u);
      return data;
    } catch (e) {
      erros.push((e as Error).message);
    }
  }
  throw new Error(erros.join(" || "));
}

const cicloCache = new Map<string, string>();

/** Descobre a pasta do ciclo (ex.: "ele2026") a partir do config público do TSE. */
export async function descobrirCiclo(eleicao: string, fetcher: Fetcher = fetchTse): Promise<string | null> {
  if (cicloCache.has(eleicao)) return cicloCache.get(eleicao)!;
  try {
    type Pleito = { c?: string; e?: Array<{ cd?: string }> };
    const cfg = (await fetcher(`${BASE}/comum/config/ele-c.json`)) as { pl?: Pleito[] } | null;
    const pleito = (cfg?.pl ?? []).find((pl) => (pl.e ?? []).some((e) => String(e.cd) === eleicao));
    const ciclo = typeof pleito?.c === "string" ? pleito.c : null;
    if (ciclo) {
      cicloCache.set(eleicao, ciclo);
      return ciclo;
    }
  } catch {
    /* sem config: usa o padrão */
  }
  return null;
}
