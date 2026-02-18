import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Notification } from "../api";
import { Bell } from "lucide-react";

interface NotificationListProps {
  notifications: Notification[];
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  declined: "secondary",
  booked: "default",
  expired: "secondary",
  failed: "destructive",
};

export default function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No notifications yet. Notifications will appear here when slots are found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Recent Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{n.restaurant_name}</p>
                <p className="text-xs text-muted-foreground">
                  {n.slot_datetime} &middot; {n.party_size}{" "}
                  {n.party_size === 1 ? "person" : "people"}
                </p>
                {n.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                )}
              </div>
              <Badge variant={statusColors[n.status] || "secondary"}>
                {n.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
