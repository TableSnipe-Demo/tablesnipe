import { Monitor, api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Pause, Play } from "lucide-react";

interface MonitorListProps {
  monitors: Monitor[];
  onRefresh: () => void;
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${displayHour}:${m} ${ampm}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MonitorList({ monitors, onRefresh }: MonitorListProps) {
  const handleToggle = async (monitor: Monitor) => {
    await api.updateMonitor(monitor.id, { active: !monitor.active });
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await api.deleteMonitor(id);
    onRefresh();
  };

  if (monitors.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p className="text-lg font-medium">No monitors yet</p>
        <p className="text-sm mt-1">
          Add a monitor to start watching for reservations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {monitors.map((m) => (
        <Card
          key={m.id}
          className={`transition-opacity ${!m.active ? "opacity-60" : ""}`}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">
                  {m.restaurant_name}
                </h3>
                <Badge variant={m.active ? "default" : "secondary"}>
                  {m.active ? "Active" : "Paused"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>{capitalize(m.day_of_week)}s</span>
                <span>{formatTime(m.time_of_day)}</span>
                <span>
                  {m.party_size} {m.party_size === 1 ? "guest" : "guests"}
                </span>
                <span>{m.weeks_ahead} weeks ahead</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggle(m)}
                title={m.active ? "Pause" : "Resume"}
              >
                {m.active ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(m.id)}
                title="Delete"
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
