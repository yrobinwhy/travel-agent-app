import { getUserOrgs, getOrgMembers, getOrgInvites, createOrg, createInvite, deleteInvite } from "@/lib/db/queries/organizations";
import { users } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, UserPlus, Crown, Link, Clock, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { headers } from "next/headers";

export default async function AdminPage() {
  const orgs = await getUserOrgs();
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  // Fetch members and invites for each org (batched to avoid N+1)
  const orgsWithDetails = await Promise.all(
    orgs.map(async (org) => {
      const [members, invites] = await Promise.all([
        getOrgMembers(org.orgId),
        getOrgInvites(org.orgId),
      ]);

      // Batch user lookup — single query instead of N queries
      const userIds = members.map((m) => m.userId).filter(Boolean);
      const userDetails = userIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name, email: users.email, image: users.image })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userDetails.map((u) => [u.id, u]));

      const membersWithInfo = members.map((m) => {
        const user = userMap.get(m.userId);
        return { ...m, name: user?.name, email: user?.email };
      });

      return { ...org, members: membersWithInfo, invites };
    })
  );

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Organization</h1>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

        {/* Create org — always visible if user wants to add another */}
        {orgs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Create Organization
              </CardTitle>
              <CardDescription>
                Set up a family or business organization to share trips and manage travel together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createOrg} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input id="name" name="name" required placeholder="e.g., Yan Family or Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select id="type" name="type" required className={selectClass}>
                    <option value="family">Family</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="col-span-full flex justify-end">
                  <SubmitButton>Create Organization</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            {orgsWithDetails.map((org) => (
              <Card key={org.orgId} className="card-hover">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10">
                        <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      {org.orgName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {org.orgType === "family" ? "Family" : "Business"}
                      </Badge>
                      <Badge variant={org.role === "owner" ? "default" : "outline"}>
                        {org.role === "owner" && <Crown className="mr-1 h-3 w-3" />}
                        {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Members */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Members ({org.members.length})
                    </h3>
                    <div className="space-y-2">
                      {org.members.map((m) => (
                        <div key={m.membershipId} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              {m.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{m.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {m.role === "owner" && <Crown className="mr-1 h-3 w-3" />}
                            {m.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Invites */}
                  {org.invites.filter((i) => !i.acceptedAt && i.expiresAt > new Date()).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Pending Invites
                      </h3>
                      <div className="space-y-2">
                        {org.invites
                          .filter((i) => !i.acceptedAt && i.expiresAt > new Date())
                          .map((invite) => (
                            <div key={invite.id} className="rounded-lg border border-dashed p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{invite.email}</span>
                                  <Badge variant="outline" className="text-xs">{invite.role}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    Expires {invite.expiresAt.toLocaleDateString()}
                                  </span>
                                  <form action={deleteInvite}>
                                    <input type="hidden" name="inviteId" value={invite.id} />
                                    <input type="hidden" name="orgId" value={org.orgId} />
                                    <button type="submit" className="text-muted-foreground hover:text-destructive transition-premium p-1 rounded" title="Delete invite">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link className="h-3 w-3 text-muted-foreground shrink-0" />
                                <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono truncate select-all">
                                  {baseUrl}/invite/{invite.token}
                                </code>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5">
                                Copy and share this link with {invite.email}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Accepted Invites */}
                  {org.invites.filter((i) => i.acceptedAt).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" /> Accepted Invites
                      </h3>
                      <div className="space-y-1">
                        {org.invites
                          .filter((i) => i.acceptedAt)
                          .map((invite) => (
                            <div key={invite.id} className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span>{invite.email}</span>
                              <span>— accepted {invite.acceptedAt?.toLocaleDateString()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Invite form */}
                  {["owner", "admin"].includes(org.role) && (
                    <div className="border-t pt-4">
                      <details className="group">
                        <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-premium">
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Add a member</span>
                        </summary>
                        <form action={createInvite} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                          <input type="hidden" name="orgId" value={org.orgId} />
                          <div className="space-y-1.5">
                            <Label htmlFor={`email-${org.orgId}`} className="text-xs">Email Address</Label>
                            <Input
                              id={`email-${org.orgId}`}
                              name="email"
                              type="email"
                              required
                              placeholder="member@example.com"
                              className="h-9"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              If they already have an account, they&apos;ll be added instantly. Otherwise, an invite link will be generated.
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`role-${org.orgId}`} className="text-xs">Role</Label>
                            <select id={`role-${org.orgId}`} name="role" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                          <SubmitButton size="sm">
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Member
                          </SubmitButton>
                        </form>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add another org */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-premium">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create another organization</span>
                  </summary>
                  <form action={createOrg} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-name" className="text-xs">Name</Label>
                      <Input id="new-name" name="name" required placeholder="e.g., Acme Corp" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-type" className="text-xs">Type</Label>
                      <select id="new-type" name="type" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                        <option value="family">Family</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <SubmitButton size="sm">Create</SubmitButton>
                    </div>
                  </form>
                </details>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
