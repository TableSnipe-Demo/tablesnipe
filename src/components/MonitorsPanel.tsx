"use client";

import { useState, useEffect, useCallback } from "react";
import AddMonitorForm from "./AddMonitorForm";

interface Monitor {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  party_size: number;
  target_days: string;
  target_time_start: string;
  target_time_end: string;
  weeks_ahead: number;
  active: number;
  created_at: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonitorsPanel() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch("/api/monitors");
      if (res.ok) {
        const data = await res.json();
        setMonitors(data);
      }
    } catch (err) {
      console.error("Failed to fetch monitors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this monitor?")) return;
    await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    fetchMonitors();
  }

  async function handleToggle(id: string, currentActive: number) {
    await fetch(`/api/monitors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: currentActive ? 0 : 1 }),
    });
    fetchMonitors();
  }

  async function handlePollNow() {
    setPolling(true);
    setPollResult(null);
    try {
      const res = await fetch("/api/poll", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPollResult(
          `Checked ${data.monitorsChecked} monitors. Found ${data.slotsFound} slots, sent ${data.alertsSent} alerts.` +
            (data.errors?.length
              ? ` Errors: ${data.errors.join("; ")}`
              : "")
        );
      } else {
        setPollResult(`Error: ${data.error}`);
      }
    } catch {
      setPollResult("Failed to poll");
    } finally {
      setPolling(false);
    }
  }

  function formatDays(daysJson: string): string {
    try {
      const days: number[] = JSON.parse(daysJson);
      if (days.length === 0) return "No days selected";
      if (days.length === 7) return "Every day";
      return days.map((d) => DAY_NAMES[d]).join(", ");
    } catch {
      return daysJson;
    }
  }

  function formatTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-12">Loading monitors...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            {showAdd ? "Cancel" : "+ Add Monitor"}
          </button>
          <button
            onClick={handlePollNow}
            disabled={polling}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
          >
            {polling ? "Polling..." : "Poll Now"}
          </button>
        </div>
        <span className="text-xs text-gray-500">
          {monitors.length} monitor{monitors.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Poll result */}
      {pollResult && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
          {pollResult}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <AddMonitorForm
          onAdded={() => {
            setShowAdd(false);
            fetchMonitors();
          }}
        />
      )}

      {/* Monitor list */}
      {monitors.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No monitors yet</p>
          <p className="text-gray-600 text-sm">
            Add a monitor to start watching for reservations
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {monitors.map((monitor) => (
            <div
              key={monitor.id}
              className={`bg-gray-900 border rounded-xl p-5 transition-colors ${
                monitor.active
                  ? "border-gray-700"
                  : "border-gray-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {monitor.restaurant_name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        monitor.active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {monitor.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-400">
                    <div>
                      <span className="text-gray-600 text-xs block">Days</span>
                      {formatDays(monitor.target_days)}
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs block">Time</span>
                      {formatTime(monitor.target_time_start)} -{" "}
                      {formatTime(monitor.target_time_end)}
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs block">Party</span>
                      {monitor.party_size} guests
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs block">
                        Looking ahead
                      </span>
                      {monitor.weeks_ahead} weeks
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() =>
                      handleToggle(monitor.id, monitor.active)
                    }
                    className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                    title={monitor.active ? "Pause" : "Resume"}
                  >
                    {monitor.active ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(monitor.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
