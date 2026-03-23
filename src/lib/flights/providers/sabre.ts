import type {
  FlightSearchProvider,
  FlightSearchParams,
  FlightOffer,
  FlightSegment,
} from "../types";

// Sabre API endpoints
const SABRE_ENDPOINTS = {
  sandbox: "https://api-crt.cert.havail.sabre.com",
  production: "https://api.platform.sabre.com",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.token;
  }

  const clientId = process.env.SABRE_CLIENT_ID;
  const clientSecret = process.env.SABRE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SABRE_CLIENT_ID or SABRE_CLIENT_SECRET not set");
  }

  const env = (process.env.SABRE_ENVIRONMENT || "sandbox") as keyof typeof SABRE_ENDPOINTS;
  const baseUrl = SABRE_ENDPOINTS[env] || SABRE_ENDPOINTS.sandbox;

  // Sabre's double-base64 encoding: base64(base64(clientId):base64(clientSecret))
  const clientIdB64 = Buffer.from(clientId).toString("base64");
  const clientSecretB64 = Buffer.from(clientSecret).toString("base64");
  const credentials = Buffer.from(`${clientIdB64}:${clientSecretB64}`).toString("base64");

  const response = await fetch(`${baseUrl}/v2/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Sabre auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 604800) * 1000,
  };

  return cachedToken.token;
}

function getBaseUrl(): string {
  const env = (process.env.SABRE_ENVIRONMENT || "sandbox") as keyof typeof SABRE_ENDPOINTS;
  return SABRE_ENDPOINTS[env] || SABRE_ENDPOINTS.sandbox;
}

function mapCabinCode(cabin: FlightSearchParams["cabinClass"]): string {
  switch (cabin) {
    case "first": return "F";
    case "business": return "C";
    case "premium_economy": return "S";
    default: return "Y";
  }
}

function parseSabreDuration(departureTime: string, arrivalTime: string): string {
  try {
    const dep = new Date(departureTime);
    const arr = new Date(arrivalTime);
    const diffMs = arr.getTime() - dep.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  } catch {
    return "0h 0m";
  }
}

export const sabreProvider: FlightSearchProvider = {
  name: "sabre",

  isAvailable(): boolean {
    return !!(process.env.SABRE_CLIENT_ID && process.env.SABRE_CLIENT_SECRET);
  },

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    const token = await getToken();
    const baseUrl = getBaseUrl();

    const requestBody = {
      OTA_AirLowFareSearchRQ: {
        Version: "1",
        POS: {
          Source: [{
            PseudoCityCode: "F9CE",
            RequestorID: {
              Type: "1",
              ID: "1",
              CompanyName: { Code: "TN" },
            },
          }],
        },
        OriginDestinationInformation: [
          {
            RPH: "1",
            DepartureDateTime: {
              content: `${params.departureDate}T11:00:00`,
            },
            OriginLocation: { LocationCode: params.origin },
            DestinationLocation: { LocationCode: params.destination },
          },
          ...(params.returnDate
            ? [{
                RPH: "2",
                DepartureDateTime: {
                  content: `${params.returnDate}T11:00:00`,
                },
                OriginLocation: { LocationCode: params.destination },
                DestinationLocation: { LocationCode: params.origin },
              }]
            : []),
        ],
        TravelPreferences: {
          CabinPref: [{
            Cabin: mapCabinCode(params.cabinClass),
            PreferLevel: "Preferred",
          }],
          ...(params.maxStops !== undefined && {
            MaxStopsQuantity: params.maxStops,
          }),
        },
        TravelerInfoSummary: {
          AirTravelerAvail: [{
            PassengerTypeQuantity: [{
              Code: "ADT",
              Quantity: params.passengers,
            }],
          }],
        },
        TPA_Extensions: {
          IntelliSellTransaction: {
            RequestType: { Name: "50ITINS" },
          },
        },
      },
    };

    const response = await fetch(`${baseUrl}/v1/shop/flights?mode=live`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sabre search failed (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const rs = data.OTA_AirLowFareSearchRS;

    if (!rs) {
      // Check if it's a top-level error
      const msg = data.message || data.errorCode || "Unknown Sabre error";
      throw new Error(`Sabre: ${msg}`);
    }

    const itineraries = rs?.PricedItineraries?.PricedItinerary || [];

    return itineraries.slice(0, 50).map((itin: Record<string, unknown>, idx: number) => {
      return parseItinerary(itin, idx, params);
    }).filter(Boolean) as FlightOffer[];
  },
};

function parseItinerary(
  itin: Record<string, unknown>,
  idx: number,
  params: FlightSearchParams
): FlightOffer | null {
  try {
    const airItinerary = itin.AirItinerary as Record<string, unknown>;
    const pricingInfo = ((itin.AirItineraryPricingInfo as unknown[]) || [{}])[0] as Record<string, unknown>;
    const totalFare = ((pricingInfo.ItinTotalFare as Record<string, unknown>) || {}).TotalFare as Record<string, unknown> || {};

    const odOptions = ((airItinerary?.OriginDestinationOptions as Record<string, unknown>)
      ?.OriginDestinationOption as unknown[]) || [];

    // Parse outbound segments
    const outboundOption = odOptions[0] as Record<string, unknown> | undefined;
    const flightSegments = (outboundOption?.FlightSegment as unknown[]) || [];

    const outbound: FlightSegment[] = flightSegments.map((seg: unknown) => {
      const s = seg as Record<string, unknown>;
      const marketing = s.MarketingAirline as Record<string, unknown> || {};
      const operating = s.OperatingAirline as Record<string, unknown> || {};
      const depAirport = s.DepartureAirport as Record<string, unknown> || {};
      const arrAirport = s.ArrivalAirport as Record<string, unknown> || {};

      return {
        airline: (marketing.Code as string) || "",
        airlineName: (marketing.Code as string) || (operating.Code as string) || "",
        flightNumber: `${marketing.Code || ""}${s.FlightNumber || ""}`,
        aircraft: (s.Equipment as Record<string, unknown>)?.AirEquipType as string || undefined,
        origin: (depAirport.LocationCode as string) || "",
        originName: (depAirport.LocationCode as string) || "",
        destination: (arrAirport.LocationCode as string) || "",
        destinationName: (arrAirport.LocationCode as string) || "",
        departureTime: (s.DepartureDateTime as string) || "",
        arrivalTime: (s.ArrivalDateTime as string) || "",
        duration: parseSabreDuration(
          (s.DepartureDateTime as string) || "",
          (s.ArrivalDateTime as string) || ""
        ),
        cabinClass: mapCabinName((s.ResBookDesigCode as string) || "Y"),
      };
    });

    if (outbound.length === 0) return null;

    // Calculate total duration from first departure to last arrival
    const firstDep = outbound[0].departureTime;
    const lastArr = outbound[outbound.length - 1].arrivalTime;
    const totalDuration = parseSabreDuration(firstDep, lastArr);

    const price = parseFloat(totalFare.Amount as string) || 0;
    const currency = (totalFare.CurrencyCode as string) || "USD";

    // Unique airlines
    const airlines = [...new Set(outbound.map((s) => s.airlineName))];

    return {
      id: `sabre-${idx}-${outbound[0].flightNumber}`,
      provider: "sabre",
      providerOfferId: `sabre-${idx}`,
      totalPrice: price,
      currency,
      pricePerPassenger: price / (params.passengers || 1),
      outbound,
      totalDuration,
      stops: Math.max(0, outbound.length - 1),
      airlines,
      bookable: false, // Sabre sandbox = not bookable yet
      refundable: undefined,
      changeable: undefined,
    };
  } catch {
    return null;
  }
}

function mapCabinName(code: string): string {
  switch (code.toUpperCase()) {
    case "F": case "A": case "P": return "First";
    case "C": case "D": case "J": case "I": return "Business";
    case "W": case "S": return "Premium Economy";
    default: return "Economy";
  }
}
