import {
  Instagram,
  CheckCircle2,
  ShieldAlert,
  Ban,
  TrendingDown,
  FileEdit,
  Wallet,
  Trophy,
  Star,
  Plug,
  ShoppingCart,
  Clock,
  RefreshCw,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { RanchoMark } from "@/components/brand/rancho-mark";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  RevenueByOperatorChart,
  AccountsByStatusChart,
  PostsThisWeekChart,
} from "@/components/dashboard/charts";
import { ACCOUNT_STATUS_LABEL, type AccountStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let accounts: { id: string; operator_id: string | null; status: string; posts_count: number; posts_this_week: number; revenue: number; account_name: string; username: string }[] | null = [];
  let operators: { id: string; name: string }[] | null = [];
  let gatewayTransactions: { status: string; amount: number; created_at: string }[] = [];
  let gatewayIntegrations: { status: string; last_sync_at: string | null }[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [accountsRes, operatorsRes, transactionsRes, integrationsRes] = await Promise.all([
      supabase
        .from("instagram_accounts")
        .select("id, operator_id, status, posts_count, posts_this_week, revenue, account_name, username"),
      supabase.from("operators").select("id, name"),
      supabase.from("gateway_transactions").select("status, amount, created_at"),
      supabase.from("gateway_integrations").select("status, last_sync_at"),
    ]);
    accounts = accountsRes.data;
    operators = operatorsRes.data;
    gatewayTransactions = transactionsRes.data ?? [];
    gatewayIntegrations = integrationsRes.data ?? [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const vendasHoje = gatewayTransactions.filter(
    (t) => (t.status === "paid" || t.status === "approved") && t.created_at?.slice(0, 10) === today
  );
  const faturamentoHojeGateway = vendasHoje.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
  const vendasPendentes = gatewayTransactions.filter((t) => t.status === "pending").length;
  const chargebacksTotal = gatewayTransactions.filter((t) => t.status === "chargeback").length;
  const gatewaysAtivos = gatewayIntegrations.filter((g) => g.status === "active").length;
  const ultimaSincronizacao = gatewayIntegrations.reduce<string | null>((latest, g) => {
    if (!g.last_sync_at) return latest;
    if (!latest || g.last_sync_at > latest) return g.last_sync_at;
    return latest;
  }, null);

  const allAccounts = accounts ?? [];
  const allOperators = operators ?? [];
  const operatorName = new Map(allOperators.map((o) => [o.id, o.name]));

  const totalAccounts = allAccounts.length;
  const countByStatus = (status: AccountStatus) =>
    allAccounts.filter((a) => a.status === status).length;

  const ativas = countByStatus("ativa");
  const restritas = countByStatus("restrita");
  const bloqueadas = countByStatus("bloqueada");
  const caiu = countByStatus("caiu");
  const totalPosts = allAccounts.reduce((sum, a) => sum + (a.posts_count ?? 0), 0);
  const totalRevenue = allAccounts.reduce((sum, a) => sum + Number(a.revenue ?? 0), 0);

  const revenueByOperatorMap = new Map<string, number>();
  const postsByOperatorMap = new Map<string, number>();
  for (const acc of allAccounts) {
    const key = acc.operator_id ? operatorName.get(acc.operator_id) ?? "Sem operador" : "Sem operador";
    revenueByOperatorMap.set(key, (revenueByOperatorMap.get(key) ?? 0) + Number(acc.revenue ?? 0));
    postsByOperatorMap.set(key, (postsByOperatorMap.get(key) ?? 0) + (acc.posts_this_week ?? 0));
  }

  const revenueByOperator = [...revenueByOperatorMap.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const postsThisWeek = [...postsByOperatorMap.entries()]
    .map(([name, posts]) => ({ name, posts }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 8);

  const accountsByStatus = (Object.keys(ACCOUNT_STATUS_LABEL) as AccountStatus[]).map((status) => ({
    name: ACCOUNT_STATUS_LABEL[status],
    value: countByStatus(status),
  })).filter((entry) => entry.value > 0);

  const bestOperator = revenueByOperator[0];
  const bestAccount = [...allAccounts].sort((a, b) => Number(b.revenue ?? 0) - Number(a.revenue ?? 0))[0];

  return (
    <div className="space-y-6">
      <div className="hero-panel p-6 md:p-8">
        <RanchoMark
          size="xl"
          className="pointer-events-none absolute -right-6 -top-10 opacity-[0.07] md:-right-2 md:-top-8"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">Rancho Manager</p>
            <h2 className="rancho-brand mt-2 text-2xl text-foreground md:text-3xl">Visão geral da operação</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Desempenho de contas, operadores e faturamento em um único painel de comando.
            </p>
          </div>
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento total
            </p>
            <p className="text-gold-gradient font-display text-3xl leading-tight md:text-4xl">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total de contas" value={totalAccounts} icon={Instagram} />
        <MetricCard label="Contas ativas" value={ativas} icon={CheckCircle2} accent="success" />
        <MetricCard label="Contas restritas" value={restritas} icon={ShieldAlert} accent="ember" />
        <MetricCard label="Contas bloqueadas" value={bloqueadas} icon={Ban} accent="destructive" />
        <MetricCard label="Contas que caíram" value={caiu} icon={TrendingDown} accent="destructive" />
        <MetricCard label="Total de posts feitos" value={totalPosts} icon={FileEdit} />
        <MetricCard
          label="Melhor operador"
          value={bestOperator ? bestOperator.name : "—"}
          hint={bestOperator ? formatCurrency(bestOperator.total) : undefined}
          icon={Trophy}
          accent="gold"
          emphasis
        />
        <MetricCard
          label="Melhor conta por faturamento"
          value={bestAccount ? `@${bestAccount.username}` : "—"}
          hint={bestAccount ? formatCurrency(Number(bestAccount.revenue ?? 0)) : undefined}
          icon={Star}
          accent="gold"
          emphasis
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Gateways de pagamento
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Vendas hoje" value={vendasHoje.length} icon={ShoppingCart} accent="success" />
          <MetricCard
            label="Faturamento hoje via gateway"
            value={formatCurrency(faturamentoHojeGateway)}
            icon={Wallet}
            accent="gold"
          />
          <MetricCard label="Vendas pendentes" value={vendasPendentes} icon={Clock} accent="ember" />
          <MetricCard label="Chargebacks" value={chargebacksTotal} icon={ShieldAlert} accent="destructive" />
          <MetricCard label="Gateways ativos" value={gatewaysAtivos} icon={Plug} accent="success" />
          <MetricCard
            label="Última sincronização"
            value={ultimaSincronizacao ? formatDateTime(ultimaSincronizacao) : "—"}
            icon={RefreshCw}
            accent="muted"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueByOperatorChart data={revenueByOperator} />
        <AccountsByStatusChart data={accountsByStatus} />
        <PostsThisWeekChart data={postsThisWeek} />
      </div>
    </div>
  );
}
