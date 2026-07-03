import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { TasksTable } from "@/components/tarefas/tasks-table";
import type { InstagramAccount, Operator, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  let tasks: Task[] = [];
  let accounts: InstagramAccount[] = [];
  let operators: Operator[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [tasksRes, accountsRes, operatorsRes] = await Promise.all([
      supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("instagram_accounts").select("*").order("account_name"),
      supabase.from("operators").select("*").order("name"),
    ]);
    tasks = tasksRes.data ?? [];
    accounts = accountsRes.data ?? [];
    operators = operatorsRes.data ?? [];
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Organize as tarefas do dia a dia: postagens, atendimento de chat, aquecimento e verificação de restrições.
      </p>
      <TasksTable tasks={tasks} accounts={accounts} operators={operators} />
    </div>
  );
}
