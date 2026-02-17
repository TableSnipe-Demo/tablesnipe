import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type Notification } from "@/lib/api";
import { Bell, RefreshCw } from "lucide-react";

const STATUS_VARIANTS: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  pending: "warning",
  confirmed: "success",
  denied: "secondary",
  failed: "destructive",
};

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  function formatDate(dt: string) {
    try {
      const d = new Date(dt);
      return d.toLocaleString();
    } catch {
      return dt;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-zinc-500">SMS alerts sent for available reservations</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Notification #{n.id}</span>
                    <Badge variant={STATUS_VARIANTS[n.status] || "default"}>
                      {n.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">
                    Slot: {formatDate(n.slot_datetime)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Monitor #{n.monitor_id} · Sent {formatDate(n.created_at)}
                    {n.responded_at && ` · Responded ${formatDate(n.responded_at)}`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {notifications.length === 0 && !loading && (
          <div className="text-center py-12 text-zinc-500">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No notifications yet. They will appear here when slots are found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
