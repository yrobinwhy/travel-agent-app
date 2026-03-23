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
