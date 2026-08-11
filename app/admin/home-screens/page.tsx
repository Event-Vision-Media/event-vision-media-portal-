import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NewHomeScreenForm } from "@/components/admin/NewHomeScreenForm";
import { HomeScreenListItem } from "@/components/admin/HomeScreenListItem";
import { PersonalizedScreenExampleUpload } from "@/components/admin/PersonalizedScreenExampleUpload";
import { Card } from "@/components/ui/Card";
import { PRODUCT_TYPES, type HomeScreen, type PersonalizedScreenExample } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHomeScreensPage() {
  const supabase = createAdminClient();
  const [{ data: homeScreens }, { data: examples }] = await Promise.all([
    supabase.from("home_screens").select("*").order("sort_order", { ascending: true }),
    supabase.from("personalized_screen_examples").select("*"),
  ]);

  const allHomeScreens = (homeScreens ?? []) as HomeScreen[];
  const byProduct = new Map<string, HomeScreen[]>();
  allHomeScreens.forEach((homeScreen) => {
    const list = byProduct.get(homeScreen.product_type) ?? [];
    list.push(homeScreen);
    byProduct.set(homeScreen.product_type, list);
  });

  const exampleByProduct = new Map<string, PersonalizedScreenExample>();
  ((examples ?? []) as PersonalizedScreenExample[]).forEach((example) => {
    exampleByProduct.set(example.product_type, example);
  });

  const productsToShow = [
    ...PRODUCT_TYPES,
    ...Array.from(byProduct.keys()).filter((p) => !(PRODUCT_TYPES as string[]).includes(p)),
  ];

  return (
    <div className="min-h-screen bg-sand-50">
      <AdminHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/admin/dashboard" className="text-sm text-anthracite-400 hover:text-anthracite-700">
          ← Zurück zur Übersicht
        </Link>
        <h1 className="mt-3 mb-6 font-serif text-2xl font-semibold text-anthracite-800">
          Startbildschirme verwalten
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {productsToShow.map((product) => {
              const items = byProduct.get(product) ?? [];
              return (
                <div key={product}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-anthracite-400">
                    {product}
                  </h2>

                  <PersonalizedScreenExampleUpload
                    productType={product}
                    exampleImageUrl={exampleByProduct.get(product)?.example_image_url ?? null}
                  />

                  <div className="mt-3 space-y-3">
                    {items.map((homeScreen) => (
                      <HomeScreenListItem key={homeScreen.id} homeScreen={homeScreen} />
                    ))}
                    {items.length === 0 && (
                      <p className="text-sm text-anthracite-400">
                        Noch keine Startbildschirme für {product} angelegt.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Card className="h-fit">
            <h2 className="mb-4 font-serif text-lg font-semibold text-anthracite-800">
              Neuer Startbildschirm
            </h2>
            <NewHomeScreenForm />
          </Card>
        </div>
      </main>
    </div>
  );
}
