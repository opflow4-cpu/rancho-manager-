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
import { createRevenueRecord, updateRevenueRecord, type RevenueInput } from "@/lib/actions/revenue";
import { REVENUE_ORIGIN_LABEL, type InstagramAccount, type Operator, type RevenueRecord } from "@/lib/types";

const NONE = "__none__";

type FormValues = {
  account_id: string;
  operator_id: string;
  record_date: string;
  amount: number;
  origin: RevenueInput["origin"];
  notes: string;
};

function defaultValues(record?: RevenueRecord, defaultAccountId?: string): FormValues {
  return {
    account_id: record?.account_id ?? defaultAccountId ?? "",
    operator_id: record?.operator_id ?? NONE,
    record_date: record?.record_date ?? new Date().toISOString().slice(0, 10),
    amount: record?.amount ?? 0,
    origin: record?.origin ?? "outro",
    notes: record?.notes ?? "",
  };
}

export function RevenueFormDialog({
  open,
  onOpenChange,
  record,
  accounts,
  operators,
  defaultAccountId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: RevenueRecord;
  accounts: InstagramAccount[];
  operators: Operator[];
  defaultAccountId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: defaultValues(record, defaultAccountId),
  });

  useEffect(() => {
    if (open) reset(defaultValues(record, defaultAccountId));
  }, [open, record, defaultAccountId, reset]);

  const accountId = watch("account_id");

  useEffect(() => {
    if (!record && accountId) {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc?.operator_id) setValue("operator_id", acc.operator_id);
    }
  }, [accountId, accounts, record, setValue]);

  async function onSubmit(values: FormValues) {
    setLoading(true);

    const payload: RevenueInput = {
      account_id: values.account_id,
      operator_id: values.operator_id === NONE ? null : values.operator_id,
      record_date: values.record_date,
      amount: Number(values.amount),
      origin: values.origin,
      notes: values.notes || null,
    };

    const result = record
      ? await updateRevenueRecord(record.id, payload)
      : await createRevenueRecord(payload);

    setLoading(false);

    if (result.error) {
      toast.error("Erro ao salvar lançamento", { description: result.error });
      return;
    }

    toast.success(record ? "Lançamento atualizado" : "Lançamento registrado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record ? "Editar lançamento" : "Novo lançamento financeiro"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-full space-y-1.5">
            <Label>Conta</Label>
            <Controller
              control={control}
              name="account_id"
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        @{a.username} — {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Operador</Label>
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
            <Label>Data</Label>
            <Input type="date" {...register("record_date", { required: true })} />
          </div>

          <div className="space-y-1.5">
            <Label>Valor faturado (R$)</Label>
            <Input type="number" min={0} step="0.01" {...register("amount", { valueAsNumber: true })} />
          </div>

          <div className="space-y-1.5">
            <Label>Origem</Label>
            <Controller
              control={control}
              name="origin"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REVENUE_ORIGIN_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
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
