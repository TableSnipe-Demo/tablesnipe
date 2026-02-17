const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Settings {
  id: number;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  user_phone_number: string;
  opentable_auth_token: string;
  polling_enabled: boolean;
  polling_interval_minutes: number;
}

export interface Monitor {
  id: number;
  restaurant_id: string;
  restaurant_name: string;
  party_size: number;
  target_day_of_week: string;
  target_time: string;
  weeks_ahead: number;
  active: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  monitor_id: number;
  slot_datetime: string;
  slot_hash: string;
  status: string;
  created_at: string;
  responded_at: string | null;
}

export interface RestaurantResult {
  rid: string;
  name: string;
  locality: string;
  region: string;
  cuisine: string;
  price_range: string;
  rating: number | null;
  reviews_count: number | null;
}

export const api = {
  getSettings: () => request<Settings>("/api/settings"),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getMonitors: () => request<Monitor[]>("/api/monitors"),
  createMonitor: (data: Omit<Monitor, "id" | "active" | "created_at">) =>
    request<Monitor>("/api/monitors", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMonitor: (id: number, data: Partial<Monitor>) =>
    request<Monitor>(`/api/monitors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteMonitor: (id: number) =>
    request<void>(`/api/monitors/${id}`, { method: "DELETE" }),
  getNotifications: (limit = 50) =>
    request<Notification[]>(`/api/notifications?limit=${limit}`),
  searchRestaurants: (query: string) =>
    request<RestaurantResult[]>(`/api/restaurants/search?query=${encodeURIComponent(query)}`),
  triggerPoll: () =>
    request<{ status: string }>("/api/poll/trigger", { method: "POST" }),
};
