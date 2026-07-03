"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { RestrictionFormDialog } from "@/components/restricoes/restriction-form-dialog";
import { deleteRestriction } from "@/lib/actions/restrictions";
import {
  RESTRICTION_STATUS_LABEL,
  RESTRICTION_TYPE_LABEL,
  type InstagramAccount,
  type Restriction,
  type RestrictionStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ALL = "__all__";

const STATUS_BADGE: Record<RestrictionStatus, "warning" | "success" | "ember" | "destructive"> = {
  em_analise: "warning",
  resolvido: "success",
  pendente: "ember",
  conta_caiu: "destructive",
};

export function RestrictionsTable({
  restrictions,
  accounts,
}: {
  restrictions: Restriction[];
  accounts: InstagramAccount[];
}) {
  const router = useRouter();
  const accountLabel = new Map(accounts.map((a) => [a.id, `@${a.username} — ${a.account_name}`]));

  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterAccount, setFilterAccount] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Restriction | undefined>(undefined);

  const filtered = useMemo(() => {
    return restrictions.filter((r) => {
      if (filterStatus !== ALL && r.status !== filterStatus) return false;
      if (filterAccount !== ALL && r.account_id !== filterAccount) return false;
      return true;
    });
  }, [restrictions, filterStatus, filterAccount]);

  async function handleDelete(restriction: Restriction) {
    if (!confirm("Excluir este registro de restrição?")) return;
    const result = await deleteRestriction(restriction.id);
    if (result.error) {
      toast.error("Erro ao excluir", { description: result.error });
      return;
    }
    toast.success("Restrição excluída");
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
            <Plus /> Nova restrição
          </Button>
        }
      >
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[220px]">
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

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos status</SelectItem>
            {Object.entries(RESTRICTION_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </span>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                Nenhuma restrição registrada.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{accountLabel.get(r.account_id) ?? "Conta removida"}</TableCell>
              <TableCell>{formatDate(r.restriction_date)}</TableCell>
              <TableCell>{RESTRICTION_TYPE_LABEL[r.restriction_type]}</TableCell>
              <TableCell className="max-w-[280px] truncate">{r.description || "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[r.status]} dot>{RESTRICTION_STATUS_LABEL[r.status]}</Badge>
              </TableCell>
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

      <RestrictionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        restriction={editing}
        accounts={accounts}
      />
    </div>
  );
}
