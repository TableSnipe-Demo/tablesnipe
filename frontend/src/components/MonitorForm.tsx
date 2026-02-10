import { useState } from "react";
import { api, MonitorCreate } from "@/lib/api";
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
import { Loader2 } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIMES = Array.from({ length: 26 }, (_, i) => {
  const hour = Math.floor(i / 2) + 11;
  const min = i % 2 === 0 ? "00" : "30";
  const displayHour = hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return {
    value: `${hour.toString().padStart(2, "0")}:${min}`,
    label: `${displayHour}:${min} ${ampm}`,
  };
});

function extractRestaurantId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const rIndex = parts.indexOf("r");
    if (rIndex !== -1 && rIndex + 1 < parts.length) {
      return parts[rIndex + 1];
    }
    return parts[parts.length - 1] || trimmed;
  } catch {
    return trimmed;
  }
}

interface MonitorFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function MonitorForm({ open, onClose, onCreated }: MonitorFormProps) {
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantUrl, setRestaurantUrl] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Friday");
  const [timeOfDay, setTimeOfDay] = useState("19:00");
  const [partySize, setPartySize] = useState("2");
  const [weeksAhead, setWeeksAhead] = useState("4");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!restaurantName.trim() || !restaurantUrl.trim()) return;
    setSubmitting(true);
    try {
      const data: MonitorCreate = {
        restaurant_name: restaurantName.trim(),
        restaurant_id: extractRestaurantId(restaurantUrl),
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
    setRestaurantName("");
    setRestaurantUrl("");
    setDayOfWeek("Friday");
    setTimeOfDay("19:00");
    setPartySize("2");
    setWeeksAhead("4");
  };

  const isValid = restaurantName.trim().length > 0 && restaurantUrl.trim().length > 0;

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
            <Label>Restaurant Name</Label>
            <Input
              placeholder="e.g. Carbone"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>OpenTable URL or Restaurant ID</Label>
            <Input
              placeholder="e.g. https://www.opentable.com/r/carbone-new-york"
              value={restaurantUrl}
              onChange={(e) => setRestaurantUrl(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Paste the full OpenTable restaurant link or just the restaurant slug/ID
            </p>
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
              disabled={!isValid || submitting}
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
