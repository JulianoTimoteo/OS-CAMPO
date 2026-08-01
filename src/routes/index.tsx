import { createFileRoute } from "@tanstack/react-router";
import { OsCampoApp } from "@/components/os/OsCampoApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OS CAMPO 📋 — Gestão de Ordens de Serviço · Usina Pitangueiras" },
      { name: "description", content: "Sistema de Field Service Management para frota agrícola. Abertura, atendimento e monitoramento de chamados GPS e Solinftec em tempo real." },
      { property: "og:title", content: "OS CAMPO 📋 — Gestão de Ordens de Serviço" },
      { property: "og:description", content: "Gestão de chamados mecânicos e telemetria para frota agrícola da Usina Pitangueiras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OsCampoApp,
});
