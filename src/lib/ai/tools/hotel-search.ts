// Hotel search tool — used by the LLM to search for hotels

import type { HotelSearchParams } from "@/lib/hotels/types";

export const HOTEL_SEARCH_TOOL = {
  name: "search_hotels",
  description:
    "Search for hotels in a city or area. Use this when the user asks about hotels, accommodation, or places to stay. Extract check-in/out dates, city, and preferences from the conversation.",
  input_schema: {
    type: "object" as const,
    properties: {
      location: {
        type: "string",
        description:
          "City or area to search (e.g., 'Lisbon', 'Tokyo Shinjuku', 'London near Heathrow'). Be specific if the user mentions a neighborhood.",
      },
      checkIn: {
        type: "string",
        description:
          "Check-in date in YYYY-MM-DD format. Use today's date from system prompt to calculate relative dates.",
      },
      checkOut: {
        type: "string",
        description: "Check-out date in YYYY-MM-DD format.",
      },
      guests: {
        type: "number",
        description: "Number of guests. Default to 1.",
      },
      rooms: {
        type: "number",
        description: "Number of rooms. Default to 1.",
      },
      minRating: {
        type: "number",
        description: "Minimum guest rating (1-5). Default to 4 for quality. Only go lower if user explicitly asks for budget options.",
      },
      hotelClass: {
        type: "number",
        description: "Minimum hotel star class (2-5). Default to 4 for business travelers. Use 3 for budget requests.",
      },
      maxPrice: {
        type: "number",
        description: "Maximum price per night in USD.",
      },
      sortBy: {
        type: "string",
        enum: ["price", "rating", "value"],
        description: "How to sort results. Default to 'value'.",
      },
    },
    required: ["location", "checkIn", "checkOut"],
  },
};

export function parseHotelToolCall(
  args: Record<string, unknown>
): HotelSearchParams {
  return {
    location: (args.location as string) || "",
    checkIn: (args.checkIn as string) || "",
    checkOut: (args.checkOut as string) || "",
    guests: (args.guests as number) || 1,
    rooms: (args.rooms as number) || 1,
    minRating: (args.minRating as number) || 4,
    hotelClass: (args.hotelClass as number) || 4,
    maxPrice: args.maxPrice as number | undefined,
    sortBy: (args.sortBy as HotelSearchParams["sortBy"]) || "value",
  };
}
