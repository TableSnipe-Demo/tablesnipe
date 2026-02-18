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
import { Search, Plus } from "lucide-react";

interface MonitorFormProps {
  onCreated: () => void;
}

export default function MonitorForm({ onCreated }: MonitorFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [targetTime, setTargetTime] = useState("19:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([5, 6]);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  const doSearch = useCallback(async () => {
    if (query.length < 2) return;
    setSearching(true);
    try {
      const res = await searchRestaurants(query);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  useEffect(() => {
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

  const handleSubmit = async () => {
    if (!selected || daysOfWeek.length === 0) return;
    setSubmitting(true);
    try {
      await createMonitor({
        restaurant_name: selected.name,
        restaurant_id: selected.id,
        party_size: partySize,
        target_time: targetTime,
        days_of_week: daysOfWeek,
        weeks_ahead: weeksAhead,
      });
      setSelected(null);
      setQuery("");
      setResults([]);
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
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Search */}
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
            </div>
          )}
        </div>

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
          disabled={!selected || daysOfWeek.length === 0 || submitting}
        >
          {submitting ? "Creating..." : "Add Monitor"}
        </Button>
      </CardContent>
    </Card>
  );
}
