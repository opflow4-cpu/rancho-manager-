"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { RanchoMark } from "@/components/brand/rancho-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast.error("Supabase ainda não configurado", {
        description: "Preencha o .env.local com a URL e a anon key do seu projeto para poder entrar.",
      });
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(900px 500px at 15% 0%, hsl(var(--gold) / 0.12), transparent), radial-gradient(900px 500px at 85% 100%, hsl(var(--ember) / 0.12), transparent)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 grain-overlay opacity-30" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <RanchoMark size="lg" className="brand-ring rounded-full" />
          <div>
            <h1 className="rancho-brand text-2xl leading-tight text-gold-gradient">
              RANCHO
              <br />
              MANAGER
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Painel interno de gestão de contas</p>
          </div>
        </div>

        <Card className="shadow-2xl shadow-black/50">
          <CardHeader className="pb-0 pt-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Acesso restrito</p>
          </CardHeader>
          <CardContent className="pt-4">
            {!isSupabaseConfigured && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Modo de pré-visualização: configure o <code className="rounded bg-secondary px-1">.env.local</code>{" "}
                  para conseguir entrar de verdade.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="voce@equipe.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading && <LoaderCircle className="animate-spin" />}
                Entrar no painel
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Acesso restrito à equipe do Rancho. Fale com um administrador para
              criar seu usuário no Supabase Auth.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
