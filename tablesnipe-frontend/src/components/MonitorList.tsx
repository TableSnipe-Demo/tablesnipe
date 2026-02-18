import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateMonitor, deleteMonitor, type Monitor } from "@/lib/api";
import { Trash2, Eye, Loader2 } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

interface MonitorListProps {
  monitors: Monitor[];
  onRefresh: () => void;
}

export function MonitorList({ monitors, onRefresh }: MonitorListProps) {
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const handleToggle = async (monitor: Monitor) => {
    setToggling(monitor.id);
    try {
      await updateMonitor(monitor.id, { active: !monitor.active });
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle monitor:", err);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this monitor?")) return;
    setDeleting(id);
    try {
      await deleteMonitor(id);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    } finally {
      setDeleting(null);
    }
  };

  if (monitors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-zinc-500">
          <Eye className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          <p>No monitors yet. Add one above to start watching for reservations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Active Monitors ({monitors.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Time Range</TableHead>
              <TableHead>Weeks</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monitors.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.restaurant_name}</TableCell>
                <TableCell>{m.party_size}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {m.days_of_week.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">
                        {DAY_LABELS[d]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatTime(m.time_start)} - {formatTime(m.time_end)}
                </TableCell>
                <TableCell>{m.weeks_ahead}</TableCell>
                <TableCell>
                  {toggling === m.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={m.active}
                      onCheckedChange={() => handleToggle(m)}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(m.id)}
                    disabled={deleting === m.id}
                  >
                    {deleting === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
