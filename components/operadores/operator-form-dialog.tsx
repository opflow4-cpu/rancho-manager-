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
import { createOperator, updateOperator, type OperatorInput } from "@/lib/actions/operators";
import { OPERATOR_STATUS_LABEL, type Operator } from "@/lib/types";

type FormValues = {
  name: string;
  role: string;
  whatsapp: string;
  email: string;
  status: OperatorInput["status"];
  notes: string;
};

function defaultValues(operator?: Operator): FormValues {
  return {
    name: operator?.name ?? "",
    role: operator?.role ?? "",
    whatsapp: operator?.whatsapp ?? "",
    email: operator?.email ?? "",
    status: operator?.status ?? "ativo",
    notes: operator?.notes ?? "",
  };
}

export function OperatorFormDialog({
  open,
  onOpenChange,
  operator,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator?: Operator;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: defaultValues(operator),
  });

  useEffect(() => {
    if (open) reset(defaultValues(operator));
  }, [open, operator, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);

    const payload: OperatorInput = {
      name: values.name,
      role: values.role || null,
      whatsapp: values.whatsapp || null,
      email: values.email || null,
      status: values.status,
      notes: values.notes || null,
    };

    const result = operator
      ? await updateOperator(operator.id, payload)
      : await createOperator(payload);

    setLoading(false);

    if (result.error) {
      toast.error("Erro ao salvar operador", { description: result.error });
      return;
    }

    toast.success(operator ? "Operador atualizado" : "Operador criado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{operator ? "Editar operador" : "Novo operador"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-full space-y-1.5">
            <Label>Nome</Label>
            <Input {...register("name", { required: true })} placeholder="Nome completo" />
          </div>

          <div className="space-y-1.5">
            <Label>Função</Label>
            <Input {...register("role")} placeholder="Ex: Operador de contas" />
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
                    {Object.entries(OPERATOR_STATUS_LABEL).map(([value, label]) => (
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
            <Label>WhatsApp</Label>
            <Input {...register("whatsapp")} placeholder="(00) 00000-0000" />
          </div>

          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" {...register("email")} placeholder="operador@equipe.com" />
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
