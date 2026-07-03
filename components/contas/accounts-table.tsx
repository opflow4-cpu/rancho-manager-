"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownUp,
  Pencil,
  Plug,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AccountFormDialog } from "@/components/contas/account-form-dialog";
import { deleteAccount } from "@/lib/actions/accounts";
import {
  ACCOUNT_STATUS_LABEL,
  RESTRICTION_TYPE_LABEL,
  type AccountStatus,
  type InstagramAccount,
  type Operator,
} from "@/lib/types";
import { cn, daysInProject, formatCurrency, formatDate } from "@/lib/utils";

const ALL = "__all__";

const STATUS_BADGE: Record<AccountStatus, "success" | "warning" | "ember" | "destructive" | "muted"> = {
  ativa: "success",
  aquecendo: "warning",
  restrita: "ember",
  bloqueada: "destructive",
  caiu: "destructive",
  pausada: "muted",
};

type SortKey = "revenue" | "days" | "posts" | null;

export function AccountsTable({
  accounts,
  operators,
  initialSearch = "",
}: {
  accounts: InstagramAccount[];
  operators: Operator[];
  initialSearch?: string;
}) {
  const router = useRouter();
  const operatorName = new Map(operators.map((o) => [o.id, o.name]));

  const [search, setSearch] = useState(initialSearch);
  const [filterOperator, setFilterOperator] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterSubniche, setFilterSubniche] = useState(ALL);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InstagramAccount | undefined>(undefined);

  const subniches = useMemo(
    () => [...new Set(accounts.map((a) => a.subniche).filter(Boolean))] as string[],
    [accounts]
  );

  const filtered = useMemo(() => {
    let list = accounts.filter((a) => {
      if (filterOperator !== ALL && a.operator_id !== filterOperator) return false;
      if (filterStatus !== ALL && a.status !== filterStatus) return false;
      if (filterSubniche !== ALL && a.subniche !== filterSubniche) return false;
      if (search.trim() && !a.username.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });

    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av =
          sortKey === "revenue"
            ? Number(a.revenue)
            : sortKey === "days"
              ? daysInProject(a.entry_date)
              : a.posts_count;
        const bv =
          sortKey === "revenue"
            ? Number(b.revenue)
            : sortKey === "days"
              ? daysInProject(b.entry_date)
              : b.posts_count;
        return sortDir === "asc" ? av - bv : bv - av;
      });
    }

    return list;
  }, [accounts, filterOperator, filterStatus, filterSubniche, search, sortKey, sortDir]);

  function toggleSort(key: Exclude<SortKey, null>) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handleDelete(account: InstagramAccount) {
    if (!confirm(`Excluir a conta @${account.username}? Essa ação não pode ser desfeita.`)) return;
    const result = await deleteAccount(account.id);
    if (result.error) {
      toast.error("Erro ao excluir", { description: result.error });
      return;
    }
    toast.success("Conta excluída");
    router.refresh();
  }

  function SortableHead({ label, k }: { label: string; k: Exclude<SortKey, null> }) {
    return (
      <TableHead>
        <button
          className={cn(
            "flex items-center gap-1 hover:text-primary",
            sortKey === k && "text-primary"
          )}
          onClick={() => toggleSort(k)}
        >
          {label}
          <ArrowDownUp className="h-3 w-3" />
        </button>
      </TableHead>
    );
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
            <Plus /> Nova conta
          </Button>
        }
      >
        <div className="relative w-full max-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por @..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos status</SelectItem>
            {Object.entries(ACCOUNT_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSubniche} onValueChange={setFilterSubniche}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Subnicho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos subnichos</SelectItem>
            {subniches.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {filtered.length} conta{filtered.length === 1 ? "" : "s"}
        </span>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operador</TableHead>
            <TableHead>Subnicho</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>@</TableHead>
            <TableHead>Entrada</TableHead>
            <SortableHead label="Dias" k="days" />
            <SortableHead label="Posts" k="posts" />
            <TableHead>Posts sem.</TableHead>
            <TableHead>Último post</TableHead>
            <SortableHead label="Faturamento" k="revenue" />
            <TableHead>Status</TableHead>
            <TableHead>Restrição</TableHead>
            <TableHead>Bloqueio</TableHead>
            <TableHead>Chat</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={15} className="py-8 text-center text-muted-foreground">
                Nenhuma conta encontrada com os filtros atuais.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.operator_id ? operatorName.get(account.operator_id) ?? "—" : "—"}</TableCell>
              <TableCell>{account.subniche || "—"}</TableCell>
              <TableCell className="font-medium">{account.account_name}</TableCell>
              <TableCell className="text-primary">@{account.username}</TableCell>
              <TableCell>{formatDate(account.entry_date)}</TableCell>
              <TableCell>{daysInProject(account.entry_date)}</TableCell>
              <TableCell>{account.posts_count}</TableCell>
              <TableCell>{account.posts_this_week}</TableCell>
              <TableCell>{formatDate(account.last_post_date)}</TableCell>
              <TableCell>{formatCurrency(Number(account.revenue))}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[account.status]} dot>{ACCOUNT_STATUS_LABEL[account.status]}</Badge>
              </TableCell>
              <TableCell>
                {account.had_restriction ? (
                  <Badge variant="ember" dot>{account.restriction_type ? RESTRICTION_TYPE_LABEL[account.restriction_type] : "Sim"}</Badge>
                ) : (
                  <span className="text-muted-foreground">Não</span>
                )}
              </TableCell>
              <TableCell>
                {account.had_block ? (
                  <Badge variant="destructive" dot>{account.block_type || "Sim"}</Badge>
                ) : (
                  <span className="text-muted-foreground">Não</span>
                )}
              </TableCell>
              <TableCell>
                {account.chat_attended ? (
                  <span className="text-success">
                    {account.chat_responsible_id ? operatorName.get(account.chat_responsible_id) ?? "Sim" : "Sim"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Não</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Gateway / Vendas" asChild>
                    <Link href={`/contas/${account.id}/gateway`}>
                      <Plug className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(account);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(account)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
        operators={operators}
      />
    </div>
  );
}
