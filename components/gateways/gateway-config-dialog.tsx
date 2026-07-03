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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGatewayIntegration,
  updateGatewayIntegration,
  type GatewayIntegrationInput,
} from "@/lib/actions/gateways";
import { encodeSyncPayCredentials, isSyncPayProvider, SYNCPAY_DEFAULT_BASE_URL } from "@/lib/gateway/syncpay-shared";
import { GATEWAY_PROVIDER_PRESETS, GATEWAY_STATUS_LABEL, type GatewayIntegrationSafe } from "@/lib/types";

type FormValues = {
  provider_choice: string;
  provider_custom: string;
  integration_name: string;
  api_base_url: string;
  api_key: string;
  syncpay_client_id: string;
  syncpay_client_secret: string;
  webhook_secret: string;
  status: GatewayIntegrationInput["status"];
};

function defaultValues(integration?: GatewayIntegrationSafe): FormValues {
  const knownPreset = integration && (GATEWAY_PROVIDER_PRESETS as readonly string[]).includes(integration.provider_name);
  return {
    provider_choice: integration ? (knownPreset ? integration.provider_name : "Outro") : GATEWAY_PROVIDER_PRESETS[0],
    provider_custom: integration && !knownPreset ? integration.provider_name : "",
    integration_name: integration?.integration_name ?? "",
    api_base_url: integration?.api_base_url ?? "",
    api_key: "",
    syncpay_client_id: "",
    syncpay_client_secret: "",
    webhook_secret: "",
    status: integration?.status ?? "inactive",
  };
}

export function GatewayConfigDialog({
  open,
  onOpenChange,
  operatorId,
  integration,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  integration?: GatewayIntegrationSafe;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, watch, reset } = useForm<FormValues>({
    defaultValues: defaultValues(integration),
  });

  useEffect(() => {
    if (open) reset(defaultValues(integration));
  }, [open, integration, reset]);

  const providerChoice = watch("provider_choice");
  const isSyncPay = isSyncPayProvider(providerChoice);

  async function onSubmit(values: FormValues) {
    setLoading(true);

    const apiKeyValue = isSyncPay
      ? values.syncpay_client_id && values.syncpay_client_secret
        ? encodeSyncPayCredentials(values.syncpay_client_id, values.syncpay_client_secret)
        : null
      : values.api_key || null;

    const payload: GatewayIntegrationInput = {
      operator_id: operatorId,
      provider_name: values.provider_choice === "Outro" ? values.provider_custom.trim() : values.provider_choice,
      integration_name: values.integration_name,
      api_base_url: values.api_base_url || (isSyncPay ? SYNCPAY_DEFAULT_BASE_URL : null),
      api_key: apiKeyValue,
      webhook_secret: values.webhook_secret || null,
      status: values.status,
    };

    const result = integration
      ? await updateGatewayIntegration(integration.id, payload)
      : await createGatewayIntegration(payload);

    setLoading(false);

    if (result.error) {
      toast.error("Erro ao salvar integração", { description: result.error });
      return;
    }

    toast.success(integration ? "Integração atualizada" : "Gateway configurado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{integration ? "Editar gateway" : "Configurar gateway"}</DialogTitle>
          <DialogDescription>
            As credenciais nunca são reexibidas depois de salvas. Deixe os campos de chave em
            branco para manter os valores atuais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Gateway</Label>
            <Controller
              control={control}
              name="provider_choice"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GATEWAY_PROVIDER_PRESETS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {providerChoice === "Outro" && (
            <div className="space-y-1.5">
              <Label>Nome do gateway customizado</Label>
              <Input {...register("provider_custom", { required: providerChoice === "Outro" })} placeholder="Ex: MeuGateway" />
            </div>
          )}

          <div className={providerChoice === "Outro" ? "col-span-full space-y-1.5" : "space-y-1.5"}>
            <Label>Nome da integração</Label>
            <Input {...register("integration_name", { required: true })} placeholder="Ex: Conta principal - PIX" />
          </div>

          <div className="col-span-full space-y-1.5">
            <Label>API Base URL</Label>
            <Input
              {...register("api_base_url")}
              placeholder={isSyncPay ? SYNCPAY_DEFAULT_BASE_URL : "https://api.meugateway.com"}
            />
          </div>

          {isSyncPay ? (
            <>
              <div className="space-y-1.5">
                <Label>Client ID</Label>
                <Input
                  {...register("syncpay_client_id")}
                  placeholder={integration?.has_api_key ? "Preenchido — deixe em branco pra manter" : "uuid do client_id"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  {...register("syncpay_client_secret")}
                  placeholder={integration?.has_api_key ? "Preenchido — deixe em branco pra manter" : "uuid do client_secret"}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>API Key / Token</Label>
              <Input
                type="password"
                {...register("api_key")}
                placeholder={integration?.has_api_key ? `Atual: ${integration.api_key_masked}` : "sk_live_..."}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Webhook Secret</Label>
            <Input
              type="password"
              {...register("webhook_secret")}
              placeholder={
                integration?.has_webhook_secret ? `Atual: ${integration.webhook_secret_masked}` : "opcional"
              }
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
                    {Object.entries(GATEWAY_STATUS_LABEL)
                      .filter(([value]) => value !== "error")
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {integration && (
            <p className="col-span-full text-xs text-muted-foreground">
              URL do webhook (configure no painel do gateway):{" "}
              <code className="rounded bg-secondary px-1 py-0.5">{integration.webhook_url}</code>
            </p>
          )}

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
