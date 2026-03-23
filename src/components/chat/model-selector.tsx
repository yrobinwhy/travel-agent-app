"use client";

import { ChevronDown, Sparkles, Zap, Globe, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

const MODEL_CHOICES = [
  {
    id: "claude-sonnet",
    label: "Smart",
    version: "Sonnet 4.6",
    icon: Sparkles,
    recommended: true,
    hasTools: true,
  },
  {
    id: "gemini-flash",
    label: "Fast",
    version: "Gemini 3",
    icon: Zap,
    recommended: false,
    hasTools: false,
  },
  {
    id: "gemini-pro",
    label: "Search",
    version: "Gemini 3.1 Pro",
    icon: Globe,
    recommended: false,
    hasTools: false,
  },
];

export function ModelSelector({
  selectedModelId,
  onModelChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = MODEL_CHOICES.find((m) => m.id === selectedModelId) || MODEL_CHOICES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all"
        aria-label="Select AI model"
        aria-expanded={open}
      >
        <selected.icon className="w-3.5 h-3.5" />
        <span className="font-medium">{selected.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border/60 bg-popover shadow-lg z-50 py-1">
          {MODEL_CHOICES.map((model) => {
            const isSelected = model.id === selectedModelId;
            const Icon = model.icon;

            return (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors",
                  isSelected
                    ? "bg-emerald-500/10"
                    : "hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isSelected ? "text-emerald-400" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", isSelected && "text-emerald-400")}>
                  {model.label}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  {model.version}
                </span>
                {model.recommended && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    ★
                  </span>
                )}
                {!model.hasTools && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                    no tools
                  </span>
                )}
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
