import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateMonitor, deleteMonitor, DAY_NAMES } from "../api";
import type { Monitor } from "../api";
import { Eye, Trash2, Clock, Users, CalendarDays } from "lucide-react";

interface MonitorListProps {
  monitors: Monitor[];
  onRefresh: () => void;
}

export default function MonitorList({ monitors, onRefresh }: MonitorListProps) {
  const handleToggle = async (monitor: Monitor) => {
    try {
      await updateMonitor(monitor.id, { is_active: !monitor.is_active });
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle monitor:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this monitor?")) return;
    try {
      await deleteMonitor(id);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    }
  };

  if (monitors.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No monitors yet. Add one above to start watching for reservations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {monitors.map((m) => (
        <Card key={m.id} className={!m.is_active ? "opacity-60" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">
                    {m.restaurant_name}
                  </h3>
                  <Badge variant={m.is_active ? "default" : "secondary"}>
                    {m.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {m.target_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {m.party_size} {m.party_size === 1 ? "person" : "people"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {m.days_of_week.map((d) => DAY_NAMES[d]?.slice(0, 3)).join(", ")}
                  </span>
                  <span className="text-xs">
                    {m.weeks_ahead} {m.weeks_ahead === 1 ? "week" : "weeks"} ahead
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Restaurant ID: {m.restaurant_id}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  checked={m.is_active}
                  onCheckedChange={() => handleToggle(m)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(m.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
