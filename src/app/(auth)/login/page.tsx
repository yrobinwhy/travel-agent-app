import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 animate-gradient" />

      {/* Subtle emerald glow orbs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-emerald-500/8 blur-3xl animate-float" />
      <div className="absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-emerald-600/6 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 right-1/3 h-56 w-56 rounded-full bg-teal-500/5 blur-3xl animate-pulse-glow" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
          {/* Logo & branding */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/20 shadow-lg shadow-emerald-500/10">
              <Plane className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              TravelAgent Pro
            </h1>
            <p className="mt-2.5 text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
              Your AI-powered travel concierge. Plan trips, optimize points, and manage bookings with natural language.
            </p>
          </div>

          {/* Sign in */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-emerald-500 text-white hover:bg-emerald-400 border-0 shadow-lg shadow-emerald-500/20 transition-premium"
            >
              <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#fff"
                  fillOpacity="0.8"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#fff"
                  fillOpacity="0.9"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#fff"
                  fillOpacity="0.7"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#fff"
                  fillOpacity="0.85"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
