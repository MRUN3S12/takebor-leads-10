// Gera JSON no mesmo formato do TSE para testar a página sem depender da
// apuração real. Cada chamada avança a apuração alguns pontos percentuais,
// com o eleitorado restante votando de forma um pouco diferente (efeito regional).

const CANDIDATOS = [
  { n: "10", nm: "CANDIDATO A", base: 44, tardio: 50 },
  { n: "20", nm: "CANDIDATO B", base: 41, tardio: 35 },
  { n: "30", nm: "CANDIDATO C", base: 8, tardio: 8 },
  { n: "40", nm: "CANDIDATO D", base: 4, tardio: 4.5 },
  { n: "50", nm: "CANDIDATO E", base: 3, tardio: 2.5 },
];

const ELEITORADO = 156_000_000;
const SECOES = 470_000;

export function criarSimulador(eleicao: string) {
  let progresso = 0;
  const votos = CANDIDATOS.map(() => 0);
  let brancos = 0;
  let nulos = 0;
  let comparecimento = 0;

  return async (): Promise<unknown> => {
    if (progresso < 1) {
      const passo = Math.min(1 - progresso, progresso < 0.9 ? 0.03 + Math.random() * 0.05 : 0.02);
      const meio = progresso + passo / 2;
      const eleitores = ELEITORADO * passo;
      const comp = eleitores * (0.78 + Math.random() * 0.04);
      comparecimento += comp;
      const vb = comp * 0.016;
      const vn = comp * 0.03;
      brancos += vb;
      nulos += vn;
      const validos = comp - vb - vn;
      const pesos = CANDIDATOS.map((c) => (c.base + (c.tardio - c.base) * meio) * (0.95 + Math.random() * 0.1));
      const soma = pesos.reduce((a, b) => a + b, 0);
      pesos.forEach((p, i) => (votos[i] += (validos * p) / soma));
      progresso += passo;
    }

    const totalValidos = votos.reduce((a, b) => a + b, 0);
    const fmt = (x: number) => x.toFixed(2).replace(".", ",");
    const agora = new Date();
    const ea = Math.round(ELEITORADO * progresso);
    const lider = votos.indexOf(Math.max(...votos));
    const fim = progresso >= 1;

    return {
      ele: eleicao,
      md: fim ? "S" : "N",
      dt: agora.toLocaleDateString("pt-BR"),
      ht: agora.toLocaleTimeString("pt-BR"),
      s: String(SECOES),
      st: String(Math.round(SECOES * progresso)),
      pst: fmt(progresso * 100),
      e: String(ELEITORADO),
      ea: String(ea),
      ena: String(ELEITORADO - ea),
      c: String(Math.round(comparecimento)),
      a: String(Math.max(0, ea - Math.round(comparecimento))),
      vb: String(Math.round(brancos)),
      tvn: String(Math.round(nulos)),
      vv: String(Math.round(totalValidos)),
      cand: CANDIDATOS.map((c, i) => {
        const p = totalValidos > 0 ? (votos[i] / totalValidos) * 100 : 0;
        const eleito = fim && i === lider && p > 50;
        return {
          seq: String(i + 1),
          n: c.n,
          nm: c.nm,
          cc: "",
          nv: "",
          e: eleito ? "s" : "n",
          st: fim ? (eleito ? "Eleito" : "") : "",
          dvt: "Válido",
          vap: String(Math.round(votos[i])),
          pvap: fmt(p),
        };
      }),
    };
  };
}
