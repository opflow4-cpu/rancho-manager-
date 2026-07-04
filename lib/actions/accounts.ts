"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const accountSchema = z.object({
  operator_id: z.string().uuid().nullable(),
  subniche: z.string().trim().nullable(),
  account_name: z.string().trim().min(1, "Informe o nome da conta"),
  username: z
    .string()
    .trim()
    .min(1, "Informe o @ da conta")
    .transform((v) => v.replace(/^@/, "")),
  entry_date: z.string().min(1, "Informe a data de entrada"),
  posts_count: z.coerce.number().int().min(0),
  posts_this_week: z.coerce.number().int().min(0).default(0),
  last_post_date: z.string().nullable().default(null),
  revenue: z.coerce.number().min(0),
  status: z.enum(["ativa", "aquecendo", "restrita", "bloqueada", "caiu", "pausada"]),
  had_restriction: z.boolean(),
  restriction_type: z
    .enum(["comentario", "seguir", "dm", "live", "alcance", "publicacao", "outro"])
    .nullable(),
  had_block: z.boolean(),
  block_type: z.string().trim().nullable(),
  chat_attended: z.boolean(),
  chat_responsible_id: z.string().uuid().nullable(),
  notes: z.string().trim().nullable(),
  bot_platform: z.string().trim().nullable(),
  bot_login: z.string().trim().nullable(),
  bot_password: z.string().trim().nullable(),
});

export type AccountInput = z.input<typeof accountSchema>;

function normalize(input: AccountInput) {
  return {
    ...input,
    subniche: input.subniche || null,
    last_post_date: input.last_post_date || null,
    block_type: input.block_type || null,
    notes: input.notes || null,
    restriction_type: input.had_restriction ? input.restriction_type : null,
    chat_responsible_id: input.chat_attended ? input.chat_responsible_id : null,
    bot_platform: input.bot_platform || null,
    bot_login: input.bot_login || null,
    bot_password: input.bot_password || null,
  };
}

export async function createAccount(input: AccountInput) {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("instagram_accounts").insert(normalize(parsed.data));

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateAccount(id: string, input: AccountInput) {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const patch = normalize(parsed.data);
  // Campo de senha em branco significa "manter a senha já salva" — não
  // sobrescreve com null só porque o usuário não digitou nada de novo.
  if (!parsed.data.bot_password) delete (patch as { bot_password?: unknown }).bot_password;

  const supabase = await createClient();
  const { error } = await supabase
    .from("instagram_accounts")
    .update(patch)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("instagram_accounts").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { error: null };
}
