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
import { CreditCard, Plus, Globe } from "lucide-react";
import { revalidatePath } from "next/cache";

const issuerColors: Record<string, string> = {
  chase: "border-t-blue-500",
  amex: "border-t-green-500",
  capital_one: "border-t-red-500",
  citi: "border-t-sky-400",
  other: "border-t-gray-400",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

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

      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Security notice */}
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <Globe className="h-4 w-4 shrink-0" />
          <span>
            No full card numbers stored &mdash; only last 4 digits.
          </span>
        </div>

        {/* Existing cards */}
        {cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => {
              const color =
                issuerColors[card.issuer] || issuerColors.other;
              return (
                <Card
                  key={card.id}
                  className={`border-t-4 ${color}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {card.nickname}
                      </span>
                      {card.isOrgCard && (
                        <Badge variant="secondary">Org</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="font-mono text-sm">
                      {card.cardType.charAt(0).toUpperCase() +
                        card.cardType.slice(1)}{" "}
                      &bull;&bull;&bull;&bull; {card.lastFour}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">
                      {card.issuer.replace("_", " ").replace(/\b\w/g, (c) =>
                        c.toUpperCase()
                      )}
                    </Badge>
                    {card.portal && card.portal !== "none" && (
                      <Badge variant="outline">
                        Portal:{" "}
                        {card.portal.replace("_", " ").replace(/\b\w/g, (c) =>
                          c.toUpperCase()
                        )}
                      </Badge>
                    )}
                    {card.noForeignTxFee && (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="h-3 w-3" />
                        No Foreign TX Fee
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p>No credit cards added yet.</p>
          </div>
        )}

        {/* Add Credit Card form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add Credit Card
            </CardTitle>
            <CardDescription>
              Add a card to track portal earn rates and foreign transaction
              benefits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addCard} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Card Nickname</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  required
                  placeholder="e.g., Chase Sapphire Reserve"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardType">Card Type</Label>
                <select
                  id="cardType"
                  name="cardType"
                  required
                  className={selectClass}
                >
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">Amex</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastFour">Last 4 Digits</Label>
                <Input
                  id="lastFour"
                  name="lastFour"
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="4532"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issuer">Issuer</Label>
                <select
                  id="issuer"
                  name="issuer"
                  required
                  className={selectClass}
                >
                  <option value="chase">Chase</option>
                  <option value="amex">Amex</option>
                  <option value="capital_one">Capital One</option>
                  <option value="citi">Citi</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal">Booking Portal</Label>
                <select
                  id="portal"
                  name="portal"
                  className={selectClass}
                >
                  <option value="none">None</option>
                  <option value="chase">Chase Travel</option>
                  <option value="amex">Amex Travel</option>
                  <option value="capital_one">Capital One Travel</option>
                </select>
              </div>
              <div className="flex flex-col justify-end gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="noForeignTxFee"
                    value="true"
                    className="h-4 w-4 rounded border-input"
                  />
                  No Foreign Transaction Fee
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isOrgCard"
                    value="true"
                    className="h-4 w-4 rounded border-input"
                  />
                  Organization / Business Card
                </label>
              </div>
              <div className="col-span-full flex justify-end">
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Card
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
