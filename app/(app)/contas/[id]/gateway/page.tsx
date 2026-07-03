import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GatewaySummaryCards } from "@/components/gateways/gateway-summary-cards";
import { GatewayTransactionsTable } from "@/components/gateways/gateway-transactions-table";
import { GatewayProductNameForm } from "@/components/gateways/gateway-product-name-form";
import { GatewayRealtimeRefresher } from "@/components/gateways/gateway-realtime-refresher";
import { ACCOUNT_STATUS_LABEL, type AccountStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<AccountStatus, "success" | "warning" | "ember" | "destructive" | "muted"> = {
  ativa: "success",
  aquecendo: "warning",
  restrita: "ember",
  bloqueada: "destructive",
  caiu: "destructive",
  pausada: "muted",
};

export default async function AccountGatewayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    redirect("/contas");
  }

  const supabase = await createClient();

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("*, operators!operator_id(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!account) notFound();

  const operator = (account as { operators?: { id: string; name: string } | null }).operators ?? null;

  const [{ data: integration }, { data: transactions }] = await Promise.all([
    operator
      ? supabase.from("gateway_integrations").select("id, status").eq("operator_id", operator.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("gateway_transactions")
      .select("*")
      .eq("account_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const allTransactions = transactions ?? [];
  const totalVendido = allTransactions
    .filter((t) => t.status === "paid" || t.status === "approved")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const aprovadas = allTransactions.filter((t) => t.status === "paid" || t.status === "approved").length;
  const pendentes = allTransactions.filter((t) => t.status === "pending").length;
  const reembolsos = allTransactions.filter((t) => t.status === "refunded").length;
  const chargebacks = allTransactions.filter((t) => t.status === "chargeback").length;

  return (
    <div className="space-y-6">
      <Link
        href="/contas"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para contas
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{account.account_name}</h2>
              <Badge variant={STATUS_BADGE[account.status as AccountStatus]} dot>
                {ACCOUNT_STATUS_LABEL[account.status as AccountStatus]}
              </Badge>
            </div>
            <p className="text-sm text-primary">@{account.username}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          {operator ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                O gateway desta conta é configurado no operador{" "}
                <span className="font-medium text-foreground">{operator.name}</span> — uma única
                integração vale para todas as contas que ele administra.
              </p>
              <Link
                href="/gateways"
                className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Gerenciar em Gateways <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta conta ainda não tem um operador responsável atribuído. Atribua um operador em{" "}
              <Link href="/contas" className="text-primary hover:underline">
                Contas
              </Link>{" "}
              para poder configurar o gateway de pagamento.
            </p>
          )}

          {integration && <GatewayProductNameForm accountId={id} currentValue={account.gateway_product_name} />}
        </CardContent>
      </Card>

      <GatewaySummaryCards
        totalVendido={totalVendido}
        aprovadas={aprovadas}
        pendentes={pendentes}
        reembolsos={reembolsos}
        chargebacks={chargebacks}
      />

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Vendas recebidas nesta conta
        </h3>
        <GatewayTransactionsTable transactions={allTransactions} />
      </div>

      <GatewayRealtimeRefresher accountId={id} />
    </div>
  );
}
