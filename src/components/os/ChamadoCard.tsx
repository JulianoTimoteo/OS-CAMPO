import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Image as ImageIcon, Inbox, Package, Pause, Play, Plus, Radio, RotateCcw, Satellite, Search, Timer, Trash2, UserCheck } from "lucide-react";
import { CardGridSkeleton, EmptyState, FilterChip, PageHeader } from "@/components/os/ui-kit";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useOs } from "@/lib/os-store";
import type { Chamado, ChamadoStatus, Direcionamento } from "@/lib/os-mock";
import { fmtDuration } from "@/lib/os-mock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CallStatusPill({ status }: { status: ChamadoStatus }) {
  const map: Record<ChamadoStatus, string> = {
    aberto: "bg-destructive/12 text-destructive border-destructive/30",
    assumido: "bg-primary/12 text-primary border-primary/30",
    pausado: "bg-warning/15 text-warning border-warning/35",
    encerrado: "bg-usina/12 text-usina border-usina/30",
  };
  const label: Record<ChamadoStatus, string> = { aberto: "Aberto", assumido: "Em atendimento", pausado: "Pausado", encerrado: "Encerrado" };
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-semibold", map[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label[status]}
    </Badge>
  );
}


function useTicker(activeMs?: number) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!activeMs) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [activeMs]);
}

function elapsed(c: Chamado) {
  if (c.status === "encerrado" && c.encerradoEm) return c.encerradoEm - c.abertoEm;
  return Date.now() - c.abertoEm;
}

/** Tempo do técnico: acumula só enquanto em atendimento (pausa congela). */
function elapsedTecnico(c: Chamado) {
  const base = c.tecnicoMs ?? 0;
  if (c.status === "assumido" && c.assumidoEm) return base + (Date.now() - c.assumidoEm);
  return base;
}

export function ChamadoCard({ c }: { c: Chamado }) {
  const { user, atualizarChamado, assumirChamado, equipes, pecas, baixarEstoque } = useOs();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [imgsOpen, setImgsOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [itens, setItens] = useState<{ pecaId: string; qtd: number }[]>([]);
  const [justificativa, setJustificativa] = useState("");
  const [semMaterial, setSemMaterial] = useState(false);
  useTicker(c.status !== "encerrado" ? Date.now() : undefined);

  const equipe = equipes.find((e) => e.id === c.equipeId)?.nome ?? c.equipeId;
  const pecasMap = useMemo(() => new Map(pecas.map((p) => [p.id, p])), [pecas]);

  const update = (patch: Partial<Chamado>) => atualizarChamado(c.os, patch);

  const assumir = async () => {
    const ok = await assumirChamado(c.os, { status: "assumido", assumidoEm: Date.now(), tecnicoMs: c.tecnicoMs ?? 0, tecnico: user?.nome });
    if (ok) toast.success(`${c.os} assumido`);
  };
  const abrirFinalizar = () => { setItens([]); setJustificativa(""); setSemMaterial(false); setFinishOpen(true); };
  const confirmarFinalizar = async () => {
    const validos = itens.filter((i) => i.pecaId && i.qtd > 0);
    if (validos.length === 0 && !justificativa.trim()) {
      setSemMaterial(true);
      return toast.error("Sem peças informadas: justifique o serviço sem material para encerrar a OS");
    }
    if (validos.length > 0) {
      const ok = await baixarEstoque(c.os, validos);
      if (!ok) return;
    }
    await update({
      status: "encerrado",
      encerradoEm: Date.now(),
      tecnicoMs: elapsedTecnico(c),
      tecnico: c.tecnico ?? user?.nome,
      ...(validos.length === 0 ? { justificativaSemMaterial: justificativa.trim() } : {}),
    });
    toast.success(`${c.os} finalizado${validos.length ? ` · ${validos.length} peça(s) baixada(s)` : " · sem material"}`);
    setFinishOpen(false);
  };
  const reabrir = async () => { await update({ status: "aberto", encerradoEm: undefined, pausadoEm: undefined, motivoPausa: undefined, assumidoEm: undefined }); toast.info(`${c.os} reaberto`); };
  const pausar = async () => {
    if (!motivo.trim()) return toast.error("Informe o motivo");
    await update({ status: "pausado", pausadoEm: Date.now(), tecnicoMs: elapsedTecnico(c), motivoPausa: motivo.trim() });
    toast.info(`${c.os} pausado`); setMotivo(""); setPauseOpen(false);
  };

  const running = c.status !== "encerrado";
  const overdue = running && Date.now() - c.abertoEm > 20 * 3600_000;

  return (
    <Card className={cn(
      "surface-interactive relative flex flex-col overflow-hidden",
      overdue && "border-destructive/40",
    )}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          c.status === "aberto" ? "bg-destructive" : c.status === "assumido" ? "bg-primary" : c.status === "pausado" ? "bg-warning" : "bg-usina",
        )}
      />
      <CardContent className="space-y-3.5 p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="shrink-0 rounded-md bg-muted px-2 py-1 font-mono text-xs font-bold tracking-tight">{c.os}</div>
            <CallStatusPill status={c.status} />
            <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">{c.direcionamento}</Badge>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <div className={cn(
              "flex items-center gap-1.5 font-mono text-lg font-bold leading-none tabular-nums",
              overdue ? "text-destructive" : running ? "text-primary" : "text-muted-foreground",
            )} title="Tempo do chamado">
              <Timer className="h-4 w-4" />{fmtDuration(elapsed(c))}
            </div>
            {(c.status === "assumido" || c.status === "pausado" || (c.status === "encerrado" && (c.tecnicoMs ?? 0) > 0)) && (
              <div className={cn(
                "mt-1.5 flex items-center gap-1.5 font-mono text-sm font-semibold leading-none tabular-nums",
                c.status === "assumido" ? "text-usina" : "text-muted-foreground",
              )} title="Tempo do técnico">
                <UserCheck className="h-3.5 w-3.5" />{fmtDuration(elapsedTecnico(c))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg bg-muted/40 p-3 text-sm">
          <div className="min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Equipamento</span>
            <div className="truncate font-semibold">{c.equipamentoId}</div>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Equipe</span>
            <div className="truncate font-semibold">{equipe}</div>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Solicitante</span>
            <div className="truncate">{c.solicitante}</div>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Abertura</span>
            <div className="truncate text-xs tabular-nums">{new Date(c.abertoEm).toLocaleString("pt-BR")}</div>
          </div>
        </div>

        <p className="rounded-lg border border-border/70 bg-background p-3 text-sm leading-relaxed">{c.descricao}</p>

        {c.motivoPausa && (
          <div className="rounded-lg border border-warning/35 bg-warning/10 p-2.5 text-xs leading-relaxed text-warning">
            <strong className="font-semibold">Pausado:</strong> {c.motivoPausa}
          </div>
        )}
        {c.tecnico && <div className="text-xs text-muted-foreground">Técnico: <span className="font-medium text-foreground">{c.tecnico}</span></div>}

        {c.status === "encerrado" && c.pecasUsadas && c.pecasUsadas.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-usina/30 bg-usina/10 p-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-usina"><Package className="h-3.5 w-3.5" /> Peças utilizadas</div>
            <ul className="space-y-1">
              {c.pecasUsadas.map((u) => {
                const p = pecasMap.get(u.pecaId);
                return <li key={u.pecaId} className="flex justify-between gap-2"><span className="truncate font-mono">{p?.codigo ?? u.pecaId}</span><span className="tabular-nums">{u.qtd} {p?.unidade ?? ""}</span></li>;
              })}
            </ul>
          </div>
        )}

        {c.status === "encerrado" && !c.pecasUsadas?.length && c.justificativaSemMaterial && (
          <div className="rounded-lg border border-warning/35 bg-warning/10 p-2.5 text-xs text-warning">
            <div className="flex items-center gap-1.5 font-semibold"><FileText className="h-3.5 w-3.5" /> Serviço sem material</div>
            <p className="mt-1 leading-relaxed">{c.justificativaSemMaterial}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {c.status === "aberto" && (
            <Button size="sm" onClick={assumir}><UserCheck className="mr-1 h-4 w-4" /> Assumir</Button>
          )}
          {c.status === "assumido" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setPauseOpen(true)}><Pause className="mr-1 h-4 w-4" /> Pausar</Button>
              <Button size="sm" variant="usina" onClick={abrirFinalizar}><CheckCircle2 className="mr-1 h-4 w-4" /> Finalizar</Button>
            </>
          )}
          {c.status === "pausado" && (
            <Button size="sm" onClick={() => { update({ status: "assumido", assumidoEm: Date.now(), pausadoEm: undefined, motivoPausa: undefined }); toast.success("Retomado"); }}>
              <Play className="mr-1 h-4 w-4" /> Retomar
            </Button>
          )}
          {c.status === "encerrado" && (
            <Button size="sm" variant="outline" onClick={reabrir}><RotateCcw className="mr-1 h-4 w-4" /> Reabrir</Button>
          )}
          {!!c.imagens && (
            <Button size="sm" variant="ghost" onClick={() => setImgsOpen(true)}><ImageIcon className="mr-1 h-4 w-4" /> Ver imagens ({c.imagens})</Button>
          )}

        </div>
      </CardContent>

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Pausar {c.os}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`motivo-${c.os}`}>Motivo da pausa</Label>
            <Textarea id={`motivo-${c.os}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: aguardando peça, deslocamento..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)}>Cancelar</Button>
            <Button onClick={pausar}><Pause className="mr-1 h-4 w-4" /> Pausar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imgsOpen} onOpenChange={setImgsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Imagens de {c.os}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: c.imagens ?? 0 }).map((_, i) => (
              <div key={i} className="grid aspect-square place-items-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>


      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-usina" /> Finalizar {c.os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">Informe as peças utilizadas neste atendimento. O estoque será baixado automaticamente.</p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {itens.length === 0 && (
                <p className="rounded-lg border border-dashed border-border py-5 text-center text-xs text-muted-foreground">Nenhuma peça adicionada</p>
              )}
              {itens.map((it, idx) => {
                const p = pecasMap.get(it.pecaId);
                const insuf = p && it.qtd > p.qtd;
                return (
                  <div key={idx} className="grid grid-cols-[1fr_5rem_auto] items-end gap-2">
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-xs">Peça</Label>}
                      <select
                        aria-label="Peça utilizada"
                        className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs transition-colors hover:border-ring/40 focus-visible:border-ring md:h-9"
                        value={it.pecaId}
                        onChange={(e) => setItens((prev) => prev.map((x, i) => i === idx ? { ...x, pecaId: e.target.value } : x))}
                      >
                        <option value="">Selecione…</option>
                        {pecas.map((op) => (
                          <option key={op.id} value={op.id} disabled={itens.some((y, j) => j !== idx && y.pecaId === op.id)}>
                            {op.codigo} — {op.descricao} (estoque: {op.qtd})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-xs">Qtd</Label>}
                      <input
                        type="number"
                        min={1}
                        aria-label="Quantidade"
                        className={cn("h-10 w-full rounded-md border border-input bg-background px-2 text-sm tabular-nums shadow-xs transition-colors hover:border-ring/40 focus-visible:border-ring md:h-9", insuf && "border-destructive text-destructive")}
                        value={it.qtd}
                        onChange={(e) => setItens((prev) => prev.map((x, i) => i === idx ? { ...x, qtd: Math.max(0, +e.target.value) } : x))}
                      />
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Remover peça" onClick={() => setItens((prev) => prev.filter((_, i) => i !== idx))} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => { setItens((prev) => [...prev, { pecaId: "", qtd: 1 }]); setSemMaterial(false); }} className="w-full">
              <Plus className="mr-1 h-4 w-4" /> Adicionar peça
            </Button>

            {itens.length === 0 && !semMaterial && (
              <Button variant="secondary" onClick={() => setSemMaterial(true)} className="w-full">
                <FileText className="mr-1 h-4 w-4" /> Serviço sem material — justificar
              </Button>
            )}

            {itens.length === 0 && semMaterial && (
              <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
                <Label htmlFor={`just-${c.os}`} className="flex items-center gap-1.5 text-xs text-warning">
                  <FileText className="h-3.5 w-3.5" /> Justificativa do serviço sem material (obrigatória)
                </Label>
                <Textarea
                  id={`just-${c.os}`}
                  rows={3}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Ex.: apenas ajuste de configuração, reinício do equipamento, limpeza de conectores..."
                />

              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishOpen(false)}>Cancelar</Button>
            <Button variant="usina" onClick={confirmarFinalizar}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Finalizar chamado
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </Card>
  );
}

const STATUS_ORDER: Record<ChamadoStatus, number> = { aberto: 0, assumido: 0, pausado: 1, encerrado: 2 };

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("...");
  out.push(total);
  return out;
}

const PAGE_SIZE = 10;

export function ChamadosPanel({ direcionamento }: { direcionamento: Direcionamento }) {
  const { chamados, equipes, loadingData } = useOs();
  const [filtro, setFiltro] = useState<ChamadoStatus | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);

  const equipeNome = useMemo(() => new Map(equipes.map((e) => [e.id, e.nome])), [equipes]);
  const doSetor = useMemo(() => chamados.filter((c) => c.direcionamento === direcionamento), [chamados, direcionamento]);

  const list = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return doSetor
      .filter((c) => filtro === "todos" || c.status === filtro)
      .filter((c) => {
        if (!q) return true;
        const eq = (equipeNome.get(c.equipeId) ?? c.equipeId ?? "").toLowerCase();
        return [c.os, c.equipamentoId, eq, c.solicitante]
          .some((v) => String(v ?? "").toLowerCase().includes(q));
      })
      .sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || (a.abertoEm - b.abertoEm));
  }, [doSetor, filtro, busca, equipeNome]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filtro, busca, direcionamento]);

  const counts = useMemo(() => ({
    todos: doSetor.length,
    aberto: doSetor.filter((c) => c.status === "aberto").length,
    assumido: doSetor.filter((c) => c.status === "assumido").length,
    pausado: doSetor.filter((c) => c.status === "pausado").length,
    encerrado: doSetor.filter((c) => c.status === "encerrado").length,
  }), [doSetor]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={direcionamento === "GPS" ? Radio : Satellite}
        title={`Atendimento ${direcionamento}`}
        description={`Chamados direcionados à equipe ${direcionamento}`}
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar OS, frota, equipe…"
              aria-label="Buscar chamados"
              className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-200 hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>
        }
      />
      <div className="no-scrollbar -mx-1 flex flex-wrap items-center gap-2 px-1">
        {(["todos", "aberto", "assumido", "pausado", "encerrado"] as const).map((k) => (
          <FilterChip key={k} active={filtro === k} onClick={() => setFiltro(k)} count={counts[k]}>
            {k}
          </FilterChip>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pageItems.map((c) => <ChamadoCard key={c.os} c={c} />)}
        {pageItems.length === 0 && (
          loadingData ? (
            <CardGridSkeleton className="col-span-full" count={4} />
          ) : (
            <EmptyState
              className="col-span-full"
              icon={Inbox}
              title="Nenhum chamado nesta visão"
              description="Ajuste os filtros ou a busca para encontrar outros chamados."
            />
          )
        )}
      </div>

      {list.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-1 flex-wrap pt-2">
          <Button size="sm" variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</Button>
          {pageNumbers(current, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                size="sm"
                variant={p === current ? "default" : "outline"}
                className={cn("w-9 tabular-nums", p === current && "bg-usina hover:bg-usina/90 text-usina-foreground")}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button size="sm" variant="outline" disabled={current === totalPages} onClick={() => setPage(current + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
