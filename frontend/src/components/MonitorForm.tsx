import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { searchRestaurants, type Restaurant, type Monitor } from "@/api";
import { Search, Loader2 } from "lucide-react";

const DAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

interface MonitorFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    restaurant_id: string;
    restaurant_name: string;
    party_size: number;
    days_of_week: number[];
    time_start: string;
    time_end: string;
    weeks_ahead: number;
    active: boolean;
  }) => void;
  editMonitor?: Monitor | null;
}

export function MonitorForm({ open, onClose, onSubmit, editMonitor }: MonitorFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<{ id: string; name: string } | null>(null);
  const [manualId, setManualId] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([4, 5]); // Fri, Sat
  const [timeStart, setTimeStart] = useState("18:00");
  const [timeEnd, setTimeEnd] = useState("21:00");
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (editMonitor) {
      setSelectedRestaurant({ id: editMonitor.restaurant_id, name: editMonitor.restaurant_name });
      setPartySize(editMonitor.party_size);
      setDaysOfWeek(editMonitor.days_of_week);
      setTimeStart(editMonitor.time_start);
      setTimeEnd(editMonitor.time_end);
      setWeeksAhead(editMonitor.weeks_ahead);
      setActive(editMonitor.active);
    } else {
      setSelectedRestaurant(null);
      setPartySize(2);
      setDaysOfWeek([4, 5]);
      setTimeStart("18:00");
      setTimeEnd("21:00");
      setWeeksAhead(4);
      setActive(true);
    }
    setSearchQuery("");
    setSearchResults([]);
    setManualId("");
  }, [editMonitor, open]);

  const doSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchRestaurants(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = () => {
    if (!selectedRestaurant) return;
    onSubmit({
      restaurant_id: selectedRestaurant.id,
      restaurant_name: selectedRestaurant.name,
      party_size: partySize,
      days_of_week: daysOfWeek,
      time_start: timeStart,
      time_end: timeEnd,
      weeks_ahead: weeksAhead,
      active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMonitor ? "Edit Monitor" : "Add Monitor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Restaurant Search */}
          <div className="space-y-2">
            <Label>Restaurant</Label>
            {selectedRestaurant ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-zinc-50">
                <span className="font-medium text-sm">{selectedRestaurant.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRestaurant(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder="Search OpenTable restaurants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && doSearch()}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={doSearch} disabled={searching} size="sm">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors"
                        onClick={() => setSelectedRestaurant({ id: r.id, name: r.name })}
                      >
                        <div className="font-medium text-sm">{r.name}</div>
                        <div className="text-xs text-zinc-500">
                          {[r.cuisine, r.neighborhood, r.city].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-zinc-500">
                  Or enter a restaurant ID manually:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Restaurant ID (e.g. 211123)"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualId.trim()) {
                        setSelectedRestaurant({ id: manualId.trim(), name: `Restaurant #${manualId.trim()}` });
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (manualId.trim()) {
                        setSelectedRestaurant({ id: manualId.trim(), name: `Restaurant #${manualId.trim()}` });
                      }
                    }}
                    disabled={!manualId.trim()}
                  >
                    Set
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Party Size */}
          <div className="space-y-2">
            <Label>Party Size</Label>
            <Select value={String(partySize)} onValueChange={(v) => setPartySize(Number(v))}>
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

          {/* Days of Week */}
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="flex gap-1">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                    daysOfWeek.includes(day.value)
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Earliest Time</Label>
              <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Latest Time</Label>
              <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
            </div>
          </div>

          {/* Weeks Ahead */}
          <div className="space-y-2">
            <Label>Weeks Ahead to Monitor</Label>
            <Select value={String(weeksAhead)} onValueChange={(v) => setWeeksAhead(Number(v))}>
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

          {/* Active */}
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!selectedRestaurant}>
              {editMonitor ? "Save Changes" : "Add Monitor"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
