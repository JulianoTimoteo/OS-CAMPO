import { useEffect, useMemo, useState } from "react";
import {
  Package, Plus, Pencil, Trash2, AlertTriangle, Search,
  SlidersHorizontal, FileText, History, Download, Printer, ArrowDown, ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useOs } from "@/lib/os-store";
import type { Peca, Movimento } from "@/lib/os-mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CardGridSkeleton, EmptyState, PageHeader, TableSkeleton } from "@/components/os/ui-kit";


const empty: Omit<Peca, "id"> = { codigo: "", descricao: "", unidade: "un", qtd: 0, minimo: 0 };

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function toISODate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}
function todayISO() { return toISODate(Date.now()); }
function daysAgoISO(d: number) { return toISODate(Date.now() - d * 86_400_000); }

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function printHTML(title: string, bodyHTML: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return toast.error("Bloqueado pelo navegador. Libere pop-ups para imprimir.");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      *{box-sizing:border-box} body{font-family:Inter,system-ui,Arial,sans-serif;margin:24px;color:#0f172a}
      h1{font-size:20px;margin:0 0 4px} .sub{color:#64748b;font-size:12px;margin-bottom:16px}
      h2{font-size:14px;margin:20px 0 6px;color:#1a4f00;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
      th{background:#f1f5f9;font-weight:600;font-size:11px;text-transform:uppercase;color:#475569}
      tr:nth-child(even) td{background:#fafafa}
      .num{text-align:right;font-variant-numeric:tabular-nums}
      .low{color:#b45309;font-weight:600}
      .foot{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center}
    </style></head><body>${bodyHTML}
    <div class="foot">Gerado em ${new Date().toLocaleString("pt-BR")} · OS CAMPO · Usina Pitangueiras</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),150)}</script>
    </body></html>`);
  w.document.close();
}

export function EstoquePage() {
  const { pecas, savePeca, removePeca, movimentos, ajustarEstoque, loadMovimentos, loadingData } = useOs();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Peca | null>(null);
  const [form, setForm] = useState<Omit<Peca, "id">>(empty);

  // ajuste modal
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjPeca, setAdjPeca] = useState<Peca | null>(null);
  const [adjTipo, setAdjTipo] = useState<"entrada" | "baixa">("entrada");
  const [adjQtd, setAdjQtd] = useState<number>(0);
  const [adjMotivo, setAdjMotivo] = useState("");

  // relatório
  const [dtIni, setDtIni] = useState(daysAgoISO(30));
  const [dtFim, setDtFim] = useState(todayISO());
  const [tab, setTab] = useState("pecas");

  useEffect(() => {
    if (tab === "historico" || tab === "relatorio") {
      void loadMovimentos(100);
    }
  }, [tab, loadMovimentos]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return pecas
      .filter((p) => !t || p.codigo.toLowerCase().includes(t) || p.descricao.toLowerCase().includes(t))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [pecas, q]);

  const abaixoMin = pecas.filter((p) => p.qtd <= p.minimo).length;
  const pecasMap = useMemo(() => new Map(pecas.map((p) => [p.id, p])), [pecas]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Peca) => { setEditing(p); setForm({ codigo: p.codigo, descricao: p.descricao, unidade: p.unidade, qtd: p.qtd, minimo: p.minimo }); setOpen(true); };
  const openAjuste = (p: Peca) => { setAdjPeca(p); setAdjTipo("entrada"); setAdjQtd(0); setAdjMotivo(""); setAdjOpen(true); };

  const save = async () => {
    if (!form.codigo.trim() || !form.descricao.trim()) return toast.error("Preencha código e descrição");
    await savePeca({ id: editing?.id ?? "", ...form });
    toast.success(editing ? "Peça atualizada" : "Peça cadastrada");
    setOpen(false);
  };

  const remove = async (p: Peca) => {
    await removePeca(p.id);
    toast.info(`${p.codigo} removida`);
  };

  const confirmarAjuste = async () => {
    if (!adjPeca) return;
    const delta = adjTipo === "entrada" ? Math.abs(adjQtd) : -Math.abs(adjQtd);
    const ok = await ajustarEstoque(adjPeca.id, delta, adjMotivo);
    if (ok) setAdjOpen(false);
  };

  // Relatório - filtro por período
  const iniMs = new Date(dtIni + "T00:00:00").getTime();
  const fimMs = new Date(dtFim + "T23:59:59").getTime();
  const movsPeriodo = useMemo(
    () => movimentos.filter((m) => m.data >= iniMs && m.data <= fimMs),
    [movimentos, iniMs, fimMs],
  );
  const maisUsados = useMemo(() => {
    const map = new Map<string, number>();
    movsPeriodo
      .filter((m) => m.tipo === "baixa")
      .forEach((m) => map.set(m.pecaId, (map.get(m.pecaId) ?? 0) + Math.abs(m.qtd)));
    return [...map.entries()]
      .map(([pecaId, total]) => ({ peca: pecasMap.get(pecaId), total }))
      .filter((x) => x.peca)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [movsPeriodo, pecasMap]);

  const baixos = useMemo(
    () => pecas.filter((p) => p.qtd <= p.minimo).sort((a, b) => a.qtd - b.qtd),
    [pecas],
  );

  // Exportações
  const exportBaixosCSV = () => {
    const rows: (string | number)[][] = [["Código", "Descrição", "Unidade", "Estoque", "Mínimo", "Faltante"]];
    baixos.forEach((p) => rows.push([p.codigo, p.descricao, p.unidade, p.qtd, p.minimo, Math.max(0, p.minimo - p.qtd)]));
    downloadCSV(`estoque-baixo-${todayISO()}.csv`, rows);
  };
  const exportMaisUsadosCSV = () => {
    const rows: (string | number)[][] = [["Código", "Descrição", "Unidade", "Total baixado", "Período"]];
    maisUsados.forEach((x) => rows.push([x.peca!.codigo, x.peca!.descricao, x.peca!.unidade, x.total, `${dtIni} a ${dtFim}`]));
    downloadCSV(`materiais-mais-usados-${dtIni}_a_${dtFim}.csv`, rows);
  };
  const exportRelatorioPDF = () => {
    const baixosRows = baixos.map((p) =>
      `<tr><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.unidade}</td>
      <td class="num low">${p.qtd}</td><td class="num">${p.minimo}</td>
      <td class="num">${Math.max(0, p.minimo - p.qtd)}</td></tr>`,
    ).join("") || `<tr><td colspan="6" style="text-align:center;color:#94a3b8">Nenhuma peça abaixo do mínimo.</td></tr>`;
    const usadosRows = maisUsados.map((x) =>
      `<tr><td>${x.peca!.codigo}</td><td>${x.peca!.descricao}</td><td>${x.peca!.unidade}</td><td class="num">${x.total}</td></tr>`,
    ).join("") || `<tr><td colspan="4" style="text-align:center;color:#94a3b8">Sem baixas no período.</td></tr>`;
    printHTML("Relatório de Estoque",
      `<h1>Relatório de Estoque</h1>
       <div class="sub">Período de baixas: ${dtIni} a ${dtFim}</div>
       <h2>Itens com estoque baixo (${baixos.length})</h2>
       <table><thead><tr><th>Código</th><th>Descrição</th><th>Un.</th><th class="num">Estoque</th><th class="num">Mínimo</th><th class="num">Faltante</th></tr></thead><tbody>${baixosRows}</tbody></table>
       <h2>Materiais mais utilizados no período (${maisUsados.length})</h2>
       <table><thead><tr><th>Código</th><th>Descrição</th><th>Un.</th><th class="num">Total baixado</th></tr></thead><tbody>${usadosRows}</tbody></table>`,
    );
  };

  // Histórico
  const [histQ, setHistQ] = useState("");
  const [histTipo, setHistTipo] = useState<"todos" | "baixa" | "entrada" | "ajuste">("todos");
  const historico = useMemo(() => {
    const t = histQ.trim().toLowerCase();
    return movimentos.filter((m) => {
      const p = pecasMap.get(m.pecaId);
      if (histTipo !== "todos" && m.tipo !== histTipo) return false;
      if (!t) return true;
      return (
        p?.codigo.toLowerCase().includes(t) ||
        p?.descricao.toLowerCase().includes(t) ||
        m.usuarioNome.toLowerCase().includes(t) ||
        (m.os ?? "").toLowerCase().includes(t) ||
        m.motivo.toLowerCase().includes(t)
      );
    });
  }, [movimentos, histQ, histTipo, pecasMap]);

  const exportHistoricoCSV = () => {
    const rows: (string | number)[][] = [["Data", "Tipo", "Código", "Descrição", "Qtd", "Motivo", "OS", "Usuário"]];
    historico.forEach((m) => {
      const p = pecasMap.get(m.pecaId);
      rows.push([fmtDate(m.data), m.tipo, p?.codigo ?? "", p?.descricao ?? "", m.qtd, m.motivo, m.os ?? "", m.usuarioNome]);
    });
    downloadCSV(`historico-estoque-${todayISO()}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Estoque Solinftec"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            Peças, movimentações e relatórios
            {abaixoMin > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> {abaixoMin} abaixo do mínimo
              </span>
            )}
          </span>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="pecas"><Package className="mr-1.5 h-4 w-4" />Peças</TabsTrigger>
          <TabsTrigger value="historico"><History className="mr-1.5 h-4 w-4" />Histórico</TabsTrigger>
          <TabsTrigger value="relatorio"><FileText className="mr-1.5 h-4 w-4" />Relatório</TabsTrigger>
        </TabsList>

        {/* ========== PEÇAS ========== */}
        <TabsContent value="pecas" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código ou descrição" aria-label="Buscar peça" className="pl-9" />
            </div>
            <Button variant="usina" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Nova peça
            </Button>
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Código</th>
                    <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                    <th className="px-4 py-3 text-left font-semibold">Un.</th>
                    <th className="px-4 py-3 text-right font-semibold">Estoque</th>
                    <th className="px-4 py-3 text-right font-semibold">Mínimo</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const baixo = p.qtd <= p.minimo;
                    return (
                      <tr key={p.id} className="border-t border-border/50 transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{p.codigo}</td>
                        <td className="px-4 py-3 font-medium">{p.descricao}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.unidade}</td>
                        <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", baixo && "text-warning")}>{p.qtd}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.minimo}</td>
                        <td className="px-4 py-3 text-center">
                          {baixo ? <Badge variant="outline" className="border-warning/30 bg-warning/15 text-warning">Baixo</Badge>
                                 : <Badge variant="outline" className="border-usina/30 bg-usina/15 text-usina">OK</Badge>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" title="Ajustar" aria-label={`Ajustar ${p.codigo}`} onClick={() => openAjuste(p)}><SlidersHorizontal className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Editar" aria-label={`Editar ${p.codigo}`} onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Excluir" aria-label={`Excluir ${p.codigo}`} onClick={() => remove(p)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        {loadingData ? (
                          <TableSkeleton rows={6} cols={6} />
                        ) : (
                          <EmptyState
                            className="border-0 bg-transparent"
                            icon={Package}
                            title="Nenhuma peça encontrada"
                            description="Ajuste a busca ou cadastre uma nova peça no estoque."
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>


          {/* Mobile cards */}
          <div className="grid gap-2.5 md:hidden">
            {list.map((p) => {
              const baixo = p.qtd <= p.minimo;
              return (
                <Card key={p.id} className="shadow-xs">
                  <CardContent className="space-y-3 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold">{p.codigo}</div>
                        <div className="truncate text-sm font-medium">{p.descricao}</div>
                      </div>
                      {baixo ? <Badge variant="outline" className="shrink-0 border-warning/30 bg-warning/15 text-warning">Baixo</Badge>
                             : <Badge variant="outline" className="shrink-0 border-usina/30 bg-usina/15 text-usina">OK</Badge>}
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
                      <span className="text-muted-foreground">Estoque</span>
                      <span className={cn("font-bold tabular-nums", baixo && "text-warning")}>{p.qtd} {p.unidade} <span className="font-normal text-muted-foreground">(mín {p.minimo})</span></span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openAjuste(p)}><SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Ajustar</Button>
                      <Button size="sm" variant="outline" aria-label={`Editar ${p.codigo}`} onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" aria-label={`Excluir ${p.codigo}`} onClick={() => remove(p)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {list.length === 0 && (
              loadingData ? (
                <CardGridSkeleton count={3} className="md:grid-cols-1" />
              ) : (
                <EmptyState icon={Package} title="Nenhuma peça encontrada" description="Ajuste a busca ou cadastre uma nova peça no estoque." />
              )
            )}
          </div>

        </TabsContent>

        {/* ========== HISTÓRICO ========== */}
        <TabsContent value="historico" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-[200px] flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={histQ} onChange={(e) => setHistQ(e.target.value)} placeholder="Buscar código, OS, usuário, motivo" aria-label="Buscar movimentação" className="pl-9" />
              </div>
              <Select value={histTipo} onValueChange={(v) => setHistTipo(v as typeof histTipo)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportHistoricoCSV} disabled={historico.length === 0}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </div>

          <Card className="overflow-hidden">

            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Data</th>
                    <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold">Peça</th>
                    <th className="px-4 py-3 text-right font-semibold">Qtd</th>
                    <th className="px-4 py-3 text-left font-semibold">Motivo</th>
                    <th className="px-4 py-3 text-left font-semibold">OS</th>
                    <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((m) => {
                    const p = pecasMap.get(m.pecaId);
                    const isIn = m.qtd > 0;
                    return (
                      <tr key={m.id} className="border-t border-border/50 transition-colors hover:bg-muted/40">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{fmtDate(m.data)}</td>
                        <td className="px-4 py-3">
                          <MovTipoBadge m={m} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-semibold">{p?.codigo ?? m.pecaId}</div>
                          <div className="max-w-[220px] truncate text-xs text-muted-foreground">{p?.descricao}</div>
                        </td>
                        <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", isIn ? "text-success" : "text-destructive")}>
                          <span className="inline-flex items-center gap-1">
                            {isIn ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {isIn ? "+" : ""}{m.qtd}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{m.motivo}</td>
                        <td className="px-4 py-3 font-mono text-xs">{m.os ?? "—"}</td>
                        <td className="px-4 py-3 text-xs">{m.usuarioNome}</td>
                      </tr>
                    );
                  })}
                  {historico.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma movimentação registrada.</td></tr>
                  )}
                </tbody>
              </table>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== RELATÓRIO ========== */}
        <TabsContent value="relatorio" className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dt-ini">Data inicial</Label>
                  <Input id="dt-ini" type="date" value={dtIni} onChange={(e) => setDtIni(e.target.value)} className="w-[160px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dt-fim">Data final</Label>
                  <Input id="dt-fim" type="date" value={dtFim} onChange={(e) => setDtFim(e.target.value)} className="w-[160px]" />
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button variant="outline" onClick={exportBaixosCSV}><Download className="mr-1 h-4 w-4" /> CSV Baixos</Button>
                  <Button variant="outline" onClick={exportMaisUsadosCSV}><Download className="mr-1 h-4 w-4" /> CSV Mais usados</Button>
                  <Button variant="usina" onClick={exportRelatorioPDF}>
                    <Printer className="mr-1 h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Itens com estoque baixo
                  <Badge variant="outline" className="ml-auto tabular-nums">{baixos.length}</Badge>
                </h3>
                <div className="max-h-[400px] space-y-1 overflow-y-auto">
                  {baixos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold">{p.codigo}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.descricao}</div>
                      </div>
                      <div className="ml-2 shrink-0 text-right text-xs tabular-nums">
                        <div className="font-bold text-warning">{p.qtd} {p.unidade}</div>
                        <div className="text-muted-foreground">mín {p.minimo}</div>
                      </div>
                    </div>
                  ))}
                  {baixos.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Todos os itens estão acima do mínimo.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <Package className="h-4 w-4 text-usina" /> Mais utilizados no período
                  <Badge variant="outline" className="ml-auto tabular-nums">{maisUsados.length}</Badge>
                </h3>
                <div className="max-h-[400px] space-y-1 overflow-y-auto">
                  {maisUsados.map((x) => {
                    const max = maisUsados[0]?.total || 1;
                    const pct = (x.total / max) * 100;
                    return (
                      <div key={x.peca!.id} className="rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <div className="min-w-0 truncate">
                            <span className="font-mono text-xs font-semibold">{x.peca!.codigo}</span>
                            <span className="ml-2 truncate text-xs text-muted-foreground">{x.peca!.descricao}</span>
                          </div>
                          <span className="ml-2 shrink-0 text-xs font-bold tabular-nums">{x.total} {x.peca!.unidade}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-usina transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {maisUsados.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Sem baixas de peças no período selecionado.</p>}
                </div>
              </CardContent>
            </Card>
          </div>

        </TabsContent>
      </Tabs>

      {/* Modal cadastro/edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar peça" : "Nova peça"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2">
                <Label htmlFor="pc-cod">Código</Label>
                <Input id="pc-cod" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="ANT-GPS-01" />
              </div>
              <div className="w-24 space-y-2">
                <Label htmlFor="pc-un">Unidade</Label>
                <Input id="pc-un" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-desc">Descrição</Label>
              <Input id="pc-desc" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pc-qtd">Quantidade</Label>
                <Input id="pc-qtd" type="number" min={0} value={form.qtd} onChange={(e) => setForm({ ...form, qtd: Math.max(0, +e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-min">Estoque mínimo</Label>
                <Input id="pc-min" type="number" min={0} value={form.minimo} onChange={(e) => setForm({ ...form, minimo: Math.max(0, +e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="usina" onClick={save}>Salvar</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Modal Ajuste */}
      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de estoque</DialogTitle>
            <DialogDescription>
              {adjPeca && <>{adjPeca.codigo} · {adjPeca.descricao} · atual: <b>{adjPeca.qtd} {adjPeca.unidade}</b></>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={adjTipo} onValueChange={(v) => setAdjTipo(v as "entrada" | "baixa")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (+)</SelectItem>
                    <SelectItem value="baixa">Baixa (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adj-qtd">Quantidade</Label>
                <Input id="adj-qtd" type="number" min={0} value={adjQtd} onChange={(e) => setAdjQtd(Math.max(0, +e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-motivo">Motivo</Label>
              <Textarea id="adj-motivo" value={adjMotivo} onChange={(e) => setAdjMotivo(e.target.value)} placeholder="Ex.: Compra NF 1234, contagem física, devolução..." rows={3} />
            </div>
            {adjPeca && adjQtd > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/50 p-3 text-xs text-muted-foreground">
                Novo estoque: <b className="text-foreground">{adjPeca.qtd + (adjTipo === "entrada" ? adjQtd : -adjQtd)} {adjPeca.unidade}</b>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Cancelar</Button>
            <Button variant="usina" onClick={confirmarAjuste}>Confirmar ajuste</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}

function MovTipoBadge({ m }: { m: Movimento }) {
  if (m.tipo === "baixa") return <Badge variant="outline" className="border-destructive/30 bg-destructive/15 text-destructive">Baixa</Badge>;
  if (m.tipo === "entrada") return <Badge variant="outline" className="border-success/30 bg-success/15 text-success">Entrada</Badge>;
  return <Badge variant="outline" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">Ajuste</Badge>;
}
