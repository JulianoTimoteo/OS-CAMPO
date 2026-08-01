import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  serverTimestamp, query, orderBy, deleteField, runTransaction, where, limit,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  db, auth, parseBrDate, formatBrDate, normalizeNivel, nextOsNumber,
  entrarAnonimo, sair, trocarSenha, criarContaAuth,
} from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import type {
  Chamado, ChamadoStatus, Direcionamento, Equipamento, Equipe,
  Movimento, Peca, User, AccessLevel, EquipTipo,
} from "./os-mock";

type Theme = "light" | "dark";

interface Store {
  ready: boolean;
  theme: Theme;
  toggleTheme: () => void;
  user: User | null;
  login: (usuario: string, senha: string) => Promise<User | null>;
  logout: () => void;
  changePassword: (nova: string) => Promise<void>;
  users: User[];
  setUsers: (fn: User[] | ((prev: User[]) => User[])) => void;
  saveUser: (u: User) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  equipes: Equipe[];
  saveEquipe: (e: Equipe) => Promise<void>;
  removeEquipe: (id: string) => Promise<void>;
  equipamentos: Equipamento[];
  saveEquipamento: (eq: Equipamento) => Promise<void>;
  removeEquipamento: (id: string) => Promise<void>;
  chamados: Chamado[];
  setChamados: (fn: Chamado[] | ((prev: Chamado[]) => Chamado[])) => void;
  criarChamado: (c: Omit<Chamado, "os" | "status" | "abertoEm"> & { abertoEm?: number }) => Promise<string | null>;
  atualizarChamado: (os: string, patch: Partial<Chamado>) => Promise<void>;
  assumirChamado: (os: string, patch: Partial<Chamado>) => Promise<boolean>;
  pecas: Peca[];
  savePeca: (p: Peca) => Promise<void>;
  removePeca: (id: string) => Promise<void>;
  movimentos: Movimento[];
  loadMovimentos: (limite?: number) => Promise<void>;
  baixarEstoque: (os: string, itens: { pecaId: string; qtd: number }[]) => Promise<boolean>;
  ajustarEstoque: (pecaId: string, delta: number, motivo: string) => Promise<boolean>;
  requestLogin: (data: { nome: string; idUsina: string; telefone: string }) => Promise<void>;
  refreshData: (force?: boolean) => Promise<void>;
  loadingData: boolean;
  lastRefresh: number | null;
}

const Ctx = createContext<Store | null>(null);

// ============= cache local para economizar reads do Firebase =============
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const CACHE_KEYS = {
  users: "os-cache-users",
  fronts: "os-cache-fronts",
  calls: "os-cache-calls",
  estoque: "os-cache-estoque",
  movimentos: "os-cache-movimentos",
};

type CacheEnvelope<T> = { data: T; ts: number };

function getCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    // invalida caches gerados por versões antigas do mapeamento
    if (localStorage.getItem("os-cache-version") !== "3") {
      Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem("os-cache-version", "3");
      return null;
    }
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env: CacheEnvelope<T> = JSON.parse(raw);
    if (Date.now() - env.ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    // cache vazio não deve bloquear uma nova leitura do Firestore
    if (Array.isArray(env.data) && env.data.length === 0) return null;
    return env.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function setCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignora erro de quota do localStorage
  }
}

function clearCache() {
  if (typeof window === "undefined") return;
  Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k));
}

// ------------- mapeamentos -----------------
function inferStatus(d: any): ChamadoStatus {
  const raw = String(d.status ?? "").trim().toLowerCase();
  if (["aberto", "assumido", "pausado", "encerrado"].includes(raw)) return raw as ChamadoStatus;
  if (raw === "em atendimento" || raw === "atendimento") return "assumido";
  if (raw === "finalizado" || raw === "concluido" || raw === "concluído") return "encerrado";
  if (d.dataEncerramento || d.encerradoEm || d.finished_at) return "encerrado";
  if (d.pausadoEm || d.paused_at || d.motivoPausa) return "pausado";
  if (d.assumidoEm || d.dataAssumido || d.assigned_at || d.tecnicoResponsavel || d.tecnico) return "assumido";
  return "aberto";
}

function normalizeDirecionamento(v: any): Direcionamento {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.includes("solinftec") || s === "sol") return "Solinftec";
  if (s.includes("gps")) return "GPS";
  return "GPS";
}

function docToChamado(id: string, d: any): Chamado {
  return {
    os: d.os ?? id,
    equipamentoId: d.frota ?? d.equipamentoId ?? "",
    equipeId: d.equipeId ?? d.frente ?? "",
    solicitante: d.solicitante ?? "",
    direcionamento: normalizeDirecionamento(
      d.solicitarTecnico ?? d.tecnicoSolicitado ?? d.direcionamento ?? d.tipo,
    ),
    descricao: d.descricao ?? "",
    status: inferStatus(d),
    abertoEm: d.abertoEm ?? parseBrDate(d.dataAbertura) ?? Date.now(),
    assumidoEm: d.assumidoEm ?? parseBrDate(d.dataAssumido) ?? parseBrDate(d.dataAtendimento),
    pausadoEm: d.pausadoEm ?? parseBrDate(d.dataPausa),
    motivoPausa: d.motivoPausa ?? undefined,
    encerradoEm: d.encerradoEm ?? parseBrDate(d.dataEncerramento),
    tecnico: d.tecnicoResponsavel ?? d.tecnico ?? d.tecnicoNome ?? undefined,
    tecnicoMs: Number(d.tecnicoMs ?? 0) || 0,
    imagens: Array.isArray(d.imagens) ? d.imagens.length : (d.imagens ?? 0),
    pecasUsadas: Array.isArray(d.pecasUsadas) ? d.pecasUsadas : undefined,
    justificativaSemMaterial: d.justificativaSemMaterial ?? undefined,
  };
}

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  assumido: "Assumido",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

function chamadoToDoc(c: Partial<Chamado>): any {
  const out: any = { ...c };
  if (c.equipamentoId !== undefined) out.frota = c.equipamentoId;
  if (c.equipeId !== undefined) out.frente = c.equipeId;
  if (c.direcionamento !== undefined) out.solicitarTecnico = c.direcionamento;
  if (c.status !== undefined) out.status = STATUS_LABEL[c.status] ?? c.status;
  if (c.tecnico !== undefined) out.tecnicoResponsavel = c.tecnico;
  if (c.abertoEm !== undefined) out.dataAbertura = formatBrDate(c.abertoEm);
  if (c.assumidoEm !== undefined) out.dataAssumido = formatBrDate(c.assumidoEm);
  if (c.pausadoEm !== undefined) out.dataPausa = formatBrDate(c.pausadoEm);
  if (c.encerradoEm !== undefined) out.dataEncerramento = formatBrDate(c.encerradoEm);
  return out;
}

function docToUser(id: string, d: any): User {
  return {
    id,
    nome: d.nome ?? d.nomeCompleto ?? id,
    usuario: d.usuario ?? d.user ?? d.login ?? id,
    senha: String(d.senha ?? d.password ?? d.pass ?? ""),
    nivel: normalizeNivel(d.nivel ?? d.nivelAcesso ?? d.role) as AccessLevel,
    idUsina: d.idUsina ?? d.idUnico ?? "",
    telefone: d.telefone,
    ativo: d.ativo !== false,
    permissoes: Array.isArray(d.permissoes) ? d.permissoes : undefined,
  };
}

function docToPeca(id: string, d: any): Peca {
  return {
    id,
    codigo: d.codigo ?? id,
    descricao: d.descricao ?? "",
    unidade: d.unidade ?? "un",
    qtd: Number(d.qtd ?? d.quantidade ?? d.qtdAtual ?? 0),
    minimo: Number(d.minimo ?? d.qtdMin ?? 0),
  };
}

function docToEquipe(id: string, d: any): Equipe {
  return { id, nome: d.nome ?? d.name ?? d.nomeFrente ?? d.frente ?? id };
}

const TIPO_COR: Record<string, string> = {
  Colhedora: "#16a34a", Transbordo: "#0891b2", Trator: "#ca8a04",
  Caminhão: "#7c3aed", "Caminhão Oficina": "#e11d48", Pulverizador: "#0284c7",
  Outro: "#64748b",
};

function extractEquipamentos(id: string, d: any): Equipamento[] {
  const arr = Array.isArray(d.equipamentos) ? d.equipamentos
            : Array.isArray(d.frota) ? d.frota
            : Array.isArray(d.frotas) ? d.frotas
            : Array.isArray(d.equipment) ? d.equipment
            : [];
  return arr.map((e: any, index: number) => {
    const frota = String(e.frota ?? e.id ?? e.nome ?? e.name ?? e.numero ?? e.codigo ?? "").trim();
    const tipo = String(e.tipo ?? e.type ?? e.categoria ?? "Outro").trim() as EquipTipo;
    const nome = String(e.nome ?? e.name ?? e.descricao ?? frota).trim();
    return {
      id: frota || String(e.id ?? `${id}-${index}`),
      nome: nome || frota || `Frota ${index + 1}`,
      tipo,
      cor: e.cor ?? e.color ?? TIPO_COR[tipo] ?? TIPO_COR.Outro,
      equipeId: id,
      ativo: e.ativo !== false,
    } as Equipamento;
  });
}

export function normalizeFrente(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}

function mergeFrentes(es: Equipe[], eqs: Equipamento[]): { equipes: Equipe[]; equipamentos: Equipamento[] } {
  const canon = new Map<string, Equipe>();
  const idMap = new Map<string, string>();
  for (const e of es) {
    const key = normalizeFrente(e.nome);
    const existing = canon.get(key);
    if (existing) { idMap.set(e.id, existing.id); continue; }
    canon.set(key, e);
    idMap.set(e.id, e.id);
  }
  const seen = new Set<string>();
  const equipamentos: Equipamento[] = [];
  for (const eq of eqs) {
    const equipeId = idMap.get(eq.equipeId) ?? eq.equipeId;
    const k = `${equipeId}::${eq.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    equipamentos.push({ ...eq, equipeId });
  }
  return { equipes: [...canon.values()], equipamentos };
}

export function OsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("os-theme") as Theme) || "dark";
  });
  const [ready, setReady] = useState(false);
  const [firebaseAuthed, setFirebaseAuthed] = useState(() => Boolean(auth.currentUser));
  // Always null on first render (server + client) to avoid hydration mismatch.
  // Restored from localStorage after mount via the effect below.
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsersState] = useState<User[]>(() => getCache<User[]>(CACHE_KEYS.users) ?? []);
  const [equipes, setEquipesState] = useState<Equipe[]>(() => {
    const cached = getCache<{ equipes: Equipe[]; equipamentos: Equipamento[] }>(CACHE_KEYS.fronts);
    return cached?.equipes ?? [];
  });
  const [equipamentos, setEquipamentosState] = useState<Equipamento[]>(() => {
    const cached = getCache<{ equipes: Equipe[]; equipamentos: Equipamento[] }>(CACHE_KEYS.fronts);
    return cached?.equipamentos ?? [];
  });
  const [chamados, setChamadosState] = useState<Chamado[]>(() => getCache<Chamado[]>(CACHE_KEYS.calls) ?? []);
  const [pecas, setPecasState] = useState<Peca[]>(() => getCache<Peca[]>(CACHE_KEYS.estoque) ?? []);
  const [movimentos, setMovimentos] = useState<Movimento[]>(() => getCache<Movimento[]>(CACHE_KEYS.movimentos) ?? []);
  const [loadingData, setLoadingData] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const ts = Math.max(
      Number(localStorage.getItem("os-cache-users-ts") ?? 0),
      Number(localStorage.getItem("os-cache-fronts-ts") ?? 0),
      Number(localStorage.getItem("os-cache-calls-ts") ?? 0),
      Number(localStorage.getItem("os-cache-estoque-ts") ?? 0),
    );
    return ts || null;
  });

  // Restaura o login legado no cliente após a hidratação SSR.
  useEffect(() => {
    if (user || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("os-user");
      if (saved) setUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem("os-user");
    }
  }, []);

  // Tema
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("os-theme", theme);
    const id = window.setTimeout(() => root.classList.remove("theme-switching"), 60);
    return () => window.clearTimeout(id);
  }, [theme]);

  // Persistir usuário logado (NUNCA persistir credenciais)
  useEffect(() => {
    if (user) {
      const { senha: _omit, ...safe } = user;
      localStorage.setItem("os-user", JSON.stringify(safe));
    } else localStorage.removeItem("os-user");
  }, [user]);

  // Sessão Firebase anônima
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fb) => {
      setFirebaseAuthed(Boolean(fb));
      if (!fb) {
        void entrarAnonimo()
          .catch((e) => console.error("[auth-anon]", e))
          .finally(() => setReady(true));
        return;
      }
      setReady(true);
    });
    void entrarAnonimo()
      .then(() => setFirebaseAuthed(true))
      .catch((e) => console.error("[auth-anon]", e))
      .finally(() => setReady(true));
    return unsub;
  }, []);

  // Limpa estados quando desloga
  useEffect(() => {
    if (!user) {
      setUsersState([]);
      setEquipesState([]);
      setEquipamentosState([]);
      setChamadosState([]);
      setPecasState([]);
      setMovimentos([]);
    }
  }, [user?.id]);

  // Carregamento otimizado dos dados (getDocs + cache) - uma única vez por sessão e a cada refresh manual
  const refreshData = useCallback(async (force = false) => {
    if (!user) return;
    if (!firebaseAuthed) return;
    if (loadingData) return;
    setLoadingData(true);
    try {
      // 1) users: somente gestores
      if (user.nivel === "gestor") {
        const cachedUsers = force ? null : getCache<User[]>(CACHE_KEYS.users);
        if (!cachedUsers) {
          const snap = await getDocs(collection(db, "users"));
          const parsed = snap.docs.map((d) => docToUser(d.id, d.data()));
          setUsersState(parsed);
          setCache(CACHE_KEYS.users, parsed);
          localStorage.setItem("os-cache-users-ts", String(Date.now()));
        } else {
          setUsersState(cachedUsers);
        }
      }

      // 2) fronts (equipes + equipamentos)
      const cachedFronts = force ? null : getCache<{ equipes: Equipe[]; equipamentos: Equipamento[] }>(CACHE_KEYS.fronts);
      if (!cachedFronts) {
        const snap = await getDocs(collection(db, "fronts"));
        const es: Equipe[] = [];
        const eqs: Equipamento[] = [];
        snap.docs.forEach((d) => {
          es.push(docToEquipe(d.id, d.data()));
          eqs.push(...extractEquipamentos(d.id, d.data()));
        });
        const merged = mergeFrentes(es, eqs);
        setEquipesState(merged.equipes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
        setEquipamentosState(merged.equipamentos);
        setCache(CACHE_KEYS.fronts, merged);
        localStorage.setItem("os-cache-fronts-ts", String(Date.now()));
      } else {
        setEquipesState(cachedFronts.equipes);
        setEquipamentosState(cachedFronts.equipamentos);
      }

      // 3) calls (chamados) - os documentos legados usam `dataAbertura` (string BR),
      // por isso a ordenação é feita em memória após converter as datas.
      const cachedCalls = force ? null : getCache<Chamado[]>(CACHE_KEYS.calls);
      if (!cachedCalls) {
        const snap = await getDocs(collection(db, "calls"));
        const parsed = snap.docs
          .map((d) => docToChamado(d.id, d.data()))
          .sort((a, b) => (b.abertoEm ?? 0) - (a.abertoEm ?? 0))
          .slice(0, 2000);
        setChamadosState(parsed);
        setCache(CACHE_KEYS.calls, parsed);
        localStorage.setItem("os-cache-calls-ts", String(Date.now()));
      } else {
        setChamadosState(cachedCalls);
      }

      // 4) estoque (peças)
      const cachedPecas = force ? null : getCache<Peca[]>(CACHE_KEYS.estoque);
      if (!cachedPecas) {
        const snap = await getDocs(collection(db, "estoque"));
        const parsed = snap.docs.map((d) => docToPeca(d.id, d.data()));
        setPecasState(parsed);
        setCache(CACHE_KEYS.estoque, parsed);
        localStorage.setItem("os-cache-estoque-ts", String(Date.now()));
      } else {
        setPecasState(cachedPecas);
      }

      setLastRefresh(Date.now());
    } catch (e: any) {
      console.error("[refreshData]", e);
      if (e?.code?.includes("permission-denied")) {
        toast.error("Acesso negado pelo Firestore. Verifique as regras publicadas.");
      } else if (String(e?.code ?? "").includes("quota")) {
        toast.error("Cota do Firebase excedida. Aguarde o reset ou faça upgrade do plano.");
      } else {
        toast.error("Falha ao carregar dados: " + (e?.message ?? e));
      }
    } finally {
      setLoadingData(false);
    }
  }, [user, firebaseAuthed, loadingData]);

  // Carrega dados automaticamente uma vez quando autenticado
  useEffect(() => {
    if (!user || !firebaseAuthed) return;
    void refreshData();
  }, [user?.id, firebaseAuthed, refreshData]);

  // -------------------- ações --------------------
  /** Login legado: valida `usuario` + `senha` na coleção users. */
  const login = useCallback(async (u: string, s: string): Promise<User | null> => {
    try {
      await entrarAnonimo();
      const usuario = u.trim().toLowerCase();
      const senha = String(s).trim();

      // tenta buscar pelo campo 'usuario' em 1 leitura
      let snap = await getDocs(query(collection(db, "users"), where("usuario", "==", usuario)));
      if (snap.empty) {
        // fallback: varredura legada (só quando o campo não está padronizado)
        snap = await getDocs(collection(db, "users"));
      }
      const foundDoc = snap.docs.find((d) => {
        const data: any = d.data();
        const docUser = String(data.usuario ?? data.user ?? data.login ?? d.id).trim().toLowerCase();
        const docPass = String(data.senha ?? data.password ?? data.pass ?? "").trim();
        return docUser === usuario && docPass === senha;
      });
      if (!foundDoc) return null;

      const perfil = docToUser(foundDoc.id, foundDoc.data());
      if (perfil.ativo === false) {
        toast.error("Este usuário está inativo. Contate o gestor.");
        return null;
      }
      const logado: User = {
        ...perfil,
        senha: "",
        usuario: perfil.usuario.trim().toLowerCase(),
        telefone: perfil.telefone,
        ativo: true,
      };
      setUser(logado);
      clearCache(); // força recarregar dados do novo usuário
      return logado;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code.includes("too-many-requests")) toast.error("Muitas tentativas. Aguarde alguns minutos.");
      else if (code.includes("network")) toast.error("Sem conexão com o servidor.");
      else if (code.includes("permission-denied")) toast.error("Acesso negado pelas regras do Firestore. Publique as regras atualizadas.");
      else toast.error("Usuário ou senha inválidos.");
      console.error("[login]", e);
      return null;
    }
  }, []);

  const logout = useCallback(() => { void sair(); setUser(null); clearCache(); }, []);

  const changePassword = useCallback(async (nova: string) => {
    await trocarSenha(nova);
    toast.success("Senha alterada com sucesso");
  }, []);

  const setUsers = useCallback((_fn: User[] | ((prev: User[]) => User[])) => {
    console.warn("Use saveUser/removeUser para persistir no Firestore");
  }, []);

  const saveUser = useCallback(async (u: User) => {
    try {
      let id = u.id;
      if (!id) {
        if (!u.senha || String(u.senha).length < 6) {
          toast.error("Defina uma senha com pelo menos 6 caracteres");
          return;
        }
        id = await criarContaAuth(u.usuario, String(u.senha));
      }
      const perfil = {
        nome: u.nome, usuario: u.usuario.trim().toLowerCase(),
        nivel: u.nivel, idUsina: u.idUsina, telefone: u.telefone ?? null, ativo: u.ativo,
        permissoes: u.permissoes ?? null,
      };
      await setDoc(doc(db, "users", id), { ...perfil, senha: u.senha ?? "" }, { merge: true });
      await setDoc(doc(db, "userProfiles", id), perfil, { merge: true }).catch(() => {});
      toast.success("Usuário salvo");
      // atualiza cache local
      setUsersState((prev) => {
        const next = prev.some((x) => x.id === id) ? prev.map((x) => x.id === id ? { ...u, id } : x) : [...prev, { ...u, id }];
        setCache(CACHE_KEYS.users, next);
        return next;
      });
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code.includes("email-already-in-use")) toast.error("Este nome de usuário já existe");
      else if (code.includes("weak-password")) toast.error("Senha muito fraca (mínimo 6 caracteres)");
      else toast.error("Falha ao salvar usuário: " + (e?.message ?? e));
    }
  }, []);

  const removeUser = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "users", id));
    await deleteDoc(doc(db, "userProfiles", id)).catch(() => {});
    setUsersState((prev) => {
      const next = prev.filter((x) => x.id !== id);
      setCache(CACHE_KEYS.users, next);
      return next;
    });
    toast.message("Usuário removido do sistema. Desative também no Firebase Authentication se necessário.");
  }, []);

  const saveEquipe = useCallback(async (e: Equipe) => {
    const dup = equipes.find((x) => x.id !== e.id && normalizeFrente(x.nome) === normalizeFrente(e.nome));
    if (dup) { toast.error(`Já existe a equipe "${dup.nome}"`); return; }
    await setDoc(doc(db, "fronts", e.id), { nome: e.nome, name: e.nome, id: e.id }, { merge: true });
    await refreshData(true);
  }, [equipes, refreshData]);

  const removeEquipe = useCallback(async (id: string) => {
    const alvo = equipes.find((x) => x.id === id);
    const key = alvo ? normalizeFrente(alvo.nome) : null;
    const snap = await getDocs(collection(db, "fronts"));
    const alvos = snap.docs.filter((d) => {
      if (d.id === id) return true;
      const nome = (d.data() as any)?.nome ?? (d.data() as any)?.name ?? "";
      return key !== null && normalizeFrente(String(nome)) === key;
    });
    await Promise.all(alvos.map((d) => deleteDoc(d.ref)));
    await refreshData(true);
  }, [equipes, refreshData]);

  const saveEquipamento = useCallback(async (eq: Equipamento) => {
    const front = equipes.find((f) => f.id === eq.equipeId);
    if (!front) { toast.error("Equipe inexistente"); return; }
    const codigo = String(eq.nome || eq.id).trim().toUpperCase();
    const dup = equipamentos.find((x) => x.id !== eq.id && String(x.nome || x.id).trim().toUpperCase() === codigo);
    if (dup) {
      const nomeEq = equipes.find((f) => f.id === dup.equipeId)?.nome ?? dup.equipeId;
      toast.error(`Equipamento ${dup.nome} já cadastrado na equipe ${nomeEq}`);
      return;
    }
    const others = equipamentos.filter((x) => x.equipeId === eq.equipeId && x.id !== eq.id);
    const arr = [...others, eq].map(({ id, nome, tipo, cor, ativo }) => ({ id, frota: nome || id, nome, tipo, cor, color: cor, ativo }));
    await setDoc(doc(db, "fronts", eq.equipeId), { equipamentos: arr }, { merge: true });
    await refreshData(true);
  }, [equipes, equipamentos, refreshData]);

  const removeEquipamento = useCallback(async (id: string) => {
    const eq = equipamentos.find((x) => x.id === id); if (!eq) return;
    const arr = equipamentos.filter((x) => x.equipeId === eq.equipeId && x.id !== id)
      .map(({ id, nome, tipo, cor, ativo }) => ({ id, frota: nome || id, nome, tipo, cor, color: cor, ativo }));
    await setDoc(doc(db, "fronts", eq.equipeId), { equipamentos: arr }, { merge: true });
    await refreshData(true);
  }, [equipamentos, refreshData]);

  const setChamados = useCallback((_fn: Chamado[] | ((prev: Chamado[]) => Chamado[])) => {
    console.warn("Use atualizarChamado/criarChamado");
  }, []);

  const criarChamado = useCallback(async (c: Omit<Chamado, "os" | "status" | "abertoEm"> & { abertoEm?: number }) => {
    const os = nextOsNumber(chamados.map((x) => x.os));
    const abertoEm = c.abertoEm ?? Date.now();
    const payload = chamadoToDoc({ ...c, os, status: "aberto", abertoEm });
    await setDoc(doc(db, "calls", os), { ...payload, id: os, os, abertoEm }, { merge: true });
    // otimização: insere no cache local sem precisar recarregar tudo
    setChamadosState((prev) => {
      const novo = { ...c, os, status: "aberto" as ChamadoStatus, abertoEm };
      const next = [novo, ...prev];
      setCache(CACHE_KEYS.calls, next);
      return next;
    });
    return os;
  }, [chamados]);

  const atualizarChamado = useCallback(async (os: string, patch: Partial<Chamado>) => {
    const payload = chamadoToDoc(patch);
    const clean: any = {};
    Object.entries(payload).forEach(([k, v]) => { clean[k] = v === undefined ? deleteField() : v; });
    await updateDoc(doc(db, "calls", os), clean);
    setChamadosState((prev) => {
      const next = prev.map((c) => c.os === os ? { ...c, ...patch } : c);
      setCache(CACHE_KEYS.calls, next);
      return next;
    });
  }, []);

  const assumirChamado = useCallback(async (os: string, patch: Partial<Chamado>) => {
    const ref = doc(db, "calls", os);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("Chamado não encontrado");
        const atual = docToChamado(os, snap.data());
        if (atual.status === "assumido" && atual.tecnico && atual.tecnico !== patch.tecnico) {
          throw new Error(`Chamado já assumido por ${atual.tecnico}`);
        }
        if (atual.status === "encerrado") throw new Error("Chamado já encerrado");
        const payload = chamadoToDoc(patch);
        const clean: any = {};
        Object.entries(payload).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
        tx.update(ref, clean);
      });
      setChamadosState((prev) => {
        const next = prev.map((c) => c.os === os ? { ...c, ...patch } : c);
        setCache(CACHE_KEYS.calls, next);
        return next;
      });
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao assumir chamado");
      return false;
    }
  }, []);

  const savePeca = useCallback(async (p: Peca) => {
    const id = p.id || crypto.randomUUID();
    await setDoc(doc(db, "estoque", id), {
      codigo: p.codigo, descricao: p.descricao, unidade: p.unidade,
      qtd: Number(p.qtd), minimo: Number(p.minimo),
    }, { merge: true });
    setPecasState((prev) => {
      const exists = prev.some((x) => x.id === id);
      const next = exists ? prev.map((x) => x.id === id ? { ...p, id } : x) : [...prev, { ...p, id }];
      setCache(CACHE_KEYS.estoque, next);
      return next;
    });
  }, []);

  const removePeca = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "estoque", id));
    setPecasState((prev) => {
      const next = prev.filter((x) => x.id !== id);
      setCache(CACHE_KEYS.estoque, next);
      return next;
    });
  }, []);

  const logMov = useCallback(async (pecaId: string, m: Omit<Movimento, "id" | "data" | "usuarioId" | "usuarioNome" | "pecaId">) => {
    await addDoc(collection(db, "estoque", pecaId, "movimentacoes"), {
      ...m, usuarioId: user?.id ?? "sistema", usuarioNome: user?.nome ?? "Sistema", data: serverTimestamp(),
    });
  }, [user]);

  const loadMovimentos = useCallback(async (limite = 100) => {
    if (!user || !firebaseAuthed) return;
    const cached = getCache<Movimento[]>(CACHE_KEYS.movimentos);
    if (cached) {
      setMovimentos(cached);
      return;
    }
    try {
      const all: Movimento[] = [];
      // lê apenas as N movimentações mais recentes de cada peça (on demand)
      for (const p of pecas) {
        const snap = await getDocs(query(
          collection(db, "estoque", p.id, "movimentacoes"),
          orderBy("data", "desc"),
          limit(limite),
        ));
        snap.docs.forEach((mDoc) => {
          const md = mDoc.data();
          all.push({
            id: mDoc.id, pecaId: p.id,
            tipo: md.tipo ?? "ajuste",
            qtd: Number(md.qtd ?? 0),
            motivo: md.motivo ?? "",
            usuarioId: md.usuarioId ?? "",
            usuarioNome: md.usuarioNome ?? "",
            os: md.os ?? undefined,
            data: md.data?.toMillis ? md.data.toMillis() : (typeof md.data === "number" ? md.data : Date.now()),
          });
        });
      }
      const sorted = all.sort((a, b) => b.data - a.data);
      setMovimentos(sorted);
      setCache(CACHE_KEYS.movimentos, sorted);
    } catch (e: any) {
      console.error("[loadMovimentos]", e);
      toast.error("Falha ao carregar histórico de movimentações");
    }
  }, [user, firebaseAuthed, pecas]);

  const baixarEstoque = useCallback(async (os: string, itens: { pecaId: string; qtd: number }[]) => {
    const validos = itens.filter((i) => i.qtd > 0);
    if (!validos.length) return true;
    try {
      await runTransaction(db, async (tx) => {
        const refs = validos.map((it) => doc(db, "estoque", it.pecaId));
        const snaps = await Promise.all(refs.map((r) => tx.get(r)));
        snaps.forEach((snap, i) => {
          if (!snap.exists()) throw new Error("Peça inválida");
          const atual = Number(snap.data().qtd ?? 0);
          if (atual < validos[i].qtd) {
            throw new Error(`Estoque insuficiente: ${snap.data().codigo ?? validos[i].pecaId}`);
          }
        });
        snaps.forEach((snap, i) => {
          tx.update(refs[i], { qtd: Number(snap.data()!.qtd ?? 0) - validos[i].qtd });
        });
        tx.update(doc(db, "calls", os), { pecasUsadas: validos });
      });
      await Promise.all(validos.map((it) =>
        logMov(it.pecaId, { tipo: "baixa", qtd: -it.qtd, motivo: `Baixa em atendimento ${os}`, os }),
      ));
      // atualiza cache local de peças e movimentos
      setPecasState((prev) => {
        const next = prev.map((p) => {
          const it = validos.find((v) => v.pecaId === p.id);
          return it ? { ...p, qtd: Math.max(0, p.qtd - it.qtd) } : p;
        });
        setCache(CACHE_KEYS.estoque, next);
        return next;
      });
      localStorage.removeItem(CACHE_KEYS.movimentos);
      return true;
    } catch (e: any) {
      toast.error("Falha ao baixar estoque: " + (e?.message ?? e)); return false;
    }
  }, [logMov]);

  const ajustarEstoque = useCallback(async (pecaId: string, delta: number, motivo: string) => {
    if (!motivo.trim()) { toast.error("Informe o motivo do ajuste"); return false; }
    if (delta === 0) { toast.error("Informe uma quantidade diferente de zero"); return false; }
    try {
      const codigo = await runTransaction(db, async (tx) => {
        const ref = doc(db, "estoque", pecaId);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("Peça inválida");
        const atual = Number(snap.data().qtd ?? 0);
        if (atual + delta < 0) throw new Error(`Ajuste inválido: estoque ficaria negativo (${snap.data().codigo ?? pecaId})`);
        tx.update(ref, { qtd: atual + delta });
        return String(snap.data().codigo ?? pecaId);
      });
      await logMov(pecaId, { tipo: delta > 0 ? "entrada" : "ajuste", qtd: delta, motivo: motivo.trim() });
      setPecasState((prev) => {
        const next = prev.map((p) => p.id === pecaId ? { ...p, qtd: p.qtd + delta } : p);
        setCache(CACHE_KEYS.estoque, next);
        return next;
      });
      localStorage.removeItem(CACHE_KEYS.movimentos);
      toast.success(`Estoque ajustado: ${codigo} ${delta > 0 ? "+" : ""}${delta}`);
      return true;
    } catch (e: any) { toast.error("Falha no ajuste: " + (e?.message ?? e)); return false; }
  }, [logMov]);

  const requestLogin = useCallback(async (data: { nome: string; idUsina: string; telefone: string }) => {
    try {
      await addDoc(collection(db, "loginRequests"), { ...data, criadoEm: serverTimestamp() });
    } catch (e: any) { toast.error("Falha ao enviar solicitação: " + (e?.message ?? e)); }
  }, []);

  const value: Store = useMemo(() => ({
    ready, theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    user, login, logout, changePassword,
    users, setUsers, saveUser, removeUser,
    equipes, saveEquipe, removeEquipe,
    equipamentos, saveEquipamento, removeEquipamento,
    chamados, setChamados, criarChamado, atualizarChamado, assumirChamado,
    pecas, savePeca, removePeca,
    movimentos, loadMovimentos, baixarEstoque, ajustarEstoque, requestLogin,
    refreshData, loadingData, lastRefresh,
  }), [ready, theme, user, users, equipes, equipamentos, chamados, pecas, movimentos,
       loadingData, lastRefresh,
       login, changePassword, saveUser, removeUser, saveEquipe, removeEquipe,
       saveEquipamento, removeEquipamento, setChamados, criarChamado, atualizarChamado, assumirChamado,
       savePeca, removePeca, loadMovimentos, baixarEstoque, ajustarEstoque, requestLogin, logout, setUsers, refreshData]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOs precisa estar dentro de OsProvider");
  return v;
}
