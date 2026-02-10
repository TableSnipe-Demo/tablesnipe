import { useState, useEffect, useRef } from "react";
import { api, Restaurant, MonitorCreate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2 } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIMES = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 11;
  const min = i % 2 === 0 ? "00" : "30";
  const displayHour = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return {
    value: `${hour.toString().padStart(2, "0")}:${min}`,
    label: `${displayHour}:${min} ${ampm}`,
  };
});

interface MonitorFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function MonitorForm({ open, onClose, onCreated }: MonitorFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState("Friday");
  const [timeOfDay, setTimeOfDay] = useState("19:00");
  const [partySize, setPartySize] = useState("2");
  const [weeksAhead, setWeeksAhead] = useState("4");
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchRestaurants(searchQuery);
        setSearchResults(results);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [searchQuery]);

  const handleSelectRestaurant = (r: Restaurant) => {
    setSelectedRestaurant(r);
    setSearchQuery(r.name);
    setShowResults(false);
  };

  const handleSubmit = async () => {
    if (!selectedRestaurant) return;
    setSubmitting(true);
    try {
      const data: MonitorCreate = {
        restaurant_name: selectedRestaurant.name,
        restaurant_id: selectedRestaurant.id,
        day_of_week: dayOfWeek.toLowerCase(),
        time_of_day: timeOfDay,
        party_size: parseInt(partySize),
        weeks_ahead: parseInt(weeksAhead),
      };
      await api.createMonitor(data);
      onCreated();
      resetForm();
      onClose();
    } catch (err) {
      console.error("Failed to create monitor:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedRestaurant(null);
    setDayOfWeek("Friday");
    setTimeOfDay("19:00");
    setPartySize("2");
    setWeeksAhead("4");
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Reservation Monitor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Restaurant</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search OpenTable restaurants..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedRestaurant(null);
                }}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
              )}
            </div>
            {showResults && searchResults.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto bg-white shadow-lg">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRestaurant(r)}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-100 border-b last:border-0 transition-colors"
                  >
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-zinc-500">
                      {r.cuisine && `${r.cuisine} · `}
                      {r.locality}
                      {r.region && `, ${r.region}`}
                      {r.price_range && ` · ${r.price_range}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showResults && searchResults.length === 0 && !searching && (
              <p className="text-sm text-zinc-500">No restaurants found</p>
            )}
            {selectedRestaurant && (
              <div className="bg-zinc-50 rounded-md p-3 border">
                <div className="font-medium text-sm">
                  {selectedRestaurant.name}
                </div>
                <div className="text-xs text-zinc-500">
                  {selectedRestaurant.address},{" "}
                  {selectedRestaurant.locality}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={timeOfDay} onValueChange={setTimeOfDay}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Party Size</Label>
              <Select value={partySize} onValueChange={setPartySize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weeks Ahead</Label>
              <Select value={weeksAhead} onValueChange={setWeeksAhead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} {n === 1 ? "week" : "weeks"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedRestaurant || submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add Monitor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
