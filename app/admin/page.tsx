import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Card } from "@/components/ui/Card";

export default async function AdminLoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-anthracite-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-3 h-16 w-16">
            <Image
              src="/logo-mark.png"
              alt="Event Vision Media"
              fill
              sizes="64px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-white">
            Event Vision Media
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
