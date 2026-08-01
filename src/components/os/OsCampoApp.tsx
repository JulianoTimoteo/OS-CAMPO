import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { OsProvider, useOs } from "@/lib/os-store";
import { permissoesDoUsuario } from "@/lib/os-mock";
import { LoginScreen } from "@/components/os/LoginScreen";
import { Header, type TabKey } from "@/components/os/Header";
import { Dashboard } from "@/components/os/Dashboard";
import { UsuariosPage } from "@/components/os/UsuariosPage";
import { EquipesPage } from "@/components/os/EquipesPage";
import { SolicitantePage } from "@/components/os/SolicitantePage";
import { ChamadosPanel } from "@/components/os/ChamadoCard";
import { EstoquePage } from "@/components/os/EstoquePage";
import { GlobalLoadingBar } from "@/components/os/ui-kit";

function defaultTab(nivel: string): TabKey {
  if (nivel === "gestor") return "dashboards";
  if (nivel === "gps") return "gps";
  if (nivel === "solinftec") return "solinftec";
  return "solicitante";
}

function AppShell() {
  const { user, loadingData } = useOs();
  const [tab, setTab] = useState<TabKey>("dashboards");

  if (!user) return <LoginScreen />;

  // Abas liberadas: permissões personalizadas do usuário ou padrão do nível
  const allowed = permissoesDoUsuario(user) as TabKey[];
  const fallback = allowed.includes(defaultTab(user.nivel)) ? defaultTab(user.nivel) : allowed[0];
  const effectiveTab = allowed.includes(tab) ? tab : fallback;

  return (
    <div className="min-h-dvh bg-background">
      <GlobalLoadingBar active={loadingData} />
      <Header tab={effectiveTab} setTab={setTab} />
      <main
        key={effectiveTab}
        className="animate-enter mx-auto w-full max-w-7xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:py-8"
      >
        {effectiveTab === "dashboards" && <Dashboard />}
        {effectiveTab === "usuarios" && <UsuariosPage />}
        {effectiveTab === "equipes" && <EquipesPage />}
        {effectiveTab === "estoque" && <EstoquePage />}
        {effectiveTab === "solicitante" && <SolicitantePage />}
        {effectiveTab === "gps" && <ChamadosPanel direcionamento="GPS" />}
        {effectiveTab === "solinftec" && <ChamadosPanel direcionamento="Solinftec" />}
      </main>
    </div>

  );
}

export function OsCampoApp() {
  return (
    <OsProvider>
      <AppShell />
      <Toaster position="top-right" richColors />
    </OsProvider>
  );
}
