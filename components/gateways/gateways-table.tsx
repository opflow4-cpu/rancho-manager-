"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle, Plug, RefreshCw, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { GatewayConfigDialog } from "@/components/gateways/gateway-config-dialog";
import {
  deleteGatewayIntegration,
  testGatewayConnection,
  triggerManualSync,
} from "@/lib/actions/gateways";
import { GATEWAY_STATUS_LABEL, type GatewayIntegrationSafe, type GatewayStatus, type Operator } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const STATUS_BADGE: Record<GatewayStatus, "success" | "muted" | "destructive"> = {
  active: "success",
  inactive: "muted",
  error: "destructive",
};

function GatewayRowActions({
  operator,
  integration,
  onConfigure,
}: {
  operator: Operator;
  integration?: GatewayIntegrationSafe;
  onConfigure: () => void;
}) {
  const router = useRouter();
  const [testing, startTest] = useTransition();
  const [syncing, startSync] = useTransition();

  if (!integration) {
    return (
      <Button size="sm" onClick={onConfigure}>
        <Settings /> Configurar
      </Button>
    );
  }

  function handleTest() {
    startTest(async () => {
      const result = await testGatewayConnection(integration!.id);
      if (result.error) toast.error("Falha na conexão", { description: result.error });
      else toast.success("Conexão bem-sucedida");
      router.refresh();
    });
  }

  function handleSync() {
    startSync(async () => {
      const result = await triggerManualSync(integration!.id);
      if (result.error) toast.error("Erro ao sincronizar", { description: result.error });
      else toast.success("Sincronização concluída");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm(`Remover a integração de gateway de "${operator.name}"?`)) return;
    const result = await deleteGatewayIntegration(integration!.id, operator.id);
    if (result.error) {
      toast.error("Erro ao remover", { description: result.error });
      return;
    }
    toast.success("Integração removida");
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" title="Editar" onClick={onConfigure}>
        <Settings className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Testar conexão" onClick={handleTest} disabled={testing}>
        {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" title="Sincronizar vendas" onClick={handleSync} disabled={syncing}>
        {syncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" title="Remover" onClick={handleDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function GatewaysTable({
  operators,
  integrations,
}: {
  operators: Operator[];
  integrations: Map<string, GatewayIntegrationSafe>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);

  const selectedIntegration = selectedOperatorId ? integrations.get(selectedOperatorId) : undefined;

  return (
    <div className="space-y-4">
      <TableToolbar>
        <span className="text-sm text-muted-foreground">
          {integrations.size} de {operators.length} operador{operators.length === 1 ? "" : "es"} com gateway
          configurado
        </span>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operador</TableHead>
            <TableHead>Provedor</TableHead>
            <TableHead>Integração</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última sincronização</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operators.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                Nenhum operador cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
          {operators.map((operator) => {
            const integration = integrations.get(operator.id);
            return (
              <TableRow key={operator.id}>
                <TableCell className="font-medium">{operator.name}</TableCell>
                <TableCell>{integration?.provider_name ?? "—"}</TableCell>
                <TableCell>{integration?.integration_name ?? "—"}</TableCell>
                <TableCell>
                  {integration ? (
                    <Badge variant={STATUS_BADGE[integration.status]} dot>
                      {GATEWAY_STATUS_LABEL[integration.status]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{integration ? formatDateTime(integration.last_sync_at) : "—"}</TableCell>
                <TableCell className="text-right">
                  <GatewayRowActions
                    operator={operator}
                    integration={integration}
                    onConfigure={() => {
                      setSelectedOperatorId(operator.id);
                      setDialogOpen(true);
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {selectedOperatorId && (
        <GatewayConfigDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          operatorId={selectedOperatorId}
          integration={selectedIntegration}
        />
      )}
    </div>
  );
}
