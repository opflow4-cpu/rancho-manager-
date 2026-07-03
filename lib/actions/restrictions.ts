"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const restrictionSchema = z.object({
  account_id: z.string().uuid("Selecione a conta"),
  restriction_date: z.string().min(1, "Informe a data"),
  restriction_type: z.enum(["comentario", "seguir", "dm", "live", "alcance", "publicacao", "outro"]),
  description: z.string().trim().nullable(),
  status: z.enum(["em_analise", "resolvido", "pendente", "conta_caiu"]),
  notes: z.string().trim().nullable(),
});

export type RestrictionInput = z.infer<typeof restrictionSchema>;

function normalize(input: RestrictionInput) {
  return {
    ...input,
    description: input.description || null,
    notes: input.notes || null,
  };
}

export async function createRestriction(input: RestrictionInput) {
  const parsed = restrictionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("restrictions").insert(normalize(parsed.data));

  if (error) return { error: error.message };

  revalidatePath("/restricoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateRestriction(id: string, input: RestrictionInput) {
  const parsed = restrictionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("restrictions").update(normalize(parsed.data)).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/restricoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteRestriction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("restrictions").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/restricoes");
  revalidatePath("/dashboard");
  return { error: null };
}
