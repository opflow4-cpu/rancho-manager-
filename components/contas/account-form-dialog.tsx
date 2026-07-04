"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { createAccount, updateAccount, type AccountInput } from "@/lib/actions/accounts";
import {
  ACCOUNT_STATUS_LABEL,
  RESTRICTION_TYPE_LABEL,
  type InstagramAccount,
  type Operator,
} from "@/lib/types";

const NONE = "__none__";

type FormValues = {
  operator_id: string;
  subniche: string;
  username: string;
  entry_date: string;
  posts_count: number;
  revenue: number;
  status: AccountInput["status"];
  had_restriction: boolean;
  restriction_type: string;
  had_block: boolean;
  block_type: string;
  chat_attended: boolean;
  chat_responsible_id: string;
  notes: string;
};

function defaultValues(account?: InstagramAccount): FormValues {
  return {
    operator_id: account?.operator_id ?? NONE,
    subniche: account?.subniche ?? "",
    username: account?.username ?? "",
    entry_date: account?.entry_date ?? new Date().toISOString().slice(0, 10),
    posts_count: account?.posts_count ?? 0,
    revenue: account?.revenue ?? 0,
    status: account?.status ?? "aquecendo",
    had_restriction: account?.had_restriction ?? false,
    restriction_type: account?.restriction_type ?? NONE,
    had_block: account?.had_block ?? false,
    block_type: account?.block_type ?? "",
    chat_attended: account?.chat_attended ?? false,
    chat_responsible_id: account?.chat_responsible_id ?? NONE,
    notes: account?.notes ?? "",
  };
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  operators,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: InstagramAccount;
  operators: Operator[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, watch, reset } = useForm<FormValues>({
    defaultValues: defaultValues(account),
  });

  useEffect(() => {
    if (open) reset(defaultValues(account));
  }, [open, account, reset]);

  const hadRestriction = watch("had_restriction");
  const hadBlock = watch("had_block");
  const chatAttended = watch("chat_attended");

  async function onSubmit(values: FormValues) {
    setLoading(true);

    const payload: AccountInput = {
      operator_id: values.operator_id === NONE ? null : values.operator_id,
      subniche: values.subniche || null,
      // "Nome da conta" não é mais preenchido manualmente — usa o @ como nome.
      account_name: values.username.trim().replace(/^@/, ""),
      username: values.username,
      entry_date: values.entry_date,
      posts_count: Number(values.posts_count),
      revenue: Number(values.revenue),
      status: values.status,
      had_restriction: values.had_restriction,
      restriction_type:
        values.restriction_type === NONE ? null : (values.restriction_type as AccountInput["restriction_type"]),
      had_block: values.had_block,
      block_type: values.block_type || null,
      chat_attended: values.chat_attended,
      chat_responsible_id: values.chat_responsible_id === NONE ? null : values.chat_responsible_id,
      notes: values.notes || null,
    };

    const result = account
      ? await updateAccount(account.id, payload)
      : await createAccount(payload);

    setLoading(false);

    if (result.error) {
      toast.error("Erro ao salvar conta", { description: result.error });
      return;
    }

    toast.success(account ? "Conta atualizada" : "Conta criada");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account ? "Editar conta" : "Nova conta do Instagram"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>@ da conta</Label>
            <Input {...register("username", { required: true })} placeholder="usuario_instagram" />
          </div>

          <div className="space-y-1.5">
            <Label>Subnicho</Label>
            <Input {...register("subniche")} placeholder="Ex: fitness, viagens..." />
          </div>

          <div className="space-y-1.5">
            <Label>Operador responsável</Label>
            <Controller
              control={control}
              name="operator_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem operador</SelectItem>
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
            <Label>Data de entrada no projeto</Label>
            <Input type="date" {...register("entry_date", { required: true })} />
          </div>

          <div className="space-y-1.5">
            <Label>Status da conta</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_STATUS_LABEL).map(([value, label]) => (
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
            <Label>Posts feitos (total)</Label>
            <Input type="number" min={0} {...register("posts_count", { valueAsNumber: true })} />
          </div>

          <div className="space-y-1.5">
            <Label>Faturamento da conta (R$)</Label>
            <Input type="number" min={0} step="0.01" {...register("revenue", { valueAsNumber: true })} />
          </div>

          <div className="col-span-full gold-divider" />

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              Recebeu restrição?
              <Controller
                control={control}
                name="had_restriction"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de restrição</Label>
            <Controller
              control={control}
              name="restriction_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!hadRestriction}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {Object.entries(RESTRICTION_TYPE_LABEL).map(([value, label]) => (
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
            <Label className="flex items-center justify-between">
              Recebeu bloqueio?
              <Controller
                control={control}
                name="had_block"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de bloqueio</Label>
            <Input {...register("block_type")} disabled={!hadBlock} placeholder="Ex: banimento temporário" />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              Tem alguém respondendo o chat?
              <Controller
                control={control}
                name="chat_attended"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável pelo chat</Label>
            <Controller
              control={control}
              name="chat_responsible_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!chatAttended}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
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
