import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UtensilsCrossed,
  Eye,
  Settings,
  Bell,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  Clock,
  MapPin,
} from "lucide-react";
import * as api from "./lib/api";

interface Restaurant {
  id: number;
  opentable_id: string;
  name: string;
  cuisine: string;
  location: string;
  created_at: string;
}

interface Monitor {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  opentable_id: string;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  party_size: number;
  weeks_ahead: number;
  enabled: boolean;
  created_at: string;
}

interface SettingsData {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  user_phone_number: string;
  opentable_bearer_token: string;
  polling_interval_minutes: number;
}

interface Notification {
  id: number;
  slot_id: number;
  message: string;
  status: string;
  twilio_sid: string;
  created_at: string;
  responded_at: string | null;
  slot_date_time: string;
  party_size: number;
  restaurant_name: string;
}

interface Slot {
  id: number;
  monitor_id: number;
  restaurant_id: number;
  restaurant_name: string;
  date_time: string;
  party_size: number;
  slot_hash: string;
  status: string;
  created_at: string;
}

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function statusColor(status: string) {
  switch (status) {
    case "sent":
      return "default" as const;
    case "confirmed":
      return "default" as const;
    case "declined":
      return "destructive" as const;
    case "failed":
      return "destructive" as const;
    case "found":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusBgClass(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-500 hover:bg-green-600";
    default:
      return "";
  }
}

function formatDateTime(dt: string) {
  try {
    const d = new Date(dt);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Add restaurant form
  const [newRest, setNewRest] = useState({ opentable_id: "", name: "", cuisine: "", location: "" });

  // Add monitor form
  const [newMon, setNewMon] = useState({
    restaurant_id: 0,
    days_of_week: [] as number[],
    time_start: "18:00",
    time_end: "21:00",
    party_size: 2,
    weeks_ahead: 4,
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState<Partial<SettingsData>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m, s, n, sl] = await Promise.all([
        api.getRestaurants(),
        api.getMonitors(),
        api.getSettings(),
        api.getNotifications(),
        api.getSlots(),
      ]);
      setRestaurants(r);
      setMonitors(m);
      setSettings(s);
      setSettingsForm({});
      setNotifications(n);
      setSlots(sl);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddRestaurant = async () => {
    if (!newRest.opentable_id || !newRest.name) return;
    try {
      await api.createRestaurant(newRest);
      setNewRest({ opentable_id: "", name: "", cuisine: "", location: "" });
      loadAll();
    } catch (err) {
      alert(String(err));
    }
  };

  const handleDeleteRestaurant = async (id: number) => {
    if (!confirm("Delete this restaurant and all its monitors?")) return;
    await api.deleteRestaurant(id);
    loadAll();
  };

  const handleAddMonitor = async () => {
    if (!newMon.restaurant_id || newMon.days_of_week.length === 0) return;
    try {
      await api.createMonitor(newMon);
      setNewMon({ restaurant_id: 0, days_of_week: [], time_start: "18:00", time_end: "21:00", party_size: 2, weeks_ahead: 4 });
      loadAll();
    } catch (err) {
      alert(String(err));
    }
  };

  const handleToggleMonitor = async (id: number) => {
    await api.toggleMonitor(id);
    loadAll();
  };

  const handleDeleteMonitor = async (id: number) => {
    if (!confirm("Delete this monitor?")) return;
    await api.deleteMonitor(id);
    loadAll();
  };

  const handleSaveSettings = async () => {
    try {
      await api.updateSettings(settingsForm);
      setSettingsForm({});
      loadAll();
    } catch (err) {
      alert(String(err));
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await api.checkNow();
      loadAll();
    } catch (err) {
      alert(String(err));
    }
    setChecking(false);
  };

  const toggleDay = (day: number) => {
    setNewMon((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TableSnipe</h1>
              <p className="text-xs text-zinc-400">Restaurant reservation monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckNow}
              disabled={checking}
              className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            >
              {checking ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              Check Now
            </Button>
            <Button variant="ghost" size="sm" onClick={loadAll} disabled={loading} className="text-zinc-400 hover:text-zinc-200">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="restaurants" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="restaurants" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              <UtensilsCrossed className="h-4 w-4 mr-1.5" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="monitors" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              <Eye className="h-4 w-4 mr-1.5" />
              Monitors
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              <Bell className="h-4 w-4 mr-1.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* ========= RESTAURANTS ========= */}
          <TabsContent value="restaurants" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-zinc-100">Restaurants</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Add OpenTable restaurants to monitor for reservations.
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-1" /> Add Restaurant
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <DialogHeader>
                        <DialogTitle>Add Restaurant</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label className="text-zinc-300">OpenTable ID *</Label>
                          <Input
                            placeholder="e.g. 211123"
                            value={newRest.opentable_id}
                            onChange={(e) => setNewRest({ ...newRest, opentable_id: e.target.value })}
                            className="bg-zinc-800 border-zinc-700 text-zinc-100"
                          />
                          <p className="text-xs text-zinc-500">Find this in the restaurant's OpenTable URL</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Name *</Label>
                          <Input
                            placeholder="Restaurant name"
                            value={newRest.name}
                            onChange={(e) => setNewRest({ ...newRest, name: e.target.value })}
                            className="bg-zinc-800 border-zinc-700 text-zinc-100"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Cuisine</Label>
                            <Input
                              placeholder="Fine Dining"
                              value={newRest.cuisine}
                              onChange={(e) => setNewRest({ ...newRest, cuisine: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Location</Label>
                            <Input
                              placeholder="Brooklyn, NY"
                              value={newRest.location}
                              onChange={(e) => setNewRest({ ...newRest, location: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost" className="text-zinc-400">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={handleAddRestaurant} className="bg-emerald-600 hover:bg-emerald-700">
                            Add Restaurant
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {restaurants.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No restaurants added yet.</p>
                    <p className="text-sm mt-1">Add a restaurant to start monitoring reservations.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {restaurants.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-zinc-700 p-2 rounded-md">
                            <UtensilsCrossed className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-100">{r.name}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                              <span>ID: {r.opentable_id}</span>
                              {r.cuisine && (
                                <>
                                  <span>-</span>
                                  <span>{r.cuisine}</span>
                                </>
                              )}
                              {r.location && (
                                <>
                                  <MapPin className="h-3 w-3" />
                                  <span>{r.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRestaurant(r.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========= MONITORS ========= */}
          <TabsContent value="monitors" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-zinc-100">Monitors</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Configure when and how to check for reservations.
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={restaurants.length === 0}>
                        <Plus className="h-4 w-4 mr-1" /> Add Monitor
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Create Monitor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Restaurant *</Label>
                          <Select
                            value={newMon.restaurant_id ? String(newMon.restaurant_id) : ""}
                            onValueChange={(v) => setNewMon({ ...newMon, restaurant_id: Number(v) })}
                          >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                              <SelectValue placeholder="Select restaurant" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                              {restaurants.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Days of Week *</Label>
                          <div className="flex flex-wrap gap-2">
                            {DAY_OPTIONS.map((d) => (
                              <Button
                                key={d.value}
                                variant={newMon.days_of_week.includes(d.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleDay(d.value)}
                                className={
                                  newMon.days_of_week.includes(d.value)
                                    ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200 bg-zinc-800"
                                }
                              >
                                {d.label.slice(0, 3)}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Start Time</Label>
                            <Input
                              type="time"
                              value={newMon.time_start}
                              onChange={(e) => setNewMon({ ...newMon, time_start: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">End Time</Label>
                            <Input
                              type="time"
                              value={newMon.time_end}
                              onChange={(e) => setNewMon({ ...newMon, time_end: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Party Size</Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={newMon.party_size}
                              onChange={(e) => setNewMon({ ...newMon, party_size: Number(e.target.value) })}
                              className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Weeks Ahead</Label>
                            <Input
                              type="number"
                              min={1}
                              max={12}
                              value={newMon.weeks_ahead}
                              onChange={(e) => setNewMon({ ...newMon, weeks_ahead: Number(e.target.value) })}
                              className="bg-zinc-800 border-zinc-700 text-zinc-100"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost" className="text-zinc-400">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={handleAddMonitor} className="bg-emerald-600 hover:bg-emerald-700">
                            Create Monitor
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {monitors.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <Eye className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No monitors configured.</p>
                    <p className="text-sm mt-1">Create a monitor to start watching for reservations.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {monitors.map((m) => (
                      <div
                        key={m.id}
                        className={`p-4 rounded-lg border ${m.enabled ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-900/50 border-zinc-800 opacity-60"}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-zinc-100">{m.restaurant_name}</p>
                              <Badge variant={m.enabled ? "default" : "secondary"} className={m.enabled ? "bg-emerald-600" : ""}>
                                {m.enabled ? "Active" : "Paused"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {m.time_start} - {m.time_end}
                              </span>
                              <span>Party of {m.party_size}</span>
                              <span>{m.weeks_ahead} weeks ahead</span>
                            </div>
                            <div className="flex gap-1.5">
                              {m.days_of_week.map((d) => (
                                <Badge key={d} variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                                  {DAY_NAMES[d]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={m.enabled} onCheckedChange={() => handleToggleMonitor(m.id)} />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMonitor(m.id)}
                              className="text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========= SETTINGS ========= */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Twilio Configuration</CardTitle>
                <CardDescription className="text-zinc-400">
                  Configure SMS notifications via Twilio. Set your Twilio webhook URL to{" "}
                  <code className="text-emerald-400 bg-zinc-800 px-1 rounded text-xs">
                    {"<your-backend-url>"}/api/twilio/webhook
                  </code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Account SID</Label>
                    <Input
                      placeholder={settings?.twilio_account_sid || "ACxxxxx"}
                      value={settingsForm.twilio_account_sid ?? ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, twilio_account_sid: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Auth Token</Label>
                    <Input
                      type="password"
                      placeholder={settings?.twilio_auth_token || "Enter token"}
                      value={settingsForm.twilio_auth_token ?? ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, twilio_auth_token: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Twilio Phone Number</Label>
                    <Input
                      placeholder={settings?.twilio_phone_number || "+1234567890"}
                      value={settingsForm.twilio_phone_number ?? ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, twilio_phone_number: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Your Phone Number</Label>
                    <Input
                      placeholder={settings?.user_phone_number || "+1234567890"}
                      value={settingsForm.user_phone_number ?? ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, user_phone_number: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">OpenTable Configuration</CardTitle>
                <CardDescription className="text-zinc-400">
                  Bearer token for OpenTable API. Obtain from the OpenTable mobile app traffic.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Bearer Token</Label>
                  <Input
                    type="password"
                    placeholder={settings?.opentable_bearer_token || "Enter bearer token"}
                    value={settingsForm.opentable_bearer_token ?? ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, opentable_bearer_token: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Polling</CardTitle>
                <CardDescription className="text-zinc-400">
                  How often to check for new availability.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Interval (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    placeholder={String(settings?.polling_interval_minutes ?? 15)}
                    value={settingsForm.polling_interval_minutes ?? ""}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, polling_interval_minutes: Number(e.target.value) })
                    }
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 w-32"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-700">
                Save Settings
              </Button>
            </div>
          </TabsContent>

          {/* ========= ACTIVITY ========= */}
          <TabsContent value="activity" className="space-y-4">
            {/* Found Slots */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Found Slots</CardTitle>
                <CardDescription className="text-zinc-400">
                  Reservation openings discovered by your monitors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No slots found yet. Monitors will check automatically.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-zinc-400">Restaurant</TableHead>
                        <TableHead className="text-zinc-400">Date/Time</TableHead>
                        <TableHead className="text-zinc-400">Party</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                        <TableHead className="text-zinc-400">Found</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots.map((s) => (
                        <TableRow key={s.id} className="border-zinc-800">
                          <TableCell className="text-zinc-200 font-medium">{s.restaurant_name}</TableCell>
                          <TableCell className="text-zinc-300">{formatDateTime(s.date_time)}</TableCell>
                          <TableCell className="text-zinc-300">{s.party_size}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(s.status)} className={statusBgClass(s.status)}>
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500 text-sm">{formatDateTime(s.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Separator className="bg-zinc-800" />

            {/* Notifications */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Notification History</CardTitle>
                <CardDescription className="text-zinc-400">SMS messages sent and their responses.</CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications sent yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-zinc-400">Restaurant</TableHead>
                        <TableHead className="text-zinc-400">Slot</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                        <TableHead className="text-zinc-400">Sent</TableHead>
                        <TableHead className="text-zinc-400">Response</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((n) => (
                        <TableRow key={n.id} className="border-zinc-800">
                          <TableCell className="text-zinc-200 font-medium">{n.restaurant_name}</TableCell>
                          <TableCell className="text-zinc-300">{formatDateTime(n.slot_date_time)}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(n.status)} className={statusBgClass(n.status)}>
                              {n.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500 text-sm">{formatDateTime(n.created_at)}</TableCell>
                          <TableCell className="text-zinc-500 text-sm">
                            {n.responded_at ? formatDateTime(n.responded_at) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
