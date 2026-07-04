// Funções puras (sem I/O), seguras para importar tanto em Server quanto em
// Client Components. A chamada de rede de verdade (que usa o client_secret)
// fica isolada em lib/gateway/syncpay.ts, marcado com "server-only".

export const SYNCPAY_DEFAULT_BASE_URL = "https://api.syncpayments.com.br";

export function isSyncPayProvider(providerName: string): boolean {
  return providerName.trim().toLowerCase() === "syncpay";
}

export function encodeSyncPayCredentials(clientId: string, clientSecret: string): string {
  return JSON.stringify({ client_id: clientId, client_secret: clientSecret });
}

export function decodeSyncPayCredentials(apiKey: string | null): { clientId: string; clientSecret: string } | null {
  if (!apiKey) return null;
  try {
    const parsed = JSON.parse(apiKey);
    if (parsed?.client_id && parsed?.client_secret) {
      return { clientId: parsed.client_id, clientSecret: parsed.client_secret };
    }
    return null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Payload real do webhook de CashIn da SyncPay (confirmado via
// https://syncpay.apidog.io/oncreate-19542402e0):
//
// {
//   "data": {
//     "id": "9f2a58ed-...",
//     "client": { "name": "...", "email": "...", "document": "..." },
//     "pix_code": "000201...",
//     "amount": 10,
//     "final_amount": 9.4,
//     "currency": "BRL",
//     "status": "pending" | "completed" | "failed" | "refunded" | "med",
//     "payment_method": "PIX",
//     "created_at": "...",
//     "updated_at": "..."
//   }
// }
//
// Bem diferente do contrato genérico do MVP (tudo aninhado em `data`, id em
// vez de external_transaction_id, cliente aninhado, e vocabulário de status
// próprio). "med" = Mecanismo Especial de Devolução (disputa de Pix),
// mapeado para "chargeback".
//
// NOTA: este payload não traz nome de produto/link — então, pra operadores
// com mais de uma conta, ainda não dá pra desambiguar automaticamente uma
// venda da SyncPay (o fallback de conta única continua funcionando normal).
// -----------------------------------------------------------------------------

const SYNCPAY_STATUS_MAP: Record<string, string> = {
  pending: "pending",
  completed: "paid",
  failed: "failed",
  refunded: "refunded",
  med: "chargeback",
};

export interface SyncPayNormalizedTransaction {
  external_transaction_id: string;
  status: string;
  amount: number;
  currency: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  product_name: string | null;
  paid_at: string | null;
  raw: unknown;
}

export function normalizeSyncPayWebhookPayload(body: unknown): SyncPayNormalizedTransaction | null {
  const data = (body as { data?: Record<string, unknown> })?.data;
  if (!data || !data.id) return null;

  const client = data.client as { name?: string; email?: string } | undefined;
  const rawStatus = String(data.status ?? "").toLowerCase();

  return {
    external_transaction_id: String(data.id),
    status: SYNCPAY_STATUS_MAP[rawStatus] ?? "pending",
    amount: Number(data.amount ?? data.final_amount ?? 0),
    currency: (data.currency as string) ?? "BRL",
    customer_name: client?.name ?? null,
    customer_email: client?.email ?? null,
    customer_phone: null,
    payment_method: (data.payment_method as string) ?? null,
    product_name: null,
    paid_at: (data.updated_at as string) ?? null,
    raw: body,
  };
}
