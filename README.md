# OS-CAMPO — Sistema de Ordem de Serviço de Campo

Aplicação web para gestão de ordens de serviço de campo (manutenção, atendimento e encerramento de chamados), com controle de estoque, equipes, usuários, permissões por aba e integração Solinftec.

## Funcionalidades

- **Dashboard** — KPIs em tempo real, gráficos de atendimentos e ranking de equipes/técnicos.
- **Chamados (OS)** — Abertura, direcionamento, assumir, atender e encerrar chamados; modal de finalização com baixa de estoque **ou** justificativa de serviço sem material.
- **Estoque** — Cadastro de peças, baixa automática ao encerrar OS, movimentações e ajustes manuais com justificativa.
- **Equipes** — Cadastro de equipes e vínculo com técnicos.
- **Usuários** — Gestão de usuários com **permissões granulares por aba** (Dashboards, Usuários, Equipes, Estoque, Solicitante, GPS, Solinftec).
- **Solicitante** — Solicitação de acesso por terceiros.
- **Solinftec** — Integração com chamados originados no Solinftec.
- **PWA** — Instalável como app no celular/desktop.
- **Tema claro/escuro** — Alternância dinâmica.

## Stack técnica

- **Framework:** TanStack Start (React 19 + SSR/SSG)
- **Build:** Vite 8
- **Estilo:** Tailwind CSS v4
- **Banco de dados & Auth:** Firebase (Firestore + Authentication)
- **Gráficos:** Recharts
- **Linguagem:** TypeScript

## Pré-requisitos

- Node.js 20+
- Projeto Firebase configurado (Firestore + Authentication habilitados)

## Instalação

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd os-campo

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

## Configuração do Firebase

A configuração do Firebase (apiKey, projectId, etc.) está em `src/lib/firebase.ts`. Para usar seu próprio projeto Firebase, edite o objeto `firebaseConfig` nesse arquivo com as credenciais do seu projeto (Firebase Console → Configurações do projeto → Seus apps).

### Security Rules

Publique as regras em `firestore.rules` no Firebase Console (Firestore → Regras → Publicar) ou via CLI:

```bash
firebase deploy --only firestore:rules
```

### Migração de usuários (legado → Firebase Auth)

Se você tem usuários antigos na coleção `users` com senha em texto, migre-os para o Firebase Authentication:

```bash
npm i firebase-admin
# Obtenha a chave de serviço em: Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada
node scripts/migrate-auth.mjs ./serviceAccount.json --dry   # simula
node scripts/migrate-auth.mjs ./serviceAccount.json          # aplica
```

> ⚠️ **Nunca commitar o arquivo `serviceAccount.json`** — ele já está no `.gitignore`.

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Pré-visualizar build de produção |
| `npm run lint` | Lint com ESLint |
| `npm run format` | Formatar com Prettier |

## Estrutura do projeto

```
src/
├── components/
│   ├── os/              # Componentes específicos da aplicação
│   │   ├── OsCampoApp.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ChamadoCard.tsx
│   │   ├── EstoquePage.tsx
│   │   ├── EquipesPage.tsx
│   │   ├── UsuariosPage.tsx
│   │   ├── SolicitantePage.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── Header.tsx
│   │   ├── InstallPWA.tsx
│   │   └── ui-kit.tsx    # Biblioteca de componentes compartilhados
│   └── ui/              # Primitivos de UI (shadcn/ui)
├── lib/
│   ├── firebase.ts      # Configuração e helpers do Firebase
│   ├── os-store.tsx     # Estado global (Context API)
│   ├── os-mock.ts       # Tipos e dados mockados
│   └── utils.ts         # Utilidades
├── routes/              # Rotas (TanStack Router)
└── styles.css           # Tokens de design e estilos globais
```

## Licença

Projeto privado. Todos os direitos reservados.
