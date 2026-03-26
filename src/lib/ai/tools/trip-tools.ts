// Trip management tools — used by the LLM to create and manage trips

export const CREATE_TRIP_TOOL = {
  name: "create_trip",
  description:
    "Create a new trip when the user is planning travel. Use this when the user mentions a trip, vacation, business travel, or any multi-step journey. Create the trip early in the conversation so flight/hotel results can be attached to it later.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description:
          "A descriptive title for the trip (e.g., 'London to Tokyo Business Trip', 'Family Vacation to Lisbon', 'NYC Weekend Getaway').",
      },
      destinationCity: {
        type: "string",
        description: "Primary destination city name.",
      },
      destinationCountry: {
        type: "string",
        description: "Destination country name.",
      },
      startDate: {
        type: "string",
        description: "Trip start date in YYYY-MM-DD format. Use today's date from system prompt for relative dates.",
      },
      endDate: {
        type: "string",
        description: "Trip end date in YYYY-MM-DD format.",
      },
    },
    required: ["title"],
  },
};

export const ADD_FLIGHT_TO_TRIP_TOOL = {
  name: "add_flight_to_trip",
  description:
    "Add a flight segment to an existing trip. Use this after the user selects or confirms a flight from search results.",
  input_schema: {
    type: "object" as const,
    properties: {
      tripId: {
        type: "string",
        description: "The trip ID to add the flight to. Get this from the create_trip result.",
      },
      carrier: {
        type: "string",
        description: "Airline name (e.g., 'British Airways').",
      },
      flightNumber: {
        type: "string",
        description: "Flight number (e.g., 'BA117').",
      },
      origin: {
        type: "string",
        description: "Origin airport IATA code.",
      },
      destination: {
        type: "string",
        description: "Destination airport IATA code.",
      },
      departureTime: {
        type: "string",
        description: "Departure time as ISO 8601 string.",
      },
      arrivalTime: {
        type: "string",
        description: "Arrival time as ISO 8601 string.",
      },
      cabinClass: {
        type: "string",
        description: "Cabin class (economy, business, first).",
      },
      price: {
        type: "number",
        description: "Price in the booking currency.",
      },
      currency: {
        type: "string",
        description: "Currency code (e.g., USD, GBP).",
      },
    },
    required: ["tripId", "origin", "destination"],
  },
};

export const ADD_HOTEL_TO_TRIP_TOOL = {
  name: "add_hotel_to_trip",
  description:
    "Add a hotel stay to an existing trip. Use this when the user confirms a hotel booking.",
  input_schema: {
    type: "object" as const,
    properties: {
      tripId: {
        type: "string",
        description: "The trip ID to add the hotel to.",
      },
      hotelName: {
        type: "string",
        description: "Name of the hotel.",
      },
      address: {
        type: "string",
        description: "Hotel address.",
      },
      checkIn: {
        type: "string",
        description: "Check-in date/time as ISO 8601 string.",
      },
      checkOut: {
        type: "string",
        description: "Check-out date/time as ISO 8601 string.",
      },
      price: {
        type: "number",
        description: "Total price.",
      },
      currency: {
        type: "string",
        description: "Currency code.",
      },
    },
    required: ["tripId", "hotelName"],
  },
};

export const UPDATE_TRIP_SEGMENT_TOOL = {
  name: "update_trip_segment",
  description:
    "Update an existing flight or hotel segment in a trip. Use this when the user wants to change dates, times, prices, or other details of a segment already added to a trip. You need the segment ID which you can get from the trip details or from the context of the conversation.",
  input_schema: {
    type: "object" as const,
    properties: {
      segmentId: {
        type: "string",
        description: "The ID of the trip segment to update",
      },
      tripId: {
        type: "string",
        description: "The trip ID containing the segment",
      },
      departureTime: {
        type: "string",
        description: "Updated departure time (ISO 8601 datetime, e.g. 2026-04-04T08:00:00)",
      },
      arrivalTime: {
        type: "string",
        description: "Updated arrival time (ISO 8601 datetime)",
      },
      checkIn: {
        type: "string",
        description: "Updated hotel check-in date (YYYY-MM-DD)",
      },
      checkOut: {
        type: "string",
        description: "Updated hotel check-out date (YYYY-MM-DD)",
      },
      price: {
        type: "number",
        description: "Updated price",
      },
      currency: {
        type: "string",
        description: "Currency code (e.g. USD, GBP)",
      },
      notes: {
        type: "string",
        description: "Updated notes or special instructions",
      },
    },
    required: ["segmentId", "tripId"],
  },
};

export const ALL_TRIP_TOOLS = [
  CREATE_TRIP_TOOL,
  ADD_FLIGHT_TO_TRIP_TOOL,
  ADD_HOTEL_TO_TRIP_TOOL,
  UPDATE_TRIP_SEGMENT_TOOL,
];
