"use client";

import { useState, useEffect } from "react";
import type { HotelDetail } from "@/lib/hotels/types";
import type { HotelOfferDisplay } from "@/components/chat/hotel-results-card";

interface UseHotelDetailsResult {
  details: HotelDetail | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useHotelDetails(
  hotel: HotelOfferDisplay | null
): UseHotelDetailsResult {
  const [details, setDetails] = useState<HotelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!hotel) {
      setDetails(null);
      setError(null);
      return;
    }

    // Skip fetch for fake tokens (no real property_token)
    const token = hotel.providerOfferId;
    if (!token || token.startsWith("serpapi-")) {
      setDetails(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      token,
      ...(hotel.location && { location: hotel.location }),
      ...(hotel.checkIn && { check_in: hotel.checkIn }),
      ...(hotel.checkOut && { check_out: hotel.checkOut }),
      ...(hotel.guests && { adults: String(hotel.guests) }),
    });

    // Location is required — fall back to neighborhood or address
    if (!params.has("location")) {
      const fallbackLocation = hotel.neighborhood || hotel.address || "";
      if (fallbackLocation) {
        params.set("location", fallbackLocation);
      }
    }

    fetch(`/api/hotels/details?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed (${res.status})`);
        }
        return res.json() as Promise<HotelDetail>;
      })
      .then((data) => {
        if (cancelled) return;

        // Merge TripAdvisor data from original hotel (SerpApi detail doesn't return TA data)
        // Also merge review breakdown from original if detail endpoint didn't return it
        const merged: HotelDetail = {
          ...data,
          reviewBreakdown:
            data.reviewBreakdown.length > 0
              ? data.reviewBreakdown
              : (hotel.reviewBreakdown || []).map((rb) => ({
                  ...rb,
                  description: undefined,
                })),
        };

        setDetails(merged);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to fetch hotel details");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotel?.providerOfferId, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    details,
    isLoading,
    error,
    retry: () => setRetryCount((c) => c + 1),
  };
}
