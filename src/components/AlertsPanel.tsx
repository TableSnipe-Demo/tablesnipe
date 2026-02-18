"use client";

import { useState, useEffect, useCallback } from "react";

interface Alert {
  id: string;
  monitor_id: string;
  restaurant_name: string;
  date: string;
  time_slot: string;
  slot_hash: string | null;
  status: string;
  twilio_message_sid: string | null;
  booking_confirmation: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  booked: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-gray-600/20 text-gray-400",
  expired: "bg-gray-600/20 text-gray-500",
  error: "bg-red-500/20 text-red-400",
};

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  function formatTime(dateTimeStr: string): string {
    const timePart = dateTimeStr.includes("T")
      ? dateTimeStr.split("T")[1]
      : dateTimeStr;
    const [hours, minutes] = timePart.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-12">Loading alerts...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg mb-2">No alerts yet</p>
        <p className="text-gray-600 text-sm">
          Alerts will appear here when availability is found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Alerts</h2>
        <button
          onClick={fetchAlerts}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{alert.restaurant_name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    STATUS_COLORS[alert.status] ?? "bg-gray-700 text-gray-400"
                  }`}
                >
                  {alert.status}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {formatDate(alert.date)} at {formatTime(alert.time_slot)}
              </div>
              {alert.booking_confirmation && (
                <div className="text-sm text-emerald-400 mt-1">
                  Confirmation: {alert.booking_confirmation}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600">
              {alert.id.slice(0, 6)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
