"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, LoaderCircle, Plug, RefreshCw, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GatewayConfigDialog } from "@/components/gateways/gateway-config-dialog";
import {
  deleteGatewayIntegration,
  testGatewayConnection,
  triggerManualSync,
} from "@/lib/actions/gateways";
import { isSyncPayProvider } from "@/lib/gateway/syncpay-shared";
import { GATEWAY_STATUS_LABEL, type GatewayIntegrationSafe, type GatewayStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const STATUS_BADGE: Record<GatewayStatus, "success" | "muted" | "destructive"> = {
  active: "success",
  inactive: "muted",
  error: "destructive",
};

export function GatewayPanel({
  operatorId,
  integration,
}: {
  operatorId: string;
  integration: GatewayIntegrationSafe | null;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testing, startTest] = useTransition();
  const [syncing, startSync] = useTransition();

  function handleTest() {
    if (!integration) return;
    startTest(async () => {
      const result = await testGatewayConnection(integration.id);
      if (result.error) {
        toast.error("Falha na conexão", { description: result.error });
      } else {
        toast.success("Conexão bem-sucedida");
      }
      router.refresh();
    });
  }

  function handleSync() {
    if (!integration) return;
    startSync(async () => {
      const result = await triggerManualSync(integration.id);
      if (result.error) {
        toast.error("Erro ao sincronizar", { description: result.error });
      } else {
        toast.success("Sincronização concluída");
      }
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!integration) return;
    if (!confirm("Remover esta integração de gateway? O histórico de transações será apagado.")) return;
    const result = await deleteGatewayIntegration(integration.id, operatorId);
    if (result.error) {
      toast.error("Erro ao remover", { description: result.error });
      return;
    }
    toast.success("Integração removida");
    router.refresh();
  }

  const credentialLabel =
    integration && isSyncPayProvider(integration.provider_name)
      ? integration.has_api_key
        ? "Client ID/Secret configurados"
        : "não configurada"
      : (integration?.api_key_masked ?? "não configurada");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Plug className="h-4 w-4 text-primary" /> Gateway / Vendas do operador
        </CardTitle>
        {integration && (
          <Badge variant={STATUS_BADGE[integration.status]} dot>
            {GATEWAY_STATUS_LABEL[integration.status]}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!integration ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Nenhum gateway configurado para este operador ainda. Uma única integração vale para
              todas as contas de Instagram que ele administra — use o campo &quot;Nome do
              produto/link&quot; em cada conta para identificar de onde vem cada venda.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Settings /> Configurar gateway
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Provedor</p>
                <p className="font-medium">{integration.provider_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Integração</p>
                <p className="font-medium">{integration.integration_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Credenciais</p>
                <p className="flex items-center gap-1.5 font-mono text-xs">
                  <KeyRound className="h-3 w-3 text-muted-foreground" />
                  {credentialLabel}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Última sincronização</p>
                <p className="font-medium">{formatDateTime(integration.last_sync_at)}</p>
              </div>
            </div>

            {integration.last_error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {integration.last_error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Settings /> Configurar gateway
              </Button>
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing ? <LoaderCircle className="animate-spin" /> : <Plug />} Testar conexão
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                {syncing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Sincronizar vendas
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
                <Trash2 /> Remover
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <GatewayConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        operatorId={operatorId}
        integration={integration ?? undefined}
      />
    </Card>
  );
}
