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
