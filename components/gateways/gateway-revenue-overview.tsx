"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { GatewayTransactionsTable } from "@/components/gateways/gateway-transactions-table";
import { GATEWAY_TRANSACTION_STATUS_LABEL, type GatewayTransaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const ALL = "__all__";

export function GatewayRevenueOverview({
  transactions,
  providerByIntegration,
  accountLabel,
}: {
  transactions: GatewayTransaction[];
  providerByIntegration: Map<string, string>;
  accountLabel: Map<string, string>;
}) {
  const [filterProvider, setFilterProvider] = useState(ALL);
  const [filterAccount, setFilterAccount] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const providers = useMemo(() => [...new Set(providerByIntegration.values())], [providerByIntegration]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterProvider !== ALL && providerByIntegration.get(t.integration_id) !== filterProvider) return false;
      if (filterAccount !== ALL && t.account_id !== filterAccount) return false;
      if (filterStatus !== ALL && t.status !== filterStatus) return false;
      const day = t.created_at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [transactions, filterProvider, filterAccount, filterStatus, dateFrom, dateTo, providerByIntegration]);

  const sumWhere = (statuses: string[]) =>
    filtered.filter((t) => statuses.includes(t.status)).reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  const totalAprovado = sumWhere(["paid", "approved"]);
  const totalPendente = sumWhere(["pending"]);
  const totalReembolsado = sumWhere(["refunded"]);
  const totalChargeback = sumWhere(["chargeback"]);

  const byGateway = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      if (t.status !== "paid" && t.status !== "approved") continue;
      const provider = providerByIntegration.get(t.integration_id) ?? "Desconhecido";
      map.set(provider, (map.get(provider) ?? 0) + Number(t.amount ?? 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered, providerByIntegration]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total aprovado</CardTitle>
          </CardHeader>
          <CardContent className="text-gold-gradient font-display text-2xl">{formatCurrency(totalAprovado)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total pendente</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-warning">{formatCurrency(totalPendente)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total reembolsado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {formatCurrency(totalReembolsado)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total chargeback</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {formatCurrency(totalChargeback)}
          </CardContent>
        </Card>
      </div>

      {byGateway.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por gateway</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byGateway.map(([name, value]) => (
              <div key={name} className="flex justify-between">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <TableToolbar>
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Gateway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos gateways</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as contas</SelectItem>
            {[...accountLabel.entries()].map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos status</SelectItem>
            {Object.entries(GATEWAY_TRANSACTION_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="text-sm text-muted-foreground">até</span>
        <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </TableToolbar>

      <GatewayTransactionsTable transactions={filtered} accountLabel={accountLabel} hideToolbar />
    </div>
  );
}
