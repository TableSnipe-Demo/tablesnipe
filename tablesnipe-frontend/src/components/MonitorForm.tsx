import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchRestaurants, createMonitor, DAY_NAMES } from "../api";
import type { Restaurant } from "../api";
import { Search, Plus, PenLine } from "lucide-react";

interface MonitorFormProps {
  onCreated: () => void;
}

export default function MonitorForm({ onCreated }: MonitorFormProps) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualId, setManualId] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [targetTime, setTargetTime] = useState("19:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([5, 6]);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  const doSearch = useCallback(async () => {
    if (query.length < 2) return;
    setSearching(true);
    setSearchError(false);
    try {
      const res = await searchRestaurants(query);
      setResults(res);
      if (res.length === 0) setSearchError(true);
    } catch {
      setResults([]);
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  }, [query]);

  useEffect(() => {
    setSearchError(false);
    const timeout = setTimeout(() => {
      if (query.length >= 2) doSearch();
    }, 400);
    return () => clearTimeout(timeout);
  }, [query, doSearch]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const canSubmit = () => {
    if (daysOfWeek.length === 0) return false;
    if (mode === "search") return selected !== null;
    return manualName.trim().length > 0 && manualId.trim().length > 0;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    const restaurantName = mode === "search" ? selected!.name : manualName.trim();
    const restaurantId = mode === "search" ? selected!.id : manualId.trim();
    try {
      await createMonitor({
        restaurant_name: restaurantName,
        restaurant_id: restaurantId,
        party_size: partySize,
        target_time: targetTime,
        days_of_week: daysOfWeek,
        weeks_ahead: weeksAhead,
      });
      setSelected(null);
      setQuery("");
      setResults([]);
      setManualName("");
      setManualId("");
      setDaysOfWeek([5, 6]);
      onCreated();
    } catch (err) {
      console.error("Failed to create monitor:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Monitor
          </span>
          <div className="flex gap-1">
            <Button
              variant={mode === "search" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("search")}
            >
              <Search className="h-3.5 w-3.5 mr-1" />
              Search
            </Button>
            <Button
              variant={mode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("manual")}
            >
              <PenLine className="h-3.5 w-3.5 mr-1" />
              Manual
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Selection */}
        {mode === "search" ? (
        <div className="space-y-2">
          <Label>Restaurant</Label>
          {selected ? (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-green-50">
              <div className="flex-1">
                <p className="font-medium">{selected.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.locality}
                  {selected.region ? `, ${selected.region}` : ""} &middot; ID:{" "}
                  {selected.id}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search OpenTable restaurants..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {searching && (
                <p className="text-sm text-muted-foreground">Searching...</p>
              )}
              {results.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                      onClick={() => {
                        setSelected(r);
                        setResults([]);
                      }}
                    >
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.locality}
                        {r.region ? `, ${r.region}` : ""}
                        {r.cuisine ? ` · ${r.cuisine}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {searchError && !searching && query.length >= 2 && (
                <p className="text-sm text-muted-foreground">
                  No results found. Try the{" "}
                  <button
                    className="text-primary underline"
                    onClick={() => setMode("manual")}
                  >
                    manual entry
                  </button>{" "}
                  mode instead.
                </p>
              )}
            </div>
          )}
        </div>
        ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Restaurant Name</Label>
            <Input
              placeholder="e.g. Nobu Malibu"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>OpenTable Restaurant ID</Label>
            <Input
              placeholder="e.g. 123456"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find the ID from the OpenTable URL: opentable.com/r/restaurant-name-<strong>12345</strong>
            </p>
          </div>
        </div>
        )}

        {/* Party Size & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Party Size</Label>
            <Select
              value={String(partySize)}
              onValueChange={(v) => setPartySize(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "person" : "people"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Preferred Time</Label>
            <Input
              type="time"
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
            />
          </div>
        </div>

        {/* Days of Week */}
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <Button
                key={day}
                variant={daysOfWeek.includes(day) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDay(day)}
                className="min-w-16"
              >
                {DAY_NAMES[day].slice(0, 3)}
              </Button>
            ))}
          </div>
        </div>

        {/* Weeks Ahead */}
        <div className="space-y-2">
          <Label>Weeks Ahead to Monitor</Label>
          <Select
            value={String(weeksAhead)}
            onValueChange={(v) => setWeeksAhead(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} {n === 1 ? "week" : "weeks"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!canSubmit() || submitting}
        >
          {submitting ? "Creating..." : "Add Monitor"}
        </Button>
      </CardContent>
    </Card>
  );
}
