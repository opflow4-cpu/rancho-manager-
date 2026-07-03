import { Wallet, CheckCircle2, Clock, Undo2, ShieldAlert } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { formatCurrency } from "@/lib/utils";

export function GatewaySummaryCards({
  totalVendido,
  aprovadas,
  pendentes,
  reembolsos,
  chargebacks,
}: {
  totalVendido: number;
  aprovadas: number;
  pendentes: number;
  reembolsos: number;
  chargebacks: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard label="Total vendido" value={formatCurrency(totalVendido)} icon={Wallet} accent="gold" emphasis />
      <MetricCard label="Vendas aprovadas" value={aprovadas} icon={CheckCircle2} accent="success" />
      <MetricCard label="Vendas pendentes" value={pendentes} icon={Clock} accent="ember" />
      <MetricCard label="Reembolsos" value={reembolsos} icon={Undo2} accent="destructive" />
      <MetricCard label="Chargebacks" value={chargebacks} icon={ShieldAlert} accent="destructive" />
    </div>
  );
}
