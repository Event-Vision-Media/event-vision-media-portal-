import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentBooking } from "@/lib/booking-session";
import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui/Card";
import { Footer } from "@/components/Footer";

export default async function LoginPage() {
  const booking = await getCurrentBooking();
  if (booking) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold-300/30 blur-3xl" />

        <div className="relative w-full max-w-md animate-fade-in-up">
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-anthracite-900 p-4 shadow-glow">
              <Image
                src="/logo-mark.png"
                alt="Event Vision Media"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-anthracite-800">
              Event Vision Media
            </h1>
            <div className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
            <p className="mt-4 text-anthracite-500">
              Euer persönliches Kundenportal für die Auswahl von Layout und
              Personalisierung.
            </p>
          </div>

          <Card>
            <LoginForm />
          </Card>

          <p className="mt-6 text-center text-sm text-anthracite-400">
            Deinen Buchungscode oder dein individuelles Passwort findest du in deiner
            Buchungsbestätigung. Fragen? Melde dich einfach bei uns.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
