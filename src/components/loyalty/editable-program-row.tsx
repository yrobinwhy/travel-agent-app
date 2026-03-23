"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Hotel, Trash2, Pencil, Check, X } from "lucide-react";

interface EditableProgramRowProps {
  id: string;
  type: "ff" | "hotel";
  // Display
  code?: string; // Airline code for FF
  programName: string;
  memberNumber?: string | null;
  statusLevel?: string | null;
  priorityPhone?: string | null;
  hotelChain?: string;
  // Balance
  balance?: number | null;
  balanceLabel?: string; // "miles" or "pts"
  // Actions
  deleteAction: (formData: FormData) => Promise<void>;
  updateBalanceAction: (formData: FormData) => Promise<void>;
  balanceProgram?: string; // Key for upsertPointBalance
}

export function EditableProgramRow({
  id,
  type,
  code,
  programName,
  memberNumber,
  statusLevel,
  priorityPhone,
  hotelChain,
  balance,
  balanceLabel = "pts",
  deleteAction,
  updateBalanceAction,
  balanceProgram,
}: EditableProgramRowProps) {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editValue, setEditValue] = useState(balance?.toString() || "");

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 transition-premium hover:bg-accent/50">
      <div className="flex items-center gap-3">
        {type === "ff" ? (
          <span className="font-mono font-bold text-lg text-primary">{code}</span>
        ) : (
          <Hotel className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">{programName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {type === "hotel" && hotelChain && <span>{hotelChain}</span>}
            {memberNumber && (
              <span className="font-mono">{type === "hotel" ? `· ${memberNumber}` : memberNumber}</span>
            )}
            {priorityPhone && (
              <span className="hidden md:inline">· {priorityPhone}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Balance — inline editable */}
        {isEditingBalance ? (
          <form
            action={async (formData: FormData) => {
              await updateBalanceAction(formData);
              setIsEditingBalance(false);
            }}
            className="flex items-center gap-1"
          >
            <input type="hidden" name="program" value={balanceProgram || code?.toLowerCase() || hotelChain?.toLowerCase() || ""} />
            <input type="hidden" name="programName" value={programName} />
            <Input
              name="balance"
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 w-24 text-xs font-mono text-right"
              autoFocus
            />
            <button type="submit" className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setIsEditingBalance(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditValue(balance?.toString() || "0");
              setIsEditingBalance(true);
            }}
            className="flex items-center gap-1 group/bal"
            title="Click to edit balance"
          >
            {balance !== null && balance !== undefined ? (
              <span className="font-mono font-semibold text-sm text-emerald-500">
                {balance.toLocaleString()}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">{balanceLabel}</span>
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover/bal:opacity-100 transition-opacity">
                + balance
              </span>
            )}
            <Pencil className="h-2.5 w-2.5 text-muted-foreground/30 group-hover/bal:text-muted-foreground transition-colors" />
          </button>
        )}

        {statusLevel && <Badge variant="secondary">{statusLevel}</Badge>}

        <form action={deleteAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Delete program">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
