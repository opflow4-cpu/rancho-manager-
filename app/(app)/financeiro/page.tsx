import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { RevenueTable } from "@/components/financeiro/revenue-table";
import { GatewayRevenueOverview } from "@/components/gateways/gateway-revenue-overview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GatewayTransaction, InstagramAccount, Operator, RevenueRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  let records: RevenueRecord[] = [];
  let accounts: InstagramAccount[] = [];
  let operators: Operator[] = [];
  let gatewayTransactions: GatewayTransaction[] = [];
  let providerByIntegration = new Map<string, string>();

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [recordsRes, accountsRes, operatorsRes, transactionsRes, integrationsRes] = await Promise.all([
      supabase.from("revenue_records").select("*").order("record_date", { ascending: false }),
      supabase.from("instagram_accounts").select("*").order("account_name"),
      supabase.from("operators").select("*").order("name"),
      supabase.from("gateway_transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("gateway_integrations").select("id, provider_name"),
    ]);
    records = recordsRes.data ?? [];
    accounts = accountsRes.data ?? [];
    operators = operatorsRes.data ?? [];
    gatewayTransactions = transactionsRes.data ?? [];
    providerByIntegration = new Map((integrationsRes.data ?? []).map((i) => [i.id, i.provider_name]));
  }

  const accountLabel = new Map(accounts.map((a) => [a.id, `@${a.username}`]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Controle o faturamento manual e as vendas automáticas vindas dos gateways conectados.
      </p>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Lançamentos manuais</TabsTrigger>
          <TabsTrigger value="gateway">Vendas via gateway</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <RevenueTable records={records} accounts={accounts} operators={operators} />
        </TabsContent>

        <TabsContent value="gateway">
          <GatewayRevenueOverview
            transactions={gatewayTransactions}
            providerByIntegration={providerByIntegration}
            accountLabel={accountLabel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
