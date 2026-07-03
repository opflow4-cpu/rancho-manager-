"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableToolbar } from "@/components/ui/table-toolbar";
import {
  GATEWAY_TRANSACTION_STATUS_LABEL,
  type GatewayTransaction,
  type GatewayTransactionStatus,
} from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const ALL = "__all__";

const STATUS_BADGE: Record<GatewayTransactionStatus, "success" | "warning" | "ember" | "destructive" | "muted"> = {
  pending: "warning",
  paid: "success",
  approved: "success",
  cancelled: "muted",
  refunded: "destructive",
  chargeback: "destructive",
  failed: "destructive",
};

export function GatewayTransactionsTable({
  transactions,
  accountLabel,
  hideToolbar = false,
}: {
  transactions: GatewayTransaction[];
  /** Se informado, mostra uma coluna "Conta" — útil em visões multi-conta (ex: Financeiro). */
  accountLabel?: Map<string, string>;
  /** Oculta o toolbar interno de status — usado quando o componente pai já filtra (ex: Financeiro). */
  hideToolbar?: boolean;
}) {
  const [filterStatus, setFilterStatus] = useState(ALL);

  const filtered = useMemo(
    () => (hideToolbar ? transactions : transactions.filter((t) => filterStatus === ALL || t.status === filterStatus)),
    [transactions, filterStatus, hideToolbar]
  );

  return (
    <div className="space-y-4">
      {!hideToolbar && (
        <TableToolbar>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[170px]">
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
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {filtered.length} transaç{filtered.length === 1 ? "ão" : "ões"}
          </span>
        </TableToolbar>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {accountLabel && <TableHead>Conta</TableHead>}
            <TableHead>ID externo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recebido em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={accountLabel ? 8 : 7} className="py-8 text-center text-muted-foreground">
                Nenhuma transação registrada ainda.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((t) => (
            <TableRow key={t.id}>
              {accountLabel && (
                <TableCell className="text-primary">{accountLabel.get(t.account_id) ?? "—"}</TableCell>
              )}
              <TableCell className="font-mono text-xs text-primary">{t.external_transaction_id}</TableCell>
              <TableCell>{t.customer_name || t.customer_email || "—"}</TableCell>
              <TableCell>{formatCurrency(Number(t.amount))}</TableCell>
              <TableCell>{t.payment_method || "—"}</TableCell>
              <TableCell className="max-w-[200px] truncate">{t.product_name || "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[t.status]} dot>
                  {GATEWAY_TRANSACTION_STATUS_LABEL[t.status]}
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(t.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
