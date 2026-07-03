-- =============================================================================
-- Rancho Manager — Supabase schema
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- Seguro para rodar novamente (usa IF NOT EXISTS / DROP ... IF EXISTS em pontos-chave).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
do $$ begin
  create type operator_status as enum ('ativo', 'pausado', 'removido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('ativa', 'aquecendo', 'restrita', 'bloqueada', 'caiu', 'pausada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type restriction_type as enum ('comentario', 'seguir', 'dm', 'live', 'alcance', 'publicacao', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type restriction_status as enum ('em_analise', 'resolvido', 'pendente', 'conta_caiu');
exception when duplicate_object then null; end $$;

do $$ begin
  create type revenue_origin as enum ('chat', 'privacy', 'telegram', 'chamada', 'ppv', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_type as enum ('postar', 'responder_chat', 'aquecer_conta', 'verificar_restricao', 'criar_conteudo', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('baixa', 'media', 'alta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pendente', 'em_andamento', 'finalizada');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. FUNÇÃO UTILITÁRIA: manter updated_at sempre atualizado
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. PROFILES (um por usuário autenticado do Supabase Auth)
--    Não guarda senha nem 2FA — apenas metadados internos do usuário do painel.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- cria profile automaticamente quando um usuário se cadastra no Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill: cria o profile de qualquer usuário que já existia em auth.users
-- antes desta trigger ser criada (ex: usuários criados manualmente no painel
-- antes de rodar este schema). Seguro rodar sempre que quiser.
insert into public.profiles (id, full_name, email)
select u.id, u.raw_user_meta_data ->> 'full_name', u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. OPERATORS (equipe)
-- -----------------------------------------------------------------------------
create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text, -- função dentro da equipe
  whatsapp text,
  email text,
  status operator_status not null default 'ativo',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_operators_updated_at on public.operators;
create trigger set_operators_updated_at
  before update on public.operators
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. INSTAGRAM_ACCOUNTS (linha principal da planilha)
--    Regra: nunca armazenar senha do Instagram ou código 2FA nesta tabela.
-- -----------------------------------------------------------------------------
create table if not exists public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references public.operators (id) on delete set null,
  subniche text,
  account_name text not null,
  username text not null, -- @ da conta (sem o "@")
  entry_date date not null default current_date,
  posts_count integer not null default 0,
  posts_this_week integer not null default 0,
  last_post_date date,
  revenue numeric(12, 2) not null default 0,
  status account_status not null default 'aquecendo',
  had_restriction boolean not null default false,
  restriction_type restriction_type,
  had_block boolean not null default false,
  block_type text,
  chat_attended boolean not null default false,
  chat_responsible_id uuid references public.operators (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_accounts_operator on public.instagram_accounts (operator_id);
create index if not exists idx_accounts_status on public.instagram_accounts (status);
create index if not exists idx_accounts_subniche on public.instagram_accounts (subniche);
create unique index if not exists idx_accounts_username on public.instagram_accounts (lower(username));

drop trigger if exists set_accounts_updated_at on public.instagram_accounts;
create trigger set_accounts_updated_at
  before update on public.instagram_accounts
  for each row execute function public.set_updated_at();

-- OBS: "dias no projeto" é calculado a partir de entry_date (current_date - entry_date).
-- Não é uma coluna gerada em disco (current_date não é IMMUTABLE), é calculado
-- em tempo de consulta pela aplicação/queries (ver view abaixo).

-- -----------------------------------------------------------------------------
-- 6. RESTRICTIONS (histórico de restrições/bloqueios por conta)
-- -----------------------------------------------------------------------------
create table if not exists public.restrictions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts (id) on delete cascade,
  restriction_date date not null default current_date,
  restriction_type restriction_type not null,
  description text,
  status restriction_status not null default 'em_analise',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restrictions_account on public.restrictions (account_id);
create index if not exists idx_restrictions_status on public.restrictions (status);

drop trigger if exists set_restrictions_updated_at on public.restrictions;
create trigger set_restrictions_updated_at
  before update on public.restrictions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. REVENUE_RECORDS (lançamentos financeiros)
-- -----------------------------------------------------------------------------
create table if not exists public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts (id) on delete cascade,
  operator_id uuid references public.operators (id) on delete set null,
  record_date date not null default current_date,
  amount numeric(12, 2) not null default 0,
  origin revenue_origin not null default 'outro',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_revenue_account on public.revenue_records (account_id);
create index if not exists idx_revenue_operator on public.revenue_records (operator_id);
create index if not exists idx_revenue_date on public.revenue_records (record_date);

drop trigger if exists set_revenue_updated_at on public.revenue_records;
create trigger set_revenue_updated_at
  before update on public.revenue_records
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. TASKS (tarefas do dia a dia)
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  account_id uuid references public.instagram_accounts (id) on delete set null,
  operator_id uuid references public.operators (id) on delete set null, -- responsável
  type task_type not null default 'outro',
  priority task_priority not null default 'media',
  status task_status not null default 'pendente',
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_account on public.tasks (account_id);
create index if not exists idx_tasks_operator on public.tasks (operator_id);
create index if not exists idx_tasks_status on public.tasks (status);

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. VIEW auxiliar com campos calculados (dias no projeto)
-- -----------------------------------------------------------------------------
create or replace view public.instagram_accounts_view as
select
  a.*,
  (current_date - a.entry_date) as days_in_project
from public.instagram_accounts a;

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
--     Regra do MVP: qualquer usuário autenticado (membro da equipe com login
--     no painel) pode ler e escrever nos dados operacionais. Não há hierarquia
--     de permissões neste estágio — todos que têm login são "staff" interno.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.operators enable row level security;
alter table public.instagram_accounts enable row level security;
alter table public.restrictions enable row level security;
alter table public.revenue_records enable row level security;
alter table public.tasks enable row level security;

-- profiles: usuário vê todos os perfis (para atribuir responsáveis), mas só
-- edita o próprio.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- demais tabelas: CRUD liberado para qualquer usuário autenticado (staff interno)
do $$
declare
  t text;
begin
  foreach t in array array['operators', 'instagram_accounts', 'restrictions', 'revenue_records', 'tasks']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true);', t);

    execute format('drop policy if exists "%1$s_insert" on public.%1$s;', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert to authenticated with check (true);', t);

    execute format('drop policy if exists "%1$s_update" on public.%1$s;', t);
    execute format('create policy "%1$s_update" on public.%1$s for update to authenticated using (true) with check (true);', t);

    execute format('drop policy if exists "%1$s_delete" on public.%1$s;', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete to authenticated using (true);', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 11. Força o PostgREST a recarregar o cache de schema imediatamente, para que
--     as tabelas/colunas novas fiquem visíveis pra API sem esperar o próximo ciclo.
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- Fim do schema.
-- -----------------------------------------------------------------------------
