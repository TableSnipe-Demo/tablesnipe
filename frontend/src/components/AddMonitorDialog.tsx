import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RestaurantSearch } from "@/components/RestaurantSearch";
import { createMonitor, type RestaurantSearchResult } from "@/lib/api";
import { Plus } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface AddMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddMonitorDialog({
  open,
  onOpenChange,
  onCreated,
}: AddMonitorDialogProps) {
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantSearchResult | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState(5); // Saturday
  const [timeStart, setTimeStart] = useState("18:00");
  const [timeEnd, setTimeEnd] = useState("21:00");
  const [partySize, setPartySize] = useState(2);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!selectedRestaurant) return;
    setSubmitting(true);
    try {
      await createMonitor({
        restaurant_id: selectedRestaurant.id,
        restaurant_name: selectedRestaurant.name,
        restaurant_image_url: selectedRestaurant.image_url,
        day_of_week: dayOfWeek,
        time_start: timeStart,
        time_end: timeEnd,
        party_size: partySize,
        weeks_ahead: weeksAhead,
      });
      onCreated();
      onOpenChange(false);
      // Reset form
      setSelectedRestaurant(null);
      setDayOfWeek(5);
      setTimeStart("18:00");
      setTimeEnd("21:00");
      setPartySize(2);
      setWeeksAhead(4);
    } catch (err) {
      console.error("Failed to create monitor:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-screen overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Reservation Monitor
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Restaurant Search */}
          <div className="space-y-2">
            <Label>Restaurant</Label>
            <RestaurantSearch onSelect={setSelectedRestaurant} />
            {selectedRestaurant && (
              <div className="flex items-center gap-2 rounded-md bg-accent p-2 text-sm">
                <span className="font-medium">{selectedRestaurant.name}</span>
                <span className="text-muted-foreground">
                  · {selectedRestaurant.city}
                </span>
              </div>
            )}
          </div>

          {/* Day of Week */}
          <div className="space-y-2">
            <Label>Day of Week</Label>
            <Select
              value={String(dayOfWeek)}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {DAYS.map((day, i) => (
                <option key={i} value={i}>
                  {day}
                </option>
              ))}
            </Select>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Earliest Time</Label>
              <Input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Latest Time</Label>
              <Input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Party Size */}
          <div className="space-y-2">
            <Label>Party Size</Label>
            <Select
              value={String(partySize)}
              onChange={(e) => setPartySize(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "person" : "people"}
                </option>
              ))}
            </Select>
          </div>

          {/* Weeks Ahead */}
          <div className="space-y-2">
            <Label>Weeks Ahead to Monitor</Label>
            <Select
              value={String(weeksAhead)}
              onChange={(e) => setWeeksAhead(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "week" : "weeks"}
                </option>
              ))}
            </Select>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!selectedRestaurant || submitting}
          >
            {submitting ? "Creating..." : "Start Monitoring"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
