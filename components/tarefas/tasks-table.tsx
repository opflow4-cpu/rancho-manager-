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
import { TaskFormDialog } from "@/components/tarefas/task-form-dialog";
import { deleteTask, updateTaskStatus } from "@/lib/actions/tasks";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_TYPE_LABEL,
  type InstagramAccount,
  type Operator,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

const ALL = "__all__";

const STATUS_BADGE: Record<TaskStatus, "warning" | "ember" | "success"> = {
  pendente: "warning",
  em_andamento: "ember",
  finalizada: "success",
};

const PRIORITY_BADGE: Record<TaskPriority, "muted" | "warning" | "destructive"> = {
  baixa: "muted",
  media: "warning",
  alta: "destructive",
};

export function TasksTable({
  tasks,
  accounts,
  operators,
}: {
  tasks: Task[];
  accounts: InstagramAccount[];
  operators: Operator[];
}) {
  const router = useRouter();
  const accountLabel = new Map(accounts.map((a) => [a.id, `@${a.username}`]));
  const operatorName = new Map(operators.map((o) => [o.id, o.name]));

  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterPriority, setFilterPriority] = useState(ALL);
  const [filterOperator, setFilterOperator] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>(undefined);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== ALL && t.status !== filterStatus) return false;
      if (filterPriority !== ALL && t.priority !== filterPriority) return false;
      if (filterOperator !== ALL && t.operator_id !== filterOperator) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterOperator]);

  async function handleDelete(task: Task) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;
    const result = await deleteTask(task.id);
    if (result.error) {
      toast.error("Erro ao excluir", { description: result.error });
      return;
    }
    toast.success("Tarefa excluída");
    router.refresh();
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    const result = await updateTaskStatus(task.id, status);
    if (result.error) {
      toast.error("Erro ao atualizar status", { description: result.error });
      return;
    }
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
            <Plus /> Nova tarefa
          </Button>
        }
      >
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos status</SelectItem>
            {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas prioridades</SelectItem>
            {Object.entries(TASK_PRIORITY_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOperator} onValueChange={setFilterOperator}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos responsáveis</SelectItem>
            {operators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {filtered.length} tarefa{filtered.length === 1 ? "" : "s"}
        </span>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                Nenhuma tarefa encontrada.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="max-w-[220px] truncate font-medium">{task.title}</TableCell>
              <TableCell>{task.account_id ? accountLabel.get(task.account_id) ?? "—" : "—"}</TableCell>
              <TableCell>{task.operator_id ? operatorName.get(task.operator_id) ?? "—" : "—"}</TableCell>
              <TableCell>{TASK_TYPE_LABEL[task.type]}</TableCell>
              <TableCell>
                <Badge variant={PRIORITY_BADGE[task.priority]} dot>{TASK_PRIORITY_LABEL[task.priority]}</Badge>
              </TableCell>
              <TableCell>
                <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v as TaskStatus)}>
                  <SelectTrigger className="h-7 w-[150px] border-0 bg-transparent p-0 shadow-none">
                    <Badge variant={STATUS_BADGE[task.status]} dot>{TASK_STATUS_LABEL[task.status]}</Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{formatDate(task.created_at?.slice(0, 10))}</TableCell>
              <TableCell>{formatDate(task.due_date)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(task);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(task)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        accounts={accounts}
        operators={operators}
      />
    </div>
  );
}
