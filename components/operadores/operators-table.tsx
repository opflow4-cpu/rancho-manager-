"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { OperatorFormDialog } from "@/components/operadores/operator-form-dialog";
import { deleteOperator } from "@/lib/actions/operators";
import { OPERATOR_STATUS_LABEL, type InstagramAccount, type Operator, type OperatorStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const STATUS_BADGE: Record<OperatorStatus, "success" | "warning" | "muted"> = {
  ativo: "success",
  pausado: "warning",
  removido: "muted",
};

export function OperatorsTable({
  operators,
  accounts,
}: {
  operators: Operator[];
  accounts: InstagramAccount[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Operator | undefined>(undefined);

  function metricsFor(operatorId: string) {
    const own = accounts.filter((a) => a.operator_id === operatorId);
    return {
      count: own.length,
      revenue: own.reduce((sum, a) => sum + Number(a.revenue ?? 0), 0),
      posts: own.reduce((sum, a) => sum + (a.posts_count ?? 0), 0),
    };
  }

  async function handleDelete(operator: Operator) {
    if (!confirm(`Remover o operador "${operator.name}"? As contas dele ficarão sem responsável.`)) return;
    const result = await deleteOperator(operator.id);
    if (result.error) {
      toast.error("Erro ao remover", { description: result.error });
      return;
    }
    toast.success("Operador removido");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <TableToolbar
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus /> Novo operador
          </Button>
        }
      >
        <span className="text-sm text-muted-foreground">
          {operators.length} operador{operators.length === 1 ? "" : "es"} cadastrado{operators.length === 1 ? "" : "s"}
        </span>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Contas</TableHead>
            <TableHead>Faturamento</TableHead>
            <TableHead>Posts feitos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operators.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                Nenhum operador cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
          {operators.map((operator) => {
            const metrics = metricsFor(operator.id);
            return (
              <TableRow key={operator.id}>
                <TableCell className="font-medium">
                  <Link href={`/operadores/${operator.id}`} className="hover:text-primary hover:underline">
                    {operator.name}
                  </Link>
                </TableCell>
                <TableCell>{operator.role || "—"}</TableCell>
                <TableCell>{operator.whatsapp || "—"}</TableCell>
                <TableCell>{operator.email || "—"}</TableCell>
                <TableCell>{metrics.count}</TableCell>
                <TableCell>{formatCurrency(metrics.revenue)}</TableCell>
                <TableCell>{metrics.posts}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[operator.status]} dot>{OPERATOR_STATUS_LABEL[operator.status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(operator);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(operator)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <OperatorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} operator={editing} />
    </div>
  );
}
