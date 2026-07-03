import "server-only";

// -----------------------------------------------------------------------------
// Adaptador específico da SyncPay (https://syncpayments.com.br).
//
// Diferente do contrato genérico do MVP (uma única API key/bearer estático),
// a SyncPay usa OAuth2 client_credentials: você troca client_id + client_secret
// por um access_token de curta duração (1h) no endpoint abaixo.
//
// Fonte: documentação oficial em https://syncpay.apidog.io/
//   POST /api/partner/v1/auth-token
//   body: { "client_id": "...", "client_secret": "..." }
//   resposta: { "access_token": "...", "token_type": "...", "expires_in": 3600, "expires_at": "..." }
//
// Guardamos client_id/client_secret como um JSON dentro da coluna `api_key` de
// gateway_integrations (ver encodeSyncPayCredentials, em syncpay-shared.ts)
// para não precisar de uma coluna nova só pra este provedor.
//
// NOTA: só implementamos a troca de token (usada em "Testar conexão"), que é
// uma operação de leitura/autenticação, sem mover dinheiro. Os endpoints de
// CashIn/CashOut/listagem de transações da SyncPay não foram implementados
// ainda — precisam ser confirmados contra a documentação real antes de ligar
// "Sincronizar vendas" especificamente para este provedor.
// -----------------------------------------------------------------------------

import { decodeSyncPayCredentials, SYNCPAY_DEFAULT_BASE_URL } from "@/lib/gateway/syncpay-shared";

export async function testSyncPayConnection(apiBaseUrl: string | null, apiKey: string | null) {
  const credentials = decodeSyncPayCredentials(apiKey);
  if (!credentials) {
    return { ok: false, message: "Client ID/Client Secret da SyncPay não configurados corretamente." };
  }

  const baseUrl = (apiBaseUrl || SYNCPAY_DEFAULT_BASE_URL).replace(/\/$/, "");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${baseUrl}/api/partner/v1/auth-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: credentials.clientId, client_secret: credentials.clientSecret }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.access_token) {
      return {
        ok: false,
        message: body?.message || body?.error || `SyncPay respondeu HTTP ${res.status} sem access_token.`,
      };
    }

    return { ok: true, message: `Token obtido com sucesso (expira em ${body.expires_in ?? "?"}s).` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Falha ao conectar com a API da SyncPay." };
  }
}
