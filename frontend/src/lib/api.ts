import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
});

// --- Types ---

export interface Monitor {
  id: number;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_image_url: string | null;
  day_of_week: number;
  time_start: string;
  time_end: string;
  party_size: number;
  weeks_ahead: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitorCreate {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_image_url?: string | null;
  day_of_week: number;
  time_start: string;
  time_end: string;
  party_size: number;
  weeks_ahead: number;
}

export interface MonitorUpdate {
  day_of_week?: number;
  time_start?: string;
  time_end?: string;
  party_size?: number;
  weeks_ahead?: number;
  active?: boolean;
}

export interface FoundSlot {
  id: number;
  monitor_id: number;
  date: string;
  time: string;
  party_size: number;
  booking_url: string | null;
  status: string;
  notified_at: string | null;
  created_at: string;
}

export interface RestaurantSearchResult {
  id: string;
  name: string;
  address: string;
  city: string;
  cuisine: string;
  price_range: string | null;
  rating: number | null;
  image_url: string | null;
  profile_url: string | null;
}

export interface AppSettings {
  user_phone: string | null;
  twilio_account_sid: string | null;
  twilio_auth_token_set: boolean;
  twilio_phone_number: string | null;
  poll_interval_minutes: number;
}

export interface SettingsUpdate {
  user_phone?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  poll_interval_minutes?: number;
}

export interface PollStatus {
  last_poll: string | null;
  next_poll: string | null;
  is_running: boolean;
  monitors_checked: number;
  slots_found: number;
}

// --- API functions ---

export async function getMonitors(): Promise<Monitor[]> {
  const { data } = await api.get("/api/monitors/");
  return data;
}

export async function createMonitor(monitor: MonitorCreate): Promise<Monitor> {
  const { data } = await api.post("/api/monitors/", monitor);
  return data;
}

export async function updateMonitor(
  id: number,
  update: MonitorUpdate
): Promise<Monitor> {
  const { data } = await api.put(`/api/monitors/${id}`, update);
  return data;
}

export async function deleteMonitor(id: number): Promise<void> {
  await api.delete(`/api/monitors/${id}`);
}

export async function getMonitorSlots(
  monitorId: number
): Promise<FoundSlot[]> {
  const { data } = await api.get(`/api/monitors/${monitorId}/slots`);
  return data;
}

export async function searchRestaurants(
  query: string
): Promise<RestaurantSearchResult[]> {
  const { data } = await api.get("/api/restaurants/search", {
    params: { query },
  });
  return data;
}

export async function getSettings(): Promise<AppSettings> {
  const { data } = await api.get("/api/settings/");
  return data;
}

export async function updateSettings(
  update: SettingsUpdate
): Promise<AppSettings> {
  const { data } = await api.put("/api/settings/", update);
  return data;
}

export async function getPollStatus(): Promise<PollStatus> {
  const { data } = await api.get("/api/poll/status");
  return data;
}

export async function triggerPoll(): Promise<{
  message: string;
  monitors_checked: number;
  slots_found: number;
}> {
  const { data } = await api.post("/api/poll/trigger");
  return data;
}
