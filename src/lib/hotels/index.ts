// Unified hotel search engine — queries multiple providers in parallel

import type {
  HotelSearchParams,
  HotelSearchResult,
  HotelOffer,
  HotelSearchProvider,
} from "./types";
import { serpapiHotelProvider } from "./providers/serpapi";

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
        error: result.reason?.message || "Unknown error",
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
    // Search for TripAdvisor top hotels in this city + get individual hotel ratings
    const searchParams = new URLSearchParams({
      engine: "google",
      q: `best hotels ${location} site:tripadvisor.com`,
      api_key: apiKey,
      num: "10",
    });

    const response = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`);
    if (!response.ok) return offers;

    const data = await response.json();
    const results = data.organic_results || [];

    // Extract total hotel count from title like "THE 10 BEST Hotels in Lisbon, Portugal 2026 (from $43)"
    const totalMatch = results[0]?.snippet?.match(/of\s+(\d[\d,]*)\s+hotel/i) ||
      results[0]?.title?.match(/(\d[\d,]*)\s+BEST/i);

    // Build a ranking map from snippets: "1. Hotel Da Baixa · 2. Corpo Santo..."
    const rankingMap = new Map<string, number>();
    for (const r of results) {
      const snippet = (r.snippet || "") + " " + (r.title || "");
      // Match patterns like "1. Hotel Name" or "· 1. Hotel Name"
      const matches = snippet.matchAll(/(\d+)\.\s+([^·•\d]+?)(?:\s*[·•]|\s*$)/g);
      for (const m of matches) {
        const rank = parseInt(m[1]);
        const name = m[2].trim();
        if (rank > 0 && name.length > 3) {
          rankingMap.set(name.toLowerCase(), rank);
        }
      }
    }

    // Also get individual hotel ratings from rich snippets
    // Do a batch search for our specific hotels
    const hotelNames = offers.slice(0, 5).map(o => o.name);
    const hotelSearchParams = new URLSearchParams({
      engine: "google",
      q: `${hotelNames.map(n => `"${n}"`).join(" OR ")} ${location} site:tripadvisor.com`,
      api_key: apiKey,
      num: "10",
    });

    const hotelResponse = await fetch(`https://serpapi.com/search.json?${hotelSearchParams.toString()}`);
    const hotelRichData = new Map<string, { rating: number; reviews: number }>();

    if (hotelResponse.ok) {
      const hotelData = await hotelResponse.json();
      for (const r of (hotelData.organic_results || [])) {
        const rich = r.rich_snippet?.top?.detected_extensions;
        if (rich?.rating) {
          // Match title to hotel name
          const title = (r.title || "").toLowerCase();
          for (const offer of offers) {
            if (title.includes(offer.name.toLowerCase().split(" ").slice(0, 2).join(" "))) {
              hotelRichData.set(offer.id, {
                rating: rich.rating,
                reviews: rich.reviews || 0,
              });
            }
          }
        }
      }
    }

    // Enrich offers
    return offers.map((offer) => {
      // Try to match hotel name to TripAdvisor ranking
      const nameLower = offer.name.toLowerCase();
      let rank: number | undefined;

      for (const [taName, taRank] of rankingMap) {
        // Fuzzy match: check if hotel names overlap significantly
        const offerWords = nameLower.split(/\s+/).filter(w => w.length > 3);
        const taWords = taName.split(/\s+/).filter(w => w.length > 3);
        const overlap = offerWords.filter(w => taWords.some(tw => tw.includes(w) || w.includes(tw)));
        if (overlap.length >= 2 || (overlap.length >= 1 && offerWords.length <= 2)) {
          rank = taRank;
          break;
        }
      }

      const richData = hotelRichData.get(offer.id);
      const totalHotels = totalMatch ? totalMatch[1].replace(",", "") : undefined;

      return {
        ...offer,
        tripAdvisorRating: richData?.rating || offer.tripAdvisorRating,
        tripAdvisorReviews: richData?.reviews || offer.tripAdvisorReviews,
        tripAdvisorRank: rank && totalHotels
          ? `#${rank} of ${totalHotels} hotels in ${location}`
          : rank
            ? `#${rank} in ${location}`
            : offer.tripAdvisorRank,
      };
    });
  } catch {
    // Don't fail the whole search if TripAdvisor enrichment fails
    return offers;
  }
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
