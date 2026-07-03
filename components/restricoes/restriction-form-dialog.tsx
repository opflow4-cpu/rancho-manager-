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
import { createRestriction, updateRestriction, type RestrictionInput } from "@/lib/actions/restrictions";
import {
  RESTRICTION_STATUS_LABEL,
  RESTRICTION_TYPE_LABEL,
  type InstagramAccount,
  type Restriction,
} from "@/lib/types";

type FormValues = {
  account_id: string;
  restriction_date: string;
  restriction_type: RestrictionInput["restriction_type"];
  description: string;
  status: RestrictionInput["status"];
  notes: string;
};

function defaultValues(restriction?: Restriction, defaultAccountId?: string): FormValues {
  return {
    account_id: restriction?.account_id ?? defaultAccountId ?? "",
    restriction_date: restriction?.restriction_date ?? new Date().toISOString().slice(0, 10),
    restriction_type: restriction?.restriction_type ?? "outro",
    description: restriction?.description ?? "",
    status: restriction?.status ?? "em_analise",
    notes: restriction?.notes ?? "",
  };
}

export function RestrictionFormDialog({
  open,
  onOpenChange,
  restriction,
  accounts,
  defaultAccountId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restriction?: Restriction;
  accounts: InstagramAccount[];
  defaultAccountId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: defaultValues(restriction, defaultAccountId),
  });

  useEffect(() => {
    if (open) reset(defaultValues(restriction, defaultAccountId));
  }, [open, restriction, defaultAccountId, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);

    const payload: RestrictionInput = {
      account_id: values.account_id,
      restriction_date: values.restriction_date,
      restriction_type: values.restriction_type,
      description: values.description || null,
      status: values.status,
      notes: values.notes || null,
    };

    const result = restriction
      ? await updateRestriction(restriction.id, payload)
      : await createRestriction(payload);

    setLoading(false);

    if (result.error) {
      toast.error("Erro ao salvar restrição", { description: result.error });
      return;
    }

    toast.success(restriction ? "Restrição atualizada" : "Restrição registrada");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{restriction ? "Editar restrição" : "Nova restrição"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-full space-y-1.5">
            <Label>Conta relacionada</Label>
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
            <Label>Data da restrição</Label>
            <Input type="date" {...register("restriction_date", { required: true })} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de restrição</Label>
            <Controller
              control={control}
              name="restriction_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

          <div className="col-span-full space-y-1.5">
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
                    {Object.entries(RESTRICTION_STATUS_LABEL).map(([value, label]) => (
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
            <Label>Descrição do problema</Label>
            <Textarea rows={3} {...register("description")} />
          </div>

          <div className="col-span-full space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={2} {...register("notes")} />
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
