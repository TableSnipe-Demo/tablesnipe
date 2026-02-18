const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// ─── Types ───

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
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  cuisine: string;
  price: string;
  rating: string;
  photo_url: string;
}

export interface Settings {
  id: number;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_auth_token_masked: string;
  twilio_phone_number: string;
  user_phone_number: string;
  webhook_base_url: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  monitor_id: number;
  restaurant_name: string;
  slot_datetime: string;
  party_size: number;
  slot_hash: string;
  status: string;
  sms_sid: string;
  created_at: string;
  responded_at: string | null;
}

export interface PollLog {
  id: number;
  monitor_id: number;
  slots_found: number;
  polled_at: string;
  error: string;
}

// ─── API Functions ───

export async function searchRestaurants(q: string, lat?: number, lng?: number) {
  const params = new URLSearchParams({ q });
  if (lat !== undefined) params.set("lat", String(lat));
  if (lng !== undefined) params.set("lng", String(lng));
  return request<{ restaurants: Restaurant[] }>(`/api/restaurants/search?${params}`);
}

export async function getMonitors() {
  return request<{ monitors: Monitor[] }>("/api/monitors");
}

export async function createMonitor(data: Omit<Monitor, "id" | "created_at" | "updated_at">) {
  return request<{ monitor: Monitor }>("/api/monitors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMonitor(id: number, data: Partial<Monitor>) {
  return request<{ monitor: Monitor }>(`/api/monitors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMonitor(id: number) {
  return request<{ deleted: boolean }>(`/api/monitors/${id}`, { method: "DELETE" });
}

export async function getSettings() {
  return request<{ settings: Settings }>("/api/settings");
}

export async function updateSettings(data: Partial<Settings>) {
  return request<{ settings: Settings }>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getNotifications(limit = 50) {
  return request<{ notifications: Notification[] }>(`/api/notifications?limit=${limit}`);
}

export async function triggerPoll() {
  return request<{ status: string }>("/api/poll/trigger", { method: "POST" });
}

export async function getPollLog(limit = 50) {
  return request<{ logs: PollLog[] }>(`/api/poll-log?limit=${limit}`);
}
