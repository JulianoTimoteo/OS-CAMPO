import { useState } from "react";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/os/ui-kit";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useOs } from "@/lib/os-store";
import type { EquipTipo, Equipamento } from "@/lib/os-mock";
import { toast } from "sonner";

const tipos: EquipTipo[] = ["Colhedora", "Transbordo", "Trator", "Caminhão", "Caminhão Oficina", "Pulverizador", "Outro"];
const cores = ["#16a34a", "#0891b2", "#ca8a04", "#7c3aed", "#e11d48", "#0284c7", "#64748b", "#f97316", "#db2777"];

/** Cores oficiais por frente (chave normalizada: sem acento, maiúscula). */
const EQUIPE_CORES: Record<string, string> = {
  "BRIGADA DE INCENDIO": "#dc2626",      // vermelho
  "CANAVIEIRO": "#2563eb",               // azul
  "COMBOIO": "#7b3f00",                  // marrom
  "FERTIRRIGACAO": "#38bdf8",            // azul claro
  "LINHA AMARELA": "#facc15",            // amarelo
  "PRANCHA": "#1e3a8a",                  // azul bem escuro
  "PREPARO DE SOLO": "#b58863",          // marrom claro
  "PREPARO DE SOLO TERCEIRO": "#b58863", // marrom claro
  "TRATOS CULTURAIS": "#40800C",         // verde
  "VEICULOS LEVES": "#f97316",           // laranja
};

function norm(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}

function corEquipe(nome: string) {
  return EQUIPE_CORES[norm(nome)] ?? "#64748b";
}

export function EquipesPage() {
  const { user, equipes, saveEquipe, removeEquipe, equipamentos, saveEquipamento, removeEquipamento } = useOs();
  const isGestor = user?.nivel === "gestor";
  const [novaEq, setNovaEq] = useState("");
  const [openEq, setOpenEq] = useState<string | null>(null);
  const [formEqp, setFormEqp] = useState<Omit<Equipamento, "id" | "ativo">>({ nome: "", tipo: "Colhedora", cor: "#16a34a", equipeId: "" });
  const [editingEqp, setEditingEqp] = useState<Equipamento | null>(null);

  const criarEquipe = async () => {
    if (!novaEq.trim()) return;
    if (!isGestor) return toast.error("Somente gestores podem criar equipes");
    if (equipes.some((e) => norm(e.nome) === norm(novaEq))) return toast.error("Já existe uma equipe com esse nome");
    const id = "eq" + Date.now();
    await saveEquipe({ id, nome: novaEq });
    setNovaEq(""); toast.success("Equipe criada");
  };

  const excluirEquipe = async (id: string, nome: string) => {
    if (!isGestor) return toast.error("Somente gestores podem excluir equipes");
    if (!confirm(`Excluir a equipe "${nome}" e toda a frota vinculada?`)) return;
    await removeEquipe(id);
    toast.success("Equipe excluída");
  };

  const salvarEqp = async () => {
    if (!formEqp.nome || !formEqp.equipeId) return toast.error("Preencha nome e equipe");
    const dup = equipamentos.find(
      (x) => norm(String(x.nome || x.id)) === norm(formEqp.nome) && x.id !== editingEqp?.id,
    );
    if (dup) {
      const nomeEq = equipes.find((e) => e.id === dup.equipeId)?.nome ?? dup.equipeId;
      return toast.error(`Equipamento ${dup.nome} já existe na equipe ${nomeEq}`);
    }
    const eq: Equipamento = editingEqp
      ? { ...editingEqp, ...formEqp }
      : { id: formEqp.nome, ativo: true, ...formEqp };
    await saveEquipamento(eq);
    toast.success(editingEqp ? "Equipamento atualizado" : "Equipamento adicionado");
    setOpenEq(null); setEditingEqp(null);
  };

  const inativar = async (eqp: Equipamento) => {
    if (!isGestor) return toast.error("Somente gestores podem excluir equipamentos");
    if (!confirm(`Excluir o equipamento ${eqp.nome}?`)) return;
    await removeEquipamento(eqp.id);
    toast.success(`${eqp.nome} removido`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title="Equipes & Frota"
        description="Frentes de trabalho e equipamentos vinculados"
        actions={isGestor ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              value={novaEq}
              onChange={(e) => setNovaEq(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void criarEquipe(); }}
              placeholder="Nome da equipe"
              aria-label="Nome da nova equipe"
              className="w-full sm:w-52"
            />
            <Button variant="usina" onClick={criarEquipe} className="shrink-0"><Plus className="mr-1 h-4 w-4" /> Equipe</Button>
          </div>
        ) : undefined}
      />

      <Card>
        <CardContent className="p-2 sm:p-4">

          <Accordion type="multiple" className="w-full">
            {equipes.map((eq) => {
              const list = equipamentos.filter((e) => e.equipeId === eq.id);
              const corEq = corEquipe(eq.nome);
              return (
                <AccordionItem value={eq.id} key={eq.id} className="border-b border-border/60 last:border-b-0">
                  <AccordionTrigger className="rounded-lg px-2 hover:bg-muted/40 hover:no-underline">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                        style={{ background: `${corEq}26`, color: corEq }}>
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="truncate text-left font-semibold" style={{ color: corEq }}>{eq.nome}</div>
                      <div className="ml-auto flex shrink-0 items-center gap-2 pr-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{list.length} equip.</span>
                        {isGestor && eq.id !== "inativos" && (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Excluir equipe ${eq.nome}`}
                            onClick={(ev) => { ev.stopPropagation(); excluirEquipe(eq.id, eq.nome); }}
                            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); excluirEquipe(eq.id, eq.nome); } }}
                            className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2 px-2 pb-3">
                      {list.map((eqp) => (
                        <div
                          key={eqp.id}
                          className="group relative inline-flex items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-1.5 text-xs font-semibold shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                          style={{ background: `${corEq}22`, borderColor: `${corEq}66`, color: corEq }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: corEq }} />
                          {eqp.nome}
                          <span className="opacity-70">· {eqp.tipo}</span>
                          <div className="ml-1 flex opacity-60 transition-opacity duration-200 group-hover:opacity-100">
                            <button aria-label={`Editar ${eqp.nome}`} className="rounded-full p-1 transition-colors hover:bg-background/70" onClick={() => { setEditingEqp(eqp); setFormEqp({ nome: eqp.nome, tipo: eqp.tipo, cor: eqp.cor, equipeId: eqp.equipeId }); setOpenEq(eq.id); }}>
                              <Pencil className="h-3 w-3" />
                            </button>
                            {isGestor && (
                              <button className="rounded-full p-1 transition-colors hover:bg-background/70" onClick={() => inativar(eqp)} aria-label={`Excluir ${eqp.nome}`}>
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {list.length === 0 && <p className="text-xs text-muted-foreground">Nenhum equipamento nesta equipe.</p>}
                      {eq.id !== "inativos" && (
                        <button
                          onClick={() => { setEditingEqp(null); setFormEqp({ nome: "", tipo: "Colhedora", cor: "#16a34a", equipeId: eq.id }); setOpenEq(eq.id); }}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-usina hover:text-usina"
                        >
                          <Plus className="h-3 w-3" /> Adicionar
                        </button>
                      )}
                    </div>

                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={!!openEq} onOpenChange={(o) => { if (!o) { setOpenEq(null); setEditingEqp(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingEqp ? "Editar" : "Novo"} equipamento</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="eqp-nome">Nome / ID</Label><Input id="eqp-nome" value={formEqp.nome} onChange={(e) => setFormEqp({ ...formEqp, nome: e.target.value })} placeholder="ex.: CH-3412" /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formEqp.tipo} onValueChange={(v) => setFormEqp({ ...formEqp, tipo: v as EquipTipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={formEqp.equipeId} onValueChange={(v) => setFormEqp({ ...formEqp, equipeId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{equipes.filter((e) => e.id !== "inativos").map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2.5">
                {cores.map((c) => (
                  <button key={c} type="button" aria-label={`Selecionar cor ${c}`} onClick={() => setFormEqp({ ...formEqp, cor: c })}
                    className={`h-9 w-9 rounded-full border-2 border-transparent shadow-xs transition-all duration-200 hover:scale-105 ${formEqp.cor === c ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenEq(null); setEditingEqp(null); }}>Cancelar</Button>
            <Button variant="usina" onClick={salvarEqp}>Salvar</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
