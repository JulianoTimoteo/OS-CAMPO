import { useState } from "react";
import {
  BarChart3,
  Users as UsersIcon,
  Boxes,
  ClipboardPlus,
  Radio,
  Moon,
  Sun,
  KeyRound,
  LogOut,
  Menu,
  Package,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useOs } from "@/lib/os-store";
import { toast } from "sonner";
import { InstallPWA } from "@/components/os/InstallPWA";
import type { AccessLevel } from "@/lib/os-mock";
import { permissoesDoUsuario } from "@/lib/os-mock";

export type TabKey = "dashboards" | "usuarios" | "equipes" | "estoque" | "solicitante" | "gps" | "solinftec";

const allTabs: { key: TabKey; label: string; icon: any; roles: AccessLevel[] }[] = [
  { key: "dashboards", label: "Dashboards", icon: BarChart3, roles: ["gestor"] },
  { key: "usuarios", label: "Usuários", icon: UsersIcon, roles: ["gestor"] },
  { key: "equipes", label: "Equipes", icon: Boxes, roles: ["gestor"] },
  { key: "estoque", label: "Estoque", icon: Package, roles: ["gestor", "solinftec"] },
  { key: "solicitante", label: "Solicitante", icon: ClipboardPlus, roles: ["solicitante", "gestor"] },
  { key: "gps", label: "GPS", icon: Radio, roles: ["gps", "gestor"] },
  { key: "solinftec", label: "Solinftec", icon: Radio, roles: ["solinftec", "gestor"] },
];

export function Header({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  const { user, logout, theme, toggleTheme, changePassword, refreshData, loadingData } = useOs();
  const [openPwd, setOpenPwd] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const permitidas = permissoesDoUsuario(user);
  const tabs = allTabs.filter((t) => permitidas.includes(t.key));
  const initials = user?.nome.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "?";

  const Brand = ({ compact = false }: { compact?: boolean }) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src="/logo-usina.png"
        alt="Usina Pitangueiras"
        className={cn("shrink-0 object-contain", compact ? "h-8" : "h-9")}
        width={100}
        height={28}
      />
      {!compact && (
        <div className="hidden min-w-0 border-l border-border/60 pl-2.5 md:block">
          <div className="truncate text-sm font-bold leading-tight tracking-tight">OS CAMPO</div>
          <div className="truncate text-[11px] leading-tight text-muted-foreground">Gestão de OS</div>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:gap-3 sm:px-4">

        {/* Left: mobile menu + brand */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full shrink-0" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border/60">
                <SheetTitle className="flex items-center gap-2">
                  <img src="/logo-usina.png" alt="" className="h-8 object-contain" />
                  <span className="text-sm font-bold">OS CAMPO</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => { setTab(t.key); setMobileOpen(false); }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.99]",
                        active
                          ? "bg-usina text-usina-foreground shadow-soft"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", !active && "text-muted-foreground")} />
                      {t.label}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-border/60 space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-usina text-usina-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{user?.nome}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{user?.nivel}</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setOpenPwd(true); setMobileOpen(false); }}>
                  <KeyRound className="h-4 w-4 mr-2" /> Trocar Senha
                </Button>
                <Button variant="destructive" className="w-full" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Brand />
        </div>

        {/* Center tabs — desktop only */}
        <nav aria-label="Navegação principal" className="no-scrollbar hidden items-center justify-center overflow-x-auto lg:flex">
          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97]",
                    active
                      ? "bg-usina text-usina-foreground shadow-soft"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        <div className="lg:hidden" />


        {/* Right */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
          <InstallPWA />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refreshData(true)}
            disabled={loadingData}
            className="touch-target rounded-full"
            aria-label={loadingData ? "Atualizando dados" : "Atualizar dados"}
            title="Atualizar dados"
          >
            <RefreshCw className={cn("h-4 w-4", loadingData && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="touch-target rounded-full"
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Abrir menu da conta"
                className="ml-0.5 rounded-full ring-2 ring-transparent transition-all duration-200 hover:ring-usina/30 active:scale-95"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-usina text-xs font-bold text-usina-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-semibold">{user?.nome}</div>
                <div className="text-xs text-muted-foreground font-normal capitalize">{user?.nivel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpenPwd(true)}>
                <KeyRound className="h-4 w-4 mr-2" /> Trocar Senha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={openPwd} onOpenChange={setOpenPwd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 4 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use uma senha que você lembre com facilidade no campo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPwd(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (novaSenha.length < 4) return toast.error("Mínimo 4 caracteres");
              changePassword(novaSenha);
              toast.success("Senha alterada");
              setNovaSenha(""); setOpenPwd(false);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </header>
  );
}
