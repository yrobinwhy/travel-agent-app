// Flight search tool — used by the LLM to search for flights

import type { FlightSearchParams } from "@/lib/flights/types";

/**
 * Tool definition for the LLM to call when user asks about flights
 */
export const FLIGHT_SEARCH_TOOL = {
  name: "search_flights",
  description:
    "Search for flights between airports. Use this whenever the user asks to find flights, check prices, or compare options. Extract the details from the conversation.",
  input_schema: {
    type: "object" as const,
    properties: {
      origin: {
        type: "string",
        description:
          "Origin airport IATA code (e.g., JFK, LHR, LAX). If user gives a city name, convert to the main airport code.",
      },
      destination: {
        type: "string",
        description:
          "Destination airport IATA code (e.g., NRT, LAS, CDG). If user gives a city name, convert to the main airport code.",
      },
      departureDate: {
        type: "string",
        description:
          "Departure date in YYYY-MM-DD format. If user says 'tomorrow', 'next friday', etc., calculate the actual date.",
      },
      returnDate: {
        type: "string",
        description:
          "Return date in YYYY-MM-DD format. Only include if user wants a round trip.",
      },
      passengers: {
        type: "number",
        description: "Number of passengers. Default to 1 if not specified.",
      },
      cabinClass: {
        type: "string",
        enum: ["economy", "premium_economy", "business", "first"],
        description:
          "Cabin class. Default to 'business' as the user prefers business class unless otherwise stated.",
      },
      maxStops: {
        type: "number",
        description:
          "Maximum number of stops. 0 for non-stop only. Leave out if user has no preference.",
      },
      sortBy: {
        type: "string",
        enum: ["price", "duration", "departure", "value"],
        description:
          "How to sort results. Default to 'value' for best value optimization.",
      },
      pointOfSale: {
        type: "string",
        description:
          "Country code for point-of-sale pricing (e.g., 'US', 'IN', 'GB'). Use this to check if booking from a different country gives better prices.",
      },
    },
    required: ["origin", "destination", "departureDate"],
  },
};

/**
 * Parse LLM tool call into search params
 */
export function parseToolCall(
  args: Record<string, unknown>
): FlightSearchParams {
  return {
    origin: (args.origin as string || "").toUpperCase(),
    destination: (args.destination as string || "").toUpperCase(),
    departureDate: args.departureDate as string,
    returnDate: args.returnDate as string | undefined,
    passengers: (args.passengers as number) || 1,
    cabinClass:
      (args.cabinClass as FlightSearchParams["cabinClass"]) || "business",
    maxStops: args.maxStops as number | undefined,
    sortBy:
      (args.sortBy as FlightSearchParams["sortBy"]) || "value",
    pointOfSale: args.pointOfSale as string | undefined,
  };
}
