import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { AccountsTable } from "@/components/contas/accounts-table";
import type { InstagramAccount, Operator } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let accounts: InstagramAccount[] = [];
  let operators: Operator[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [accountsRes, operatorsRes] = await Promise.all([
      supabase.from("instagram_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("operators").select("*").order("name"),
    ]);
    accounts = accountsRes.data ?? [];
    operators = operatorsRes.data ?? [];
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerencie todas as contas do Instagram operadas pela equipe, seus responsáveis, status e desempenho.
      </p>
      <AccountsTable accounts={accounts} operators={operators} initialSearch={q ?? ""} />
    </div>
  );
}
