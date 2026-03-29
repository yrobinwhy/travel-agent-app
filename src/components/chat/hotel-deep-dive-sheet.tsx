"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Star,
  MapPin,
  Trophy,
  ExternalLink,
  Wifi,
  Car,
  Dumbbell,
  UtensilsCrossed,
  Coffee,
  Waves,
  Wind,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
} from "lucide-react";
import { useHotelDetails } from "@/hooks/use-hotel-details";
import type { HotelOfferDisplay } from "./hotel-results-card";
import type {
  HotelDetailReview,
  HotelDetailNearbyPlace,
  HotelDetailPriceSource,
  HotelDetailReviewBreakdown,
} from "@/lib/hotels/types";

interface HotelDeepDiveSheetProps {
  hotel: HotelOfferDisplay | null;
  onClose: () => void;
  onSelectHotel?: (offer: HotelOfferDisplay) => void;
}

export function HotelDeepDiveSheet({
  hotel,
  onClose,
  onSelectHotel,
}: HotelDeepDiveSheetProps) {
  const { details, isLoading, error, retry } = useHotelDetails(hotel);

  return (
    <Sheet
      open={!!hotel}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full overflow-y-auto p-0"
      >
        {hotel && (
          <>
            {/* Image Gallery */}
            <ImageGallery
              images={
                details?.images?.length
                  ? details.images.map((img) => img.url)
                  : hotel.images
              }
              hotelName={hotel.name}
              isLoading={isLoading}
            />

            {/* Header */}
            <SheetHeader className="px-5 pt-4 pb-2">
              <SheetTitle className="text-lg leading-tight">
                {hotel.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                {hotel.starRating && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </span>
                )}
                {hotel.address && (
                  <span className="flex items-center gap-1 text-xs">
                    <MapPin className="w-3 h-3" /> {hotel.address}
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="px-5 pb-28 space-y-5">
              {/* === DUAL RATINGS SECTION === */}
              <DualRatings hotel={hotel} />

              {/* Error state */}
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={retry}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              )}

              {/* Loading skeleton */}
              {isLoading && <DetailsSkeleton />}

              {/* Loaded details */}
              {details && !isLoading && (
                <>
                  {/* Description */}
                  {details.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {details.description}
                    </p>
                  )}

                  {/* Check-in/out times */}
                  {(details.checkInTime || details.checkOutTime) && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {details.checkInTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Check-in:{" "}
                          {details.checkInTime}
                        </span>
                      )}
                      {details.checkOutTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Check-out:{" "}
                          {details.checkOutTime}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Review Breakdown */}
                  {details.reviewBreakdown.length > 0 && (
                    <ReviewBreakdown breakdown={details.reviewBreakdown} />
                  )}

                  {/* Sample Reviews */}
                  {details.reviews.length > 0 && (
                    <SampleReviews reviews={details.reviews} />
                  )}

                  {/* Full Amenities */}
                  {details.amenities.length > 0 && (
                    <FullAmenities amenities={details.amenities} />
                  )}

                  {/* Map */}
                  <MapSection
                    lat={details.latitude || hotel.latitude}
                    lng={details.longitude || hotel.longitude}
                    name={hotel.name}
                  />

                  {/* Nearby Places */}
                  {details.nearbyPlaces.length > 0 && (
                    <NearbyPlaces places={details.nearbyPlaces} />
                  )}

                  {/* Price Comparison */}
                  {details.prices.length > 0 && (
                    <PriceComparison
                      prices={details.prices}
                      currency={hotel.currency}
                    />
                  )}
                </>
              )}

              {/* Fallback amenities when detail hasn't loaded */}
              {!details && !isLoading && hotel.amenities.length > 0 && (
                <FullAmenities amenities={hotel.amenities} />
              )}
            </div>

            {/* Sticky footer */}
            <div className="fixed bottom-0 right-0 sm:max-w-2xl w-full bg-background/95 backdrop-blur border-t border-border px-5 py-3 flex items-center justify-between z-10">
              <div>
                <p className="text-lg font-bold text-purple-400">
                  ${hotel.pricePerNight}
                  <span className="text-xs font-normal text-muted-foreground">
                    /night
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ${hotel.totalPrice} total · {hotel.nights} night
                  {hotel.nights !== 1 ? "s" : ""}
                </p>
              </div>
              {onSelectHotel && (
                <button
                  type="button"
                  onClick={() => onSelectHotel(hotel)}
                  className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Add to Trip
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// --- Sub-components ---

function ImageGallery({
  images,
  hotelName,
  isLoading,
}: {
  images: string[];
  hotelName: string;
  isLoading: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const displayImages = images.length > 0 ? images : [];

  if (displayImages.length === 0 && !isLoading) return null;

  return (
    <div className="relative">
      {/* Hero image */}
      {displayImages[activeIdx] ? (
        <div className="w-full h-56 bg-muted">
          <img
            src={displayImages[activeIdx]}
            alt={`${hotelName} photo ${activeIdx + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-56 bg-muted animate-pulse" />
      )}

      {/* Thumbnail strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-1 p-2 overflow-x-auto bg-background/80 backdrop-blur-sm scroll-smooth snap-x snap-mandatory">
          {displayImages.slice(0, 20).map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "flex-shrink-0 w-14 h-10 rounded overflow-hidden snap-start transition-all",
                activeIdx === i
                  ? "ring-2 ring-purple-500 opacity-100"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={img}
                alt={`${hotelName} thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image counter */}
      {displayImages.length > 0 && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px]">
          {activeIdx + 1}/{displayImages.length}
        </span>
      )}
    </div>
  );
}

function DualRatings({ hotel }: { hotel: HotelOfferDisplay }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Google Rating */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold mb-1.5">
          Google Rating
        </p>
        <div className="flex items-baseline gap-2">
          {hotel.guestRating ? (
            <>
              <span
                className={cn(
                  "text-2xl font-bold",
                  hotel.guestRating >= 4.5
                    ? "text-emerald-400"
                    : hotel.guestRating >= 4.0
                    ? "text-blue-400"
                    : "text-muted-foreground"
                )}
              >
                {hotel.guestRating}
              </span>
              <span className="text-xs text-muted-foreground">/5</span>
              {hotel.guestRatingText && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    hotel.guestRating >= 4.5
                      ? "bg-emerald-500/20 text-emerald-400"
                      : hotel.guestRating >= 4.0
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {hotel.guestRatingText}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No rating</span>
          )}
        </div>
        {hotel.reviewCount && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {hotel.reviewCount.toLocaleString()} reviews
          </p>
        )}
      </div>

      {/* TripAdvisor Traveler Ranking */}
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1.5 flex items-center gap-1">
          <Trophy className="w-3 h-3" />
          TripAdvisor · Traveler Ranked
        </p>
        {hotel.tripAdvisorRank ? (
          <p className="text-sm font-bold text-emerald-400">
            {hotel.tripAdvisorRank}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No ranking available</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {hotel.tripAdvisorRating && (
            <span className="text-xs font-medium text-emerald-400">
              {hotel.tripAdvisorRating}/5
            </span>
          )}
          {hotel.tripAdvisorReviews && (
            <span className="text-[10px] text-muted-foreground">
              ({hotel.tripAdvisorReviews.toLocaleString()} reviews)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewBreakdown({
  breakdown,
}: {
  breakdown: HotelDetailReviewBreakdown[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Review Breakdown</h3>
      <div className="space-y-2">
        {breakdown.map((item) => {
          const total = item.positive + item.negative;
          const pct = total > 0 ? Math.round((item.positive / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-24 flex-shrink-0 truncate">
                {item.name}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    pct >= 80
                      ? "bg-emerald-500"
                      : pct >= 60
                      ? "bg-blue-500"
                      : pct >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SampleReviews({ reviews }: { reviews: HotelDetailReview[] }) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Guest Reviews</h3>
      <div className="space-y-2">
        {display.map((review, i) => (
          <div
            key={i}
            className="rounded-lg bg-muted/30 border border-border/20 px-3 py-2"
          >
            <div className="flex items-center gap-2 mb-1">
              {review.rating && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                  {review.rating}/5
                </span>
              )}
              {review.date && (
                <span className="text-[10px] text-muted-foreground">
                  {review.date}
                </span>
              )}
              {review.source && (
                <span className="text-[10px] text-muted-foreground">
                  via {review.source}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {review.text}
            </p>
          </div>
        ))}
      </div>
      {reviews.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-purple-400 hover:text-purple-300 mt-1.5 flex items-center gap-0.5"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show all {reviews.length}{" "}
              reviews
            </>
          )}
        </button>
      )}
    </div>
  );
}

function getAmenityIcon(amenity: string) {
  const l = amenity.toLowerCase();
  if (l.includes("wifi") || l.includes("internet")) return Wifi;
  if (l.includes("parking") || l.includes("car")) return Car;
  if (l.includes("gym") || l.includes("fitness")) return Dumbbell;
  if (l.includes("restaurant") || l.includes("breakfast") || l.includes("dining")) return UtensilsCrossed;
  if (l.includes("coffee") || l.includes("tea")) return Coffee;
  if (l.includes("pool") || l.includes("swim")) return Waves;
  if (l.includes("air") || l.includes("ac") || l.includes("conditioning")) return Wind;
  if (l.includes("spa") || l.includes("sauna")) return Sparkles;
  return null;
}

function FullAmenities({ amenities }: { amenities: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? amenities : amenities.slice(0, 12);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Amenities</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {display.map((amenity, i) => {
          const Icon = getAmenityIcon(amenity);
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              {Icon ? (
                <Icon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              )}
              {amenity}
            </div>
          );
        })}
      </div>
      {amenities.length > 12 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-purple-400 hover:text-purple-300 mt-1.5"
        >
          {showAll ? "Show fewer" : `Show all ${amenities.length} amenities`}
        </button>
      )}
    </div>
  );
}

function MapSection({
  lat,
  lng,
  name,
}: {
  lat?: number;
  lng?: number;
  name: string;
}) {
  if (!lat || !lng) return null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`;
  const gmapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Location</h3>
      {gmapsKey ? (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x200&markers=color:purple%7C${lat},${lng}&key=${gmapsKey}`}
            alt={`Map of ${name}`}
            className="w-full h-40 rounded-lg object-cover"
          />
        </a>
      ) : (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/30 border border-border/20 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          View on Google Maps
          <ExternalLink className="w-3 h-3 ml-auto" />
        </a>
      )}
    </div>
  );
}

function NearbyPlaces({ places }: { places: HotelDetailNearbyPlace[] }) {
  // Group by type
  const groups = places.reduce<Record<string, HotelDetailNearbyPlace[]>>(
    (acc, place) => {
      const type = place.type || "Other";
      if (!acc[type]) acc[type] = [];
      acc[type].push(place);
      return acc;
    },
    {}
  );

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Nearby</h3>
      <div className="space-y-3">
        {Object.entries(groups)
          .slice(0, 4)
          .map(([type, items]) => (
            <div key={type}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                {type}
              </p>
              <div className="space-y-1">
                {items.slice(0, 5).map((place, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground truncate">
                      {place.name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {place.rating && (
                        <span className="text-[10px] text-amber-400">
                          {place.rating}
                        </span>
                      )}
                      {place.distance && (
                        <span className="text-[10px] text-muted-foreground">
                          {place.distance}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function PriceComparison({
  prices,
  currency,
}: {
  prices: HotelDetailPriceSource[];
  currency: string;
}) {
  const sorted = [...prices].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0]?.price;

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2">Price Comparison</h3>
      <div className="rounded-lg border border-border/30 overflow-hidden">
        {sorted.map((source, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-xs",
              i !== sorted.length - 1 && "border-b border-border/20",
              source.price === cheapest && "bg-emerald-500/5"
            )}
          >
            <div className="flex items-center gap-2">
              {source.logo && (
                <img
                  src={source.logo}
                  alt={source.source}
                  className="w-4 h-4 rounded"
                />
              )}
              <span className="text-muted-foreground">{source.source}</span>
              {source.price === cheapest && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                  Cheapest
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-medium",
                  source.price === cheapest
                    ? "text-emerald-400"
                    : "text-foreground"
                )}
              >
                ${source.price}
                <span className="text-muted-foreground font-normal">
                  /night
                </span>
              </span>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Description */}
      <div className="space-y-1.5">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
      {/* Review breakdown */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-28" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 bg-muted rounded w-20" />
            <div className="flex-1 h-1.5 bg-muted rounded-full" />
          </div>
        ))}
      </div>
      {/* Reviews */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-24" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-muted/30 p-3 space-y-1.5">
            <div className="h-2.5 bg-muted rounded w-16" />
            <div className="h-2.5 bg-muted rounded w-full" />
            <div className="h-2.5 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
      {/* Amenities */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-20" />
        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-3 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
