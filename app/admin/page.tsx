import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Card } from "@/components/ui/Card";
import { BrandMark, BrandName } from "@/components/BrandMark";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin/uebersicht");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-anthracite-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <BrandMark size={76} tone="dark" priority />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-white">
            <BrandName tone="dark" />
          </h1>
          <p className="mt-1 text-sm text-anthracite-300">Admin-Bereich</p>
        </div>
        <Card>
          <AdminLoginForm />
        </Card>
      </div>
    </main>
  );
}
