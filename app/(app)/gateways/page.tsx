import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { GatewaysTable } from "@/components/gateways/gateways-table";
import type { GatewayIntegrationSafe, Operator } from "@/lib/types";
import { maskSecret } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GatewaysPage() {
  let operators: Operator[] = [];
  let integrations = new Map<string, GatewayIntegrationSafe>();

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: operatorsData }, { data: integrationsData }] = await Promise.all([
      supabase.from("operators").select("*").order("name"),
      supabase.from("gateway_integrations").select("*").not("operator_id", "is", null),
    ]);

    operators = operatorsData ?? [];
    integrations = new Map(
      (integrationsData ?? []).map((row) => [
        row.operator_id as string,
        {
          ...row,
          api_key_masked: maskSecret(row.api_key),
          webhook_secret_masked: maskSecret(row.webhook_secret),
          has_api_key: Boolean(row.api_key),
          has_webhook_secret: Boolean(row.webhook_secret),
        } as GatewayIntegrationSafe,
      ])
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada operador tem uma integração de gateway, compartilhada entre todas as contas de
        Instagram que ele administra. Configure aqui as credenciais e acompanhe o status de cada
        conexão.
      </p>
      <GatewaysTable operators={operators} integrations={integrations} />
    </div>
  );
}
