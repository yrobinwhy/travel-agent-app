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
import { Plane, Hotel, Coins, Plus, Info } from "lucide-react";

export default async function PointsPage() {
  const [ffPrograms, hotelPrograms, pointBalances] = await Promise.all([
    getUserFFPrograms(),
    getUserHotelPrograms(),
    getUserPointBalances(),
  ]);

  const hasAnyData = ffPrograms.length > 0 || hotelPrograms.length > 0 || pointBalances.length > 0;

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Points &amp; Loyalty</h1>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

        {/* Contextual tip */}
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">No need to add everything now.</span>{" "}
            When you search for flights, the AI will detect relevant airlines and prompt you to save your loyalty info right in the conversation.
          </p>
        </div>

        {/* Frequent Flyer Programs */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10">
                <Plane className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Frequent Flyer Programs
            </CardTitle>
            <CardDescription>
              {ffPrograms.length === 0
                ? "None saved yet — these will be added automatically when you book flights."
                : `${ffPrograms.length} program${ffPrograms.length > 1 ? "s" : ""} saved`}
            </CardDescription>
          </CardHeader>
          {ffPrograms.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {ffPrograms.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 transition-premium hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg text-primary">{p.airlineCode}</span>
                      <div>
                        <p className="text-sm font-medium">{p.programName}</p>
                        {p.memberNumber && (
                          <p className="text-xs text-muted-foreground font-mono">{p.memberNumber}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.statusLevel && <Badge variant="secondary">{p.statusLevel}</Badge>}
                      {p.priorityPhone && (
                        <span className="text-xs text-muted-foreground hidden md:block">{p.priorityPhone}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
          <CardContent className={ffPrograms.length > 0 ? "pt-0" : ""}>
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-premium">
                <Plus className="h-3.5 w-3.5" />
                <span>Manually add a program</span>
              </summary>
              <form action={createFFProgram} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ff-airlineCode" className="text-xs">Airline Code</Label>
                  <Input id="ff-airlineCode" name="airlineCode" maxLength={2} placeholder="UA" className="uppercase h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ff-programName" className="text-xs">Program Name</Label>
                  <Input id="ff-programName" name="programName" placeholder="MileagePlus" className="h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ff-memberNumber" className="text-xs">Member Number</Label>
                  <Input id="ff-memberNumber" name="memberNumber" placeholder="Encrypted at rest" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ff-statusLevel" className="text-xs">Status Level</Label>
                  <Input id="ff-statusLevel" name="statusLevel" placeholder="1K, Gold, etc." className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ff-priorityPhone" className="text-xs">Priority Phone</Label>
                  <Input id="ff-priorityPhone" name="priorityPhone" placeholder="+1 800-xxx-xxxx" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ff-priorityEmail" className="text-xs">Priority Email</Label>
                  <Input id="ff-priorityEmail" name="priorityEmail" type="email" className="h-9" />
                </div>
                <input type="hidden" name="notes" value="" />
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" size="sm">Add Program</Button>
                </div>
              </form>
            </details>
          </CardContent>
        </Card>

        {/* Hotel Programs */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 dark:bg-violet-400/10">
                <Hotel className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Hotel Programs
            </CardTitle>
            <CardDescription>
              {hotelPrograms.length === 0
                ? "None saved yet — the AI will prompt you when booking hotels."
                : `${hotelPrograms.length} program${hotelPrograms.length > 1 ? "s" : ""} saved`}
            </CardDescription>
          </CardHeader>
          {hotelPrograms.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {hotelPrograms.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 transition-premium hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <Hotel className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{p.programName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{p.hotelChain}</p>
                          {p.memberNumber && (
                            <p className="text-xs text-muted-foreground font-mono">· {p.memberNumber}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.statusLevel && <Badge variant="secondary">{p.statusLevel}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
          <CardContent className={hotelPrograms.length > 0 ? "pt-0" : ""}>
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-premium">
                <Plus className="h-3.5 w-3.5" />
                <span>Manually add a program</span>
              </summary>
              <form action={createHotelProgram} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hp-hotelChain" className="text-xs">Hotel Chain</Label>
                  <Input id="hp-hotelChain" name="hotelChain" placeholder="Hyatt" className="h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hp-programName" className="text-xs">Program Name</Label>
                  <Input id="hp-programName" name="programName" placeholder="World of Hyatt" className="h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hp-memberNumber" className="text-xs">Member Number</Label>
                  <Input id="hp-memberNumber" name="memberNumber" placeholder="Encrypted at rest" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hp-statusLevel" className="text-xs">Status Level</Label>
                  <Input id="hp-statusLevel" name="statusLevel" placeholder="Globalist, Platinum" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hp-priorityPhone" className="text-xs">Priority Phone</Label>
                  <Input id="hp-priorityPhone" name="priorityPhone" className="h-9" />
                </div>
                <input type="hidden" name="notes" value="" />
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" size="sm">Add Program</Button>
                </div>
              </form>
            </details>
          </CardContent>
        </Card>

        {/* Point Balances */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/10">
                <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Point Balances
            </CardTitle>
            <CardDescription>
              {pointBalances.length === 0
                ? "Track your points across all programs. Balances help the AI calculate the best redemption options."
                : `Tracking ${pointBalances.length} balance${pointBalances.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          {pointBalances.length > 0 && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pointBalances.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{b.programName || b.program}</span>
                    <span className="font-mono font-semibold text-primary">
                      {Number(b.balance).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
          <CardContent className={pointBalances.length > 0 ? "pt-0" : ""}>
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-premium">
                <Plus className="h-3.5 w-3.5" />
                <span>Add or update a balance</span>
              </summary>
              <form action={upsertPointBalance} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pb-program" className="text-xs">Program Key</Label>
                  <Input id="pb-program" name="program" placeholder="chase_ur" className="h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pb-programName" className="text-xs">Display Name</Label>
                  <Input id="pb-programName" name="programName" placeholder="Chase Ultimate Rewards" className="h-9" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pb-balance" className="text-xs">Balance</Label>
                  <Input id="pb-balance" name="balance" type="number" placeholder="0" className="h-9" required />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button type="submit" size="sm">Save Balance</Button>
                </div>
              </form>
            </details>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
