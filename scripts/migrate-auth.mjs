/**
 * Migração dos usuários existentes (coleção `users`) para o Firebase Authentication.
 * NENHUM usuário é perdido: cada documento vira uma conta de autenticação
 * e ganha um perfil em `userProfiles/{uid}`. A senha em texto é removida do Firestore.
 *
 * Como rodar (uma única vez, na sua máquina):
 *   1) Firebase Console > Configurações do projeto > Contas de serviço >
 *      "Gerar nova chave privada"  -> salve como serviceAccount.json
 *   2) npm i firebase-admin
 *   3) node scripts/migrate-auth.mjs ./serviceAccount.json
 *
 * Opções:
 *   --dry           apenas simula, não grava nada
 *   --keep-senha    não remove o campo `senha` dos documentos (não recomendado)
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [, , keyPath = "./serviceAccount.json", ...flags] = process.argv;
const DRY = flags.includes("--dry");
const KEEP = flags.includes("--keep-senha");
const DOMINIO = "oscampo.local";

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const normalizeNivel = (n = "") => {
  const v = String(n).toLowerCase();
  if (v.includes("gestor") || v.includes("admin")) return "gestor";
  if (v.includes("solinf")) return "solinftec";
  if (v.includes("gps")) return "gps";
  return "solicitante";
};

const senhaTemporaria = (usuario) =>
  `OsCampo@${usuario.replace(/\W/g, "").slice(0, 6)}${Math.floor(1000 + Math.random() * 9000)}`;

const snap = await db.collection("users").get();
console.log(`Encontrados ${snap.size} usuários no Firestore.\n`);

const relatorio = [];

for (const docSnap of snap.docs) {
  const d = docSnap.data();
  const usuario = String(d.usuario ?? d.user ?? d.login ?? docSnap.id).trim().toLowerCase();
  const email = usuario.includes("@") ? usuario : `${usuario}@${DOMINIO}`;
  const nome = d.nome ?? d.nomeCompleto ?? usuario;
  const nivel = normalizeNivel(d.nivel ?? d.nivelAcesso ?? d.role);
  let senha = String(d.senha ?? d.password ?? d.pass ?? "");
  let senhaGerada = null;
  if (senha.length < 6) { senhaGerada = senhaTemporaria(usuario); senha = senhaGerada; }

  let uid;
  try {
    const existente = await auth.getUserByEmail(email);
    uid = existente.uid;
    if (!DRY) await auth.updateUser(uid, { password: senha, displayName: nome, disabled: d.ativo === false });
    console.log(`= já existia no Auth: ${email}`);
  } catch {
    if (DRY) { uid = "(dry-run)"; }
    else {
      const criado = await auth.createUser({ email, password: senha, displayName: nome, disabled: d.ativo === false });
      uid = criado.uid;
    }
    console.log(`+ criado no Auth: ${email}`);
  }

  const perfil = {
    nome,
    usuario,
    nivel,
    idUsina: d.idUsina ?? d.idUnico ?? "",
    telefone: d.telefone ?? null,
    ativo: d.ativo !== false,
    docOriginal: docSnap.id,
  };

  if (!DRY) {
    // claim opcional (útil para regras/Functions futuras)
    await auth.setCustomUserClaims(uid, { nivel });
    await db.collection("userProfiles").doc(uid).set(perfil, { merge: true });
    await db.collection("users").doc(uid).set(perfil, { merge: true });
    // remove o documento antigo (se a chave era o login, não o uid) e a senha em texto
    if (docSnap.id !== uid) await docSnap.ref.delete();
    else if (!KEEP) await docSnap.ref.update({ senha: FieldValue.delete(), password: FieldValue.delete() });
  }

  relatorio.push({ usuario, email, uid, nivel, senhaGerada: senhaGerada ?? "(mantida)" });
}

console.log("\n=== RELATÓRIO ===");
console.table(relatorio);
console.log(
  DRY
    ? "\nDRY RUN: nada foi gravado. Rode sem --dry para aplicar."
    : "\nMigração concluída. Anote as senhas geradas e avise os usuários.",
);
