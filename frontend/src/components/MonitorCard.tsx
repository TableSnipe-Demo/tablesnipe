import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  updateMonitor,
  deleteMonitor,
  getMonitorSlots,
  type Monitor,
  type FoundSlot,
} from "@/lib/api";
import {
  Trash2,
  Clock,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
} from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface MonitorCardProps {
  monitor: Monitor;
  onUpdate: () => void;
}

export function MonitorCard({ monitor, onUpdate }: MonitorCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [slots, setSlots] = useState<FoundSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  async function handleToggle(active: boolean) {
    try {
      await updateMonitor(monitor.id, { active });
      onUpdate();
    } catch (err) {
      console.error("Failed to toggle monitor:", err);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this monitor?")) return;
    setDeleting(true);
    try {
      await deleteMonitor(monitor.id);
      onUpdate();
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleSlots() {
    if (!showSlots) {
      setLoadingSlots(true);
      try {
        const data = await getMonitorSlots(monitor.id);
        setSlots(data);
      } catch (err) {
        console.error("Failed to load slots:", err);
      } finally {
        setLoadingSlots(false);
      }
    }
    setShowSlots(!showSlots);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "found":
        return <Badge variant="secondary">Found</Badge>;
      case "notified":
        return <Badge>Notified</Badge>;
      case "accepted":
        return <Badge className="bg-green-600 hover:bg-green-700">Accepted</Badge>;
      case "declined":
        return <Badge variant="destructive">Declined</Badge>;
      case "booked":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Booked</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <Card className={!monitor.active ? "opacity-60" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Restaurant info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {monitor.restaurant_image_url ? (
              <img
                src={monitor.restaurant_image_url}
                alt={monitor.restaurant_name}
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {monitor.restaurant_name}
              </h3>

              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {DAYS[monitor.day_of_week]}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {monitor.time_start} – {monitor.time_end}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {monitor.party_size}
                </span>
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                Looking {monitor.weeks_ahead} {monitor.weeks_ahead === 1 ? "week" : "weeks"} ahead
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Switch
              checked={monitor.active}
              onCheckedChange={handleToggle}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleting}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Found slots section */}
        <div className="mt-3 border-t pt-3">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleToggleSlots}
          >
            {showSlots ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Found Reservations
          </button>

          {showSlots && (
            <div className="mt-2 space-y-2">
              {loadingSlots && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
              {!loadingSlots && slots.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No reservations found yet. Polling continues automatically.
                </div>
              )}
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-md bg-accent/50 p-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{slot.date}</span>
                      <span className="text-muted-foreground"> at </span>
                      <span className="font-medium">{slot.time}</span>
                    </div>
                    {getStatusBadge(slot.status)}
                  </div>
                  {slot.booking_url && (
                    <a
                      href={slot.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Book <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
