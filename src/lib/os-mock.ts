export type AccessLevel = "solicitante" | "gps" | "solinftec" | "gestor";

export interface User {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
  nivel: AccessLevel;
  idUsina: string;
  telefone?: string;
  ativo: boolean;
  /** Abas liberadas para este usuário. Se ausente, usa o padrão do nível. */
  permissoes?: AppTab[];
}

export type AppTab =
  | "dashboards" | "usuarios" | "equipes" | "estoque" | "solicitante" | "gps" | "solinftec";

export const APP_TABS: { key: AppTab; label: string; descricao: string }[] = [
  { key: "dashboards", label: "Dashboards", descricao: "Indicadores e gráficos gerenciais" },
  { key: "usuarios", label: "Usuários", descricao: "Cadastro e permissões de acesso" },
  { key: "equipes", label: "Equipes", descricao: "Frentes e equipamentos" },
  { key: "estoque", label: "Estoque", descricao: "Peças, movimentos e relatórios" },
  { key: "solicitante", label: "Solicitante", descricao: "Abertura de OS" },
  { key: "gps", label: "GPS", descricao: "Chamados direcionados ao GPS" },
  { key: "solinftec", label: "Solinftec", descricao: "Chamados direcionados à Solinftec" },
];

export const PERMISSOES_PADRAO: Record<AccessLevel, AppTab[]> = {
  gestor: ["dashboards", "usuarios", "equipes", "estoque", "solicitante", "gps", "solinftec"],
  gps: ["gps"],
  solinftec: ["solinftec", "estoque"],
  solicitante: ["solicitante"],
};

/** Abas efetivamente liberadas: personalizadas (se houver) ou padrão do nível. */
export function permissoesDoUsuario(u?: Pick<User, "nivel" | "permissoes"> | null): AppTab[] {
  if (!u) return [];
  const custom = u.permissoes?.filter((t) => APP_TABS.some((a) => a.key === t));
  if (custom && custom.length) return custom;
  return PERMISSOES_PADRAO[u.nivel] ?? [];
}

export type EquipTipo =
  | "Colhedora"
  | "Transbordo"
  | "Trator"
  | "Caminhão"
  | "Caminhão Oficina"
  | "Pulverizador"
  | "Outro";

export interface Equipamento {
  id: string;
  nome: string;
  tipo: EquipTipo;
  cor: string;
  equipeId: string;
  ativo: boolean;
}

export interface Equipe {
  id: string;
  nome: string;
}

export type ChamadoStatus = "aberto" | "assumido" | "pausado" | "encerrado";
export type Direcionamento = "GPS" | "Solinftec";

export interface Chamado {
  os: string;
  equipamentoId: string;
  equipeId: string;
  solicitante: string;
  direcionamento: Direcionamento;
  descricao: string;
  status: ChamadoStatus;
  abertoEm: number; // ms
  assumidoEm?: number;
  pausadoEm?: number;
  motivoPausa?: string;
  encerradoEm?: number;
  tecnico?: string;
  /** tempo acumulado (ms) do técnico, sem contar pausas */
  tecnicoMs?: number;
  imagens?: number;
  pecasUsadas?: { pecaId: string; qtd: number }[];
  /** justificativa obrigatória quando o atendimento é encerrado sem uso de material */
  justificativaSemMaterial?: string;
}

export interface Peca {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string; // un, m, L, kg
  qtd: number;
  minimo: number;
}

export type MovimentoTipo = "baixa" | "entrada" | "ajuste";
export interface Movimento {
  id: string;
  pecaId: string;
  tipo: MovimentoTipo;
  qtd: number; // positivo = entrada, negativo = baixa
  motivo: string;
  usuarioId: string;
  usuarioNome: string;
  os?: string;
  data: number; // ms
}

export const equipes: Equipe[] = [
  { id: "e01", nome: "Equipe 01" },
  { id: "e05", nome: "Equipe 05" },
  { id: "e08", nome: "Equipe 08" },
  { id: "e12", nome: "Equipe 12" },
  { id: "inativos", nome: "Inativos" },
];

const tipoColor: Record<EquipTipo, string> = {
  Colhedora: "#16a34a",
  Transbordo: "#0891b2",
  Trator: "#ca8a04",
  Caminhão: "#7c3aed",
  "Caminhão Oficina": "#e11d48",
  Pulverizador: "#0284c7",
  Outro: "#64748b",
};

export const equipamentos: Equipamento[] = [
  { id: "CH-3410", nome: "CH-3410", tipo: "Colhedora", cor: tipoColor.Colhedora, equipeId: "e08", ativo: true },
  { id: "CH-3411", nome: "CH-3411", tipo: "Colhedora", cor: tipoColor.Colhedora, equipeId: "e08", ativo: true },
  { id: "TB-221", nome: "TB-221", tipo: "Transbordo", cor: tipoColor.Transbordo, equipeId: "e08", ativo: true },
  { id: "TB-222", nome: "TB-222", tipo: "Transbordo", cor: tipoColor.Transbordo, equipeId: "e05", ativo: true },
  { id: "TR-101", nome: "TR-101", tipo: "Trator", cor: tipoColor.Trator, equipeId: "e01", ativo: true },
  { id: "CM-77", nome: "CM-77", tipo: "Caminhão", cor: tipoColor.Caminhão, equipeId: "e12", ativo: true },
  { id: "CO-02", nome: "CO-02", tipo: "Caminhão Oficina", cor: tipoColor["Caminhão Oficina"], equipeId: "e01", ativo: true },
  { id: "PV-09", nome: "PV-09", tipo: "Pulverizador", cor: tipoColor.Pulverizador, equipeId: "e05", ativo: true },
  { id: "TR-099", nome: "TR-099", tipo: "Trator", cor: tipoColor.Trator, equipeId: "inativos", ativo: false },
];

export const usuarios: User[] = [
  { id: "1", nome: "Carlos Silva", usuario: "carlos.silva", senha: "1234", nivel: "gestor", idUsina: "USP-001", ativo: true },
  { id: "2", nome: "João GPS", usuario: "joao.gps", senha: "1234", nivel: "gps", idUsina: "USP-014", ativo: true },
  { id: "3", nome: "Marcos Solinftec", usuario: "marcos.sol", senha: "1234", nivel: "solinftec", idUsina: "USP-021", ativo: true },
  { id: "4", nome: "Ana Solicitante", usuario: "ana.sol", senha: "1234", nivel: "solicitante", idUsina: "USP-032", ativo: true },
  { id: "5", nome: "Pedro Campo", usuario: "pedro.c", senha: "1234", nivel: "solicitante", idUsina: "USP-045", ativo: true },
];

const now = Date.now();
const min = 60_000;
const h = 60 * min;

export const chamadosSeed: Chamado[] = [
  { os: "OS-1042", equipamentoId: "CH-3410", equipeId: "e08", solicitante: "Ana Solicitante", direcionamento: "GPS", descricao: "Vazamento hidráulico no braço da colhedora.", status: "aberto", abertoEm: now - 2 * h - 12 * min, imagens: 2 },
  { os: "OS-1041", equipamentoId: "TB-221", equipeId: "e08", solicitante: "Pedro Campo", direcionamento: "Solinftec", descricao: "Falha no rastreador, sem sinal há 30min.", status: "assumido", abertoEm: now - 3 * h, assumidoEm: now - 2 * h, tecnico: "Marcos Solinftec" },
  { os: "OS-1040", equipamentoId: "TR-101", equipeId: "e01", solicitante: "Ana Solicitante", direcionamento: "GPS", descricao: "Antena GPS deslocada, precisa recalibrar.", status: "pausado", abertoEm: now - 5 * h, assumidoEm: now - 4 * h, pausadoEm: now - 1 * h, motivoPausa: "Aguardando peça", tecnico: "João GPS" },
  { os: "OS-1039", equipamentoId: "CM-77", equipeId: "e12", solicitante: "Pedro Campo", direcionamento: "Solinftec", descricao: "Sistema telemetria desligando sozinho.", status: "encerrado", abertoEm: now - 26 * h, assumidoEm: now - 25 * h, encerradoEm: now - 22 * h, tecnico: "Marcos Solinftec" },
  { os: "OS-1038", equipamentoId: "PV-09", equipeId: "e05", solicitante: "Ana Solicitante", direcionamento: "GPS", descricao: "Erro na bandeja do piloto automático.", status: "aberto", abertoEm: now - 40 * min },
  { os: "OS-1037", equipamentoId: "CO-02", equipeId: "e01", solicitante: "Pedro Campo", direcionamento: "GPS", descricao: "Monitor não liga após reboot.", status: "encerrado", abertoEm: now - 50 * h, assumidoEm: now - 49 * h, encerradoEm: now - 47 * h, tecnico: "João GPS" },
  { os: "OS-1036", equipamentoId: "TB-222", equipeId: "e05", solicitante: "Ana Solicitante", direcionamento: "Solinftec", descricao: "Sensor de peso descalibrado.", status: "assumido", abertoEm: now - 6 * h, assumidoEm: now - 5 * h, tecnico: "Marcos Solinftec" },
  { os: "OS-1035", equipamentoId: "CH-3411", equipeId: "e08", solicitante: "Pedro Campo", direcionamento: "GPS", descricao: "Piloto perdeu linha de plantio.", status: "encerrado", abertoEm: now - 70 * h, assumidoEm: now - 69 * h, encerradoEm: now - 66 * h, tecnico: "João GPS" },
];

export const pecasSeed: Peca[] = [
  { id: "p001", codigo: "ANT-GPS-01", descricao: "Antena GPS L1/L2", unidade: "un", qtd: 8, minimo: 3 },
  { id: "p002", codigo: "CAB-ETH-05", descricao: "Cabo Ethernet CAT6 5m", unidade: "un", qtd: 22, minimo: 10 },
  { id: "p003", codigo: "MOD-TEL-02", descricao: "Módulo Telemetria 4G", unidade: "un", qtd: 4, minimo: 2 },
  { id: "p004", codigo: "SEN-PESO-1T", descricao: "Sensor de peso 1T", unidade: "un", qtd: 6, minimo: 2 },
  { id: "p005", codigo: "FUS-15A", descricao: "Fusível 15A", unidade: "un", qtd: 120, minimo: 40 },
  { id: "p006", codigo: "CHIP-M2M", descricao: "Chip M2M dados", unidade: "un", qtd: 15, minimo: 5 },
  { id: "p007", codigo: "SUP-ANT-01", descricao: "Suporte de antena", unidade: "un", qtd: 9, minimo: 3 },
  { id: "p008", codigo: "GRX-SIL-200", descricao: "Graxa de silicone 200g", unidade: "un", qtd: 12, minimo: 4 },
];

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
