import { getUserCreditCards, createCreditCard } from "@/lib/db/queries/loyalty";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Plus, Globe, Shield, Info } from "lucide-react";
import { revalidatePath } from "next/cache";

const issuerGradients: Record<string, string> = {
  chase: "from-blue-500 to-blue-700",
  amex: "from-emerald-500 to-emerald-700",
  capital_one: "from-red-500 to-red-700",
  citi: "from-sky-400 to-sky-600",
  other: "from-gray-400 to-gray-600",
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default async function CardsPage() {
  const cards = await getUserCreditCards();

  async function addCard(formData: FormData) {
    "use server";
    await createCreditCard(formData);
    revalidatePath("/cards");
  }

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Credit Cards</h1>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

        {/* Contextual tips */}
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Cards are added as you book.</span>{" "}
            When completing a booking, the AI will ask which card to use and save it for next time. You can also add cards manually below.
          </p>
        </div>

        {/* Security notice */}
        <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>Only last 4 digits stored. Full card numbers are never saved or transmitted.</span>
        </div>

        {/* Existing cards */}
        {cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-fade-in">
            {cards.map((card) => {
              const gradient = issuerGradients[card.issuer] || issuerGradients.other;
              return (
                <Card key={card.id} className="overflow-hidden card-hover">
                  {/* Gradient stripe */}
                  <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        {card.nickname}
                      </span>
                      {card.isOrgCard && (
                        <Badge variant="secondary" className="text-xs">Org</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="font-mono text-sm">
                      {card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)}{" "}
                      &bull;&bull;&bull;&bull; {card.lastFour}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-1.5 text-sm">
                    <Badge variant="outline" className="text-xs">
                      {card.issuer.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                    {card.portal && card.portal !== "none" && (
                      <Badge variant="outline" className="text-xs">
                        {card.portal.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} Portal
                      </Badge>
                    )}
                    {card.noForeignTxFee && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Globe className="h-3 w-3" />
                        No FTF
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <CreditCard className="h-7 w-7 opacity-40" />
            </div>
            <p className="font-medium">No cards yet</p>
            <p className="text-sm mt-1">Cards will be saved automatically during your first booking.</p>
          </div>
        )}

        {/* Add Credit Card — collapsed by default */}
        <Card>
          <CardContent className="pt-6">
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-premium">
                <Plus className="h-3.5 w-3.5" />
                <span>Manually add a card</span>
              </summary>
              <form action={addCard} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nickname" className="text-xs">Card Nickname</Label>
                  <Input id="nickname" name="nickname" required placeholder="Chase Sapphire Reserve" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cardType" className="text-xs">Card Type</Label>
                  <select id="cardType" name="cardType" required className={selectClass}>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">Amex</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastFour" className="text-xs">Last 4 Digits</Label>
                  <Input id="lastFour" name="lastFour" required maxLength={4} pattern="[0-9]{4}" placeholder="4532" inputMode="numeric" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="issuer" className="text-xs">Issuer</Label>
                  <select id="issuer" name="issuer" required className={selectClass}>
                    <option value="chase">Chase</option>
                    <option value="amex">Amex</option>
                    <option value="capital_one">Capital One</option>
                    <option value="citi">Citi</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal" className="text-xs">Booking Portal</Label>
                  <select id="portal" name="portal" className={selectClass}>
                    <option value="none">None</option>
                    <option value="chase">Chase Travel</option>
                    <option value="amex">Amex Travel</option>
                    <option value="capital_one">Capital One Travel</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="noForeignTxFee" value="true" className="h-3.5 w-3.5 rounded border-input" />
                    No Foreign Transaction Fee
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="isOrgCard" value="true" className="h-3.5 w-3.5 rounded border-input" />
                    Organization / Business Card
                  </label>
                </div>
                <div className="col-span-full flex justify-end">
                  <Button type="submit" size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Card
                  </Button>
                </div>
              </form>
            </details>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
