"use client";

import { useState, useEffect, useRef } from "react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface AddMonitorFormProps {
  onAdded: () => void;
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function AddMonitorForm({ onAdded }: AddMonitorFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [manualId, setManualId] = useState("");
  const [manualName, setManualName] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [partySize, setPartySize] = useState(2);
  const [selectedDays, setSelectedDays] = useState<number[]>([5, 6]); // Fri, Sat default
  const [timeStart, setTimeStart] = useState("19:00");
  const [timeEnd, setTimeEnd] = useState("21:00");
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/restaurants/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const restaurantId = useManual ? manualId : selectedRestaurant?.id;
    const restaurantName = useManual ? manualName : selectedRestaurant?.name;

    if (!restaurantId || !restaurantName) {
      setError("Please select or enter a restaurant");
      return;
    }

    if (selectedDays.length === 0) {
      setError("Please select at least one day");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          party_size: partySize,
          target_days: selectedDays,
          target_time_start: timeStart,
          target_time_end: timeEnd,
          weeks_ahead: weeksAhead,
        }),
      });

      if (res.ok) {
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create monitor");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5"
    >
      <h3 className="text-lg font-semibold">New Monitor</h3>

      {/* Restaurant Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-400">Restaurant</label>
          <button
            type="button"
            onClick={() => setUseManual(!useManual)}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            {useManual ? "Search instead" : "Enter ID manually"}
          </button>
        </div>

        {useManual ? (
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Restaurant ID (e.g. 211123)"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="w-full"
            />
            <input
              type="text"
              placeholder="Restaurant name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="w-full"
            />
          </div>
        ) : (
          <div className="relative">
            {selectedRestaurant ? (
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3">
                <div className="flex-1">
                  <div className="font-medium">{selectedRestaurant.name}</div>
                  <div className="text-xs text-gray-500">
                    {selectedRestaurant.address}
                    {selectedRestaurant.city
                      ? `, ${selectedRestaurant.city}`
                      : ""}
                    {" "}(ID: {selectedRestaurant.id})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRestaurant(null);
                    setSearchQuery("");
                  }}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                {searching && (
                  <div className="absolute right-3 top-2.5 text-xs text-gray-500">
                    Searching...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedRestaurant(r);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0"
                      >
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-gray-500">
                          {r.address}
                          {r.city ? `, ${r.city}` : ""} (ID: {r.id})
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Days of Week */}
      <div>
        <label className="text-sm text-gray-400 block mb-2">
          Days of Week
        </label>
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedDays.includes(day.value)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Earliest Time
          </label>
          <input
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Latest Time
          </label>
          <input
            type="time"
            value={timeEnd}
            onChange={(e) => setTimeEnd(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Party Size & Weeks Ahead */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Party Size
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(parseInt(e.target.value) || 2)}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">
            Weeks Ahead
          </label>
          <input
            type="number"
            min={1}
            max={12}
            value={weeksAhead}
            onChange={(e) => setWeeksAhead(parseInt(e.target.value) || 4)}
            className="w-full"
          />
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
      >
        {submitting ? "Creating..." : "Create Monitor"}
      </button>
    </form>
  );
}
