import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, Phone, Plug } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { AccountsTable } from "@/components/contas/accounts-table";
import { GatewaySummaryCards } from "@/components/gateways/gateway-summary-cards";
import { GatewayTransactionsTable } from "@/components/gateways/gateway-transactions-table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GATEWAY_STATUS_LABEL,
  OPERATOR_STATUS_LABEL,
  type GatewayStatus,
  type OperatorStatus,
} from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const GATEWAY_STATUS_BADGE: Record<GatewayStatus, "success" | "muted" | "destructive"> = {
  active: "success",
  inactive: "muted",
  error: "destructive",
};

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<OperatorStatus, "success" | "warning" | "muted"> = {
  ativo: "success",
  pausado: "warning",
  removido: "muted",
};

export default async function OperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    redirect("/operadores");
  }

  const supabase = await createClient();

  const [{ data: operator }, { data: accounts }, { data: allOperators }, { data: integrationRow }] =
    await Promise.all([
      supabase.from("operators").select("*").eq("id", id).maybeSingle(),
      supabase.from("instagram_accounts").select("*").eq("operator_id", id).order("created_at", { ascending: false }),
      supabase.from("operators").select("*").order("name"),
      supabase.from("gateway_integrations").select("*").eq("operator_id", id).maybeSingle(),
    ]);

  if (!operator) notFound();

  const own = accounts ?? [];
  const totalRevenue = own.reduce((sum, a) => sum + Number(a.revenue ?? 0), 0);
  const totalPosts = own.reduce((sum, a) => sum + (a.posts_count ?? 0), 0);
  const accountLabel = new Map(own.map((a) => [a.id, `@${a.username}`]));

  const { data: transactions } = integrationRow
    ? await supabase
        .from("gateway_transactions")
        .select("*")
        .eq("integration_id", integrationRow.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as never[] };

  const allTransactions = transactions ?? [];
  const totalVendido = allTransactions
    .filter((t) => t.status === "paid" || t.status === "approved")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const aprovadas = allTransactions.filter((t) => t.status === "paid" || t.status === "approved").length;
  const pendentes = allTransactions.filter((t) => t.status === "pending").length;
  const reembolsos = allTransactions.filter((t) => t.status === "refunded").length;
  const chargebacks = allTransactions.filter((t) => t.status === "chargeback").length;

  const integration = integrationRow ?? null;

  return (
    <div className="space-y-6">
      <Link href="/operadores" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar para operadores
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{operator.name}</h2>
              <Badge variant={STATUS_BADGE[operator.status as OperatorStatus]} dot>
                {OPERATOR_STATUS_LABEL[operator.status as OperatorStatus]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{operator.role || "Sem função definida"}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {operator.whatsapp && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {operator.whatsapp}
                </span>
              )}
              {operator.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {operator.email}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-gold-gradient font-display text-2xl">{own.length}</p>
              <p className="text-xs text-muted-foreground">Contas</p>
            </div>
            <div className="text-center">
              <p className="text-gold-gradient font-display text-2xl">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Faturamento</p>
            </div>
            <div className="text-center">
              <p className="text-gold-gradient font-display text-2xl">{totalPosts}</p>
              <p className="text-xs text-muted-foreground">Posts feitos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {operator.notes && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{operator.notes}</CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Contas administradas
        </h3>
        <AccountsTable accounts={own} operators={allOperators ?? []} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Gateway de pagamento
        </h3>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {integration ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Plug className="h-4 w-4 text-primary" />
                  <span className="font-medium">{integration.provider_name}</span>
                  <Badge variant={GATEWAY_STATUS_BADGE[integration.status as GatewayStatus]} dot>
                    {GATEWAY_STATUS_LABEL[integration.status as GatewayStatus]}
                  </Badge>
                  <span className="text-muted-foreground">
                    Última sincronização: {formatDateTime(integration.last_sync_at)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum gateway configurado para este operador.</p>
              )}
              <Link
                href="/gateways"
                className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {integration ? "Gerenciar em Gateways" : "Configurar em Gateways"} <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            {integration?.last_error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {integration.last_error}
              </p>
            )}
          </CardContent>
        </Card>

        {integration && (
          <>
            <GatewaySummaryCards
              totalVendido={totalVendido}
              aprovadas={aprovadas}
              pendentes={pendentes}
              reembolsos={reembolsos}
              chargebacks={chargebacks}
            />
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vendas de todas as contas deste operador
              </h4>
              <GatewayTransactionsTable transactions={allTransactions} accountLabel={accountLabel} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
