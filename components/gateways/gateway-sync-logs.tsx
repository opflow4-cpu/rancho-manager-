import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GATEWAY_SYNC_TYPE_LABEL, type GatewaySyncLog } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function GatewaySyncLogs({ logs }: { logs: GatewaySyncLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
            {log.status === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{log.message || GATEWAY_SYNC_TYPE_LABEL[log.type]}</p>
              <p className="text-xs text-muted-foreground">
                {GATEWAY_SYNC_TYPE_LABEL[log.type]} · {formatDateTime(log.created_at)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
