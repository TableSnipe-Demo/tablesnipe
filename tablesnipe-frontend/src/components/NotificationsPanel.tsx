import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, XCircle, Send, Link, AlertTriangle } from "lucide-react";
import { Notification, getNotifications } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-400", icon: <Bell className="h-3.5 w-3.5" /> },
  sent: { label: "Sent", color: "bg-blue-500/10 text-blue-400", icon: <Send className="h-3.5 w-3.5" /> },
  confirmed: { label: "Booked", color: "bg-emerald-500/10 text-emerald-400", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  declined: { label: "Declined", color: "bg-zinc-500/10 text-zinc-400", icon: <XCircle className="h-3.5 w-3.5" /> },
  link_sent: { label: "Link Sent", color: "bg-purple-500/10 text-purple-400", icon: <Link className="h-3.5 w-3.5" /> },
  error: { label: "Error", color: "bg-red-500/10 text-red-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const dt = new Date(iso);
      return dt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-12 w-12 text-zinc-700 mb-4" />
        <p className="text-zinc-400 text-lg">No notifications yet</p>
        <p className="text-zinc-500 text-sm mt-1">
          Notifications will appear here when available slots are found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((n) => {
        const status = STATUS_CONFIG[n.status] || STATUS_CONFIG.pending;
        return (
          <Card key={n.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-zinc-100 truncate">
                    {n.restaurant_name}
                  </p>
                  <Badge className={`${status.color} border-0 text-xs flex items-center gap-1`}>
                    {status.icon}
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>{formatDate(n.slot_datetime)}</span>
                  <span>{n.party_size} guests</span>
                  <span className="text-zinc-600">#{n.id}</span>
                </div>
              </div>
              <div className="text-xs text-zinc-600">
                {formatDate(n.created_at)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
