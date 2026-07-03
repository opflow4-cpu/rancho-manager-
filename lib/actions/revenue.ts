"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const revenueSchema = z.object({
  account_id: z.string().uuid("Selecione a conta"),
  operator_id: z.string().uuid().nullable(),
  record_date: z.string().min(1, "Informe a data"),
  amount: z.coerce.number().min(0),
  origin: z.enum(["chat", "privacy", "telegram", "chamada", "ppv", "gateway", "outro"]),
  notes: z.string().trim().nullable(),
});

export type RevenueInput = z.infer<typeof revenueSchema>;

function normalize(input: RevenueInput) {
  return { ...input, notes: input.notes || null };
}

export async function createRevenueRecord(input: RevenueInput) {
  const parsed = revenueSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("revenue_records").insert(normalize(parsed.data));

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateRevenueRecord(id: string, input: RevenueInput) {
  const parsed = revenueSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("revenue_records").update(normalize(parsed.data)).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteRevenueRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("revenue_records").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { error: null };
}
