import { getUserOrgs, createOrg, createInvite } from "@/lib/db/queries/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, UserPlus, Crown } from "lucide-react";

export default async function AdminPage() {
  const orgs = await getUserOrgs();

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Organization</h1>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-8">

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
                  <select
                    id="type"
                    name="type"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="family">Family</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="col-span-full flex justify-end">
                  <Button type="submit">Create Organization</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          orgs.map((org) => (
            <Card key={org.orgId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {org.orgName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {org.orgType === "family" ? (
                        <><Users className="mr-1 h-3 w-3" /> Family</>
                      ) : (
                        <><Building2 className="mr-1 h-3 w-3" /> Business</>
                      )}
                    </Badge>
                    <Badge variant={org.role === "owner" ? "default" : "outline"}>
                      {org.role === "owner" && <Crown className="mr-1 h-3 w-3" />}
                      {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Manage members and invitations for this organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Invite Member
                  </h3>
                  <form action={createInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <input type="hidden" name="orgId" value={org.orgId} />
                    <div className="space-y-2">
                      <Label htmlFor={`email-${org.orgId}`}>Email Address</Label>
                      <Input
                        id={`email-${org.orgId}`}
                        name="email"
                        type="email"
                        required
                        placeholder="member@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`role-${org.orgId}`}>Role</Label>
                      <select
                        id={`role-${org.orgId}`}
                        name="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <Button type="submit">
                      <UserPlus className="mr-2 h-4 w-4" /> Send Invite
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
