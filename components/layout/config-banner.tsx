import { AlertTriangle } from "lucide-react";

export function ConfigBanner() {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="font-medium text-primary">Supabase ainda não configurado</p>
        <p className="text-muted-foreground">
          Este é o modo de pré-visualização, exibindo o painel com dados vazios. Preencha{" "}
          <code className="rounded bg-secondary px-1 py-0.5">.env.local</code> com a URL e a
          anon key do seu projeto Supabase (veja o README) para carregar e salvar dados reais.
        </p>
      </div>
    </div>
  );
}
