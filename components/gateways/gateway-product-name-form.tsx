"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountGatewayProductName } from "@/lib/actions/gateways";

export function GatewayProductNameForm({
  accountId,
  currentValue,
}: {
  accountId: string;
  currentValue: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentValue ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const result = await updateAccountGatewayProductName(accountId, value);
    setLoading(false);

    if (result.error) {
      toast.error("Erro ao salvar", { description: result.error });
      return;
    }

    toast.success("Nome do produto/link salvo");
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <Label>Nome do produto/link nesta conta no gateway</Label>
      <p className="text-xs text-muted-foreground">
        Configure o mesmo nome usado no link de pagamento/produto criado no gateway do operador
        para esta conta — é assim que o sistema identifica de qual conta veio cada venda.
      </p>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex: Assinatura Rancho Fitness"
        />
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? <LoaderCircle className="animate-spin" /> : <Save />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
