"use client";

import { useTransition } from "react";

export function RoleSelect({
  orgId,
  memberUserId,
  currentRole,
  action,
}: {
  orgId: string;
  memberUserId: string;
  currentRole: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("memberUserId", memberUserId);
    formData.set("role", e.target.value);
    startTransition(() => action(formData));
  }

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={isPending}
      className={`h-8 rounded-md border border-input bg-background px-2 text-xs ${isPending ? "opacity-50" : ""}`}
    >
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}
