// Unified hotel search engine — queries multiple providers in parallel

import type {
  HotelSearchParams,
  HotelSearchResult,
  HotelOffer,
  HotelSearchProvider,
} from "./types";
import { serpapiHotelProvider } from "./providers/serpapi";
import { cacheGet, cacheSet, taCacheKey, CACHE_TTL } from "@/lib/cache";

export type { HotelSearchParams, HotelSearchResult, HotelOffer } from "./types";

const providers: HotelSearchProvider[] = [serpapiHotelProvider];

export async function searchHotels(
  params: HotelSearchParams
): Promise<HotelSearchResult> {
  const activeProviders = providers.filter((p) => p.isAvailable());

  if (activeProviders.length === 0) {
    return {
      params,
      offers: [],
      searchedAt: new Date().toISOString(),
      providers: [],
      errors: [{ provider: "all", error: "No hotel search providers configured" }],
    };
  }

  const results = await Promise.allSettled(
    activeProviders.map(async (provider) => {
      const offers = await provider.search(params);
      return { provider: provider.name, offers };
    })
  );

  let allOffers: HotelOffer[] = [];
  const errors: { provider: string; error: string }[] = [];
  const usedProviders: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allOffers = allOffers.concat(result.value.offers);
      usedProviders.push(result.value.provider);
    } else {
      const providerName = activeProviders[results.indexOf(result)]?.name || "unknown";
      errors.push({
        provider: providerName,
        error: sanitizeError(result.reason?.message || "Search unavailable"),
      });
    }
  }

  // Enrich with TripAdvisor rankings (one extra API call per search)
  allOffers = await enrichWithTripAdvisor(allOffers, params.location);

  // Score hotels
  allOffers = scoreHotels(allOffers, params);

  // Sort
  allOffers = sortHotels(allOffers, params.sortBy || "value");

  const cheapest = allOffers.reduce(
    (min, o) => (o.pricePerNight < min ? o.pricePerNight : min),
    Infinity
  );

  return {
    params,
    offers: allOffers,
    searchedAt: new Date().toISOString(),
    providers: usedProviders,
    errors: errors.length > 0 ? errors : undefined,
    cheapestPrice: cheapest === Infinity ? undefined : cheapest,
    bestRated: allOffers.find((o) => o.guestRating && o.guestRating >= 4.5)?.id,
  };
}

/**
 * Enrich hotel offers with TripAdvisor rankings via Google search
 * One API call per city — cross-references hotel names
 */
async function enrichWithTripAdvisor(offers: HotelOffer[], location: string): Promise<HotelOffer[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || offers.length === 0) return offers;

  try {
    type TAResult = { rating?: number; reviews?: number; rankText?: string };
    const taData = new Map<string, TAResult>();

    // Extract the city name from location for matching (e.g. "Lisbon, Portugal" → "Lisbon")
    const cityName = location.split(",")[0].trim();

    const topOffers = offers.slice(0, 10);

    // --- Pass 1: Search each hotel with a broad query (no "ranked #" requirement) ---
    const hotelSearches = topOffers.map(async (offer) => {
      try {
        const cacheKey = taCacheKey(offer.name, location);
        const cached = await cacheGet<TAResult>(cacheKey);
        if (cached) {
          taData.set(offer.id, cached);
          return;
        }

        // Use the most distinctive part of the hotel name (first 3 words, skip common prefixes)
        const nameWords = offer.name
          .replace(/^(hotel|the)\s+/i, "")
          .split(/\s+/)
          .filter((w) => w.length > 1);
        const nameForSearch = nameWords.slice(0, 3).join(" ");

        // Broader query — don't require "ranked #" in the page, just find the TA listing
        const params = new URLSearchParams({
          engine: "google",
          q: `${nameForSearch} hotel ${cityName} site:tripadvisor.com`,
          api_key: apiKey,
          num: "5",
        });
        const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;

        const data = await res.json();
        const results = data.organic_results || [];

        // Also check the knowledge graph / right-side panel
        const knowledgeSnippet = data.knowledge_graph?.description || "";

        let bestResult: TAResult | null = null;

        for (const r of results) {
          const snippet = (r.snippet || "") + " " + (r.rich_snippet?.bottom?.text || "");
          const title = r.title || "";
          const link = r.link || "";
          const rich = r.rich_snippet?.top?.detected_extensions;

          // Only consider TripAdvisor Hotel_Review pages (not forum posts, etc.)
          if (!link.includes("tripadvisor.com")) continue;
          const isHotelPage = link.includes("Hotel_Review") || link.includes("Hotels-");

          // Verify the result is about this hotel (fuzzy name match)
          const nameLower = offer.name.toLowerCase();
          const titleLower = title.toLowerCase();
          const nameMatch =
            nameWords.slice(0, 2).every((w) => titleLower.includes(w.toLowerCase())) ||
            titleLower.includes(nameLower.slice(0, 20));
          if (!isHotelPage && !nameMatch) continue;

          // Try to extract "ranked #X of Y hotels" from snippet, title, or rich snippet text
          const allText = `${snippet} ${title} ${knowledgeSnippet}`;
          const rankMatch = allText.match(/(?:#|ranked\s+#?)(\d+)\s+of\s+([\d,]+)\s+hotel/i);

          if (rankMatch) {
            bestResult = {
              rating: rich?.rating || bestResult?.rating,
              reviews: rich?.reviews || bestResult?.reviews,
              rankText: `#${rankMatch[1]} of ${rankMatch[2]} hotels in ${location}`,
            };
            break; // Found ranking — done
          }

          // Even without explicit ranking text, grab rating from rich snippet
          if (rich?.rating && !bestResult) {
            bestResult = {
              rating: rich.rating,
              reviews: rich.reviews,
              rankText: undefined,
            };
            // Don't break — keep looking for one with explicit ranking
          }

          // Check the TripAdvisor meta text that sometimes appears
          // e.g. "4.5 of 5 · 2,345 reviews · #12 Best Value of 456 Hotels in Lisbon"
          // We want Traveler Ranked, but will take any ranking as fallback
          const metaRank = allText.match(/#(\d+)\s+(?:Best Value|Traveler Ranked?)\s+(?:of\s+)?([\d,]+)/i);
          if (metaRank && !bestResult?.rankText) {
            bestResult = {
              rating: rich?.rating || bestResult?.rating,
              reviews: rich?.reviews || bestResult?.reviews,
              rankText: `#${metaRank[1]} of ${metaRank[2]} hotels in ${location}`,
            };
          }
        }

        if (bestResult) {
          taData.set(offer.id, bestResult);
          await cacheSet(cacheKey, bestResult, CACHE_TTL.tripAdvisorRanking);
        }
      } catch {
        // Individual hotel search failed — skip silently
      }
    });

    await Promise.allSettled(hotelSearches);

    // --- Pass 2: For hotels that got a rating but NO rank text, try a targeted search ---
    const missingRankOffers = topOffers.filter((offer) => {
      const ta = taData.get(offer.id);
      return !ta?.rankText; // No ranking found yet
    });

    if (missingRankOffers.length > 0) {
      const pass2Searches = missingRankOffers.map(async (offer) => {
        try {
          // Skip if we already have a ranking
          const existing = taData.get(offer.id);
          if (existing?.rankText) return;

          const cacheKey = taCacheKey(offer.name, location);

          // More targeted query specifically requesting ranking info
          const nameWords = offer.name
            .replace(/^(hotel|the)\s+/i, "")
            .split(/\s+/)
            .filter((w) => w.length > 1);
          const shortName = nameWords.slice(0, 2).join(" ");

          const params = new URLSearchParams({
            engine: "google",
            q: `"${shortName}" tripadvisor ${cityName} "of" hotels ranked`,
            api_key: apiKey,
            num: "3",
          });
          const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
            signal: AbortSignal.timeout(6000),
          });
          if (!res.ok) return;

          const data = await res.json();
          for (const r of (data.organic_results || [])) {
            const allText = `${r.snippet || ""} ${r.title || ""}`;
            const rankMatch = allText.match(/(?:#|ranked\s+#?)(\d+)\s+of\s+([\d,]+)\s+hotel/i);
            if (rankMatch) {
              const result: TAResult = {
                rating: existing?.rating || r.rich_snippet?.top?.detected_extensions?.rating,
                reviews: existing?.reviews || r.rich_snippet?.top?.detected_extensions?.reviews,
                rankText: `#${rankMatch[1]} of ${rankMatch[2]} hotels in ${location}`,
              };
              taData.set(offer.id, result);
              await cacheSet(cacheKey, result, CACHE_TTL.tripAdvisorRanking);
              return;
            }
          }
        } catch {
          // Pass 2 failed — keep whatever we had from pass 1
        }
      });

      await Promise.allSettled(pass2Searches);
    }

    // Enrich offers with TripAdvisor data
    return offers.map((offer) => {
      const ta = taData.get(offer.id);
      return {
        ...offer,
        tripAdvisorRating: ta?.rating || offer.tripAdvisorRating,
        tripAdvisorReviews: ta?.reviews || offer.tripAdvisorReviews,
        tripAdvisorRank: ta?.rankText || offer.tripAdvisorRank,
      };
    });
  } catch {
    // Don't fail the whole search if TripAdvisor enrichment fails
    return offers;
  }
}

function sanitizeError(error: string): string {
  const jsonStart = error.indexOf("{");
  if (jsonStart > 0) return error.substring(0, jsonStart).trim();
  if (error.length > 100) return error.substring(0, 100) + "...";
  return error;
}

function scoreHotels(offers: HotelOffer[], params: HotelSearchParams): HotelOffer[] {
  if (offers.length === 0) return offers;

  const prices = offers.map((o) => o.pricePerNight).filter((p) => p > 0);
  const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] || 0;

  return offers.map((offer) => {
    let score = 50;
    const notes: string[] = [];

    // Price scoring
    if (medianPrice > 0 && offer.pricePerNight > 0) {
      const ratio = offer.pricePerNight / medianPrice;
      if (ratio < 0.7) { score += 20; notes.push("Great price"); }
      else if (ratio < 0.9) { score += 10; notes.push("Below average price"); }
      else if (ratio > 1.3) { score -= 10; }
    }

    // Rating scoring
    if (offer.guestRating) {
      if (offer.guestRating >= 4.5) { score += 20; notes.push(`${offer.guestRatingText}`); }
      else if (offer.guestRating >= 4.0) { score += 10; notes.push(`${offer.guestRatingText}`); }
      else if (offer.guestRating < 3.0) { score -= 15; }
    }

    // Review count bonus
    if (offer.reviewCount && offer.reviewCount > 1000) {
      score += 5;
      notes.push(`${offer.reviewCount.toLocaleString()} reviews`);
    }

    // Free cancellation bonus
    if (offer.freeCancellation) {
      score += 5;
      notes.push("Free cancellation");
    }

    // Deal bonus
    if (offer.dealLabel) {
      score += 5;
      notes.push(offer.dealLabel);
    }

    // Star rating
    if (offer.starRating && offer.starRating >= 4) {
      score += 5;
    }

    // TripAdvisor ranking bonus
    if (offer.tripAdvisorRank) {
      const rankMatch = offer.tripAdvisorRank.match(/#(\d+)/);
      if (rankMatch) {
        const rank = parseInt(rankMatch[1]);
        if (rank <= 5) { score += 15; notes.push(`TripAdvisor Top 5`); }
        else if (rank <= 10) { score += 10; notes.push(`TripAdvisor Top 10`); }
        else if (rank <= 25) { score += 5; notes.push(`TripAdvisor Top 25`); }
      }
    }
    if (offer.tripAdvisorRating && offer.tripAdvisorRating >= 4.5) {
      score += 5;
    }

    return {
      ...offer,
      valueScore: Math.max(0, Math.min(100, score)),
      valueNotes: notes,
    };
  });
}

function sortHotels(offers: HotelOffer[], sortBy: string): HotelOffer[] {
  switch (sortBy) {
    case "price":
      return offers.sort((a, b) => a.pricePerNight - b.pricePerNight);
    case "rating":
      return offers.sort((a, b) => (b.guestRating || 0) - (a.guestRating || 0));
    case "value":
    default:
      return offers.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));
  }
}
