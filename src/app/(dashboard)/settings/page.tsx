import { getUserProfile, getUserPreferences, upsertUserProfile, upsertUserPreferences } from "@/lib/db/queries/profiles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { User, Plane, Shield } from "lucide-react";

export default async function SettingsPage() {
  const profile = await getUserProfile();
  const prefs = await getUserPreferences();

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-8">

        {/* Profile & Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile &amp; Contact</CardTitle>
            <CardDescription>Your personal information and emergency contacts.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertUserProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" defaultValue={profile?.phone || ""} placeholder="+1 555-123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input id="nationality" name="nationality" defaultValue={profile?.nationality || ""} placeholder="US" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeOfBirth">Place of Birth</Label>
                <Input id="placeOfBirth" name="placeOfBirth" defaultValue={profile?.placeOfBirth || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={profile?.dateOfBirth || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input id="emergencyContactName" name="emergencyContactName" defaultValue={profile?.emergencyContactName || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={profile?.emergencyContactPhone || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seatPref">Seat Preference</Label>
                <select id="seatPref" name="seatPref" defaultValue={profile?.seatPref || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="">No preference</option>
                  <option value="window">Window</option>
                  <option value="aisle">Aisle</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mealPref">Meal Preference</Label>
                <Input id="mealPref" name="mealPref" defaultValue={profile?.mealPref || ""} placeholder="e.g., Vegetarian, Kosher" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cabinClassPref">Cabin Class Preference</Label>
                <select id="cabinClassPref" name="cabinClassPref" defaultValue={profile?.cabinClassPref || "business"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerName">Employer</Label>
                <Input id="employerName" name="employerName" defaultValue={profile?.employerName || ""} />
              </div>
              <div className="col-span-full flex justify-end">
                <SubmitButton>Save Profile</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Travel Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Travel Documents</CardTitle>
            <CardDescription>Passport and trusted traveler info. All sensitive data is AES-256-GCM encrypted at rest.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertUserProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preserve existing non-document fields */}
              <input type="hidden" name="phone" value={profile?.phone || ""} />
              <input type="hidden" name="nationality" value={profile?.nationality || ""} />
              <input type="hidden" name="seatPref" value={profile?.seatPref || ""} />
              <input type="hidden" name="mealPref" value={profile?.mealPref || ""} />
              <input type="hidden" name="cabinClassPref" value={profile?.cabinClassPref || ""} />

              <div className="space-y-2">
                <Label htmlFor="passportNumber">Passport Number</Label>
                <Input id="passportNumber" name="passportNumber" defaultValue={profile?.passportNumber || ""} placeholder="Encrypted at rest" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportCountry">Passport Country</Label>
                <Input id="passportCountry" name="passportCountry" defaultValue={profile?.passportCountry || ""} placeholder="US" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportExpiry">Passport Expiry</Label>
                <Input id="passportExpiry" name="passportExpiry" type="date" defaultValue={profile?.passportExpiry || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tsaPrecheckNumber">TSA PreCheck</Label>
                <Input id="tsaPrecheckNumber" name="tsaPrecheckNumber" defaultValue={profile?.tsaPrecheckNumber || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="globalEntryNumber">Global Entry</Label>
                <Input id="globalEntryNumber" name="globalEntryNumber" defaultValue={profile?.globalEntryNumber || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knownTravelerId">Known Traveler ID</Label>
                <Input id="knownTravelerId" name="knownTravelerId" defaultValue={profile?.knownTravelerId || ""} />
              </div>
              <div className="col-span-full flex justify-end">
                <SubmitButton>Save Documents</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Travel Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5" /> Travel Preferences</CardTitle>
            <CardDescription>Default settings used by the AI when searching flights and hotels.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertUserPreferences} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeAirport">Home Airport (IATA)</Label>
                <Input id="homeAirport" name="homeAirport" defaultValue={prefs?.homeAirport || ""} placeholder="SFO" maxLength={3} className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCabinClass">Default Cabin Class</Label>
                <select id="defaultCabinClass" name="defaultCabinClass" defaultValue={prefs?.defaultCabinClass || "business"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultOptimizationMode">Default Search Mode</Label>
                <select id="defaultOptimizationMode" name="defaultOptimizationMode" defaultValue={prefs?.defaultOptimizationMode || "best_value"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="best_value">Best Value</option>
                  <option value="best_schedule">Best Schedule</option>
                  <option value="fewest_stops">Fewest Stops</option>
                  <option value="best_points">Best Points Deal</option>
                  <option value="most_flexible">Most Flexible</option>
                  <option value="cheapest_market">Cheapest Market</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredAirlines">Preferred Airlines</Label>
                <Input id="preferredAirlines" name="preferredAirlines" defaultValue={(prefs?.preferredAirlines as string[] || []).join(", ")} placeholder="UA, NH, SQ" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredHotels">Preferred Hotels</Label>
                <Input id="preferredHotels" name="preferredHotels" defaultValue={(prefs?.preferredHotels as string[] || []).join(", ")} placeholder="hyatt, marriott" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredAirports">Preferred Airports</Label>
                <Input id="preferredAirports" name="preferredAirports" defaultValue={(prefs?.preferredAirports as string[] || []).join(", ")} placeholder="SFO, OAK" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
                <Input id="dietaryRestrictions" name="dietaryRestrictions" defaultValue={prefs?.dietaryRestrictions || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessibilityNeeds">Accessibility Needs</Label>
                <Input id="accessibilityNeeds" name="accessibilityNeeds" defaultValue={prefs?.accessibilityNeeds || ""} />
              </div>
              <div className="col-span-full flex justify-end">
                <SubmitButton>Save Preferences</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
