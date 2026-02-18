import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { MonitorCreate } from "@/lib/api";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AddMonitorDialogProps {
  onAdd: (monitor: MonitorCreate) => Promise<void>;
}

export function AddMonitorDialog({ onAdd }: AddMonitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<MonitorCreate>({
    restaurant_name: "",
    restaurant_id: "",
    party_size: 2,
    days_of_week: [4, 5, 6], // Fri, Sat, Sun
    time_start: "18:00",
    time_end: "21:00",
    weeks_ahead: 4,
    enabled: true,
  });

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdd(form);
      setOpen(false);
      setForm({
        restaurant_name: "",
        restaurant_id: "",
        party_size: 2,
        days_of_week: [4, 5, 6],
        time_start: "18:00",
        time_end: "21:00",
        weeks_ahead: 4,
        enabled: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Monitor
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add Restaurant Monitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Restaurant Name</Label>
            <Input
              placeholder="e.g. Chef's Table at Brooklyn Fare"
              value={form.restaurant_name}
              onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">OpenTable Restaurant ID</Label>
            <Input
              placeholder="e.g. 211123 (from the OpenTable URL)"
              value={form.restaurant_id}
              onChange={(e) => setForm({ ...form, restaurant_id: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
              required
            />
            <p className="text-xs text-zinc-500">
              Find this in the restaurant's OpenTable URL
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Party Size</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={form.party_size}
              onChange={(e) => setForm({ ...form, party_size: parseInt(e.target.value) || 2 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Days of Week</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    form.days_of_week.includes(i)
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Time From</Label>
              <Input
                type="time"
                value={form.time_start}
                onChange={(e) => setForm({ ...form, time_start: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Time To</Label>
              <Input
                type="time"
                value={form.time_end}
                onChange={(e) => setForm({ ...form, time_end: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Weeks Ahead</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={form.weeks_ahead}
              onChange={(e) => setForm({ ...form, weeks_ahead: parseInt(e.target.value) || 4 })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-24"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading || !form.restaurant_name || !form.restaurant_id}
            >
              {loading ? "Adding..." : "Add Monitor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
