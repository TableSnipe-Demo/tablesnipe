const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }
  return res.json();
}

export interface Monitor {
  id: number;
  restaurant_id: string;
  restaurant_name: string;
  party_size: number;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  weeks_ahead: number;
  active: boolean;
  created_at: string;
}

export interface FoundSlot {
  id: number;
  monitor_id: number;
  restaurant_name: string;
  date: string;
  time: string;
  party_size: number;
  slot_token: string;
  slot_hash: string;
  status: string;
  notified_at: string | null;
  created_at: string;
}

export interface Settings {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_auth_token_masked?: string;
  twilio_phone_number: string;
  user_phone_number: string;
  opentable_bearer_token: string;
  opentable_bearer_token_masked?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  price: string;
  rating: number;
  city: string;
}

// Monitors
export const getMonitors = (): Promise<Monitor[]> => request("/api/monitors");
export const createMonitor = (data: Omit<Monitor, "id" | "created_at">): Promise<Monitor> =>
  request("/api/monitors", { method: "POST", body: JSON.stringify(data) });
export const updateMonitor = (id: number, data: Partial<Monitor>): Promise<Monitor> =>
  request(`/api/monitors/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteMonitor = (id: number): Promise<void> =>
  request(`/api/monitors/${id}`, { method: "DELETE" });
export const manualCheck = (id: number): Promise<{ message: string; slots_found: number }> =>
  request(`/api/monitors/${id}/check`, { method: "POST" });
export const checkAll = (): Promise<{ message: string }> =>
  request("/api/check-all", { method: "POST" });

// Settings
export const getSettings = (): Promise<Settings> => request("/api/settings");
export const saveSettings = (data: Partial<Settings>): Promise<Settings> =>
  request("/api/settings", { method: "POST", body: JSON.stringify(data) });

// Restaurant search
export const searchRestaurants = (query: string): Promise<Restaurant[]> =>
  request(`/api/restaurants/search?query=${encodeURIComponent(query)}`);

// Activity
export const getActivity = (limit?: number): Promise<FoundSlot[]> =>
  request(`/api/activity${limit ? `?limit=${limit}` : ""}`);
