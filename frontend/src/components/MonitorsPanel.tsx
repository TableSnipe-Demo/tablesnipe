import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api, type Monitor, type RestaurantResult } from "@/lib/api";
import { Plus, Trash2, Search, Radar, RefreshCw } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function MonitorsPanel() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RestaurantResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantResult | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [day, setDay] = useState("Friday");
  const [time, setTime] = useState("19:00");
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [polling, setPolling] = useState(false);

  const loadMonitors = useCallback(async () => {
    const data = await api.getMonitors();
    setMonitors(data);
  }, []);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await api.searchRestaurants(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate() {
    if (!selectedRestaurant) return;
    await api.createMonitor({
      restaurant_id: selectedRestaurant.rid,
      restaurant_name: selectedRestaurant.name,
      party_size: partySize,
      target_day_of_week: day.toLowerCase(),
      target_time: time,
      weeks_ahead: weeksAhead,
    });
    setShowForm(false);
    setSelectedRestaurant(null);
    setSearchResults([]);
    setSearchQuery("");
    loadMonitors();
  }

  async function handleToggle(monitor: Monitor) {
    await api.updateMonitor(monitor.id, { active: !monitor.active });
    loadMonitors();
  }

  async function handleDelete(id: number) {
    await api.deleteMonitor(id);
    loadMonitors();
  }

  async function handlePoll() {
    setPolling(true);
    try {
      await api.triggerPoll();
    } finally {
      setTimeout(() => setPolling(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Active Monitors</h2>
          <p className="text-sm text-zinc-500">{monitors.length} monitor{monitors.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePoll} disabled={polling}>
            <RefreshCw className={`h-4 w-4 mr-2 ${polling ? "animate-spin" : ""}`} />
            Poll Now
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Monitor
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-2 border-zinc-900">
          <CardHeader>
            <CardTitle>New Monitor</CardTitle>
            <CardDescription>Search for a restaurant and configure monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRestaurant ? (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    <Search className="h-4 w-4 mr-2" />
                    {searching ? "Searching..." : "Search"}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.rid}
                        className="w-full text-left p-3 hover:bg-zinc-50 transition-colors"
                        onClick={() => setSelectedRestaurant(r)}
                      >
                        <div className="font-medium">{r.name}</div>
                        <div className="text-sm text-zinc-500">
                          {r.locality}{r.region ? `, ${r.region}` : ""} · {r.cuisine} · {r.price_range}
                          {r.rating ? ` · ${r.rating} stars` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm text-zinc-500 mb-2">Or enter restaurant ID directly:</p>
                  <div className="flex gap-2 max-w-md mx-auto">
                    <Input
                      placeholder="Restaurant ID (e.g. 211123)"
                      id="manual-rid"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById("manual-rid") as HTMLInputElement;
                        if (input.value) {
                          setSelectedRestaurant({
                            rid: input.value,
                            name: `Restaurant #${input.value}`,
                            locality: "",
                            region: "",
                            cuisine: "",
                            price_range: "",
                            rating: null,
                            reviews_count: null,
                          });
                        }
                      }}
                    >
                      Use ID
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <div className="font-medium">{selectedRestaurant.name}</div>
                  <div className="text-sm text-zinc-500">ID: {selectedRestaurant.rid}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Time</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Party Size</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value) || 2)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weeks Ahead</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={weeksAhead}
                      onChange={(e) => setWeeksAhead(parseInt(e.target.value) || 4)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate}>
                    <Radar className="h-4 w-4 mr-2" />
                    Start Monitoring
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSelectedRestaurant(null);
                    setShowForm(false);
                  }}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {monitors.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.restaurant_name}</span>
                    <Badge variant={m.active ? "success" : "secondary"}>
                      {m.active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {m.target_day_of_week.charAt(0).toUpperCase() + m.target_day_of_week.slice(1)}s
                    at {m.target_time} · Party of {m.party_size} · {m.weeks_ahead} weeks ahead
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    ID: {m.restaurant_id} · Created {new Date(m.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={m.active}
                    onCheckedChange={() => handleToggle(m)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(m.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {monitors.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Radar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No monitors yet. Add one to start tracking reservations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
