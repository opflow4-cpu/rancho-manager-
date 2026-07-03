# Rancho Manager

Painel interno (estilo planilha/CRM) para organizar a equipe que opera contas do Instagram: operadores, contas, subnichos, produção, faturamento, restrições, bloqueios e tarefas.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase (Auth + Database) + RLS.

## 1. Pré-requisitos

- Node.js 18.18+ (recomendado 20+)
- Uma conta e um projeto no [Supabase](https://supabase.com)

## 2. Instalar dependências

```bash
npm install
```

## 3. Configurar o Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Vá em **SQL Editor** e cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql). Rode uma única vez — o script cria tipos enum, tabelas, triggers de `updated_at`, uma view auxiliar e as políticas de Row Level Security.
3. Vá em **Authentication → Providers** e confirme que o login por **Email/Password** está habilitado.
4. Crie os usuários da equipe em **Authentication → Users → Add user** (defina e-mail e senha). Ao criar um usuário, um registro correspondente é criado automaticamente na tabela `profiles` (via trigger `on_auth_user_created`).
5. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

## 4. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com os valores do seu projeto Supabase:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

## 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000 — você será redirecionado para `/login`. Entre com um usuário criado no passo 3.4.

## 6. Build de produção

```bash
npm run build
npm run start
```

## Estrutura do projeto

```
app/
  login/page.tsx              -> tela de login (Supabase Auth)
  (app)/layout.tsx             -> shell autenticado (sidebar + header)
  (app)/dashboard/page.tsx     -> cards de métricas + gráficos
  (app)/contas/page.tsx        -> tabela de contas (planilha)
  (app)/operadores/page.tsx    -> lista de operadores
  (app)/operadores/[id]/page.tsx -> detalhe do operador + contas dele
  (app)/restricoes/page.tsx    -> histórico de restrições
  (app)/financeiro/page.tsx    -> lançamentos financeiros
  (app)/tarefas/page.tsx       -> tarefas do dia a dia
components/
  ui/          -> primitivos shadcn/ui (button, card, dialog, table, select...)
  layout/      -> sidebar e header do painel
  dashboard/   -> cards de métrica e gráficos (recharts)
  contas/      -> tabela + formulário de contas
  operadores/  -> tabela + formulário de operadores
  restricoes/  -> tabela + formulário de restrições
  financeiro/  -> tabela + formulário financeiro
  tarefas/     -> tabela + formulário de tarefas
lib/
  supabase/    -> clients (browser, server, middleware)
  actions/     -> Server Actions com validação (zod) para cada entidade
  types.ts     -> tipos e labels em pt-BR espelhando o schema SQL
  utils.ts     -> formatação de moeda/data e cálculo de "dias no projeto"
supabase/
  schema.sql   -> schema completo (tabelas, enums, triggers, RLS)
middleware.ts  -> protege as rotas: sem sessão redireciona para /login
```

## Regras de segurança seguidas

- **Nenhuma senha do Instagram ou código 2FA é armazenado** em nenhuma tabela — o sistema é apenas para organização interna da equipe.
- Todas as tabelas têm **Row Level Security habilitado**; qualquer usuário autenticado no painel (membro da equipe) pode ler e escrever os dados operacionais. Não há hierarquia de permissões neste MVP.
- `profiles` só pode ser editado pelo próprio usuário, mas é visível para todos (necessário para atribuir responsáveis).
- Sessão de login gerenciada via cookies httpOnly pelo `@supabase/ssr`, validada no `middleware.ts` em toda navegação.

## Funcionalidades do MVP

- **Login** protegido por Supabase Auth (middleware redireciona usuários não logados).
- **Dashboard**: contas totais/ativas/restritas/bloqueadas/caídas, total de posts, faturamento total, melhor operador, melhor conta — além de gráficos de faturamento por operador, contas por status e posts da semana por operador.
- **Contas**: CRUD completo, cálculo automático de "dias no projeto", filtros por operador/status/subnicho, busca por @, ordenação por faturamento/dias/posts.
- **Operadores**: CRUD completo, métricas calculadas (contas administradas, faturamento total, posts totais) e página de detalhe com as contas de cada operador.
- **Restrições**: histórico por conta com status (em análise, resolvido, pendente, conta caiu).
- **Financeiro**: lançamentos por conta/operador/origem, com resumos por operador, subnicho e período.
- **Tarefas**: quadro com tipo, prioridade, status (com troca rápida de status) e prazo.

## Não incluído neste MVP (por escolha)

- Integração automática com o Instagram (tudo é cadastrado manualmente, como pedido).
- Perfis de permissão diferenciados (admin vs operador) — hoje todo usuário logado tem acesso total.
- Histórico diário de posts (existem apenas os campos agregados "posts feitos" e "posts dessa semana").
