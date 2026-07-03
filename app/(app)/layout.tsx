import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ConfigBanner } from "@/components/layout/config-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header name="Modo preview" email="Supabase não configurado" />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6">
            <ConfigBanner />
            {children}
          </main>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header name={profile?.full_name ?? ""} email={profile?.email ?? user.email ?? ""} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
