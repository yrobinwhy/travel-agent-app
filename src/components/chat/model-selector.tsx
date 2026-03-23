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
    detail: "Claude Sonnet 4.6",
    icon: Sparkles,
    tag: "★ Recommended",
    tagStyle: "bg-emerald-500/15 text-emerald-400",
  },
  {
    id: "gemini-flash",
    label: "Fast",
    detail: "Gemini 3 Flash",
    icon: Zap,
    tag: null,
    tagStyle: "",
  },
  {
    id: "gemini-pro",
    label: "Research",
    detail: "Gemini 3.1 Pro",
    icon: Globe,
    tag: "No flight tools",
    tagStyle: "bg-amber-500/10 text-amber-500",
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
        <div className="absolute top-full left-0 mt-1 min-w-[240px] rounded-lg border border-border/60 bg-popover shadow-lg z-50 py-1">
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
                  "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
                  isSelected ? "bg-emerald-500/10" : "hover:bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isSelected ? "text-emerald-400" : "text-muted-foreground"
                )} />

                <div className="flex-1 flex items-baseline gap-2 min-w-0">
                  <span className={cn(
                    "text-sm font-medium whitespace-nowrap",
                    isSelected && "text-emerald-400"
                  )}>
                    {model.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap">
                    {model.detail}
                  </span>
                </div>

                {model.tag && (
                  <span className={cn(
                    "text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0",
                    model.tagStyle
                  )}>
                    {model.tag}
                  </span>
                )}

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
