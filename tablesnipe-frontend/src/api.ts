const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface Restaurant {
  id: string;
  name: string;
  locality: string;
  region: string;
  cuisine: string;
}

export interface Monitor {
  id: number;
  restaurant_name: string;
  restaurant_id: string;
  party_size: number;
  target_time: string;
  days_of_week: number[];
  weeks_ahead: number;
  is_active: boolean;
  created_at: string | null;
}

export interface Notification {
  id: number;
  monitor_id: number;
  restaurant_name: string;
  slot_datetime: string;
  party_size: number;
  status: string;
  created_at: string | null;
}

export interface AppSettings {
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_from_number?: string;
  twilio_to_number?: string;
  opentable_bearer_token?: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function searchRestaurants(query: string): Promise<Restaurant[]> {
  const data = await fetchJson<{ restaurants: Restaurant[] }>(
    `/api/restaurants/search?q=${encodeURIComponent(query)}`
  );
  return data.restaurants;
}

export async function getMonitors(): Promise<Monitor[]> {
  const data = await fetchJson<{ monitors: Monitor[] }>("/api/monitors");
  return data.monitors;
}

export async function createMonitor(monitor: {
  restaurant_name: string;
  restaurant_id: string;
  party_size: number;
  target_time: string;
  days_of_week: number[];
  weeks_ahead: number;
}): Promise<Monitor> {
  return fetchJson<Monitor>("/api/monitors", {
    method: "POST",
    body: JSON.stringify(monitor),
  });
}

export async function updateMonitor(
  id: number,
  data: Partial<Monitor>
): Promise<Monitor> {
  return fetchJson<Monitor>(`/api/monitors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMonitor(id: number): Promise<void> {
  await fetchJson(`/api/monitors/${id}`, { method: "DELETE" });
}

export async function getNotifications(): Promise<Notification[]> {
  const data = await fetchJson<{ notifications: Notification[] }>(
    "/api/notifications"
  );
  return data.notifications;
}

export async function getSettings(): Promise<AppSettings> {
  const data = await fetchJson<{ settings: AppSettings }>("/api/settings");
  return data.settings;
}

export async function updateSettings(
  settings: Partial<AppSettings>
): Promise<void> {
  await fetchJson("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function triggerPoll(): Promise<void> {
  await fetchJson("/api/poll", { method: "POST" });
}

export const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};
