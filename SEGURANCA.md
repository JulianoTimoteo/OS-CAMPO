# Segurança — OS CAMPO

Três camadas foram ativadas: **Firebase Authentication**, **Security Rules restritivas** e **App Check**.

## 1. Migrar os usuários existentes (não perde ninguém)

```bash
npm i firebase-admin
node scripts/migrate-auth.mjs ./serviceAccount.json --dry   # simula
node scripts/migrate-auth.mjs ./serviceAccount.json         # aplica
```

O script:

- cria no Firebase Authentication uma conta por documento da coleção `users`,
  com e-mail `usuario@oscampo.local` e a senha que já estava cadastrada;
- gera senha temporária (mostrada no relatório) quando a senha antiga tem menos de 6 caracteres;
- cria `userProfiles/{uid}` com nome, usuário, nível, idUsina e ativo;
- define o custom claim `nivel`;
- **apaga a senha em texto** do Firestore.

O login no app continua sendo `usuario` + `senha` — o e-mail sintético é interno.

No Console: **Authentication → Sign-in method → E-mail/senha: ativar**.

## 2. Publicar as Security Rules

Copie `firestore.rules` em **Firestore → Regras → Publicar** (ou `firebase deploy --only firestore:rules`).

Garantias:

- `users` e `loginRequests` só podem ser lidos por gestores (`nivel == 'gestor'` no próprio perfil);
- `loginRequests` aceita apenas criação com campos validados (formulário “Solicitar Login”);
- `calls`: criação só por usuário ativo e sempre como `Aberto`; assumir/pausar/encerrar só por GPS/Solinftec/gestor; solicitante só altera a descrição do próprio chamado aberto; exclusão só gestor;
- `estoque`: leitura por usuário ativo, criação/exclusão de peça só gestor, quantidade nunca negativa, e `movimentacoes` é **auditoria imutável** carimbada com o uid real;
- tudo que não está declarado é negado.

## 3. App Check (bloqueia uso fora do domínio)

1. Console → **App Check → Apps → Web → reCAPTCHA v3** e registre o domínio publicado.
2. Guarde a **site key** na variável de ambiente do projeto:

```
VITE_FIREBASE_APPCHECK_SITE_KEY=<sua-site-key>
```

3. Deixe App Check em **modo monitoramento** por alguns dias e depois **Aplicar (enforce)** em
   Cloud Firestore e Authentication. A partir daí, chamadas fora dos domínios autorizados são rejeitadas.

Em desenvolvimento o app usa o debug token do App Check (registre-o em App Check → Apps → ⋮ → Gerenciar tokens de depuração).

## O que mudou no app

- O cliente **nunca** baixa a coleção `users` — o login usa Firebase Auth e lê só `userProfiles/{uid}`.
- Senha nunca é gravada no Firestore nem no `localStorage`.
- Troca de senha usa `updatePassword` do Firebase Auth.
- Criação de usuário pelo gestor cria a conta de autenticação automaticamente (mín. 6 caracteres).
