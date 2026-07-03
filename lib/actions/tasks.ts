"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Informe o título da tarefa"),
  account_id: z.string().uuid().nullable(),
  operator_id: z.string().uuid().nullable(),
  type: z.enum(["postar", "responder_chat", "aquecer_conta", "verificar_restricao", "criar_conteudo", "outro"]),
  priority: z.enum(["baixa", "media", "alta"]),
  status: z.enum(["pendente", "em_andamento", "finalizada"]),
  due_date: z.string().nullable(),
  notes: z.string().trim().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;

function normalize(input: TaskInput) {
  return {
    ...input,
    due_date: input.due_date || null,
    notes: input.notes || null,
  };
}

export async function createTask(input: TaskInput) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert(normalize(parsed.data));

  if (error) return { error: error.message };

  revalidatePath("/tarefas");
  return { error: null };
}

export async function updateTask(id: string, input: TaskInput) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(normalize(parsed.data)).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tarefas");
  return { error: null };
}

export async function updateTaskStatus(id: string, status: TaskInput["status"]) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tarefas");
  return { error: null };
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tarefas");
  return { error: null };
}
