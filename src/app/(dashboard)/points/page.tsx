import {
  getUserFFPrograms,
  getUserHotelPrograms,
  getUserPointBalances,
  createFFProgram,
  createHotelProgram,
  upsertPointBalance,
} from "@/lib/db/queries/loyalty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Plane, Hotel, Coins } from "lucide-react";

export default async function PointsPage() {
  const [ffPrograms, hotelPrograms, pointBalances] = await Promise.all([
    getUserFFPrograms(),
    getUserHotelPrograms(),
    getUserPointBalances(),
  ]);

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Points &amp; Loyalty</h1>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-8">

        {/* Frequent Flyer Programs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" /> Frequent Flyer Programs
            </CardTitle>
            <CardDescription>
              Your airline loyalty programs and status levels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {ffPrograms.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Airline</th>
                      <th className="pb-2 pr-4">Program</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Member #</th>
                      <th className="pb-2">Priority Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ffPrograms.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-mono font-semibold">{p.airlineCode}</td>
                        <td className="py-3 pr-4">{p.programName}</td>
                        <td className="py-3 pr-4">
                          {p.statusLevel ? (
                            <Badge variant="secondary">{p.statusLevel}</Badge>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono">{p.memberNumber || "--"}</td>
                        <td className="py-3">{p.priorityPhone || "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-4">Add Frequent Flyer Program</h3>
              <form action={createFFProgram} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ff-airlineCode">Airline Code</Label>
                  <Input id="ff-airlineCode" name="airlineCode" maxLength={2} placeholder="UA" className="uppercase" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ff-programName">Program Name</Label>
                  <Input id="ff-programName" name="programName" placeholder="MileagePlus" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ff-memberNumber">Member Number</Label>
                  <Input id="ff-memberNumber" name="memberNumber" placeholder="Encrypted at rest" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ff-statusLevel">Status Level</Label>
                  <Input id="ff-statusLevel" name="statusLevel" placeholder="1K, Gold, etc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ff-priorityPhone">Priority Phone</Label>
                  <Input id="ff-priorityPhone" name="priorityPhone" placeholder="+1 800-xxx-xxxx" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ff-priorityEmail">Priority Email</Label>
                  <Input id="ff-priorityEmail" name="priorityEmail" type="email" placeholder="elite@airline.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ff-notes">Notes</Label>
                  <Input id="ff-notes" name="notes" placeholder="Any additional notes" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit">Add Program</Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Programs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" /> Hotel Programs
            </CardTitle>
            <CardDescription>
              Your hotel loyalty programs and status levels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hotelPrograms.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Chain</th>
                      <th className="pb-2 pr-4">Program</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Member #</th>
                      <th className="pb-2">Priority Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotelPrograms.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-semibold">{p.hotelChain}</td>
                        <td className="py-3 pr-4">{p.programName}</td>
                        <td className="py-3 pr-4">
                          {p.statusLevel ? (
                            <Badge variant="secondary">{p.statusLevel}</Badge>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono">{p.memberNumber || "--"}</td>
                        <td className="py-3">{p.priorityPhone || "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-4">Add Hotel Program</h3>
              <form action={createHotelProgram} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hp-hotelChain">Hotel Chain</Label>
                  <Input id="hp-hotelChain" name="hotelChain" placeholder="Hyatt" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hp-programName">Program Name</Label>
                  <Input id="hp-programName" name="programName" placeholder="World of Hyatt" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hp-memberNumber">Member Number</Label>
                  <Input id="hp-memberNumber" name="memberNumber" placeholder="Encrypted at rest" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hp-statusLevel">Status Level</Label>
                  <Input id="hp-statusLevel" name="statusLevel" placeholder="Globalist, Platinum, etc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hp-priorityPhone">Priority Phone</Label>
                  <Input id="hp-priorityPhone" name="priorityPhone" placeholder="+1 800-xxx-xxxx" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hp-notes">Notes</Label>
                  <Input id="hp-notes" name="notes" placeholder="Any additional notes" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit">Add Program</Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Point Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" /> Point Balances
            </CardTitle>
            <CardDescription>
              Track your points and miles across all programs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {pointBalances.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Program</th>
                      <th className="pb-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointBalances.map((b) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">{b.programName || b.program}</td>
                        <td className="py-3 text-right font-mono font-semibold">
                          {Number(b.balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-4">Add / Update Balance</h3>
              <form action={upsertPointBalance} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pb-program">Program Key</Label>
                  <Input id="pb-program" name="program" placeholder="ua_mileageplus" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pb-programName">Program Name</Label>
                  <Input id="pb-programName" name="programName" placeholder="United MileagePlus" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pb-balance">Balance</Label>
                  <Input id="pb-balance" name="balance" type="number" placeholder="0" required />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button type="submit">Save Balance</Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
