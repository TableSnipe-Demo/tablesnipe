const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let apiKey = "";

export function setApiKey(key: string) {
  apiKey = key;
}

export function getApiKey(): string {
  return apiKey;
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    apiKey = "";
    localStorage.removeItem("tablesnipe_key");
    window.location.reload();
  }
  return res;
}

export interface Monitor {
  id: number;
  restaurant_name: string;
  restaurant_id: string;
  party_size: number;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  weeks_ahead: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitorCreate {
  restaurant_name: string;
  restaurant_id: string;
  party_size: number;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  weeks_ahead: number;
  enabled: boolean;
}

export interface Notification {
  id: number;
  monitor_id: number;
  restaurant_name: string;
  slot_datetime: string;
  party_size: number;
  slot_hash: string | null;
  slot_token: string | null;
  status: string;
  sms_sid: string | null;
  created_at: string;
}

export interface Settings {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  user_phone_number: string;
  opentable_auth_token: string;
}

// Auth
export async function login(secret: string): Promise<{ status: string; token?: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });
  return res.json();
}

// Monitors
export async function getMonitors(): Promise<Monitor[]> {
  const res = await apiFetch("/api/monitors");
  return res.json();
}

export async function createMonitor(monitor: MonitorCreate): Promise<Monitor> {
  const res = await apiFetch("/api/monitors", {
    method: "POST",
    body: JSON.stringify(monitor),
  });
  return res.json();
}

export async function updateMonitor(id: number, updates: Partial<MonitorCreate>): Promise<Monitor> {
  const res = await apiFetch(`/api/monitors/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteMonitor(id: number): Promise<void> {
  await apiFetch(`/api/monitors/${id}`, { method: "DELETE" });
}

// Notifications
export async function getNotifications(limit = 50): Promise<Notification[]> {
  const res = await apiFetch(`/api/notifications?limit=${limit}`);
  return res.json();
}

// Settings
export async function getSettings(): Promise<Settings> {
  const res = await apiFetch("/api/settings");
  return res.json();
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const res = await apiFetch("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
  return res.json();
}

// Check now
export async function checkNow(): Promise<{ status: string; slots_found: number; results: unknown[] }> {
  const res = await apiFetch("/api/check-now", { method: "POST" });
  return res.json();
}
