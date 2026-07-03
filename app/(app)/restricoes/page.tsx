import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { RestrictionsTable } from "@/components/restricoes/restrictions-table";
import type { InstagramAccount, Restriction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RestricoesPage() {
  let restrictions: Restriction[] = [];
  let accounts: InstagramAccount[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [restrictionsRes, accountsRes] = await Promise.all([
      supabase.from("restrictions").select("*").order("restriction_date", { ascending: false }),
      supabase.from("instagram_accounts").select("*").order("account_name"),
    ]);
    restrictions = restrictionsRes.data ?? [];
    accounts = accountsRes.data ?? [];
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Histórico de restrições e bloqueios sofridos pelas contas, com acompanhamento até a resolução.
      </p>
      <RestrictionsTable restrictions={restrictions} accounts={accounts} />
    </div>
  );
}
