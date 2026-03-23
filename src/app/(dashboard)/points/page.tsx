import {
  getUserFFPrograms,
  getUserHotelPrograms,
  getUserPointBalances,
  createFFProgram,
  createHotelProgram,
  deleteFFProgram,
  deleteHotelProgram,
  upsertPointBalance,
} from "@/lib/db/queries/loyalty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Plane, Hotel, Plus, Info, Coins } from "lucide-react";
import { EditableProgramRow } from "@/components/loyalty/editable-program-row";

async function deleteFF(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await deleteFFProgram(id);
}

async function deleteHotel(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await deleteHotelProgram(id);
}

async function updateBalance(formData: FormData) {
  "use server";
  await upsertPointBalance(formData);
}

export default async function PointsPage() {
  const [ffPrograms, hotelPrograms, pointBalances] = await Promise.all([
    getUserFFPrograms(),
    getUserHotelPrograms(),
    getUserPointBalances(),
  ]);

  // Create lookup maps for balances — match by program key or partial name
  const balanceMap = new Map<string, { balance: number; programName: string }>();
  for (const b of pointBalances) {
    balanceMap.set(b.program.toLowerCase(), { balance: Number(b.balance), programName: b.programName || b.program });
    // Also index by program name for fuzzy matching
    if (b.programName) {
      balanceMap.set(b.programName.toLowerCase(), { balance: Number(b.balance), programName: b.programName });
    }
  }

  // Match FF program to point balance
  function getFFBalance(airlineCode: string, programName: string) {
    // Try various key formats
    const keys = [
      airlineCode.toLowerCase(),
      programName.toLowerCase(),
      `${airlineCode.toLowerCase()}_miles`,
      programName.toLowerCase().replace(/\s+/g, "_"),
    ];
    for (const key of keys) {
      const match = balanceMap.get(key);
      if (match) return match.balance;
    }
    // Fuzzy: check if any balance program name contains the airline code or program name
    for (const [key, val] of balanceMap) {
      if (key.includes(airlineCode.toLowerCase()) || key.includes(programName.toLowerCase().split(" ")[0])) {
        return val.balance;
      }
    }
    return null;
  }

  // Match hotel program to point balance
  function getHotelBalance(hotelChain: string, programName: string) {
    const keys = [
      hotelChain.toLowerCase(),
      programName.toLowerCase(),
      hotelChain.toLowerCase().replace(/\s+/g, "_"),
      programName.toLowerCase().replace(/\s+/g, "_"),
    ];
    for (const key of keys) {
      const match = balanceMap.get(key);
      if (match) return match.balance;
    }
    for (const [key, val] of balanceMap) {
      if (key.includes(hotelChain.toLowerCase()) || key.includes(programName.toLowerCase().split(" ")[0])) {
        return val.balance;
      }
    }
    return null;
  }

  // Find "orphan" balances not matched to any program (e.g. credit card points)
  const matchedBalanceKeys = new Set<string>();
  for (const p of ffPrograms) {
    const balance = getFFBalance(p.airlineCode, p.programName);
    if (balance !== null) {
      // Mark all matching keys as used
      for (const [key] of balanceMap) {
        if (key.includes(p.airlineCode.toLowerCase()) || key.includes(p.programName.toLowerCase().split(" ")[0])) {
          matchedBalanceKeys.add(key);
        }
      }
    }
  }
  for (const p of hotelPrograms) {
    const balance = getHotelBalance(p.hotelChain, p.programName);
    if (balance !== null) {
      for (const [key] of balanceMap) {
        if (key.includes(p.hotelChain.toLowerCase()) || key.includes(p.programName.toLowerCase().split(" ")[0])) {
          matchedBalanceKeys.add(key);
        }
      }
    }
  }

  const orphanBalances = pointBalances.filter(
    (b) => !matchedBalanceKeys.has(b.program.toLowerCase()) && !(b.programName && matchedBalanceKeys.has(b.programName.toLowerCase()))
  );

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
            <span className="font-medium text-foreground">Tip:</span>{" "}
            Tell the AI your loyalty numbers and balances in chat — they&apos;ll be saved here automatically. E.g. &quot;I have 150K Chase UR points&quot;
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
                ? "None saved yet — mention your FF numbers in chat to save them automatically."
                : `${ffPrograms.length} program${ffPrograms.length > 1 ? "s" : ""} saved`}
            </CardDescription>
          </CardHeader>
          {ffPrograms.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {ffPrograms.map((p) => {
                  const balance = getFFBalance(p.airlineCode, p.programName);
                  return (
                    <EditableProgramRow
                      key={p.id}
                      id={p.id}
                      type="ff"
                      code={p.airlineCode}
                      programName={p.programName}
                      memberNumber={p.memberNumber}
                      statusLevel={p.statusLevel}
                      priorityPhone={p.priorityPhone}
                      balance={balance}
                      balanceLabel="miles"
                      balanceProgram={p.airlineCode.toLowerCase()}
                      deleteAction={deleteFF}
                      updateBalanceAction={updateBalance}
                    />
                  );
                })}
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
                {hotelPrograms.map((p) => {
                  const balance = getHotelBalance(p.hotelChain, p.programName);
                  return (
                    <EditableProgramRow
                      key={p.id}
                      id={p.id}
                      type="hotel"
                      programName={p.programName}
                      hotelChain={p.hotelChain}
                      memberNumber={p.memberNumber}
                      statusLevel={p.statusLevel}
                      balance={balance}
                      balanceLabel="pts"
                      balanceProgram={p.hotelChain.toLowerCase()}
                      deleteAction={deleteHotel}
                      updateBalanceAction={updateBalance}
                    />
                  );
                })}
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

        {/* Credit Card & Other Points (orphan balances not matched to airline/hotel) */}
        {orphanBalances.length > 0 && (
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/10">
                  <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Credit Card &amp; Other Points
              </CardTitle>
              <CardDescription>
                Points from credit card programs and other sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orphanBalances.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{b.programName || b.program}</p>
                      {b.lastUpdated && (
                        <p className="text-[10px] text-muted-foreground">
                          Updated {new Date(b.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-lg text-emerald-500">
                      {Number(b.balance).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </>
  );
}
