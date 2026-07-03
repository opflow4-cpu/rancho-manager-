-- =============================================================================
-- Rancho Manager — Migração incremental: Gateways de Pagamento por conta
-- =============================================================================
-- Esta migração é ADITIVA e SEGURA para rodar em um banco que já tem os dados
-- de supabase/schema.sql. Ela:
--   - NÃO apaga nenhuma tabela existente
--   - NÃO recria enums/tabelas já criados (usa IF NOT EXISTS / ADD VALUE IF NOT EXISTS)
--   - Só ADICIONA colunas novas em revenue_records (nenhuma coluna existente é alterada)
--
-- Rode este arquivo inteiro no SQL Editor do Supabase DEPOIS de já ter rodado
-- supabase/schema.sql pelo menos uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Nova origem de faturamento: "gateway" (venda automática via integração)
--    Precisa ser o primeiro statement do arquivo — Postgres não permite usar um
--    valor de enum recém-adicionado na mesma transação em que ele foi criado.
-- -----------------------------------------------------------------------------
ALTER TYPE revenue_origin ADD VALUE IF NOT EXISTS 'gateway';

-- -----------------------------------------------------------------------------
-- 1. ENUMS novos
-- -----------------------------------------------------------------------------
do $$ begin
  create type gateway_status as enum ('active', 'inactive', 'error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gateway_transaction_status as enum
    ('pending', 'paid', 'approved', 'cancelled', 'refunded', 'chargeback', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gateway_sync_type as enum ('webhook', 'manual_sync', 'cron_sync');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gateway_sync_status as enum ('success', 'error');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. GATEWAY_INTEGRATIONS
--    Uma integração por conta (MVP). api_key/webhook_secret ficam em texto
--    puro por enquanto — ver nota de segurança no final do arquivo.
-- -----------------------------------------------------------------------------
create table if not exists public.gateway_integrations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.instagram_accounts (id) on delete cascade,
  provider_name text not null,
  integration_name text not null,
  api_base_url text,
  api_key text,
  webhook_secret text,
  webhook_url text,
  status gateway_status not null default 'inactive',
  last_sync_at timestamptz,
  last_error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id)
);

create index if not exists idx_gateway_integrations_account on public.gateway_integrations (account_id);

drop trigger if exists set_gateway_integrations_updated_at on public.gateway_integrations;
create trigger set_gateway_integrations_updated_at
  before update on public.gateway_integrations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. GATEWAY_TRANSACTIONS
--    unique(integration_id, external_transaction_id) evita venda duplicada
--    quando o mesmo evento de webhook chega mais de uma vez (retry do gateway).
-- -----------------------------------------------------------------------------
create table if not exists public.gateway_transactions (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.gateway_integrations (id) on delete cascade,
  account_id uuid not null references public.instagram_accounts (id) on delete cascade,
  external_transaction_id text not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'BRL',
  status gateway_transaction_status not null default 'pending',
  payment_method text,
  product_name text,
  gateway_payload jsonb,
  paid_at timestamptz,
  reversed_at timestamptz, -- marca quando um estorno/chargeback já gerou o ajuste negativo no financeiro (evita duplicar o ajuste em retries)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_transaction_id)
);

create index if not exists idx_gateway_transactions_integration on public.gateway_transactions (integration_id);
create index if not exists idx_gateway_transactions_account on public.gateway_transactions (account_id);
create index if not exists idx_gateway_transactions_status on public.gateway_transactions (status);
create index if not exists idx_gateway_transactions_created on public.gateway_transactions (created_at);

drop trigger if exists set_gateway_transactions_updated_at on public.gateway_transactions;
create trigger set_gateway_transactions_updated_at
  before update on public.gateway_transactions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. GATEWAY_SYNC_LOGS
--    Histórico bruto de toda chamada de webhook/sincronização, com o payload
--    original — útil pra depurar integrações com gateways reais depois.
-- -----------------------------------------------------------------------------
create table if not exists public.gateway_sync_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.gateway_integrations (id) on delete cascade,
  account_id uuid references public.instagram_accounts (id) on delete cascade,
  type gateway_sync_type not null default 'manual_sync',
  status gateway_sync_status not null default 'success',
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_gateway_sync_logs_integration on public.gateway_sync_logs (integration_id);
create index if not exists idx_gateway_sync_logs_created on public.gateway_sync_logs (created_at);

-- -----------------------------------------------------------------------------
-- 5. REVENUE_RECORDS — colunas novas (ADITIVO, nada existente é alterado)
--    - source: distingue lançamento manual de lançamento automático via gateway
--    - gateway_transaction_id: rastreia qual venda gerou este lançamento, pra
--      permitir o ajuste negativo de estorno/chargeback sem duplicar
-- -----------------------------------------------------------------------------
alter table public.revenue_records
  add column if not exists source text not null default 'manual';

do $$ begin
  alter table public.revenue_records
    add constraint revenue_records_source_check check (source in ('manual', 'gateway'));
exception when duplicate_object then null; end $$;

alter table public.revenue_records
  add column if not exists gateway_transaction_id uuid references public.gateway_transactions (id) on delete set null;

create index if not exists idx_revenue_records_gateway_transaction on public.revenue_records (gateway_transaction_id);

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY — mesmo modelo das demais tabelas: qualquer usuário
--    autenticado (staff interno) tem CRUD completo. As chaves de gateway nunca
--    são expostas ao navegador porque a leitura/mascaramento acontece em
--    Server Components — RLS aqui protege contra acesso de usuários não
--    autenticados via API direta do Supabase.
-- -----------------------------------------------------------------------------
alter table public.gateway_integrations enable row level security;
alter table public.gateway_transactions enable row level security;
alter table public.gateway_sync_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['gateway_integrations', 'gateway_transactions', 'gateway_sync_logs']
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

-- O webhook (app/api/gateways/webhook/[integrationId]) roda em um Route Handler
-- server-only autenticado com a service_role key (nunca exposta ao navegador) e
-- por isso ignora RLS por padrão — a validação de segurança dele é o
-- webhook_secret configurado por integração, verificado no próprio código antes
-- de qualquer escrita. Ver lib/supabase/admin.ts.

-- -----------------------------------------------------------------------------
-- 7. REALTIME — permite o painel escutar novas vendas em tempo real
-- -----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.gateway_transactions;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.gateway_integrations;
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 8. Recarrega o cache de schema do PostgREST
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- NOTA DE SEGURANÇA — api_key / webhook_secret em texto puro (MVP)
-- =============================================================================
-- Por enquanto, `gateway_integrations.api_key` e `webhook_secret` são
-- armazenados como texto puro (protegidos apenas por RLS + criptografia em
-- disco do Postgres/Supabase). Isso é aceitável para o MVP, mas não é
-- criptografia em nível de aplicação.
--
-- Para adicionar criptografia depois, sem quebrar nada:
--   1. Habilite a extensão pgsodium (ou pgcrypto) no projeto.
--   2. Troque a coluna `api_key` por `api_key_encrypted bytea` (nova coluna,
--      migre os dados existentes com `pgsodium.crypto_secretbox`).
--   3. Só DOIS lugares no código leem/escrevem essa chave hoje:
--        - lib/actions/gateways.ts (criar/editar integração)
--        - app/api/gateways/webhook/[integrationId]/route.ts (leitura pra
--          chamadas de sincronização/teste de conexão)
--      Troque a leitura/escrita nesses dois pontos para usar as funções de
--      encrypt/decrypt do pgsodium e o resto do sistema não precisa mudar.
-- =============================================================================
