import { auth } from "@/lib/auth";
import { acceptInvite } from "@/lib/db/queries/organizations";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orgInvites, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Plane, CheckCircle2, XCircle, Clock } from "lucide-react";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  // Look up the invite
  const [invite] = await db
    .select({
      id: orgInvites.id,
      email: orgInvites.email,
      role: orgInvites.role,
      expiresAt: orgInvites.expiresAt,
      acceptedAt: orgInvites.acceptedAt,
      orgId: orgInvites.orgId,
      orgName: organizations.name,
      orgType: organizations.type,
    })
    .from(orgInvites)
    .innerJoin(organizations, eq(orgInvites.orgId, organizations.id))
    .where(eq(orgInvites.token, token));

  // Invalid token
  if (!invite) {
    return (
      <InviteLayout>
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">Invalid Invite</h1>
        <p className="mt-2 text-slate-400">This invite link is not valid.</p>
      </InviteLayout>
    );
  }

  // Already accepted
  if (invite.acceptedAt) {
    return (
      <InviteLayout>
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">Already Accepted</h1>
        <p className="mt-2 text-slate-400">This invite has already been used.</p>
        <a href="/" className="mt-4 inline-block text-emerald-400 hover:text-emerald-300 text-sm">
          Go to Dashboard →
        </a>
      </InviteLayout>
    );
  }

  // Expired
  if (invite.expiresAt < new Date()) {
    return (
      <InviteLayout>
        <Clock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">Invite Expired</h1>
        <p className="mt-2 text-slate-400">This invite has expired. Ask the org admin to send a new one.</p>
      </InviteLayout>
    );
  }

  // Not signed in — redirect to login, then back here
  if (!session) {
    redirect(`/login?callbackUrl=/invite/${token}`);
  }

  // Signed in — show accept form
  async function handleAccept() {
    "use server";
    await acceptInvite(token);
    redirect("/admin");
  }

  return (
    <InviteLayout>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/20">
        <Plane className="h-7 w-7 text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white">You&apos;re Invited</h1>
      <p className="mt-2 text-slate-400">
        You&apos;ve been invited to join <span className="text-white font-medium">{invite.orgName}</span> as a <span className="text-white font-medium">{invite.role}</span>.
      </p>
      <form action={handleAccept} className="mt-6">
        <Button
          type="submit"
          className="w-full h-11 bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-premium"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Accept Invite
        </Button>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        Signed in as {session.user?.email}
      </p>
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950" />
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/40 text-center">
          {children}
        </div>
      </div>
    </div>
  );
}
