"use client";

import { AVAILABLE_MODELS, type ModelConfig } from "@/lib/ai/providers";
import { ChevronDown, Cpu, Zap, Search, Brain } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

const bestForIcons: Record<string, React.ReactNode> = {
  reasoning: <Brain className="w-3 h-3" />,
  fast: <Zap className="w-3 h-3" />,
  search: <Search className="w-3 h-3" />,
  general: <Cpu className="w-3 h-3" />,
};

export function ModelSelector({
  selectedModelId,
  onModelChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = AVAILABLE_MODELS.find((m) => m.id === selectedModelId);

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
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all"
      >
        {selected && bestForIcons[selected.bestFor]}
        <span>{selected?.displayName || "Select Model"}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded-xl border border-border/60 bg-popover shadow-xl z-50 p-1.5">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                model.id === selectedModelId
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {bestForIcons[model.bestFor]}
                </span>
                <span className="font-medium">{model.displayName}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/50">
                  {model.provider}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-0.5 ml-5">
                {model.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
