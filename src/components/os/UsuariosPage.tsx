import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Shield, Trash2, Users } from "lucide-react";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/os/ui-kit";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOs } from "@/lib/os-store";
import type { AccessLevel, AppTab, User } from "@/lib/os-mock";
import { APP_TABS, PERMISSOES_PADRAO, permissoesDoUsuario } from "@/lib/os-mock";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const empty: Omit<User, "id"> = {
  nome: "", usuario: "", senha: "", nivel: "solicitante", idUsina: "", ativo: true,
};

export function UsuariosPage() {
  const { users, saveUser, removeUser, loadingData } = useOs();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<User, "id">>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [permSel, setPermSel] = useState<AppTab[]>([]);

  const openPerm = (u: User) => {
    setPermUser(u);
    setPermSel(permissoesDoUsuario(u));
  };
  const togglePerm = (key: AppTab) =>
    setPermSel((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const savePerm = async () => {
    if (!permUser) return;
    if (permSel.length === 0) return toast.error("Selecione ao menos uma aba");
    await saveUser({ ...permUser, permissoes: permSel });
    toast.success(`Permissões de ${permUser.nome} atualizadas`);
    setPermUser(null);
  };
  const resetPerm = () => permUser && setPermSel(PERMISSOES_PADRAO[permUser.nivel] ?? []);

  const filtered = useMemo(
    () => users.filter((u) => (u.nome + u.usuario + u.idUsina).toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (u: User) => { const { id, ...rest } = u; setForm(rest); setEditId(id); setOpen(true); };
  const save = async () => {
    if (!form.nome || !form.usuario) return toast.error("Nome e usuário obrigatórios");
    const id = editId ?? form.usuario ?? String(Date.now());
    await saveUser({ id, ...form });
    toast.success(editId ? "Usuário atualizado" : "Usuário criado");
    setOpen(false);
  };

  const nivelBadge: Record<AccessLevel, string> = {
    gestor: "bg-usina/12 text-usina border-usina/30",
    gps: "bg-info/12 text-info border-info/30",
    solinftec: "bg-violet-500/12 text-violet-500 border-violet-500/30",
    solicitante: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Usuários"
        description="Gerencie acessos e níveis de permissão"
        actions={
          <Button variant="usina" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar por nome, usuário ou ID" aria-label="Buscar usuários" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>ID Usina</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((u) => (
                  <TableRow key={u.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{u.usuario}</TableCell>
                    <TableCell className="font-mono text-xs">{u.idUsina}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("capitalize", nivelBadge[u.nivel])}>{u.nivel}</Badge></TableCell>
                    <TableCell>
                      {u.ativo
                        ? <Badge className="bg-usina text-usina-foreground">Ativo</Badge>
                        : <Badge variant="secondary">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="space-x-0.5 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" aria-label={`Permissões de ${u.nome}`} onClick={() => openPerm(u)}><Shield className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Editar ${u.nome}`} onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Excluir ${u.nome}`} className="hover:bg-destructive/10" onClick={() => setDelId(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pageItems.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      {loadingData ? (
                        <TableSkeleton rows={5} cols={5} />
                      ) : (
                        <EmptyState
                          className="border-0 bg-transparent"
                          icon={Users}
                          title="Nenhum usuário encontrado"
                          description="Ajuste a busca ou cadastre um novo usuário."
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-3 pt-4 text-sm">
            <span className="text-muted-foreground">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} usuário</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="u-nome">Nome</Label><Input id="u-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="u-id">ID Usina</Label><Input id="u-id" value={form.idUsina} onChange={(e) => setForm({ ...form, idUsina: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="u-user">Usuário</Label><Input id="u-user" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="u-pwd">Senha</Label><Input id="u-pwd" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Nível de acesso</Label>
              <Select value={form.nivel} onValueChange={(v) => setForm({ ...form, nivel: v as AccessLevel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitante">Solicitante</SelectItem>
                  <SelectItem value="gps">GPS</SelectItem>
                  <SelectItem value="solinftec">Solinftec</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="usina" onClick={save}>Salvar</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Dialog open={!!permUser} onOpenChange={(o) => !o && setPermUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-usina" /> Permissões — {permUser?.nome}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha quais abas este usuário pode acessar. As alterações valem no próximo carregamento do menu do usuário.
          </p>
          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {APP_TABS.map((t) => {
              const on = permSel.includes(t.key);
              return (
                <label
                  key={t.key}
                  htmlFor={`perm-${t.key}`}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                    on ? "border-usina/40 bg-usina/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.descricao}</div>
                  </div>
                  <Switch id={`perm-${t.key}`} checked={on} onCheckedChange={() => togglePerm(t.key)} />
                </label>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={resetPerm}>Restaurar padrão do nível</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPermUser(null)}>Cancelar</Button>
              <Button variant="usina" onClick={savePerm}>Salvar permissões</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (delId) await removeUser(delId);
              toast.success("Usuário removido");
              setDelId(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
