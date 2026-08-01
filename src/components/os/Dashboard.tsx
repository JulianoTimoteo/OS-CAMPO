import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertCircle, CheckCircle2, Clock, Radio, Satellite, Users, Truck, PauseCircle, TimerReset, TrendingUp, LayoutDashboard,
} from "lucide-react";
import { PageHeader, SkeletonBlock } from "@/components/os/ui-kit";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useOs } from "@/lib/os-store";
import { fmtDuration } from "@/lib/os-mock";
import { cn } from "@/lib/utils";

/** Cor de cada série do gráfico — alinhada aos tokens semânticos de status. */
const SERIE_COR = {
  Aberto: "#3b82f6",
  Assumido: "#f59e0b",
  Pausado: "#ef4444",
  Encerrado: "#22c55e",
} as const;

function Kpi({
  label, value, icon: Icon, tone = "primary", hint,
}: { label: string; value: string | number; icon: any; tone?: "primary" | "usina" | "warn" | "danger" | "info" | "muted"; hint?: string }) {
  const toneMap: Record<string, string> = {
    primary: "from-primary/12 to-primary/[0.03] text-primary",
    usina: "from-usina/16 to-usina/[0.03] text-usina",
    warn: "from-warning/16 to-warning/[0.03] text-warning",
    danger: "from-destructive/16 to-destructive/[0.03] text-destructive",
    info: "from-info/16 to-info/[0.03] text-info",
    muted: "from-muted to-muted/30 text-muted-foreground",
  };
  return (
    <Card className="surface-interactive group relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-200 group-hover:opacity-100", toneMap[tone])} />
      <CardContent className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-1.5 text-3xl font-bold leading-none tabular-nums tracking-tight">{value}</div>
            {hint && <div className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{hint}</div>}
          </div>
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 shadow-xs backdrop-blur", toneMap[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export function Dashboard() {
  const { chamados, users, equipamentos, equipes, loadingData } = useOs();
  const carregandoVazio = loadingData && chamados.length === 0;
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [tecFiltro, setTecFiltro] = useState<string>("todos");
  const [appliedStatus, setAppliedStatus] = useState<string>("todos");
  const [appliedTec, setAppliedTec] = useState<string>("todos");
  const [periodoFiltro, setPeriodoFiltro] = useState<string>("todos");
  const [appliedPeriodo, setAppliedPeriodo] = useState<string>("todos");

  const now = Date.now();
  const abertos = chamados.filter((c) => c.status === "aberto");
  const pausados = chamados.filter((c) => c.status === "pausado");
  const mes = chamados.filter((c) => c.status === "encerrado" && c.encerradoEm && now - c.encerradoEm < 30 * 24 * 3600_000);
  const abertosGps = abertos.filter((c) => c.direcionamento === "GPS").length;
  const abertosSol = abertos.filter((c) => c.direcionamento === "Solinftec").length;
  const vencendo = chamados.filter((c) => c.status !== "encerrado" && now - c.abertoEm > 20 * 3600_000).length;

  const tmaMs = useMemo(() => {
    const enc = chamados.filter((c) => c.status === "encerrado" && c.encerradoEm);
    if (!enc.length) return 0;
    return enc.reduce((s, c) => s + (c.encerradoEm! - c.abertoEm), 0) / enc.length;
  }, [chamados]);

  const rankEquipes = useMemo(() => {
    const map = new Map<string, number>();
    abertos.forEach((c) => map.set(c.equipeId, (map.get(c.equipeId) || 0) + 1));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => ({ nome: equipes.find((e) => e.id === id)?.nome ?? id, n }));
  }, [abertos, equipes]);

  const rankTecnicos = useMemo(() => {
    const map = new Map<string, number>();
    chamados.filter((c) => c.status === "encerrado" && c.tecnico).forEach((c) => map.set(c.tecnico!, (map.get(c.tecnico!) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, n]) => ({ nome, n }));
  }, [chamados]);

  /** Meses disponíveis no histórico (para o filtro de período). */
  const mesesDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    chamados.forEach((c) => {
      if (!c.abertoEm) return;
      const d = new Date(c.abertoEm);
      const key = `mes:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [chamados]);

  /** Intervalo [de, até] em ms conforme o período escolhido. */
  const periodoRange = useMemo((): [number, number] | null => {
    const DAY = 24 * 3600_000;
    if (appliedPeriodo === "todos") return null;
    if (appliedPeriodo === "hoje") {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      return [d.getTime(), now];
    }
    if (appliedPeriodo === "7d") return [now - 7 * DAY, now];
    if (appliedPeriodo === "30d") return [now - 30 * DAY, now];
    if (appliedPeriodo.startsWith("mes:")) {
      const [y, m] = appliedPeriodo.slice(4).split("-").map(Number);
      const ini = new Date(y, m - 1, 1).getTime();
      const fim = new Date(y, m, 0, 23, 59, 59, 999).getTime();
      return [ini, fim];
    }
    return null;
  }, [appliedPeriodo, now]);

  const chartData = useMemo(() => {
    const base = chamados.filter((c) =>
      (appliedTec === "todos" || c.tecnico === appliedTec)
      && c.abertoEm
      && (!periodoRange || (c.abertoEm >= periodoRange[0] && c.abertoEm <= periodoRange[1])));
    if (base.length === 0) return [];

    const min = Math.min(...base.map((c) => c.abertoEm));
    const max = Math.max(...base.map((c) => c.abertoEm), now);
    const DAY = 24 * 3600_000;
    const spanDays = Math.max(1, Math.ceil((max - min) / DAY) + 1);

    // agrupa em no máx. ~30 pontos: diário → semanal → mensal
    const mode: "dia" | "semana" | "mes" = spanDays <= 31 ? "dia" : spanDays <= 210 ? "semana" : "mes";
    const buckets = new Map<string, { label: string; ord: number; Aberto: number; Assumido: number; Pausado: number; Encerrado: number }>();

    const keyOf = (ms: number) => {
      const d = new Date(ms);
      if (mode === "dia") {
        d.setHours(0, 0, 0, 0);
        return { k: String(d.getTime()), ord: d.getTime(), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
      }
      if (mode === "semana") {
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        return { k: String(d.getTime()), ord: d.getTime(), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
      }
      const m = new Date(d.getFullYear(), d.getMonth(), 1);
      return { k: String(m.getTime()), ord: m.getTime(), label: m.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) };
    };

    for (const c of base) {
      const { k, ord, label } = keyOf(c.abertoEm);
      const row = buckets.get(k) ?? { label, ord, Aberto: 0, Assumido: 0, Pausado: 0, Encerrado: 0 };
      if (c.status === "aberto") row.Aberto++;
      else if (c.status === "assumido") row.Assumido++;
      else if (c.status === "pausado") row.Pausado++;
      else if (c.status === "encerrado") row.Encerrado++;
      buckets.set(k, row);
    }

    return [...buckets.values()]
      .sort((a, b) => a.ord - b.ord)
      .map(({ label, Aberto, Assumido, Pausado, Encerrado }) => {
        const row: any = { dia: label };
        if (appliedStatus === "todos" || appliedStatus === "aberto") row.Aberto = Aberto;
        if (appliedStatus === "todos" || appliedStatus === "assumido") row.Assumido = Assumido;
        if (appliedStatus === "todos" || appliedStatus === "pausado") row.Pausado = Pausado;
        if (appliedStatus === "todos" || appliedStatus === "encerrado") row.Encerrado = Encerrado;
        return row;
      });
  }, [chamados, appliedStatus, appliedTec, periodoRange, now]);

  const tecnicos = [...new Set(chamados.map((c) => c.tecnico).filter(Boolean) as string[])];

  return (
    <div className="space-y-7">
      <PageHeader
        icon={LayoutDashboard}
        title="Visão geral"
        description="Indicadores em tempo real da operação"
      />

      {carregandoVazio ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 sm:gap-4" aria-busy="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-7 w-16" />
              <SkeletonBlock className="h-2.5 w-24" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">

        <Kpi label="Chamados Abertos" value={abertos.length} icon={AlertCircle} tone="danger" />
        <Kpi label="Concluídos (Mês)" value={mes.length} icon={CheckCircle2} tone="usina" />
        <Kpi label="TMA Médio" value={fmtDuration(tmaMs)} icon={Clock} tone="primary" hint="tempo médio de atendimento" />
        <Kpi label="Abertos GPS" value={abertosGps} icon={Radio} tone="info" />
        <Kpi label="Abertos Solinftec" value={abertosSol} icon={Satellite} tone="info" />
        <Kpi label="Usuários Ativos" value={users.filter((u) => u.ativo).length} icon={Users} tone="primary" />
        <Kpi label="Equipamentos" value={equipamentos.length} icon={Truck} tone="muted" />
        <Kpi label="Pausados" value={pausados.length} icon={PauseCircle} tone="warn" />
        <Kpi label="Vencendo (24h)" value={vencendo} icon={TimerReset} tone="warn" />
      </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 5 equipes com chamados abertos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankEquipes.length === 0 && <p className="text-sm text-muted-foreground">Sem chamados abertos.</p>}
            {rankEquipes.map((r, i) => (
              <div key={r.nome} className="flex items-center gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-usina/15 text-xs font-bold text-usina">{i + 1}</div>
                <div className="min-w-0 flex-1 truncate text-sm font-medium">{r.nome}</div>
                <div className="h-2 w-[35%] max-w-[40%] shrink-0 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-usina transition-all duration-500" style={{ width: `${(r.n / rankEquipes[0].n) * 100}%` }} />
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">{r.n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 5 técnicos que mais fecharam</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankTecnicos.length === 0 && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}
            {rankTecnicos.map((r, i) => (
              <div key={r.nome} className="flex items-center gap-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</div>
                <div className="min-w-0 flex-1 truncate text-sm font-medium">{r.nome}</div>
                <div className="h-2 w-[35%] max-w-[40%] shrink-0 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(r.n / rankTecnicos[0].n) * 100}%` }} />
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">{r.n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-panel-border bg-panel text-panel-foreground shadow-raised">
        <CardHeader className="flex flex-col gap-4 pb-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success/20 text-success">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-base font-bold text-panel-foreground">Histórico completo de chamados</CardTitle>
              <p className="text-xs text-panel-muted">Evolução por status ao longo do tempo</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-10 w-full border-panel-border bg-panel-surface/70 text-panel-foreground transition-colors hover:border-panel-muted/60 sm:w-[150px]">
                <div className="flex items-center gap-1"><span className="text-xs text-panel-muted">Status:</span><SelectValue /></div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="assumido">Assumido</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
              <SelectTrigger className="h-10 w-full border-panel-border bg-panel-surface/70 text-panel-foreground transition-colors hover:border-panel-muted/60 sm:w-[200px]">
                <div className="flex items-center gap-1"><span className="text-xs text-panel-muted">Período:</span><SelectValue /></div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="todos">Todo o histórico</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                {mesesDisponiveis.map(([k, label]) => (
                  <SelectItem key={k} value={k} className="capitalize">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tecFiltro} onValueChange={setTecFiltro}>
              <SelectTrigger className="h-10 w-full border-panel-border bg-panel-surface/70 text-panel-foreground transition-colors hover:border-panel-muted/60 sm:w-[180px]">
                <div className="flex items-center gap-1"><span className="text-xs text-panel-muted">Técnico:</span><SelectValue /></div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tecnicos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-10 w-full rounded-md bg-success text-success-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.98] sm:w-auto"
              onClick={() => { setAppliedStatus(statusFiltro); setAppliedTec(tecFiltro); setAppliedPeriodo(periodoFiltro); }}
            >
              Aplicar filtros
            </Button>
          </div>


        </CardHeader>
        <CardContent className="h-[300px] pt-4 sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                {(["Aberto", "Assumido", "Pausado", "Encerrado"] as const).map((k) => (
                  <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIE_COR[k]} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={SERIE_COR[k]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" vertical={false} opacity={0.5} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "var(--panel-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: "var(--panel-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
              <Tooltip
                cursor={{ stroke: "var(--panel-border)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--panel-surface)",
                  border: "1px solid var(--panel-border)",
                  borderRadius: 10,
                  color: "var(--panel-foreground)",
                  boxShadow: "var(--shadow-raised)",
                }}
                labelStyle={{ color: "var(--panel-foreground)", fontWeight: 600 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                formatter={(v) => <span style={{ color: "var(--panel-muted)" }}>{v}</span>}
              />

              {(appliedStatus === "todos" || appliedStatus === "aberto") && <Area type="monotone" dataKey="Aberto" stroke={SERIE_COR.Aberto} strokeWidth={2.5} fill="url(#gAberto)" />}
              {(appliedStatus === "todos" || appliedStatus === "assumido") && <Area type="monotone" dataKey="Assumido" stroke={SERIE_COR.Assumido} strokeWidth={2.5} fill="url(#gAssumido)" />}
              {(appliedStatus === "todos" || appliedStatus === "pausado") && <Area type="monotone" dataKey="Pausado" stroke={SERIE_COR.Pausado} strokeWidth={2.5} fill="url(#gPausado)" />}
              {(appliedStatus === "todos" || appliedStatus === "encerrado") && <Area type="monotone" dataKey="Encerrado" stroke={SERIE_COR.Encerrado} strokeWidth={2.5} fill="url(#gEncerrado)" />}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
