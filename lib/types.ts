// Tipos espelhando o schema SQL em supabase/schema.sql

export type OperatorStatus = "ativo" | "pausado" | "removido";

export type AccountStatus =
  | "ativa"
  | "aquecendo"
  | "restrita"
  | "bloqueada"
  | "caiu"
  | "pausada";

export type RestrictionType =
  | "comentario"
  | "seguir"
  | "dm"
  | "live"
  | "alcance"
  | "publicacao"
  | "outro";

export type RestrictionStatus =
  | "em_analise"
  | "resolvido"
  | "pendente"
  | "conta_caiu";

export type RevenueOrigin =
  | "chat"
  | "privacy"
  | "telegram"
  | "chamada"
  | "ppv"
  | "gateway"
  | "outro";

export type RevenueSource = "manual" | "gateway";

export type GatewayStatus = "active" | "inactive" | "error";

export type GatewayTransactionStatus =
  | "pending"
  | "paid"
  | "approved"
  | "cancelled"
  | "refunded"
  | "chargeback"
  | "failed";

export type GatewaySyncType = "webhook" | "manual_sync" | "cron_sync";

export type GatewaySyncStatus = "success" | "error";

export type TaskType =
  | "postar"
  | "responder_chat"
  | "aquecer_conta"
  | "verificar_restricao"
  | "criar_conteudo"
  | "outro";

export type TaskPriority = "baixa" | "media" | "alta";

export type TaskStatus = "pendente" | "em_andamento" | "finalizada";

export interface Operator {
  id: string;
  name: string;
  role: string | null;
  whatsapp: string | null;
  email: string | null;
  status: OperatorStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstagramAccount {
  id: string;
  operator_id: string | null;
  subniche: string | null;
  account_name: string;
  username: string;
  entry_date: string;
  posts_count: number;
  posts_this_week: number;
  last_post_date: string | null;
  revenue: number;
  status: AccountStatus;
  had_restriction: boolean;
  restriction_type: RestrictionType | null;
  had_block: boolean;
  block_type: string | null;
  chat_attended: boolean;
  chat_responsible_id: string | null;
  notes: string | null;
  gateway_product_name: string | null;
  bot_platform: string | null;
  bot_login: string | null;
  bot_password: string | null;
  created_at: string;
  updated_at: string;
}

export interface Restriction {
  id: string;
  account_id: string;
  restriction_date: string;
  restriction_type: RestrictionType;
  description: string | null;
  status: RestrictionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueRecord {
  id: string;
  account_id: string;
  operator_id: string | null;
  record_date: string;
  amount: number;
  origin: RevenueOrigin;
  notes: string | null;
  source: RevenueSource;
  gateway_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GatewayIntegration {
  id: string;
  /** Legado (pré-migração 0003) — o vínculo atual é operator_id. */
  account_id: string | null;
  operator_id: string | null;
  provider_name: string;
  integration_name: string;
  api_base_url: string | null;
  api_key: string | null;
  webhook_secret: string | null;
  webhook_url: string | null;
  status: GatewayStatus;
  last_sync_at: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Versão segura para o navegador: nunca contém a chave/segredo em texto puro. */
export interface GatewayIntegrationSafe
  extends Omit<GatewayIntegration, "api_key" | "webhook_secret"> {
  api_key_masked: string | null;
  webhook_secret_masked: string | null;
  has_api_key: boolean;
  has_webhook_secret: boolean;
}

export interface GatewayTransaction {
  id: string;
  integration_id: string;
  account_id: string;
  external_transaction_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  currency: string;
  status: GatewayTransactionStatus;
  payment_method: string | null;
  product_name: string | null;
  gateway_payload: unknown;
  paid_at: string | null;
  reversed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GatewaySyncLog {
  id: string;
  integration_id: string | null;
  account_id: string | null;
  type: GatewaySyncType;
  status: GatewaySyncStatus;
  message: string | null;
  payload: unknown;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  account_id: string | null;
  operator_id: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---- labels para exibição em pt-BR ----

export const OPERATOR_STATUS_LABEL: Record<OperatorStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  removido: "Removido",
};

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ativa: "Ativa",
  aquecendo: "Aquecendo",
  restrita: "Restrita",
  bloqueada: "Bloqueada",
  caiu: "Caiu",
  pausada: "Pausada",
};

export const RESTRICTION_TYPE_LABEL: Record<RestrictionType, string> = {
  comentario: "Comentário",
  seguir: "Seguir",
  dm: "DM",
  live: "Live",
  alcance: "Alcance",
  publicacao: "Publicação",
  outro: "Outro",
};

export const RESTRICTION_STATUS_LABEL: Record<RestrictionStatus, string> = {
  em_analise: "Em análise",
  resolvido: "Resolvido",
  pendente: "Pendente",
  conta_caiu: "Conta caiu",
};

export const REVENUE_ORIGIN_LABEL: Record<RevenueOrigin, string> = {
  chat: "Chat",
  privacy: "Privacy",
  telegram: "Telegram",
  chamada: "Chamada",
  ppv: "PPV",
  gateway: "Gateway",
  outro: "Outro",
};

export const GATEWAY_STATUS_LABEL: Record<GatewayStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  error: "Erro",
};

export const GATEWAY_TRANSACTION_STATUS_LABEL: Record<GatewayTransactionStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  approved: "Aprovado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
  failed: "Falhou",
};

export const GATEWAY_SYNC_TYPE_LABEL: Record<GatewaySyncType, string> = {
  webhook: "Webhook",
  manual_sync: "Sincronização manual",
  cron_sync: "Sincronização automática",
};

export const GATEWAY_SYNC_STATUS_LABEL: Record<GatewaySyncStatus, string> = {
  success: "Sucesso",
  error: "Erro",
};

export const GATEWAY_PROVIDER_PRESETS = [
  "SyncPay",
  "PushinPay",
  "Mercado Pago",
  "Stripe",
  "Outro",
] as const;

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  postar: "Postar",
  responder_chat: "Responder chat",
  aquecer_conta: "Aquecer conta",
  verificar_restricao: "Verificar restrição",
  criar_conteudo: "Criar conteúdo",
  outro: "Outro",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
};
