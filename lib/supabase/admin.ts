import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service_role key — ignora RLS.
 *
 * USO EXCLUSIVO em código 100% servidor (Route Handlers / Server Actions) que
 * precisa gravar dados sem uma sessão de usuário logado, como o webhook de
 * gateway (o gateway externo não tem cookie de sessão do Supabase Auth).
 *
 * NUNCA:
 *   - importe este arquivo em um Client Component ("use client")
 *   - use SUPABASE_SERVICE_ROLE_KEY com o prefixo NEXT_PUBLIC_
 *   - retorne o resultado de queries feitas com este client diretamente para
 *     o navegador sem antes remover/mascarar campos sensíveis
 *
 * A validação de segurança do webhook é o `webhook_secret` de cada integração
 * (conferido no próprio route handler antes de qualquer escrita) — a
 * service_role só existe aqui para permitir a escrita em si.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_URL) não configurada — necessária para o webhook de gateway."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
