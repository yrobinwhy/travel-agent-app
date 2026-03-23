"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Plane,
  Check,
  Clock,
  ArrowRight,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  DollarSign,
  Timer,
  Star,
} from "lucide-react";

export interface FlightOffer {
  id: string;
  provider: string;
  totalPrice: number;
  currency: string;
  totalDuration: string;
  stops: number;
  airlines: string[];
  outbound: Array<{
    flightNumber: string;
    airlineName: string;
    origin: string;
    originName: string;
    destination: string;
    destinationName: string;
    departureTime: string;
    arrivalTime: string;
    cabinClass: string;
  }>;
  valueScore?: number;
  valueNotes?: string[];
  bookable: boolean;
  refundable?: boolean;
  changeable?: boolean;
}

export interface FlightResultData {
  offers: FlightOffer[];
  cheapestPrice?: number;
  fastestDuration?: string;
  providers: string[];
  errors?: Array<{ provider: string; error: string }>;
}

type SortOption = "value" | "price" | "duration" | "departure" | "stops" | "airline";

const SORT_OPTIONS: { id: SortOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "value", label: "Best Value", icon: Star },
  { id: "price", label: "Cheapest", icon: DollarSign },
  { id: "duration", label: "Fastest", icon: Timer },
  { id: "departure", label: "Earliest", icon: Clock },
  { id: "stops", label: "Fewest Stops", icon: ArrowRight },
];

interface FlightResultsCardProps {
  results: FlightResultData;
  onSelectFlight?: (offer: FlightOffer) => void;
  onActionChip?: (text: string) => void;
}

function formatTime(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return isoString;
  }
}

function formatDate(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function parseDuration(d: string): number {
  // "2h 30m" → 150 minutes
  const h = d.match(/(\d+)h/)?.[1] || "0";
  const m = d.match(/(\d+)m/)?.[1] || "0";
  return parseInt(h) * 60 + parseInt(m);
}

export function FlightResultsCard({ results, onSelectFlight, onActionChip }: FlightResultsCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("value");

  if (!results.offers || results.offers.length === 0) return null;

  const sortedOffers = useMemo(() => {
    const offers = [...results.offers];
    switch (sortBy) {
      case "price":
        return offers.sort((a, b) => a.totalPrice - b.totalPrice);
      case "duration":
        return offers.sort((a, b) => parseDuration(a.totalDuration) - parseDuration(b.totalDuration));
      case "departure":
        return offers.sort((a, b) => {
          const aTime = a.outbound?.[0]?.departureTime || "";
          const bTime = b.outbound?.[0]?.departureTime || "";
          return aTime.localeCompare(bTime);
        });
      case "stops":
        return offers.sort((a, b) => a.stops - b.stops);
      case "airline":
        return offers.sort((a, b) => (a.airlines[0] || "").localeCompare(b.airlines[0] || ""));
      case "value":
      default:
        return offers.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));
    }
  }, [results.offers, sortBy]);

  const displayOffers = showAll ? sortedOffers : sortedOffers.slice(0, 6);

  const handleSelect = (offer: FlightOffer) => {
    setSelectedId(offer.id);
    onSelectFlight?.(offer);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-2">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-emerald-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">
                {results.offers.length} flights found
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {results.cheapestPrice && (
                <span>
                  From{" "}
                  <span className="text-emerald-400 font-medium">
                    ${results.cheapestPrice}
                  </span>
                </span>
              )}
              <span className="text-[10px]">
                via {results.providers.join(", ")}
              </span>
            </div>
          </div>
          {/* Sort pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <ArrowUpDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap",
                  sortBy === opt.id
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <opt.icon className="w-2.5 h-2.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flight List */}
        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
          {displayOffers.map((offer, i) => {
            const isSelected = selectedId === offer.id;
            const isExpanded = expandedId === offer.id;
            const firstSeg = offer.outbound?.[0];
            const lastSeg = offer.outbound?.[offer.outbound.length - 1];

            return (
              <div key={offer.id}>
                {/* Main Row — clickable */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(offer)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelect(offer); }}
                  className={cn(
                    "w-full px-4 py-3 flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 transition-all text-left cursor-pointer",
                    isSelected
                      ? "bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30"
                      : "hover:bg-muted/50",
                    i === 0 && !isSelected && "bg-emerald-500/5"
                  )}
                >
                  {/* Selection indicator */}
                  <div className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Rank */}
                  <div className="flex flex-col items-center gap-0.5 w-6 flex-shrink-0">
                    <span className={cn(
                      "text-xs font-bold",
                      i === 0 ? "text-emerald-400" : "text-muted-foreground"
                    )}>
                      #{i + 1}
                    </span>
                    {offer.valueScore && offer.valueScore >= 60 && (
                      <span className={cn(
                        "text-[9px] font-medium px-1 py-0.5 rounded-full",
                        offer.valueScore >= 70
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {offer.valueScore}
                      </span>
                    )}
                  </div>

                  {/* Airline */}
                  <div className="w-20 flex-shrink-0">
                    <p className="text-xs font-medium truncate">
                      {offer.airlines[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {firstSeg?.flightNumber}
                    </p>
                  </div>

                  {/* Times & Route */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="text-center">
                        <p className="font-mono font-bold">{formatTime(firstSeg?.departureTime || "")}</p>
                        <p className="text-[10px] text-muted-foreground">{firstSeg?.origin}</p>
                      </div>

                      <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                        <p className="text-[10px] text-muted-foreground">{offer.totalDuration}</p>
                        <div className="w-full flex items-center gap-1">
                          <div className="h-px flex-1 bg-border" />
                          {offer.stops === 0 ? (
                            <ArrowRight className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <span className="text-[9px] text-amber-400 px-1 bg-amber-500/10 rounded">
                              {offer.stops} stop{offer.stops > 1 ? "s" : ""}
                            </span>
                          )}
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="font-mono font-bold">{formatTime(lastSeg?.arrivalTime || "")}</p>
                        <p className="text-[10px] text-muted-foreground">{lastSeg?.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    {offer.refundable && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        <Shield className="w-2.5 h-2.5" /> Refundable
                      </span>
                    )}
                    {offer.changeable && !offer.refundable && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        <RefreshCw className="w-2.5 h-2.5" /> Changeable
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0 w-20">
                    <p className={cn(
                      "text-sm font-bold",
                      isSelected ? "text-emerald-300" : "text-emerald-400"
                    )}>
                      ${offer.totalPrice.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {firstSeg?.cabinClass || offer.currency}
                    </p>
                  </div>

                  {/* Expand toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(expandedId === offer.id ? null : offer.id);
                    }}
                    className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-muted/30 border-t border-border/20">
                    <div className="space-y-2">
                      {offer.outbound.map((seg, j) => (
                        <div key={j} className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5 w-20">
                            <Plane className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{seg.flightNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-mono">{formatTime(seg.departureTime)}</span>
                            <span className="text-muted-foreground">{seg.originName} ({seg.origin})</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-mono">{formatTime(seg.arrivalTime)}</span>
                            <span className="text-muted-foreground">{seg.destinationName} ({seg.destination})</span>
                          </div>
                          <span className="text-muted-foreground">{seg.cabinClass}</span>
                        </div>
                      ))}
                      {offer.valueNotes && offer.valueNotes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {offer.valueNotes.map((note, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {note}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show more / Action bar */}
        <div className="px-4 py-2.5 border-t border-emerald-500/10 flex items-center justify-between">
          {results.offers.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {showAll ? `Show top 6` : `Show all ${results.offers.length} flights`}
            </button>
          )}
          {selectedId && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">
                Selected: {results.offers.find(o => o.id === selectedId)?.airlines[0]}
              </span>
              <span className="text-xs font-medium text-emerald-400">
                ${results.offers.find(o => o.id === selectedId)?.totalPrice.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Errors */}
        {results.errors && results.errors.length > 0 && (
          <div className="px-4 py-2 border-t border-border/30 text-[10px] text-yellow-400/70">
            ⚠️ {results.errors.map((e) => `${e.provider}: ${e.error}`).join(" · ")}
          </div>
        )}
      </div>

      {/* Post-result action chips */}
      {onActionChip && (
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            "Show me only non-stop flights",
            "Check prices from a different departure city",
            "Find flexible/refundable options only",
            "Compare using points instead of cash",
            "Set a price alert for this route",
            "Search nearby dates for better deals",
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onActionChip(chip)}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] bg-muted/60 border border-border/40 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
