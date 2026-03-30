// Unified flight search engine — queries multiple providers in parallel

import type {
  FlightSearchParams,
  FlightSearchResult,
  FlightOffer,
  FlightSearchProvider,
} from "./types";
import { duffelProvider } from "./providers/duffel";
import { serpapiProvider } from "./providers/serpapi";
import { cacheGet, cacheSet, flightCacheKey, CACHE_TTL } from "@/lib/cache";
import { sabreProvider } from "./providers/sabre";

export type { FlightSearchParams, FlightSearchResult, FlightOffer } from "./types";

const providers: FlightSearchProvider[] = [duffelProvider, serpapiProvider, sabreProvider];

/**
 * Search all available providers in parallel and merge results
 */
export async function searchFlights(
  params: FlightSearchParams
): Promise<FlightSearchResult> {
  // Check cache first (15-minute TTL — flight prices are volatile)
  const cKey = flightCacheKey(
    params.origin,
    params.destination,
    params.departureDate,
    params.cabinClass || "economy"
  );
  const cached = await cacheGet<FlightSearchResult>(cKey);
  if (cached) {
    return { ...cached, searchedAt: cached.searchedAt }; // Keep original timestamp for staleness check
  }

  const activeProviders = providers.filter((p) => p.isAvailable());

  if (activeProviders.length === 0) {
    return {
      params,
      offers: [],
      searchedAt: new Date().toISOString(),
      providers: [],
      errors: [
        { provider: "all", error: "No flight search providers configured" },
      ],
    };
  }

  // Search all providers in parallel
  const results = await Promise.allSettled(
    activeProviders.map(async (provider) => {
      const offers = await provider.search(params);
      return { provider: provider.name, offers };
    })
  );

  let allOffers: FlightOffer[] = [];
  const errors: { provider: string; error: string }[] = [];
  const usedProviders: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allOffers = allOffers.concat(result.value.offers);
      usedProviders.push(result.value.provider);
    } else {
      const providerName =
        activeProviders[results.indexOf(result)]?.name || "unknown";
      errors.push({
        provider: providerName,
        error: sanitizeError(result.reason?.message || "Search unavailable"),
      });
    }
  }

  // Deduplicate — same flight number + departure time = keep cheapest
  allOffers = deduplicateOffers(allOffers);

  // Score and sort
  allOffers = scoreOffers(allOffers, params);
  allOffers = sortOffers(allOffers, params.sortBy || "value");

  // Find metadata
  const cheapest = allOffers.reduce(
    (min, o) => (o.totalPrice < min ? o.totalPrice : min),
    Infinity
  );

  const fastest = allOffers.reduce((min, o) => {
    const mins = parseDurationToMinutes(o.totalDuration);
    return mins < min ? mins : min;
  }, Infinity);

  const bestValueOffer = allOffers.find((o) => o.valueScore !== undefined)?.id;

  const result: FlightSearchResult = {
    params,
    offers: allOffers,
    searchedAt: new Date().toISOString(),
    providers: usedProviders,
    errors: errors.length > 0 ? errors : undefined,
    cheapestPrice: cheapest === Infinity ? undefined : cheapest,
    fastestDuration:
      fastest === Infinity
        ? undefined
        : `${Math.floor(fastest / 60)}h ${fastest % 60}m`,
    bestValue: bestValueOffer,
  };

  // Cache results (15 min TTL)
  if (allOffers.length > 0) {
    await cacheSet(cKey, result, CACHE_TTL.flightSearch).catch(() => {});
  }

  return result;
}

/**
 * Score offers for value — business class $/hr, price vs median, etc.
 */
function scoreOffers(
  offers: FlightOffer[],
  params: FlightSearchParams
): FlightOffer[] {
  if (offers.length === 0) return offers;

  const prices = offers.map((o) => o.totalPrice).filter((p) => p > 0);
  const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] || 0;

  return offers.map((offer) => {
    let score = 50; // baseline
    const notes: string[] = [];

    // Price scoring (lower = better)
    if (medianPrice > 0 && offer.totalPrice > 0) {
      const priceRatio = offer.totalPrice / medianPrice;
      if (priceRatio < 0.7) {
        score += 25;
        notes.push(`${Math.round((1 - priceRatio) * 100)}% below median price`);
      } else if (priceRatio < 0.9) {
        score += 15;
        notes.push("Below average price");
      } else if (priceRatio > 1.3) {
        score -= 15;
      }
    }

    // Duration scoring
    const durationMins = parseDurationToMinutes(offer.totalDuration);
    if (durationMins > 0) {
      // Business class value: price per hour
      if (params.cabinClass === "business" || params.cabinClass === "first") {
        const pricePerHour = offer.totalPrice / (durationMins / 60);
        if (pricePerHour < 200) {
          score += 15;
          notes.push(`Great value at $${Math.round(pricePerHour)}/hr`);
        }
      }
    }

    // Stops scoring
    if (offer.stops === 0) {
      score += 10;
      notes.push("Non-stop");
    } else if (offer.stops > 1) {
      score -= 5 * (offer.stops - 1);
    }

    // Refundability/flexibility bonus
    if (offer.refundable) {
      score += 5;
      notes.push("Refundable");
    }
    if (offer.changeable) {
      score += 3;
      notes.push("Changeable");
    }

    // Bookable bonus (we can complete the booking)
    if (offer.bookable) {
      score += 5;
      notes.push("Instant booking available");
    }

    return {
      ...offer,
      valueScore: Math.max(0, Math.min(100, score)),
      valueNotes: notes,
    };
  });
}

/**
 * Sort offers by criteria
 */
function sortOffers(
  offers: FlightOffer[],
  sortBy: string
): FlightOffer[] {
  switch (sortBy) {
    case "price":
      return offers.sort((a, b) => a.totalPrice - b.totalPrice);
    case "duration":
      return offers.sort(
        (a, b) =>
          parseDurationToMinutes(a.totalDuration) -
          parseDurationToMinutes(b.totalDuration)
      );
    case "departure":
      return offers.sort((a, b) =>
        (a.outbound[0]?.departureTime || "").localeCompare(
          b.outbound[0]?.departureTime || ""
        )
      );
    case "value":
    default:
      return offers.sort(
        (a, b) => (b.valueScore || 0) - (a.valueScore || 0)
      );
  }
}

/**
 * Deduplicate offers — same flight number + departure = keep cheapest + most flexible
 */
function deduplicateOffers(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Map<string, FlightOffer>();

  for (const offer of offers) {
    const firstSeg = offer.outbound[0];
    if (!firstSeg) continue;

    // Key by flight number + departure time (covers same flight across providers)
    const key = `${firstSeg.flightNumber}-${firstSeg.departureTime}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, offer);
    } else {
      // Keep the one with better attributes
      const shouldReplace =
        // Prefer cheaper
        offer.totalPrice < existing.totalPrice ||
        // Same price but more flexible
        (offer.totalPrice === existing.totalPrice && offer.refundable && !existing.refundable) ||
        // Same price but bookable
        (offer.totalPrice === existing.totalPrice && offer.bookable && !existing.bookable);

      if (shouldReplace) {
        seen.set(key, offer);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Sanitize error messages — don't leak raw API responses to users
 */
function sanitizeError(error: string): string {
  // Strip raw JSON from error messages
  const jsonStart = error.indexOf("{");
  if (jsonStart > 0) {
    return error.substring(0, jsonStart).trim();
  }
  // Truncate long errors
  if (error.length > 100) {
    return error.substring(0, 100) + "...";
  }
  return error;
}

function parseDurationToMinutes(duration: string): number {
  const match = duration.match(/(\d+)h\s*(\d+)?m?/);
  if (!match) return Infinity;
  return parseInt(match[1]) * 60 + parseInt(match[2] || "0");
}
