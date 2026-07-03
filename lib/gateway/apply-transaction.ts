import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { GatewayTransactionStatus } from "@/lib/types";

const VALID_STATUSES: GatewayTransactionStatus[] = [
  "pending",
  "paid",
  "approved",
  "cancelled",
  "refunded",
  "chargeback",
  "failed",
];

export function normalizeGatewayStatus(raw: unknown): GatewayTransactionStatus {
  const value = String(raw ?? "").toLowerCase().trim();
  return (VALID_STATUSES as string[]).includes(value)
    ? (value as GatewayTransactionStatus)
    : "pending";
}

export interface IncomingGatewayTransaction {
  external_transaction_id: string;
  status: unknown;
  amount: number;
  currency?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  payment_method?: string | null;
  product_name?: string | null;
  paid_at?: string | null;
  raw?: unknown;
}

/**
 * Núcleo compartilhado entre o webhook (Route Handler) e a sincronização
 * manual (Server Action): faz upsert idempotente da transação e alimenta
 * revenue_records automaticamente quando a venda é aprovada/paga, ou cria um
 * ajuste negativo quando ela é estornada/chargeback — sem nunca duplicar.
 */
export async function applyIncomingTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  params: {
    integrationId: string;
    accountId: string;
    operatorId: string | null;
    providerName: string;
    tx: IncomingGatewayTransaction;
  }
) {
  const status = normalizeGatewayStatus(params.tx.status);

  const { data: existing } = await supabase
    .from("gateway_transactions")
    .select("*")
    .eq("integration_id", params.integrationId)
    .eq("external_transaction_id", params.tx.external_transaction_id)
    .maybeSingle();

  const isSettled = status === "paid" || status === "approved";

  const row = {
    integration_id: params.integrationId,
    account_id: params.accountId,
    external_transaction_id: params.tx.external_transaction_id,
    customer_name: params.tx.customer_name ?? null,
    customer_email: params.tx.customer_email ?? null,
    customer_phone: params.tx.customer_phone ?? null,
    amount: params.tx.amount,
    currency: params.tx.currency ?? "BRL",
    status,
    payment_method: params.tx.payment_method ?? null,
    product_name: params.tx.product_name ?? null,
    gateway_payload: params.tx.raw ?? null,
    paid_at: isSettled ? params.tx.paid_at ?? new Date().toISOString() : (existing?.paid_at ?? null),
  };

  let transactionId: string;

  if (existing) {
    const { error } = await supabase.from("gateway_transactions").update(row).eq("id", existing.id);
    if (error) throw error;
    transactionId = existing.id as string;
  } else {
    const { data: inserted, error } = await supabase
      .from("gateway_transactions")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    transactionId = inserted.id as string;
  }

  let revenueCreated = false;
  let revenueReversed = false;

  if (isSettled) {
    const { data: revenueExists } = await supabase
      .from("revenue_records")
      .select("id")
      .eq("gateway_transaction_id", transactionId)
      .eq("source", "gateway")
      .maybeSingle();

    if (!revenueExists) {
      await supabase.from("revenue_records").insert({
        account_id: params.accountId,
        operator_id: params.operatorId,
        record_date: new Date().toISOString().slice(0, 10),
        amount: params.tx.amount,
        origin: "gateway",
        source: "gateway",
        gateway_transaction_id: transactionId,
        notes: `Venda via ${params.providerName} — transação ${params.tx.external_transaction_id}`,
      });
      revenueCreated = true;
    }
  }

  if (status === "refunded" || status === "chargeback") {
    const alreadyReversed = Boolean(existing?.reversed_at);
    if (!alreadyReversed) {
      await supabase.from("revenue_records").insert({
        account_id: params.accountId,
        operator_id: params.operatorId,
        record_date: new Date().toISOString().slice(0, 10),
        amount: -Math.abs(params.tx.amount),
        origin: "gateway",
        source: "gateway",
        gateway_transaction_id: transactionId,
        notes: `Estorno (${status === "chargeback" ? "chargeback" : "reembolso"}) — ${params.providerName} — transação ${params.tx.external_transaction_id}`,
      });
      await supabase
        .from("gateway_transactions")
        .update({ reversed_at: new Date().toISOString() })
        .eq("id", transactionId);
      revenueReversed = true;
    }
  }

  return { transactionId, status, isNew: !existing, revenueCreated, revenueReversed };
}
