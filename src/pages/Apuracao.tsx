import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Bell, CheckCircle2, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bip, falar, useApuracao, type Opcoes } from "@/hooks/use-apuracao";
import { formatPct, type Fato } from "@/lib/apuracao";
import { CARGOS, parseTseAppUrl, type TseConfig } from "@/lib/tse";

const URL_PADRAO = "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/resultados";
const CORES = ["#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#ea580c", "#64748b"];

const int = (n: number) => Math.round(n).toLocaleString("pt-BR");

const PRIORIDADE: Record<Fato["nivel"], number> = { tse: 3, matematico: 2, realista: 1 };
// Dentro do mesmo nível, o fato mais conclusivo vem primeiro.
const peso = (f: Fato) => PRIORIDADE[f.nivel] + (/^(vence|confronto|tse-eleito)/.test(f.chave) ? 0.5 : 0);
const pctLimite = (v: number) => (v > 100 ? "mais de 100%" : formatPct(v));

function corStatus(status?: string) {
  switch (status) {
    case "Eleito":
    case "No 2º turno":
      return "bg-green-600 hover:bg-green-600 text-white";
    case "Top 2 garantido":
      return "bg-emerald-500 hover:bg-emerald-500 text-white";
    case "Eliminado":
    case "Não eleito":
      return "bg-muted text-muted-foreground hover:bg-muted";
    default:
      return "bg-amber-100 text-amber-900 hover:bg-amber-100";
  }
}

const Apuracao = () => {
  const [urlTse, setUrlTse] = useState(URL_PADRAO);
  const [cfg, setCfg] = useState<TseConfig>({ eleicao: "6257", uf: "br", cargo: "1", ciclo: "" });
  const [rascunho, setRascunho] = useState(cfg);
  const [opcoes, setOpcoes] = useState<Opcoes>({
    intervaloSeg: 15,
    simulacao: false,
    voz: true,
    som: true,
    notificacao: true,
    narrarAtualizacoes: false,
    alertasRealistas: true,
  });
  const [alertasAtivos, setAlertasAtivos] = useState(false);

  useEffect(() => {
    document.title = "Apuração ao vivo · TSE";
  }, []);

  const cfgMemo = useMemo(() => cfg, [cfg]);
  const { atual, historico, analise, eventos, erro, carregando, ultimaConsulta, fonte, segundoTurno, consultar, reiniciarAlertas } =
    useApuracao(cfgMemo, opcoes);

  const set = <K extends keyof Opcoes>(k: K, v: Opcoes[K]) => setOpcoes((o) => ({ ...o, [k]: v }));

  const aplicarUrl = (u: string) => {
    setUrlTse(u);
    const p = parseTseAppUrl(u);
    if (p) setRascunho((r) => ({ ...r, ...p }));
  };

  // Navegadores só liberam áudio/voz/notificação após um clique do usuário.
  const ativarAlertas = async () => {
    bip();
    falar("Alertas de apuração ativados.");
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    setAlertasAtivos(true);
  };

  const destaque = useMemo(() => {
    if (!analise) return null;
    return [...analise.fatos].sort((a, b) => peso(b) - peso(a))[0] ?? null;
  }, [analise]);

  const top = atual?.candidatos.filter((c) => c.valido).slice(0, 5) ?? [];
  const dadosGrafico = historico.map((s) => {
    const linha: Record<string, number> = { apurado: Number(s.pctSecoes.toFixed(2)) };
    top.forEach((c) => {
      const cs = s.candidatos.find((x) => x.numero === c.numero);
      if (cs) linha[c.nome] = cs.pct;
    });
    return linha;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Apuração ao vivo</h1>
            <p className="text-muted-foreground">
              {CARGOS[cfg.cargo] ?? `Cargo ${cfg.cargo}`} · {cfg.uf.toUpperCase()} · eleição {cfg.eleicao}
              {opcoes.simulacao && " · SIMULAÇÃO"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={alertasAtivos ? "secondary" : "default"} onClick={ativarAlertas}>
              <Bell className="mr-2 h-4 w-4" />
              {alertasAtivos ? "Alertas ativos" : "Ativar alertas (voz/som)"}
            </Button>
            <Button variant="outline" onClick={consultar} disabled={carregando}>
              {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </header>

        {/* Destaque: o fato mais forte já alcançado */}
        {destaque ? (
          <div
            className={`rounded-lg border p-4 flex gap-3 items-start ${
              destaque.nivel === "realista" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-green-300 bg-green-50 text-green-950"
            }`}
          >
            <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-lg">{destaque.titulo}</p>
              <p className="text-sm opacity-80">{destaque.detalhe}</p>
            </div>
          </div>
        ) : (
          atual && (
            <div className="rounded-lg border p-4 bg-card text-muted-foreground">
              Nada irreversível ainda. A página avisa assim que algum resultado não puder mais mudar.
            </div>
          )
        )}

        {erro && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium">Não consegui ler o resultado do TSE.</p>
              <p className="text-muted-foreground break-all">{erro}</p>
              <p className="text-muted-foreground mt-1">
                Se a apuração ainda não começou, o arquivo pode não existir. Confira o código da eleição e o ciclo, ou ligue a simulação para testar.
              </p>
            </div>
          </div>
        )}

        {/* Progresso da apuração */}
        {atual && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-2xl font-bold">{formatPct(atual.pctSecoes)} das seções</span>
                <span className="text-muted-foreground self-end">
                  {int(atual.secoesTotalizadas)} de {int(atual.secoesTotal)} seções · totalizado em {atual.totalizadoEm}
                </span>
              </div>
              <Progress value={atual.pctSecoes} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                <Stat rotulo="Votos válidos" valor={int(atual.validos)} />
                <Stat rotulo="Comparecimento" valor={int(atual.comparecimento)} />
                <Stat rotulo="Eleitores não apurados" valor={int(atual.eleitoradoNaoApurado)} />
                <Stat rotulo="Válidos restantes (estim.)" valor={analise ? int(analise.restanteRealista) : "—"} />
              </div>
              <p className="text-xs text-muted-foreground">
                Última consulta {ultimaConsulta ? new Date(ultimaConsulta).toLocaleTimeString("pt-BR") : "—"} · fonte: {fonte || "—"} · a cada{" "}
                {opcoes.intervaloSeg}s
              </p>
            </CardContent>
          </Card>
        )}

        {!atual && !erro && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando resultado…
          </div>
        )}

        {/* Candidatos */}
        {atual && analise && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado</CardTitle>
              <CardDescription>
                "Situação" usa o cenário matemático: todos os eleitores ainda não apurados votando. "Último lote" é como votaram os votos que
                entraram desde a atualização anterior.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead className="text-right">Votos</TableHead>
                    <TableHead className="text-right">% válidos</TableHead>
                    <TableHead className="text-right">Último lote</TableHead>
                    <TableHead className="text-right">Projeção final</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atual.candidatos
                    .filter((c) => c.valido)
                    .map((c, i) => {
                      const lote = analise.tendenciaLote?.get(c.numero);
                      const proj = analise.projecao.find((p) => p.numero === c.numero);
                      const status = c.eleito ? "Eleito" : analise.status.get(c.numero);
                      return (
                        <TableRow key={c.numero}>
                          <TableCell>{i + 1}º</TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {c.nome} <span className="text-muted-foreground font-normal">({c.numero})</span>
                            </div>
                            <div className="h-1.5 mt-1 rounded bg-muted overflow-hidden max-w-[220px]">
                              <div className="h-full" style={{ width: `${c.pct}%`, background: CORES[i % CORES.length] }} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{int(c.votos)}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatPct(c.pct)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {lote !== undefined ? formatPct(lote) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{proj ? formatPct(proj.pct) : "—"}</TableCell>
                          <TableCell>
                            <Badge className={corStatus(status)}>{status ?? "Em disputa"}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Contas */}
        {atual && analise && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quanto falta para virar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {analise.viradaNecessaria !== null && atual.candidatos[1] ? (
                  <p>
                    {atual.candidatos[1].nome} precisa tirar uma vantagem líquida de{" "}
                    <strong>{pctLimite(analise.viradaNecessaria)}</strong> dos ~{int(analise.restanteRealista)} votos válidos restantes para
                    passar {atual.candidatos[0].nome}.
                    {analise.viradaNecessaria > 100 && " Isso é impossível no cenário estimado."}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Sem votos restantes.</p>
                )}
                <p className="text-muted-foreground">
                  Diferença atual: {int((atual.candidatos[0]?.votos ?? 0) - (atual.candidatos[1]?.votos ?? 0))} votos. Máximo que ainda pode
                  entrar: {int(analise.restanteMax)}.
                </p>
              </CardContent>
            </Card>
            {segundoTurno && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vitória no 1º turno (50% + 1)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {analise.lider50Necessario !== null && atual.candidatos[0] ? (
                    analise.lider50Necessario <= 0 ? (
                      <p>
                        {atual.candidatos[0].nome} já tem mais de 50% contando os votos estimados restantes como contra.
                      </p>
                    ) : (
                      <p>
                        {atual.candidatos[0].nome} precisa de <strong>{pctLimite(analise.lider50Necessario)}</strong> dos votos válidos
                        restantes para passar de 50%.
                        {analise.lider50Necessario > 100 && " Não dá mais no cenário estimado."}
                      </p>
                    )
                  ) : (
                    <p className="text-muted-foreground">Sem votos restantes.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Evolução */}
        {dadosGrafico.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução (% dos válidos × % apurado)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="apurado" type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, "auto"]} />
                  <Tooltip formatter={(v: number) => formatPct(v)} labelFormatter={(l) => `${l}% apurado`} />
                  <Legend />
                  {segundoTurno && <ReferenceLine y={50} strokeDasharray="4 4" stroke="#64748b" />}
                  {top.map((c, i) => (
                    <Line key={c.numero} dataKey={c.nome} stroke={CORES[i % CORES.length]} dot={false} strokeWidth={2} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Log de alertas */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Alertas</CardTitle>
            <Button variant="ghost" size="sm" onClick={reiniciarAlertas}>
              Limpar
            </Button>
          </CardHeader>
          <CardContent>
            {eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta ainda nesta sessão.</p>
            ) : (
              <ul className="space-y-2">
                {eventos.map((e) => (
                  <li key={`${e.fato.chave}-${e.em}`} className="text-sm flex gap-3">
                    <span className="text-muted-foreground tabular-nums shrink-0">{new Date(e.em).toLocaleTimeString("pt-BR")}</span>
                    <span>
                      <Badge variant="outline" className="mr-2">
                        {e.fato.nivel === "tse" ? "TSE" : e.fato.nivel === "matematico" ? "matemático" : "estimado"}
                      </Badge>
                      <strong>{e.fato.titulo}</strong> — {e.fato.detalhe}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração</CardTitle>
            <CardDescription>Cole o link do app de resultados do TSE ou ajuste os campos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="url">Link do TSE</Label>
              <Input id="url" value={urlTse} onChange={(e) => aplicarUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Campo rotulo="Eleição" valor={rascunho.eleicao} onChange={(v) => setRascunho({ ...rascunho, eleicao: v })} />
              <Campo rotulo="UF" valor={rascunho.uf} onChange={(v) => setRascunho({ ...rascunho, uf: v.toLowerCase() })} />
              <Campo rotulo="Cargo" valor={rascunho.cargo} onChange={(v) => setRascunho({ ...rascunho, cargo: v })} />
              <Campo
                rotulo="Ciclo (auto se vazio)"
                valor={rascunho.ciclo}
                placeholder="ele2026"
                onChange={(v) => setRascunho({ ...rascunho, ciclo: v })}
              />
              <Campo
                rotulo="Intervalo (s)"
                valor={String(opcoes.intervaloSeg)}
                onChange={(v) => set("intervaloSeg", Math.max(5, Number(v) || 15))}
              />
            </div>
            <Button onClick={() => setCfg(rascunho)}>Aplicar</Button>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <Toggle rotulo="Falar alertas em voz alta" valor={opcoes.voz} onChange={(v) => set("voz", v)} icone />
              <Toggle rotulo="Tocar som" valor={opcoes.som} onChange={(v) => set("som", v)} />
              <Toggle rotulo="Notificação do navegador" valor={opcoes.notificacao} onChange={(v) => set("notificacao", v)} />
              <Toggle rotulo="Narrar cada atualização do TSE" valor={opcoes.narrarAtualizacoes} onChange={(v) => set("narrarAtualizacoes", v)} />
              <Toggle
                rotulo="Avisar também o 'praticamente irreversível'"
                valor={opcoes.alertasRealistas}
                onChange={(v) => set("alertasRealistas", v)}
              />
              <Toggle rotulo="Modo simulação (teste)" valor={opcoes.simulacao} onChange={(v) => set("simulacao", v)} />
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Dados lidos diretamente dos arquivos públicos de resultados.tse.jus.br. <strong>Matematicamente irreversível</strong>: o resultado
          se mantém mesmo que 100% do eleitorado ainda não apurado compareça e vote contra. <strong>Praticamente irreversível</strong>: usa o
          comparecimento atual + 5 p.p. e a taxa atual de votos válidos. Não é um site oficial.
        </p>
      </div>
    </div>
  );
};

function Stat({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{rotulo}</div>
      <div className="font-semibold tabular-nums">{valor}</div>
    </div>
  );
}

function Campo({ rotulo, valor, onChange, placeholder }: { rotulo: string; valor: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{rotulo}</Label>
      <Input value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({ rotulo, valor, onChange, icone }: { rotulo: string; valor: boolean; onChange: (v: boolean) => void; icone?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <Switch checked={valor} onCheckedChange={onChange} />
      {icone && <Volume2 className="h-4 w-4 text-muted-foreground" />}
      {rotulo}
    </label>
  );
}

export default Apuracao;
