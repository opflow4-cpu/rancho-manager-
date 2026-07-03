"use server";

// NOTA — triggerManualSync (MVP genérico):
// Assume que `api_base_url + /transactions` retorna um JSON com uma lista de
// vendas (array direto ou `{ transactions: [...] }`), cada item podendo ter os
// campos external_transaction_id/id, status, amount, currency, customer_name,
// customer_email, customer_phone, payment_method, product_name, paid_at.
// Isso é só um contrato genérico de exemplo — para um gateway real (SyncPay,
// PushinPay, Mercado Pago, Stripe...), troque apenas o bloco de `fetch` abaixo
// pela chamada real da API daquele provedor e mapeie a resposta dele para
// `IncomingGatewayTransaction`. O resto (upsert idempotente, faturamento
// automático, estorno) já funciona sem mudanças, pois vive em
// lib/gateway/apply-transaction.ts.
//
// Desde a migração 0003, a integração pertence ao OPERADOR (não à conta) —
// um operador pode ter várias contas de Instagram compartilhando o mesmo
// gateway. `resolveAccountForTransaction` decide qual conta recebe cada venda.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { applyIncomingTransaction, type IncomingGatewayTransaction } from "@/lib/gateway/apply-transaction";
import { resolveAccountForTransaction } from "@/lib/gateway/resolve-account";
import { isSyncPayProvider } from "@/lib/gateway/syncpay-shared";
import { testSyncPayConnection } from "@/lib/gateway/syncpay";

const integrationSchema = z.object({
  operator_id: z.string().uuid(),
  provider_name: z.string().trim().min(1, "Selecione o gateway"),
  integration_name: z.string().trim().min(1, "Informe um nome para a integração"),
  api_base_url: z.string().trim().nullable(),
  api_key: z.string().trim().nullable(),
  webhook_secret: z.string().trim().nullable(),
  status: z.enum(["active", "inactive", "error"]),
});

export type GatewayIntegrationInput = z.infer<typeof integrationSchema>;

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function revalidateOperatorViews(operatorId: string) {
  revalidatePath(`/operadores/${operatorId}`);
  revalidatePath("/contas");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function createGatewayIntegration(input: GatewayIntegrationInput) {
  const parsed = integrationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("gateway_integrations")
    .insert({
      operator_id: parsed.data.operator_id,
      provider_name: parsed.data.provider_name,
      integration_name: parsed.data.integration_name,
      api_base_url: parsed.data.api_base_url || null,
      api_key: parsed.data.api_key || null,
      webhook_secret: parsed.data.webhook_secret || null,
      status: parsed.data.status,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.message.includes("idx_gateway_integrations_operator_unique")
        ? "Este operador já tem uma integração de gateway configurada."
        : error.message,
    };
  }

  const baseUrl = await getBaseUrl();
  await supabase
    .from("gateway_integrations")
    .update({ webhook_url: `${baseUrl}/api/gateways/webhook/${data.id}` })
    .eq("id", data.id);

  revalidateOperatorViews(parsed.data.operator_id);
  return { error: null };
}

export async function updateGatewayIntegration(id: string, input: GatewayIntegrationInput) {
  const parsed = integrationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();

  const patch: Record<string, unknown> = {
    provider_name: parsed.data.provider_name,
    integration_name: parsed.data.integration_name,
    api_base_url: parsed.data.api_base_url || null,
    status: parsed.data.status,
  };

  // Só sobrescreve a chave/segredo se o usuário digitou um valor novo —
  // campo em branco significa "manter o que já está salvo".
  if (parsed.data.api_key) patch.api_key = parsed.data.api_key;
  if (parsed.data.webhook_secret) patch.webhook_secret = parsed.data.webhook_secret;

  const { error } = await supabase.from("gateway_integrations").update(patch).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateOperatorViews(parsed.data.operator_id);
  return { error: null };
}

export async function deleteGatewayIntegration(id: string, operatorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gateway_integrations").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateOperatorViews(operatorId);
  return { error: null };
}

export async function updateAccountGatewayProductName(accountId: string, productName: string) {
  const supabase = await createClient();
  const { data: account, error } = await supabase
    .from("instagram_accounts")
    .update({ gateway_product_name: productName.trim() || null })
    .eq("id", accountId)
    .select("operator_id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/contas/${accountId}/gateway`);
  if (account?.operator_id) revalidatePath(`/operadores/${account.operator_id}`);
  return { error: null };
}

export async function testGatewayConnection(id: string) {
  const supabase = await createClient();
  const { data: integration, error: fetchError } = await supabase
    .from("gateway_integrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !integration) {
    return { error: "Integração não encontrada" };
  }

  let ok = false;
  let message = "";

  if (isSyncPayProvider(integration.provider_name)) {
    const result = await testSyncPayConnection(integration.api_base_url, integration.api_key);
    ok = result.ok;
    message = result.message;
  } else {
    if (!integration.api_base_url) {
      return { error: "Configure a API Base URL antes de testar a conexão" };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(integration.api_base_url, {
        method: "GET",
        headers: integration.api_key ? { Authorization: `Bearer ${integration.api_key}` } : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      ok = res.status < 500;
      message = `HTTP ${res.status}`;
    } catch (err) {
      message = err instanceof Error ? err.message : "Falha ao conectar com a API do gateway";
    }
  }

  await supabase
    .from("gateway_integrations")
    .update({
      status: ok ? "active" : "error",
      last_error: ok ? null : message,
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("gateway_sync_logs").insert({
    integration_id: id,
    account_id: null,
    type: "manual_sync",
    status: ok ? "success" : "error",
    message: `Teste de conexão — ${message}`,
  });

  if (integration.operator_id) revalidatePath(`/operadores/${integration.operator_id}`);

  return ok ? { error: null } : { error: message };
}

export async function triggerManualSync(id: string) {
  const supabase = await createClient();
  const { data: integration, error: fetchError } = await supabase
    .from("gateway_integrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !integration || !integration.operator_id) {
    return { error: "Integração não encontrada ou sem operador vinculado" };
  }

  if (!integration.api_base_url) {
    await supabase.from("gateway_sync_logs").insert({
      integration_id: id,
      account_id: null,
      type: "manual_sync",
      status: "error",
      message: "Sincronização não executada: nenhuma API Base URL configurada para esta integração.",
    });
    revalidatePath(`/operadores/${integration.operator_id}`);
    return { error: "Configure a API Base URL antes de sincronizar." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${integration.api_base_url.replace(/\/$/, "")}/transactions`, {
      method: "GET",
      headers: integration.api_key ? { Authorization: `Bearer ${integration.api_key}` } : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`A API do gateway respondeu HTTP ${res.status}`);
    }

    const body = await res.json().catch(() => null);
    const list = Array.isArray(body) ? body : Array.isArray(body?.transactions) ? body.transactions : null;

    if (!list) {
      throw new Error(
        "Resposta da API não veio no formato esperado (lista de transações). Este gateway ainda precisa de um adaptador específico — ver nota em lib/actions/gateways.ts."
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const raw of list) {
      const tx: IncomingGatewayTransaction = {
        external_transaction_id: String(raw.external_transaction_id ?? raw.id ?? ""),
        status: raw.status,
        amount: Number(raw.amount ?? 0),
        currency: raw.currency ?? "BRL",
        customer_name: raw.customer_name ?? null,
        customer_email: raw.customer_email ?? null,
        customer_phone: raw.customer_phone ?? null,
        payment_method: raw.payment_method ?? null,
        product_name: raw.product_name ?? null,
        paid_at: raw.paid_at ?? null,
        raw,
      };

      if (!tx.external_transaction_id) continue;

      const resolved = await resolveAccountForTransaction(supabase, integration.operator_id, tx.product_name);
      if (!resolved.accountId) {
        skipped += 1;
        await supabase.from("gateway_sync_logs").insert({
          integration_id: id,
          account_id: null,
          type: "manual_sync",
          status: "error",
          message: `Venda ${tx.external_transaction_id} ignorada: ${resolved.reason}`,
          payload: raw,
        });
        continue;
      }

      const result = await applyIncomingTransaction(supabase, {
        integrationId: id,
        accountId: resolved.accountId,
        operatorId: integration.operator_id,
        providerName: integration.provider_name,
        tx,
      });

      if (result.isNew) created += 1;
      else updated += 1;
    }

    await supabase
      .from("gateway_integrations")
      .update({ status: "active", last_error: null, last_sync_at: new Date().toISOString() })
      .eq("id", id);

    await supabase.from("gateway_sync_logs").insert({
      integration_id: id,
      account_id: null,
      type: "manual_sync",
      status: "success",
      message: `Sincronização manual concluída: ${created} nova(s), ${updated} atualizada(s), ${skipped} ignorada(s).`,
      payload: { count: list.length },
    });

    revalidatePath(`/operadores/${integration.operator_id}`);
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha desconhecida ao sincronizar";

    await supabase
      .from("gateway_integrations")
      .update({ status: "error", last_error: message, last_sync_at: new Date().toISOString() })
      .eq("id", id);

    await supabase.from("gateway_sync_logs").insert({
      integration_id: id,
      account_id: null,
      type: "manual_sync",
      status: "error",
      message,
    });

    revalidatePath(`/operadores/${integration.operator_id}`);
    return { error: message };
  }
}
