import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { OperatorsTable } from "@/components/operadores/operators-table";
import type { InstagramAccount, Operator } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OperadoresPage() {
  let operators: Operator[] = [];
  let accounts: InstagramAccount[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [operatorsRes, accountsRes] = await Promise.all([
      supabase.from("operators").select("*").order("name"),
      supabase.from("instagram_accounts").select("*"),
    ]);
    operators = operatorsRes.data ?? [];
    accounts = accountsRes.data ?? [];
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cadastre a equipe e acompanhe quantas contas, faturamento e posts cada operador está gerando.
      </p>
      <OperatorsTable operators={operators} accounts={accounts} />
    </div>
  );
}
