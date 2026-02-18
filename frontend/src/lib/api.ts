const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJSON(path: string, options?: RequestInit) {
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

// Restaurants
export const getRestaurants = () => fetchJSON("/api/restaurants");
export const createRestaurant = (data: {
  opentable_id: string;
  name: string;
  cuisine?: string;
  location?: string;
}) => fetchJSON("/api/restaurants", { method: "POST", body: JSON.stringify(data) });
export const deleteRestaurant = (id: number) =>
  fetchJSON(`/api/restaurants/${id}`, { method: "DELETE" });

// Monitors
export const getMonitors = () => fetchJSON("/api/monitors");
export const createMonitor = (data: {
  restaurant_id: number;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  party_size: number;
  weeks_ahead: number;
}) => fetchJSON("/api/monitors", { method: "POST", body: JSON.stringify(data) });
export const updateMonitor = (id: number, data: Record<string, unknown>) =>
  fetchJSON(`/api/monitors/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteMonitor = (id: number) =>
  fetchJSON(`/api/monitors/${id}`, { method: "DELETE" });
export const toggleMonitor = (id: number) =>
  fetchJSON(`/api/monitors/${id}/toggle`, { method: "POST" });

// Settings
export const getSettings = () => fetchJSON("/api/settings");
export const updateSettings = (data: Record<string, unknown>) =>
  fetchJSON("/api/settings", { method: "PUT", body: JSON.stringify(data) });

// Notifications
export const getNotifications = () => fetchJSON("/api/notifications");

// Slots
export const getSlots = () => fetchJSON("/api/slots");

// Manual check
export const checkNow = () => fetchJSON("/api/check-now", { method: "POST" });
