import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchRestaurants, createMonitor, type Restaurant } from "@/lib/api";
import { Search, Plus, Loader2 } from "lucide-react";

const DAYS = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

const TIMES = Array.from({ length: 29 }, (_, i) => {
  const totalMinutes = 11 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  const label = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  return { value: time, label };
});

interface MonitorFormProps {
  onCreated: () => void;
}

export function MonitorForm({ onCreated }: MonitorFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([4, 5, 6]);
  const [timeStart, setTimeStart] = useState("18:00");
  const [timeEnd, setTimeEnd] = useState("21:00");
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [creating, setCreating] = useState(false);

  const doSearch = useCallback(async () => {
    if (query.length < 2) return;
    setSearching(true);
    try {
      const data = await searchRestaurants(query);
      setResults(data.restaurants);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) doSearch();
    }, 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleCreate = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      await createMonitor({
        restaurant_id: selected.id,
        restaurant_name: selected.name,
        party_size: partySize,
        days_of_week: daysOfWeek,
        time_start: timeStart,
        time_end: timeEnd,
        weeks_ahead: weeksAhead,
        active: true,
      });
      setSelected(null);
      setQuery("");
      setResults([]);
      setDaysOfWeek([4, 5, 6]);
      setTimeStart("18:00");
      setTimeEnd("21:00");
      setWeeksAhead(4);
      setPartySize(2);
      onCreated();
    } catch (err) {
      console.error("Failed to create monitor:", err);
    } finally {
      setCreating(false);
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
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{selected.name}</p>
                <p className="text-sm text-zinc-500">
                  {[selected.address, selected.city, selected.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <Button
                variant="ghost"
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
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search restaurants on OpenTable..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-zinc-400" />
              )}
              {results.length > 0 && !selected && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-50 border-b last:border-0"
                      onClick={() => {
                        setSelected(r);
                        setResults([]);
                      }}
                    >
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-zinc-500">
                        {[r.cuisine, r.city, r.state].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Party Size */}
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
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} {n === 1 ? "person" : "people"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Days of Week */}
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <Checkbox
                  checked={daysOfWeek.includes(day.value)}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Earliest Time</Label>
            <Select value={timeStart} onValueChange={setTimeStart}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Latest Time</Label>
            <Select value={timeEnd} onValueChange={setTimeEnd}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {[1, 2, 3, 4, 6, 8, 10, 12].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} {n === 1 ? "week" : "weeks"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Submit */}
        <Button
          onClick={handleCreate}
          disabled={!selected || daysOfWeek.length === 0 || creating}
          className="w-full"
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Monitor
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
