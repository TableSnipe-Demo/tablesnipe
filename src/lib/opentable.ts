import { getSetting } from "./db";

const OPENTABLE_API_BASE = "https://mobile-api.opentable.com/api";

interface TimeSlot {
  dateTime: string;
  available: boolean;
  redemptionTier?: string;
  diningAreas?: {
    id: string;
    isDefaultArea: boolean;
    availableAttributes?: string[];
  }[];
  token?: string;
  slotHash?: string;
  points?: number;
  type?: string;
  attributes?: string[];
  priceAmount?: number;
}

interface AvailabilityResponse {
  dateTime: string;
  availability: {
    dateTime: string;
    noTimesReasons?: string[];
    minPartySize?: number;
    maxPartySize?: number;
    maxDaysInAdvance?: number;
    id: string;
    timeslots: TimeSlot[];
    dateMessages?: string[];
    token?: string;
    hasPremiumTables?: boolean;
    availabilityToken?: string;
  };
  suggestedAvailability?: unknown[];
  experienceList?: { results: unknown[] };
  hasPremiumTables?: boolean;
  dayAvailability?: Record<string, unknown>;
}

interface LockResponse {
  id: string;
  rid: string;
  date: string;
  partySize: number;
  offerLockId?: string;
  creditCardCancellationPolicy?: {
    cancellable: boolean;
    cancellationCutoffDate?: string;
  };
  occasions?: string[];
}

export interface AvailableSlot {
  dateTime: string;
  slotHash: string;
  slotToken: string;
  type: string;
  attributes: string[];
  restaurantId: string;
}

export async function checkAvailability(
  restaurantId: string,
  dateTime: string,
  partySize: number
): Promise<AvailableSlot[]> {
  const token = getSetting("opentable_token");
  if (!token) {
    throw new Error("OpenTable token not configured");
  }

  const response = await fetch(`${OPENTABLE_API_BASE}/v3/restaurant/availability`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent":
        "com.contextoptional.OpenTable/15.2.0.16; iPhone; iOS/15.1.1; 3.0;",
    },
    body: JSON.stringify({
      forceNextAvailable: "true",
      includeNextAvailable: true,
      availabilityToken:
        "eyJ2IjoyLCJtIjoxLCJwIjoxLCJzIjowLCJuIjowfQ",
      dateTime,
      requestTicket: "true",
      allowPop: true,
      attribution: { partnerId: "84" },
      partySize,
      includeOffers: true,
      requestPremium: "true",
      requestDateMessages: true,
      rids: [restaurantId],
      requestAttributeTables: "true",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OpenTable API error ${response.status}: ${text}`
    );
  }

  const data: AvailabilityResponse = await response.json();

  if (!data.availability?.timeslots) {
    return [];
  }

  return data.availability.timeslots
    .filter((slot) => slot.available)
    .map((slot) => ({
      dateTime: slot.dateTime,
      slotHash: slot.slotHash ?? "",
      slotToken: slot.token ?? "",
      type: slot.type ?? "Standard",
      attributes: slot.attributes ?? [],
      restaurantId,
    }));
}

export async function lockReservation(
  restaurantId: string,
  dateTime: string,
  partySize: number,
  slotHash: string
): Promise<LockResponse> {
  const token = getSetting("opentable_token");
  if (!token) {
    throw new Error("OpenTable token not configured");
  }

  const response = await fetch(`${OPENTABLE_API_BASE}/v1/reservation/${restaurantId}/lock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent":
        "com.contextoptional.OpenTable/15.2.0.16; iPhone; iOS/15.1.1; 3.0;",
    },
    body: JSON.stringify({
      partySize,
      dateTime,
      selectedDiningArea: {
        tableAttribute: "default",
        diningAreaId: "1",
      },
      hash: slotHash,
      attribution: { partnerId: "84" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenTable lock error ${response.status}: ${text}`);
  }

  return response.json();
}

export async function completeReservation(
  restaurantId: string,
  lockId: string,
  dateTime: string,
  partySize: number,
  slotHash: string,
  slotToken: string
): Promise<{ confirmationNumber: string }> {
  const token = getSetting("opentable_token");
  const gpid = getSetting("opentable_gpid");
  const dinerId = getSetting("opentable_diner_id");
  const phoneNumber = getSetting("opentable_phone");

  if (!token) throw new Error("OpenTable token not configured");

  const response = await fetch(
    `${OPENTABLE_API_BASE}/v1/reservation/${restaurantId}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent":
          "com.contextoptional.OpenTable/15.2.0.16; iPhone; iOS/15.1.1; 3.0;",
      },
      body: JSON.stringify({
        diningFormOptIn: true,
        partySize,
        gpid: gpid ?? "",
        countryId: "US",
        attribution: { partnerId: "84" },
        loyaltyProgramOptIn: false,
        optIns: {
          smsNotifications: {
            reservationSms: true,
            waitlistSms: false,
          },
          openTableDataSharing: {
            businessPartners: false,
            corporateGroup: false,
            pointOfSale: false,
          },
          dataSharing: {
            guestShare: false,
            dinerProfileShare: false,
            sync: false,
          },
          restaurantEmailMarketing: {
            restaurantEmails: false,
          },
          emailNotifications: {
            diningFeedback: false,
          },
          emailMarketing: {
            newHot: false,
            restaurantWeek: false,
            spotlight: false,
            product: false,
            promotional: false,
            insider: false,
            dinersChoice: false,
          },
        },
        hash: slotHash,
        slotAvailabilityToken: slotToken,
        selectedDiningArea: {
          diningAreaId: "1",
          tableAttribute: "default",
        },
        lockId,
        dinerId: dinerId ?? "",
        dateTime,
        number: phoneNumber ?? "",
        notes: "",
        loadInvitations: false,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenTable complete error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return {
    confirmationNumber: data.confirmationNumber ?? data.id ?? lockId,
  };
}

export async function searchRestaurants(
  query: string
): Promise<{ id: string; name: string; address: string; city: string }[]> {
  // Use the OpenTable autocomplete/search endpoint
  const response = await fetch(
    `https://www.opentable.com/dapi/fe/gql?optype=query&opname=Autocomplete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "ot-page-type": "eyJwYWdlVHlwZSI6ImhvbWUifQ",
      },
      body: JSON.stringify({
        operationName: "Autocomplete",
        variables: {
          term: query,
          latitude: 40.7128,
          longitude: -73.9876,
          useNewVersion: true,
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "4e12a9df87e4e20c3e46e13e8a81d1ca26d08c12be5b49b181ab5e5f8c709286",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    // Fallback: try the older REST API
    return searchRestaurantsLegacy(query);
  }

  try {
    const data = await response.json();
    const restaurants =
      data?.data?.autocomplete?.restaurants ?? [];
    return restaurants.map(
      (r: { restaurantId: number; name: string; neighborhood: string; locality: string }) => ({
        id: String(r.restaurantId),
        name: r.name,
        address: r.neighborhood ?? "",
        city: r.locality ?? "",
      })
    );
  } catch {
    return searchRestaurantsLegacy(query);
  }
}

async function searchRestaurantsLegacy(
  query: string
): Promise<{ id: string; name: string; address: string; city: string }[]> {
  const response = await fetch(
    `https://www.opentable.com/s?term=${encodeURIComponent(query)}&originCorrelationId=autocomplete&corrid=autocomplete`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) return [];

  try {
    const data = await response.json();
    const restaurants = data?.restaurants ?? data?.items ?? [];
    return restaurants.slice(0, 10).map(
      (r: { rid: number; restaurantId: number; name: string; streetAddress: string; neighborhood: string; city: string; locality: string }) => ({
        id: String(r.rid ?? r.restaurantId),
        name: r.name,
        address: r.streetAddress ?? r.neighborhood ?? "",
        city: r.city ?? r.locality ?? "",
      })
    );
  } catch {
    return [];
  }
}
