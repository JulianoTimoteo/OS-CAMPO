import { initializeApp, getApps } from "firebase/app";
import {
  getAuth, signInWithEmailAndPassword, signInAnonymously, signOut as fbSignOut,
  updatePassword, onAuthStateChanged, type User as FbUser,
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDU7gti52cc2cO77lZLsC2fEYPWhKvE_Jo",
  authDomain: "os-campo-4acdd.firebaseapp.com",
  projectId: "os-campo-4acdd",
  storageBucket: "os-campo-4acdd.appspot.com",
  messagingSenderId: "420289462119",
  appId: "1:420289462119:web:e9036fe3141638d88639c2",
  measurementId: "G-S2CW81LYB",
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/** Domínio sintético usado para mapear "usuario" -> e-mail do Firebase Auth. */
export const AUTH_EMAIL_DOMAIN = "oscampo.local";
export function emailDoUsuario(usuario: string) {
  const u = usuario.trim().toLowerCase();
  return u.includes("@") ? u : `${u}@${AUTH_EMAIL_DOMAIN}`;
}

export function aguardarAuth(): Promise<FbUser | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
  });
}

export async function entrar(usuario: string, senha: string) {
  const cred = await signInWithEmailAndPassword(auth, emailDoUsuario(usuario), String(senha));
  return cred.user;
}

/** Mantém o comportamento antigo do sistema: sessão anônima do Firebase
 * para permitir leitura da coleção `users` antes do login interno do app. */
export async function entrarAnonimo() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function sair() { await fbSignOut(auth); }

/**
 * Cria uma conta no Firebase Auth usando uma instância secundária,
 * para não derrubar a sessão do gestor logado. Retorna o uid.
 */
export async function criarContaAuth(usuario: string, senha: string): Promise<string> {
  const { initializeApp: initApp, deleteApp } = await import("firebase/app");
  const { getAuth: getA, createUserWithEmailAndPassword, signOut: outA } = await import("firebase/auth");
  const secundario = initApp(firebaseConfig, "criador-" + Date.now());
  try {
    const a = getA(secundario);
    const cred = await createUserWithEmailAndPassword(a, emailDoUsuario(usuario), senha);
    await outA(a);
    return cred.user.uid;
  } finally {
    await deleteApp(secundario).catch(() => {});
  }
}


export async function trocarSenha(nova: string) {
  if (!auth.currentUser) throw new Error("Sessão expirada");
  await updatePassword(auth.currentUser, nova);
}

/** Lê SOMENTE o próprio perfil (nunca a coleção users inteira). */
export async function carregarPerfil(uid: string) {
  const snap = await getDoc(doc(db, "userProfiles", uid));
  return snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null;
}

// -------- helpers de data ----------
// Firestore usa strings "dd/MM/yyyy HH:mm:ss"
export function parseBrDate(s?: string | null): number | undefined {
  if (!s || typeof s !== "string") return undefined;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):?(\d{2})?/);
  if (!m) {
    const t = Date.parse(s);
    return isNaN(t) ? undefined : t;
  }
  const [, d, mo, y, hh, mm, ss] = m;
  return new Date(+y, +mo - 1, +d, +hh, +mm, +(ss ?? 0)).getTime();
}

export function formatBrDate(ms?: number | null): string | null {
  if (!ms) return null;
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function normalizeNivel(n?: string): "solicitante" | "gps" | "solinftec" | "gestor" {
  const v = (n ?? "").toLowerCase();
  if (v.includes("gestor") || v.includes("admin")) return "gestor";
  if (v.includes("solinf")) return "solinftec";
  if (v.includes("gps")) return "gps";
  return "solicitante";
}

export function nextOsNumber(existing: string[]): string {
  const nums = existing
    .map((s) => Number(String(s).replace(/\D/g, "")))
    .filter((n) => !isNaN(n) && n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return "OS" + String(max + 1).padStart(6, "0");
}

// ---------------------------------------------------------------------------
// MIGRAÇÃO AUTOMÁTICA (legado -> Firebase Authentication)
// Enquanto existirem usuários antigos na coleção `users` com senha em texto,
// o login tenta o Auth e, se a conta ainda não existir, migra na hora:
//   1) confere usuario/senha no documento legado
//   2) cria a conta no Firebase Auth
//   3) cria userProfiles/{uid}
//   4) apaga a senha em texto do documento legado
// ---------------------------------------------------------------------------
export type LegacyDoc = { id: string; data: any };

async function acharUsuarioLegado(usuario: string): Promise<LegacyDoc | null> {
  const { collection, getDocs } = await import("firebase/firestore");
  const alvo = usuario.trim().toLowerCase();
  const snap = await getDocs(collection(db, "users"));
  for (const d of snap.docs) {
    const x: any = d.data();
    const u = String(x.usuario ?? x.user ?? x.login ?? d.id).trim().toLowerCase();
    if (u === alvo) return { id: d.id, data: x };
  }
  return null;
}

/** Migra o usuário legado e já deixa a sessão autenticada. Retorna o uid. */
export async function migrarELogar(usuario: string, senha: string): Promise<FbUser> {
  const legado = await acharUsuarioLegado(usuario);
  if (!legado) throw Object.assign(new Error("Usuário não encontrado"), { code: "auth/user-not-found" });

  const senhaSalva = String(legado.data.senha ?? legado.data.password ?? "");
  if (!senhaSalva || senhaSalva !== String(senha)) {
    throw Object.assign(new Error("Senha inválida"), { code: "auth/wrong-password" });
  }
  if (senhaSalva.length < 6) {
    throw Object.assign(
      new Error("Sua senha tem menos de 6 caracteres. Peça ao gestor para redefini-la."),
      { code: "auth/weak-password" },
    );
  }

  const uid = await criarContaAuth(usuario, senhaSalva);
  const user = await entrar(usuario, senhaSalva);

  const { doc: dref, setDoc, updateDoc, deleteField } = await import("firebase/firestore");
  await setDoc(dref(db, "userProfiles", uid), {
    nome: legado.data.nome ?? legado.data.nomeCompleto ?? usuario,
    usuario: String(legado.data.usuario ?? legado.data.user ?? legado.data.login ?? usuario).trim().toLowerCase(),
    nivel: normalizeNivel(legado.data.nivel ?? legado.data.nivelAcesso ?? legado.data.role),
    idUsina: legado.data.idUsina ?? "",
    telefone: legado.data.telefone ?? "",
    ativo: legado.data.ativo !== false,
    migradoEm: new Date().toISOString(),
  }, { merge: true });

  // remove a senha em texto do Firestore (não é mais necessária)
  await updateDoc(dref(db, "users", legado.id), {
    senha: deleteField(), password: deleteField(), authUid: uid,
  }).catch(() => {});

  return user;
}
