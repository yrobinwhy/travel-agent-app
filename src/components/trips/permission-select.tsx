"use client";

import { useTransition } from "react";

export function PermissionSelect({
  tripId,
  memberId,
  currentPermission,
  action,
}: {
  tripId: string;
  memberId: string;
  currentPermission: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set("tripId", tripId);
    formData.set("memberId", memberId);
    formData.set("permission", e.target.value);
    startTransition(() => action(formData));
  }

  return (
    <select
      value={currentPermission}
      onChange={handleChange}
      disabled={isPending}
      className={`h-8 rounded-md border border-input bg-background px-2 text-xs ${isPending ? "opacity-50" : ""}`}
    >
      <option value="view">Can view</option>
      <option value="collaborate">Can edit</option>
    </select>
  );
}
