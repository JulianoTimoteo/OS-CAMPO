import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useOs } from "@/lib/os-store";

export function LoginScreen() {
  const { login, requestLogin } = useOs();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [openReq, setOpenReq] = useState(false);
  const [nome, setNome] = useState("");
  const [idUsina, setIdUsina] = useState("");
  const [telefone, setTelefone] = useState("");

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-gradient-to-br from-background via-background to-accent/40 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-usina/15 blur-3xl"
      />
      <Card className="animate-enter relative w-full max-w-md border-border/60 shadow-raised">
        <CardContent className="p-7 sm:p-9">
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-border/60">
              <img src="/logo-usina.png" alt="Usina Pitangueiras" className="h-14 object-contain" width={180} height={56} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">OS CAMPO</h1>
              <p className="mt-1 text-sm text-muted-foreground">Usina Pitangueiras · Gestão de OS</p>
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const found = await login(u.trim(), p);
              if (!found) toast.error("Usuário ou senha inválidos");
              else toast.success(`Bem-vindo, ${found.nome.split(" ")[0]}!`);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="usr">Usuário</Label>
              <Input id="usr" value={u} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" placeholder="ex.: carlos.silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <div className="relative">
                <Input
                  id="pwd"
                  type={show ? "text" : "password"}
                  value={p}
                  autoComplete="current-password"
                  onChange={(e) => setP(e.target.value)}
                  placeholder="••••"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="usina" size="lg" className="w-full">
              Entrar
            </Button>
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setOpenReq(true)}>
              Solicitar login
            </Button>
          </form>

          <p className="mt-7 text-center text-xs italic text-muted-foreground">
            "A energia que move a região"
          </p>
        </CardContent>
      </Card>


      <Dialog open={openReq} onOpenChange={setOpenReq}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Login</DialogTitle>
            <DialogDescription>Preencha seus dados para envio à gestão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ID da Usina</Label>
              <Input value={idUsina} onChange={(e) => setIdUsina(e.target.value)} placeholder="USP-000" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReq(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!nome || !idUsina) return toast.error("Preencha nome e ID");
                requestLogin({ nome, idUsina, telefone });
                toast.success("Solicitação enviada!");
                setOpenReq(false);
                setNome(""); setIdUsina(""); setTelefone("");
              }}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
