-- =============================================================================
-- Rancho Manager — Migração incremental: Plataforma do bot por conta
-- =============================================================================
-- Cada conta de Instagram roda seu funil/bot configurado em uma plataforma
-- (ex: Apex, Raven, SharkBot). Este campo guarda qual plataforma é, além de
-- login/senha de acesso a ESSA plataforma (não é a senha do Instagram — isso
-- continua proibido de guardar).
--
-- Aditiva — não apaga nem altera nada existente. Segura pra rodar de novo.
-- =============================================================================

alter table public.instagram_accounts
  add column if not exists bot_platform text,
  add column if not exists bot_login text,
  add column if not exists bot_password text;

comment on column public.instagram_accounts.bot_platform is
  'Plataforma onde o bot/funil desta conta está configurado (ex: Apex, Raven, SharkBot).';
comment on column public.instagram_accounts.bot_login is
  'Login de acesso à plataforma do bot (bot_platform) — não é o login do Instagram.';
comment on column public.instagram_accounts.bot_password is
  'Senha de acesso à plataforma do bot (bot_platform) — não é a senha do Instagram. '
  'Guardada em texto puro (mesma ressalva de segurança da migração 0002 para '
  'gateway_integrations.api_key): protegida por RLS (só usuários autenticados do painel '
  'acessam), mas ao contrário do api_key do gateway ela É reexibida na tela de edição de '
  'conta (para o operador conseguir logar na plataforma), então qualquer usuário '
  'autenticado do painel que carregar a lista de contas recebe o valor em texto puro no '
  'navegador. Sem criptografia em nível de coluna ainda.';

NOTIFY pgrst, 'reload schema';
