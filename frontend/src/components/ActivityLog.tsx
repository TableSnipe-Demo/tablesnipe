import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActivity, type FoundSlot } from "@/api";
import { Loader2, Clock, CalendarDays, Users, UtensilsCrossed } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  found: "bg-blue-100 text-blue-800",
  notified: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  denied: "bg-zinc-100 text-zinc-600",
  booked: "bg-emerald-100 text-emerald-800",
  expired: "bg-red-100 text-red-700",
};

export function ActivityLog() {
  const [slots, setSlots] = useState<FoundSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivity = async () => {
    try {
      const data = await getActivity(100);
      setSlots(data);
    } catch (err) {
      console.error("Failed to load activity:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
        <p className="text-zinc-500 text-sm">No activity yet</p>
        <p className="text-zinc-400 text-xs mt-1">
          Found reservations will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {slots.map((slot) => (
        <Card key={slot.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="font-medium text-sm truncate">{slot.restaurant_name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {slot.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {slot.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {slot.party_size}
                  </span>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={STATUS_COLORS[slot.status] || "bg-zinc-100 text-zinc-600"}
              >
                {slot.status}
              </Badge>
            </div>
            {slot.notified_at && (
              <p className="text-xs text-zinc-400 mt-2">
                Notified: {new Date(slot.notified_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
