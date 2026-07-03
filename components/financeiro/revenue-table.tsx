"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RevenueFormDialog } from "@/components/financeiro/revenue-form-dialog";
import { deleteRevenueRecord } from "@/lib/actions/revenue";
import {
  REVENUE_ORIGIN_LABEL,
  type InstagramAccount,
  type Operator,
  type RevenueRecord,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const ALL = "__all__";

export function RevenueTable({
  records,
  accounts,
  operators,
}: {
  records: RevenueRecord[];
  accounts: InstagramAccount[];
  operators: Operator[];
}) {
  const router = useRouter();
  const accountLabel = new Map(accounts.map((a) => [a.id, `@${a.username}`]));
  const accountSubniche = new Map(accounts.map((a) => [a.id, a.subniche ?? "Sem subnicho"]));
  const operatorName = new Map(operators.map((o) => [o.id, o.name]));

  const [filterAccount, setFilterAccount] = useState(ALL);
  const [filterOperator, setFilterOperator] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueRecord | undefined>(undefined);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterAccount !== ALL && r.account_id !== filterAccount) return false;
      if (filterOperator !== ALL && r.operator_id !== filterOperator) return false;
      if (dateFrom && r.record_date < dateFrom) return false;
      if (dateTo && r.record_date > dateTo) return false;
      return true;
    });
  }, [records, filterAccount, filterOperator, dateFrom, dateTo]);

  const total = filtered.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const byOperator = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const key = r.operator_id ? operatorName.get(r.operator_id) ?? "Sem operador" : "Sem operador";
      map.set(key, (map.get(key) ?? 0) + Number(r.amount ?? 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered, operatorName]);

  const bySubniche = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const key = accountSubniche.get(r.account_id) ?? "Sem subnicho";
      map.set(key, (map.get(key) ?? 0) + Number(r.amount ?? 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered, accountSubniche]);

  async function handleDelete(record: RevenueRecord) {
    if (!confirm("Excluir este lançamento financeiro?")) return;
    const result = await deleteRevenueRecord(record.id);
    if (result.error) {
      toast.error("Erro ao excluir", { description: result.error });
      return;
    }
    toast.success("Lançamento excluído");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento total (filtro atual)</CardTitle>
          </CardHeader>
          <CardContent className="text-gold-gradient font-display text-2xl">{formatCurrency(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top operadores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {byOperator.length === 0 && <p className="text-muted-foreground">Sem dados</p>}
            {byOperator.map(([name, value]) => (
              <div key={name} className="flex justify-between">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top subnichos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {bySubniche.length === 0 && <p className="text-muted-foreground">Sem dados</p>}
            {bySubniche.map(([name, value]) => (
              <div key={name} className="flex justify-between">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <TableToolbar
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus /> Novo lançamento
          </Button>
        }
      >
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                @{a.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOperator} onValueChange={setFilterOperator}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Operador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos operadores</SelectItem>
            {operators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="text-sm text-muted-foreground">até</span>
        <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead>Operador</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                Nenhum lançamento encontrado.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-primary">{accountLabel.get(r.account_id) ?? "—"}</TableCell>
              <TableCell>{r.operator_id ? operatorName.get(r.operator_id) ?? "—" : "—"}</TableCell>
              <TableCell>{formatDate(r.record_date)}</TableCell>
              <TableCell>{formatCurrency(Number(r.amount))}</TableCell>
              <TableCell>
                <Badge variant="secondary">{REVENUE_ORIGIN_LABEL[r.origin]}</Badge>
              </TableCell>
              <TableCell className="max-w-[220px] truncate">{r.notes || "—"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(r);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RevenueFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        accounts={accounts}
        operators={operators}
      />
    </div>
  );
}
