"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask, updateTask, type TaskInput } from "@/lib/actions/tasks";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_TYPE_LABEL,
  type InstagramAccount,
  type Operator,
  type Task,
} from "@/lib/types";

const NONE = "__none__";

type FormValues = {
  title: string;
  account_id: string;
  operator_id: string;
  type: TaskInput["type"];
  priority: TaskInput["priority"];
  status: TaskInput["status"];
  due_date: string;
  notes: string;
};

function defaultValues(task?: Task): FormValues {
  return {
    title: task?.title ?? "",
    account_id: task?.account_id ?? NONE,
    operator_id: task?.operator_id ?? NONE,
    type: task?.type ?? "outro",
    priority: task?.priority ?? "media",
    status: task?.status ?? "pendente",
    due_date: task?.due_date ?? "",
    notes: task?.notes ?? "",
  };
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  accounts,
  operators,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  accounts: InstagramAccount[];
  operators: Operator[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: defaultValues(task),
  });

  useEffect(() => {
    if (open) reset(defaultValues(task));
  }, [open, task, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);

    const payload: TaskInput = {
      title: values.title,
      account_id: values.account_id === NONE ? null : values.account_id,
      operator_id: values.operator_id === NONE ? null : values.operator_id,
      type: values.type,
      priority: values.priority,
      status: values.status,
      due_date: values.due_date || null,
      notes: values.notes || null,
    };

    const result = task ? await updateTask(task.id, payload) : await createTask(payload);

    setLoading(false);

    if (result.error) {
      toast.error("Erro ao salvar tarefa", { description: result.error });
      return;
    }

    toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-full space-y-1.5">
            <Label>Título da tarefa</Label>
            <Input {...register("title", { required: true })} placeholder="Ex: Postar conteúdo da semana" />
          </div>

          <div className="space-y-1.5">
            <Label>Conta relacionada</Label>
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem conta</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        @{a.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Controller
              control={control}
              name="operator_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem responsável</SelectItem>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Prazo</Label>
            <Input type="date" {...register("due_date")} />
          </div>

          <div className="col-span-full space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={3} {...register("notes")} />
          </div>

          <DialogFooter className="col-span-full">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <LoaderCircle className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
