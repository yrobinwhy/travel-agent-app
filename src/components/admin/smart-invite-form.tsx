"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { UserPlus, CheckCircle2, UserSearch } from "lucide-react";

interface SmartInviteFormProps {
  orgId: string;
  action: (formData: FormData) => Promise<void>;
}

export function SmartInviteForm({ orgId, action }: SmartInviteFormProps) {
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<{
    found: boolean;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const lookupEmail = useCallback(async (emailValue: string) => {
    if (emailValue.length < 5 || !emailValue.includes("@")) {
      setLookup(null);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(emailValue)}`);
      const data = await res.json();
      setLookup(data);
    } catch {
      setLookup(null);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    setLookup(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookupEmail(val), 500);
  };

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="orgId" value={orgId} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`email-${orgId}`} className="text-xs">Email Address</Label>
          <div className="relative">
            <Input
              id={`email-${orgId}`}
              name="email"
              type="email"
              required
              placeholder="member@example.com"
              className="h-9 pr-8"
              value={email}
              onChange={handleEmailChange}
            />
            {searching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <UserSearch className="h-4 w-4 text-muted-foreground animate-pulse" />
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`role-${orgId}`} className="text-xs">Role</Label>
          <select
            id={`role-${orgId}`}
            name="role"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <SubmitButton size="sm">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          {lookup?.found ? "Add Member" : "Invite"}
        </SubmitButton>
      </div>

      {/* User lookup result */}
      {lookup?.found && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          {lookup.image ? (
            <img src={lookup.image} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-medium text-emerald-600">
              {lookup.name?.[0] || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{lookup.name}</p>
            <p className="text-xs text-muted-foreground">{lookup.email}</p>
          </div>
          <span className="ml-auto text-xs text-emerald-600">Will be added instantly</span>
        </div>
      )}

      {lookup && !lookup.found && email.includes("@") && (
        <p className="text-xs text-muted-foreground">
          No account found — an invite link will be generated for {email}
        </p>
      )}
    </form>
  );
}
