"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Escuta novas vendas/atualizações via Supabase Realtime e revalida a página
 * automaticamente — assim o painel mostra a venda assim que o webhook grava
 * no banco, sem precisar de F5 nem cadastro manual.
 *
 * Requer que a tabela `gateway_transactions` esteja na publicação
 * `supabase_realtime` (já feito em supabase/migrations/0002_gateway_integrations.sql).
 */
export function GatewayRealtimeRefresher({ accountId }: { accountId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`gateway-transactions-${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gateway_transactions",
          filter: `account_id=eq.${accountId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, router]);

  return null;
}
