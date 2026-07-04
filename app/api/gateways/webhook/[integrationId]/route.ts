import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { applyIncomingTransaction, type IncomingGatewayTransaction } from "@/lib/gateway/apply-transaction";
import { resolveAccountForTransaction } from "@/lib/gateway/resolve-account";
import { isSyncPayProvider, normalizeSyncPayWebhookPayload } from "@/lib/gateway/syncpay-shared";

// -----------------------------------------------------------------------------
// Webhook genérico de gateway de pagamento.
//
// Contrato de payload esperado (formato de exemplo para o "gateway customizado"
// deste MVP — para gateways reais, adapte o parsing abaixo ao formato deles):
//
// POST /api/gateways/webhook/<integrationId>
// Header: x-webhook-secret: <webhook_secret configurado na integração>
// Body JSON:
// {
//   "external_transaction_id": "abc123",
//   "status": "paid" | "approved" | "pending" | "cancelled" | "refunded" | "chargeback" | "failed",
//   "amount": 99.90,
//   "currency": "BRL",
//   "customer_name": "Fulano de Tal",
//   "customer_email": "fulano@email.com",
//   "customer_phone": "+55 11 99999-0000",
//   "payment_method": "pix",
//   "product_name": "Assinatura mensal",
//   "paid_at": "2026-07-03T12:00:00Z"
// }
//
// Desde a migração 0003, a integração pertence a um OPERADOR (que pode ter
// várias contas de Instagram usando o mesmo gateway). `product_name` no
// payload é o que identifica qual conta recebe a venda — ver
// lib/gateway/resolve-account.ts. Se o operador só tem uma conta, o
// product_name é opcional (fallback automático).
//
// Autenticado com a service_role key (nunca exposta ao navegador) porque o
// gateway externo não tem sessão de usuário do Supabase Auth. A segurança é
// garantida pelo webhook_secret conferido abaixo antes de qualquer escrita.
//
// Sempre responde em JSON, mesmo em erro de configuração do servidor — nunca
// deixa a requisição cair num 500 vazio, tanto pra facilitar debug quanto
// porque a maioria dos gateways espera um corpo de resposta.
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest, { params }: { params: Promise<{ integrationId: string }> }) {
  const { integrationId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição precisa ser um JSON válido" }, { status: 400 });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de configuração do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const { data: integration, error: integrationError } = await supabase
      .from("gateway_integrations")
      .select("*")
      .eq("id", integrationId)
      .maybeSingle();

    if (integrationError) {
      return NextResponse.json({ error: `Erro ao consultar integração: ${integrationError.message}` }, { status: 500 });
    }

    if (!integration) {
      return NextResponse.json({ error: "Integração não encontrada" }, { status: 404 });
    }

    if (!integration.operator_id) {
      return NextResponse.json(
        { error: "Esta integração ainda não está vinculada a um operador" },
        { status: 422 }
      );
    }

    if (integration.webhook_secret) {
      const providedSecret =
        request.headers.get("x-webhook-secret") ?? request.nextUrl.searchParams.get("secret");

      if (providedSecret !== integration.webhook_secret) {
        await supabase.from("gateway_sync_logs").insert({
          integration_id: integrationId,
          account_id: null,
          type: "webhook",
          status: "error",
          message: "Webhook rejeitado: webhook_secret ausente ou inválido.",
          payload: body,
        });
        return NextResponse.json({ error: "webhook_secret inválido" }, { status: 401 });
      }
    }

    const syncPayTx = isSyncPayProvider(integration.provider_name) ? normalizeSyncPayWebhookPayload(body) : null;

    const tx: IncomingGatewayTransaction = syncPayTx ?? {
      external_transaction_id: String(body.external_transaction_id ?? body.id ?? ""),
      status: body.status,
      amount: Number(body.amount ?? 0),
      currency: (body.currency as string) ?? "BRL",
      customer_name: (body.customer_name as string) ?? null,
      customer_email: (body.customer_email as string) ?? null,
      customer_phone: (body.customer_phone as string) ?? null,
      payment_method: (body.payment_method as string) ?? null,
      product_name: (body.product_name as string) ?? null,
      paid_at: (body.paid_at as string) ?? null,
      raw: body,
    };

    if (!tx.external_transaction_id) {
      throw new Error("Payload sem external_transaction_id (ou id) — não é possível identificar a venda.");
    }

    const resolved = await resolveAccountForTransaction(supabase, integration.operator_id, tx.product_name);

    if (!resolved.accountId) {
      await supabase.from("gateway_sync_logs").insert({
        integration_id: integrationId,
        account_id: null,
        type: "webhook",
        status: "error",
        message: `Venda ${tx.external_transaction_id} não pôde ser atribuída a uma conta: ${resolved.reason}`,
        payload: body,
      });
      return NextResponse.json({ error: resolved.reason }, { status: 422 });
    }

    const result = await applyIncomingTransaction(supabase, {
      integrationId,
      accountId: resolved.accountId,
      operatorId: integration.operator_id,
      providerName: integration.provider_name,
      tx,
    });

    await supabase
      .from("gateway_integrations")
      .update({ status: "active", last_error: null, last_sync_at: new Date().toISOString() })
      .eq("id", integrationId);

    await supabase.from("gateway_sync_logs").insert({
      integration_id: integrationId,
      account_id: resolved.accountId,
      type: "webhook",
      status: "success",
      message: `Transação ${tx.external_transaction_id} processada como "${result.status}".`,
      payload: body,
    });

    return NextResponse.json({ ok: true, transaction_id: result.transactionId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao processar webhook";

    await supabase
      .from("gateway_integrations")
      .update({ status: "error", last_error: message, last_sync_at: new Date().toISOString() })
      .eq("id", integrationId);

    await supabase.from("gateway_sync_logs").insert({
      integration_id: integrationId,
      account_id: null,
      type: "webhook",
      status: "error",
      message,
      payload: body,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
