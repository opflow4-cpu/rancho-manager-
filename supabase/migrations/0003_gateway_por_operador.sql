-- =============================================================================
-- Rancho Manager — Migração incremental: Gateway por OPERADOR (não por conta)
-- =============================================================================
-- Motivo: cada operador tem uma única conta no gateway (ex: SyncPay), usada
-- para TODAS as contas de Instagram que ele administra. Cada conta de
-- Instagram tem seu próprio link/produto dentro dessa conta do gateway, então
-- o webhook consegue descobrir de qual conta veio a venda pelo nome do
-- produto/link (gateway_product_name).
--
-- Esta migração é ADITIVA — não apaga a integração de teste já criada, só
-- migra o vínculo dela de "conta" para "operador". Rode DEPOIS de
-- 0001/0002. Seguro rodar de novo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. gateway_integrations passa a pertencer ao operador, não à conta.
--    account_id vira legado/opcional (mantido só por histórico/compatibilidade).
-- -----------------------------------------------------------------------------
alter table public.gateway_integrations
  add column if not exists operator_id uuid references public.operators (id) on delete cascade;

-- backfill: para a(s) integração(ões) já criada(s) via conta, descobre o
-- operador daquela conta e preenche operator_id automaticamente.
update public.gateway_integrations gi
set operator_id = ia.operator_id
from public.instagram_accounts ia
where gi.account_id = ia.id
  and gi.operator_id is null
  and ia.operator_id is not null;

-- account_id deixa de ser obrigatório e de ser único (o vínculo real agora é
-- por operador, que pode ter várias contas).
alter table public.gateway_integrations
  alter column account_id drop not null;

do $$ begin
  alter table public.gateway_integrations
    drop constraint gateway_integrations_account_id_key;
exception when undefined_object then null; end $$;

-- um gateway por operador
create unique index if not exists idx_gateway_integrations_operator_unique
  on public.gateway_integrations (operator_id)
  where operator_id is not null;

create index if not exists idx_gateway_integrations_operator on public.gateway_integrations (operator_id);

comment on column public.gateway_integrations.account_id is
  'Legado: antes da migração 0003 a integração era por conta. Mantido só por histórico — o vínculo atual é operator_id.';

-- -----------------------------------------------------------------------------
-- 2. instagram_accounts ganha o identificador do produto/link usado nessa
--    conta dentro do gateway do operador — é isso que o webhook usa pra
--    descobrir de qual conta veio a venda.
-- -----------------------------------------------------------------------------
alter table public.instagram_accounts
  add column if not exists gateway_product_name text;

comment on column public.instagram_accounts.gateway_product_name is
  'Nome do produto/link de pagamento configurado no gateway do operador para esta conta específica — usado para identificar de qual conta veio cada venda no webhook.';

-- -----------------------------------------------------------------------------
-- 3. Recarrega o cache de schema do PostgREST
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
