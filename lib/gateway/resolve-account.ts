import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Um operador pode ter várias contas de Instagram, todas compartilhando a
 * mesma integração de gateway. Para saber de qual conta veio uma venda,
 * casamos `gateway_product_name` (configurado em cada conta) com o
 * `product_name` que veio no payload da transação. Se o operador só tem uma
 * conta cadastrada, usamos ela direto (não faz sentido pedir pra configurar
 * product_name quando não há ambiguidade).
 */
export async function resolveAccountForTransaction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  operatorId: string,
  productName: string | null | undefined
): Promise<{ accountId: string | null; reason: string }> {
  const { data: accounts, error } = await supabase
    .from("instagram_accounts")
    .select("id, username, gateway_product_name")
    .eq("operator_id", operatorId);

  if (error) {
    return { accountId: null, reason: `Erro ao consultar contas do operador: ${error.message}` };
  }

  const list = accounts ?? [];

  if (list.length === 0) {
    return {
      accountId: null,
      reason: `Este operador (id ${operatorId}) não tem nenhuma conta de Instagram cadastrada.`,
    };
  }

  if (list.length === 1) {
    return { accountId: list[0].id, reason: "single_account" };
  }

  if (!productName) {
    return {
      accountId: null,
      reason:
        "O operador tem mais de uma conta e o payload não trouxe product_name — configure o campo 'Nome do produto/link' em cada conta para desambiguar.",
    };
  }

  const normalized = productName.trim().toLowerCase();
  const match = list.find((a) => a.gateway_product_name?.trim().toLowerCase() === normalized);

  if (!match) {
    return {
      accountId: null,
      reason: `Nenhuma conta deste operador tem gateway_product_name = "${productName}" configurado.`,
    };
  }

  return { accountId: match.id, reason: "matched_product_name" };
}
