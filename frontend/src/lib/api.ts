const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface Monitor {
  id: number;
  restaurant_name: string;
  restaurant_id: string;
  day_of_week: string;
  time_of_day: string;
  party_size: number;
  weeks_ahead: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitorCreate {
  restaurant_name: string;
  restaurant_id: string;
  day_of_week: string;
  time_of_day: string;
  party_size: number;
  weeks_ahead: number;
}

export interface Booking {
  id: number;
  monitor_id: number;
  restaurant_name: string;
  restaurant_id: string;
  date: string;
  time: string;
  party_size: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  user_phone_number: string;
  opentable_api_key: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  locality: string;
  region: string;
  price_range: string;
  cuisine: string;
  image_url: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export const api = {
  getMonitors: () => request<Monitor[]>("/api/monitors"),
  createMonitor: (data: MonitorCreate) =>
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
    request<{ status: string }>(`/api/monitors/${id}`, { method: "DELETE" }),
  getBookings: () => request<Booking[]>("/api/bookings"),
  getSettings: () => request<Settings>("/api/settings"),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>("/api/settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  searchRestaurants: (query: string) =>
    request<Restaurant[]>(`/api/restaurants/search?query=${encodeURIComponent(query)}`),
  verifyPassword: (password: string) =>
    request<{ authenticated: boolean }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
};
