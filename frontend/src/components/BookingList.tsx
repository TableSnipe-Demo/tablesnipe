import { Booking } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface BookingListProps {
  bookings: Booking[];
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  notified: "outline",
  confirmed: "default",
  denied: "secondary",
  failed: "destructive",
};

export function BookingList({ bookings }: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p className="text-lg font-medium">No bookings yet</p>
        <p className="text-sm mt-1">
          Bookings will appear here when slots are found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <Card key={b.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">
                  {b.restaurant_name}
                </h3>
                <Badge variant={STATUS_COLORS[b.status] || "outline"}>
                  {b.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>{b.date}</span>
                <span>{b.time}</span>
                <span>
                  {b.party_size} {b.party_size === 1 ? "guest" : "guests"}
                </span>
                <span>Booking #{b.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
