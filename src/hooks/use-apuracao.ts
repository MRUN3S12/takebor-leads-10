import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { analisar, resumoFalado, type Fato } from "@/lib/apuracao";
import { calcularChances, UFS, type Chances } from "@/lib/modelo";
import { criarSimulador } from "@/lib/simulador";
import {
  cargoTemSegundoTurno,
  descobrirCiclo,
  fetchResultado,
  fetchTse,
  parseResultado,
  resultadoUrls,
  ultimoProxyUsado,
  type Snapshot,
  type TseConfig,
} from "@/lib/tse";

export interface Opcoes {
  intervaloSeg: number;
  simulacao: boolean;
  voz: boolean;
  som: boolean;
  notificacao: boolean;
  narrarAtualizacoes: boolean;
  /** Avisar também estimativas: "praticamente irreversível" e chance do modelo ≥ 99% */
  alertasRealistas: boolean;
}

export interface EventoLog {
  em: number;
  fato: Fato;
}

export function falar(texto: string) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "pt-BR";
  const voz = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (voz) u.voice = voz;
  window.speechSynthesis.speak(u);
}

// Um único AudioContext: o iOS só libera áudio num contexto criado/retomado
// durante um toque do usuário (o botão "Ativar alertas"), então reaproveitamos.
let audioCtx: AudioContext | null = null;

export function bip() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
    }
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* áudio indisponível */
  }
}

const storageKey = (cfg: TseConfig, sim: boolean) =>
  `apuracao:alertas:${sim ? "sim" : "real"}:${cfg.eleicao}:${cfg.uf}:${cfg.cargo}`;

function lerDisparados(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function useApuracao(cfg: TseConfig, opcoes: Opcoes) {
  const [historico, setHistorico] = useState<Snapshot[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [ultimaConsulta, setUltimaConsulta] = useState<number | null>(null);
  const [eventos, setEventos] = useState<EventoLog[]>([]);
  const [fonte, setFonte] = useState<string>("");
  const [chances, setChances] = useState<Chances | null>(null);

  const opcoesRef = useRef(opcoes);
  opcoesRef.current = opcoes;
  const disparadosRef = useRef<Set<string>>(new Set());
  const historicoRef = useRef<Snapshot[]>([]);
  const simRef = useRef<(() => Promise<unknown>) | null>(null);
  const emAndamento = useRef(false);
  const ufsRef = useRef<{ em: number; snaps: Snapshot[] }>({ em: 0, snaps: [] });

  const segundoTurno = cargoTemSegundoTurno(cfg.cargo);
  const chaveCfg = `${cfg.eleicao}|${cfg.uf}|${cfg.cargo}|${cfg.ciclo}|${opcoes.simulacao}`;

  // Reinicia tudo quando a eleição/cargo/modo muda
  useEffect(() => {
    historicoRef.current = [];
    setHistorico([]);
    setEventos([]);
    setErro(null);
    setChances(null);
    ufsRef.current = { em: 0, snaps: [] };
    disparadosRef.current = lerDisparados(storageKey(cfg, opcoes.simulacao));
    simRef.current = opcoes.simulacao ? criarSimulador(cfg.eleicao) : null;
    if (opcoes.simulacao) disparadosRef.current = new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCfg]);

  const alertar = useCallback(
    (fato: Fato) => {
      const o = opcoesRef.current;
      setEventos((ev) => [{ em: Date.now(), fato }, ...ev]);
      const forte = fato.nivel === "tse" || fato.nivel === "matematico";
      toast(fato.titulo, { description: fato.detalhe, duration: forte ? 20000 : 8000 });
      if (o.som) bip();
      if (o.voz) falar(fato.titulo);
      if (o.notificacao && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(fato.titulo, { body: fato.detalhe, tag: fato.chave });
        } catch {
          /* alguns navegadores móveis só notificam via service worker */
        }
      }
    },
    [],
  );

  const consultar = useCallback(async () => {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setCarregando(true);
    try {
      let raw: unknown;
      let ciclo = "";
      if (simRef.current) {
        raw = await simRef.current();
        setFonte("simulação");
      } else {
        ciclo = cfg.ciclo || (await descobrirCiclo(cfg.eleicao)) || "ele2026";
        raw = await fetchResultado(resultadoUrls(cfg, ciclo));
        setFonte(`${ultimoProxyUsado} · ${ciclo}`);
      }
      const snap = parseResultado(raw, cfg.cargo);
      setUltimaConsulta(Date.now());
      setErro(null);

      const hist = historicoRef.current;
      const ultimo = hist[hist.length - 1];
      const novo = !ultimo || ultimo.totalizadoEm !== snap.totalizadoEm || ultimo.pctSecoes !== snap.pctSecoes;
      if (!novo) return;

      const proxHist = [...hist, snap];
      historicoRef.current = proxHist;
      setHistorico(proxHist);

      const o = opcoesRef.current;
      if (o.narrarAtualizacoes && o.voz && ultimo) falar(resumoFalado(snap));

      const analise = analisar(snap, ultimo ?? null, segundoTurno);
      const fatos = [...analise.fatos];

      // Modelo de chances: no resultado nacional, lê também cada UF (no
      // máximo a cada 30 s) para saber de onde vêm os votos que faltam.
      if (!o.simulacao && cfg.uf.toLowerCase() === "br" && Date.now() - ufsRef.current.em > 30_000) {
        const lidas = await Promise.allSettled(
          UFS.map(async (uf) =>
            parseResultado(await fetchResultado(resultadoUrls({ ...cfg, uf }, ciclo), fetchTse), cfg.cargo),
          ),
        );
        ufsRef.current = {
          em: Date.now(),
          snaps: lidas.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
        };
      }
      const ch = calcularChances(snap, o.simulacao ? [] : ufsRef.current.snaps, segundoTurno);
      setChances(ch);
      if (ch && snap.pctSecoes > 0) {
        const pc = (x: number) => `${(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
        const base = `Modelo com ${ch.simulacoes.toLocaleString("pt-BR")} simulações a partir de ${ch.ufsLidas || "nenhuma"} UF(s).`;
        if (segundoTurno && ch.segundoTurno >= 0.99) {
          fatos.push({ chave: "modelo-2t", nivel: "modelo", titulo: `Chance de 2º turno: ${pc(ch.segundoTurno)}`, detalhe: base });
        }
        for (const c of ch.candidatos) {
          if (c.vence1t >= 0.99) {
            fatos.push({
              chave: `modelo-vence-${c.numero}`,
              nivel: "modelo",
              titulo: `${c.nome}: ${pc(c.vence1t)} de chance de vencer${segundoTurno ? " no 1º turno" : ""}`,
              detalhe: base,
            });
          }
          if (segundoTurno && c.vai2t >= 0.99) {
            fatos.push({
              chave: `modelo-top2-${c.numero}`,
              nivel: "modelo",
              titulo: `${c.nome}: ${pc(c.vai2t)} de chance de ir ao 2º turno`,
              detalhe: base,
            });
          }
        }
      }

      const key = storageKey(cfg, o.simulacao);
      for (const fato of fatos) {
        if ((fato.nivel === "realista" || fato.nivel === "modelo") && !o.alertasRealistas) continue;
        if (disparadosRef.current.has(fato.chave)) continue;
        disparadosRef.current.add(fato.chave);
        alertar(fato);
      }
      if (!o.simulacao) {
        try {
          localStorage.setItem(key, JSON.stringify([...disparadosRef.current]));
        } catch {
          /* armazenamento indisponível */
        }
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      emAndamento.current = false;
      setCarregando(false);
    }
  }, [cfg, segundoTurno, alertar]);

  useEffect(() => {
    consultar();
    const ms = Math.max(5, opcoes.intervaloSeg) * 1000;
    const id = window.setInterval(consultar, ms);
    return () => window.clearInterval(id);
  }, [consultar, opcoes.intervaloSeg, chaveCfg]);

  const atual = historico[historico.length - 1] ?? null;
  const anterior = historico[historico.length - 2] ?? null;
  const analise = useMemo(
    () => (atual ? analisar(atual, anterior, segundoTurno) : null),
    [atual, anterior, segundoTurno],
  );

  const reiniciarAlertas = useCallback(() => {
    disparadosRef.current = new Set();
    try {
      localStorage.removeItem(storageKey(cfg, opcoesRef.current.simulacao));
    } catch {
      /* nada */
    }
    setEventos([]);
  }, [cfg]);

  return { atual, historico, analise, chances, eventos, erro, carregando, ultimaConsulta, fonte, segundoTurno, consultar, reiniciarAlertas };
}
