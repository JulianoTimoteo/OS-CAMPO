import { useMemo, useState } from "react";
import { Camera, Image as ImageIcon, Mic, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOs } from "@/lib/os-store";
import type { Chamado, Direcionamento } from "@/lib/os-mock";
import { fmtDuration } from "@/lib/os-mock";
import { toast } from "sonner";
import { CallStatusPill } from "./ChamadoCard";

export function SolicitantePage() {
  const { user, equipes, equipamentos, chamados, criarChamado } = useOs();
  const [equipeId, setEquipeId] = useState("");
  const [direc, setDirec] = useState<Direcionamento>("GPS");
  const [tipo, setTipo] = useState("");
  const [eqpId, setEqpId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imgCount, setImgCount] = useState(0);
  const [hasAudio, setHasAudio] = useState(false);
  const [confirmDuplicado, setConfirmDuplicado] = useState<null | (() => void)>(null);
  const [page, setPage] = useState(1);

  const eqposEquipe = useMemo(() => equipamentos.filter((e) => e.equipeId === equipeId && e.ativo), [equipamentos, equipeId]);
  const tipos = useMemo(() => [...new Set(eqposEquipe.map((e) => e.tipo))], [eqposEquipe]);
  const frotas = useMemo(() => eqposEquipe.filter((e) => !tipo || e.tipo === tipo), [eqposEquipe, tipo]);

  const abrir = () => {
    if (!equipeId || !eqpId || !descricao.trim()) return toast.error("Preencha equipe, equipamento e descrição");
    const jaAberto = chamados.some((c) => c.equipamentoId === eqpId && c.status !== "encerrado");
    const doOpen = async () => {
      const os = await criarChamado({
        equipamentoId: eqpId,
        equipeId,
        solicitante: user?.nome ?? "—",
        direcionamento: direc,
        descricao: descricao.trim(),
        imagens: imgCount,
      });
      if (os) toast.success(`Chamado ${os} aberto`);
      setDescricao(""); setImgCount(0); setHasAudio(false);
    };
    if (jaAberto) { setConfirmDuplicado(() => doOpen); return; }
    doOpen();
  };

  const meus = chamados.filter((c) => c.solicitante === user?.nome);
  const pageSize = 4;
  const pageItems = meus.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(meus.length / pageSize));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <Card className="overflow-hidden">
        <CardHeader className="gap-1 border-b border-border/60 bg-muted/30 pb-4">
          <CardTitle className="text-lg tracking-tight">Abrir Ordem de Serviço</CardTitle>
          <p className="text-xs text-muted-foreground">Data automática: <span className="font-mono tabular-nums">{new Date().toLocaleString("pt-BR")}</span></p>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={equipeId} onValueChange={(v) => { setEquipeId(v); setEqpId(""); setTipo(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar equipe" /></SelectTrigger>
                <SelectContent>{equipes.filter((e) => e.id !== "inativos").map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Solicitar técnico</Label>
              <Select value={direc} onValueChange={(v) => setDirec(v as Direcionamento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GPS">GPS</SelectItem>
                  <SelectItem value="Solinftec">Solinftec</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de frota</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v); setEqpId(""); }} disabled={!equipeId}>
                <SelectTrigger><SelectValue placeholder={equipeId ? "Todos" : "Escolha equipe"} /></SelectTrigger>
                <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frota / ID</Label>
              <Select value={eqpId} onValueChange={setEqpId} disabled={!equipeId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{frotas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="os-desc">Descrição do problema</Label>
              <span className="text-xs tabular-nums text-muted-foreground">{descricao.length}/300</span>
            </div>
            <Textarea id="os-desc" value={descricao} maxLength={300} onChange={(e) => setDescricao(e.target.value)} rows={4} placeholder="Descreva o defeito com detalhes..." />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <Button variant="outline" size="sm" onClick={() => { setImgCount((n) => n + 1); toast.info("Imagem anexada (mock)"); }}>
              <ImageIcon className="mr-1 h-4 w-4" /> Anexar Imagem
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setImgCount((n) => n + 1); toast.info("Foto capturada (mock)"); }}>
              <Camera className="mr-1 h-4 w-4" /> Câmera
            </Button>
            <Button variant={hasAudio ? "default" : "outline"} size="sm" onClick={() => { setHasAudio((s) => !s); toast.info(hasAudio ? "Áudio removido" : "Áudio gravado (mock)"); }}>
              <Mic className="mr-1 h-4 w-4" /> {hasAudio ? "Áudio pronto" : "Gravar Áudio"}
            </Button>
            {imgCount > 0 && <Badge variant="secondary"><Paperclip className="mr-1 h-3 w-3" />{imgCount} anexo(s)</Badge>}
          </div>

          <Button variant="usina" size="lg" onClick={abrir} className="w-full">
            <Send className="mr-1 h-4 w-4" /> Abrir Chamado
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
          <CardTitle className="text-base tracking-tight">Meus chamados recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-4">
          {pageItems.map((c) => (
            <div key={c.os} className="space-y-1.5 rounded-xl border border-border/70 p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-xs font-bold tracking-wide">{c.os}</div>
                <CallStatusPill status={c.status} />
              </div>
              <div className="text-sm font-semibold">{c.equipamentoId} · {c.direcionamento}</div>
              <div className="line-clamp-2 text-xs text-muted-foreground">{c.descricao}</div>
              <div className="text-[11px] tabular-nums text-muted-foreground">{new Date(c.abertoEm).toLocaleString("pt-BR")} · {fmtDuration(Date.now() - c.abertoEm)}</div>
            </div>
          ))}
          {pageItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">Você ainda não abriu chamados.</p>
            </div>
          )}
          {meus.length > pageSize && (
            <div className="flex items-center justify-between gap-2 pt-2 text-sm">
              <span className="text-muted-foreground">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      <AlertDialog open={!!confirmDuplicado} onOpenChange={(o) => !o && setConfirmDuplicado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Equipamento já possui chamado aberto</AlertDialogTitle>
            <AlertDialogDescription>Este equipamento tem um chamado em andamento. Deseja abrir mesmo assim?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDuplicado?.(); setConfirmDuplicado(null); }}>Abrir assim mesmo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
