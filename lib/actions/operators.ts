"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const operatorSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  role: z.string().trim().nullable(),
  whatsapp: z.string().trim().nullable(),
  email: z.string().trim().nullable(),
  status: z.enum(["ativo", "pausado", "removido"]),
  notes: z.string().trim().nullable(),
});

export type OperatorInput = z.infer<typeof operatorSchema>;

function normalize(input: OperatorInput) {
  return {
    ...input,
    role: input.role || null,
    whatsapp: input.whatsapp || null,
    email: input.email || null,
    notes: input.notes || null,
  };
}

export async function createOperator(input: OperatorInput) {
  const parsed = operatorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("operators")
    .insert({ ...normalize(parsed.data), created_by: user?.id ?? null });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/operadores");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateOperator(id: string, input: OperatorInput) {
  const parsed = operatorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("operators").update(normalize(parsed.data)).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/operadores");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteOperator(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("operators").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/operadores");
  revalidatePath("/dashboard");
  return { error: null };
}
