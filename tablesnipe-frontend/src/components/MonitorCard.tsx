import { Monitor } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Clock, Users, Eye } from "lucide-react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonitorCardProps {
  monitor: Monitor;
  onToggle: (id: number, enabled: boolean) => void;
  onDelete: (id: number) => void;
}

export function MonitorCard({ monitor, onToggle, onDelete }: MonitorCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 flex-1 min-w-0">
          <CardTitle className="text-lg font-semibold text-zinc-100 truncate">
            {monitor.restaurant_name}
          </CardTitle>
          <p className="text-sm text-zinc-500 font-mono">ID: {monitor.restaurant_id}</p>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <Switch
            checked={monitor.enabled}
            onCheckedChange={(checked) => onToggle(monitor.id, checked)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(monitor.id)}
            className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {monitor.days_of_week.sort((a, b) => a - b).map((day) => (
            <Badge
              key={day}
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-400 border-0 text-xs"
            >
              {DAY_NAMES[day]}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{monitor.time_start} - {monitor.time_end}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Users className="h-3.5 w-3.5" />
            <span>{monitor.party_size} guests</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Eye className="h-3.5 w-3.5" />
            <span>{monitor.weeks_ahead}w ahead</span>
          </div>
        </div>
        {!monitor.enabled && (
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 border-0">
            Paused
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
