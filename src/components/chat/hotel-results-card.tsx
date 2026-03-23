"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Hotel,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  DollarSign,
  Shield,
  MapPin,
  Wifi,
  Car,
  Dumbbell,
  UtensilsCrossed,
  ThumbsUp,
} from "lucide-react";

export interface HotelOfferDisplay {
  id: string;
  name: string;
  starRating?: number;
  guestRating?: number;
  guestRatingText?: string;
  reviewCount?: number;
  address?: string;
  neighborhood?: string;
  totalPrice: number;
  pricePerNight: number;
  currency: string;
  originalPrice?: number;
  dealLabel?: string;
  amenities: string[];
  images: string[];
  nights: number;
  freeCancellation?: boolean;
  payAtProperty?: boolean;
  valueScore?: number;
  valueNotes?: string[];
  bookingUrl?: string;
}

export interface HotelResultData {
  offers: HotelOfferDisplay[];
  cheapestPrice?: number;
  providers: string[];
  errors?: Array<{ provider: string; error: string }>;
}

type SortOption = "value" | "price" | "rating" | "reviews";

const SORT_OPTIONS: { id: SortOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "value", label: "Best Value", icon: ThumbsUp },
  { id: "price", label: "Cheapest", icon: DollarSign },
  { id: "rating", label: "Top Rated", icon: Star },
];

interface HotelResultsCardProps {
  results: HotelResultData;
  onSelectHotel?: (offer: HotelOfferDisplay) => void;
  onActionChip?: (text: string) => void;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function AmenityIcon({ amenity }: { amenity: string }) {
  const lower = amenity.toLowerCase();
  if (lower.includes("wifi") || lower.includes("internet")) return <Wifi className="w-3 h-3" />;
  if (lower.includes("parking") || lower.includes("car")) return <Car className="w-3 h-3" />;
  if (lower.includes("gym") || lower.includes("fitness") || lower.includes("pool")) return <Dumbbell className="w-3 h-3" />;
  if (lower.includes("restaurant") || lower.includes("breakfast")) return <UtensilsCrossed className="w-3 h-3" />;
  return null;
}

export function HotelResultsCard({ results, onSelectHotel, onActionChip }: HotelResultsCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("value");

  if (!results.offers || results.offers.length === 0) return null;

  const sortedOffers = useMemo(() => {
    const offers = [...results.offers];
    switch (sortBy) {
      case "price": return offers.sort((a, b) => a.pricePerNight - b.pricePerNight);
      case "rating": return offers.sort((a, b) => (b.guestRating || 0) - (a.guestRating || 0));
      case "value":
      default: return offers.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));
    }
  }, [results.offers, sortBy]);

  const displayOffers = showAll ? sortedOffers : sortedOffers.slice(0, 5);

  const handleSelect = (offer: HotelOfferDisplay) => {
    setSelectedId(offer.id);
    onSelectHotel?.(offer);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-2">
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-purple-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Hotel className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">{results.offers.length} hotels found</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {results.cheapestPrice && (
                <span>From <span className="text-purple-400 font-medium">${results.cheapestPrice}/night</span></span>
              )}
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
                    ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <opt.icon className="w-2.5 h-2.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hotel List */}
        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
          {displayOffers.map((offer, i) => {
            const isSelected = selectedId === offer.id;
            const isExpanded = expandedId === offer.id;

            return (
              <div key={offer.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(offer)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelect(offer); }}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 transition-all text-left cursor-pointer",
                    isSelected
                      ? "bg-purple-500/15 ring-1 ring-inset ring-purple-500/30"
                      : "hover:bg-muted/50",
                    i === 0 && !isSelected && "bg-purple-500/5"
                  )}
                >
                  {/* Selection */}
                  <div className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected ? "border-purple-500 bg-purple-500" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Image thumbnail */}
                  {offer.images[0] && (
                    <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={offer.images[0]}
                        alt={offer.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Hotel info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{offer.name}</p>
                      {offer.starRating && <StarRating stars={offer.starRating} />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {offer.guestRating && (
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded",
                          offer.guestRating >= 4.5 ? "bg-emerald-500/20 text-emerald-400" :
                          offer.guestRating >= 4.0 ? "bg-blue-500/20 text-blue-400" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {offer.guestRating} {offer.guestRatingText || ""}
                        </span>
                      )}
                      {offer.reviewCount && (
                        <span className="text-[10px] text-muted-foreground">
                          ({offer.reviewCount.toLocaleString()} reviews)
                        </span>
                      )}
                    </div>
                    {offer.neighborhood && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />{offer.neighborhood}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    {offer.freeCancellation && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        <Shield className="w-2.5 h-2.5" /> Free cancel
                      </span>
                    )}
                    {offer.dealLabel && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        {offer.dealLabel}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0 w-24">
                    {offer.originalPrice && offer.originalPrice > offer.pricePerNight && (
                      <p className="text-[10px] text-muted-foreground line-through">${offer.originalPrice}</p>
                    )}
                    <p className={cn("text-sm font-bold", isSelected ? "text-purple-300" : "text-purple-400")}>
                      ${offer.pricePerNight}/nt
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ${offer.totalPrice} total · {offer.nights}n
                    </p>
                  </div>

                  {/* Expand */}
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
                    {/* Amenities */}
                    {offer.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {offer.amenities.slice(0, 8).map((amenity, j) => (
                          <span key={j} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <AmenityIcon amenity={amenity} />
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Value notes */}
                    {offer.valueNotes && offer.valueNotes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {offer.valueNotes.map((note, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                            {note}
                          </span>
                        ))}
                      </div>
                    )}
                    {offer.address && (
                      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {offer.address}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-purple-500/10 flex items-center justify-between">
          {results.offers.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showAll ? "Show top 5" : `Show all ${results.offers.length} hotels`}
            </button>
          )}
          {selectedId && (
            <span className="text-xs text-muted-foreground ml-auto">
              Selected: {results.offers.find(o => o.id === selectedId)?.name}
            </span>
          )}
        </div>
      </div>

      {/* Action chips */}
      {onActionChip && (
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            "Show 5-star luxury hotels only",
            "Find hotels with free cancellation",
            "Show hotels near the city center",
            "Compare prices using hotel points",
            "Find hotels with airport shuttle",
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onActionChip(chip)}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] bg-muted/60 border border-border/40 text-muted-foreground hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/30 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
