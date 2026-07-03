import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/config";

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured) {
    // Modo de pré-visualização: sem Supabase configurado ainda, libera a
    // navegação livre pelo painel em vez de forçar redirecionamento para /login.
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  // Exclui /api/** — rotas de API (como o webhook de gateway) são chamadas por
  // serviços externos sem sessão de navegador e nunca devem ser redirecionadas
  // para /login. A segurança delas é feita no próprio route handler.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
