import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MonitorForm } from "@/components/MonitorForm";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ActivityLog } from "@/components/ActivityLog";
import {
  getMonitors,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  manualCheck,
  checkAll,
  type Monitor,
} from "@/api";
import {
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Zap,
  UtensilsCrossed,
  CalendarDays,
  Clock,
  Users,
  Loader2,
  Search as SearchIcon,
} from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [checking, setChecking] = useState<number | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await getMonitors();
      setMonitors(data);
    } catch (err) {
      console.error("Failed to load monitors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    const interval = setInterval(loadMonitors, 30000);
    return () => clearInterval(interval);
  }, [loadMonitors]);

  const handleCreateMonitor = async (data: Omit<Monitor, "id" | "created_at">) => {
    try {
      await createMonitor(data);
      await loadMonitors();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create monitor:", err);
    }
  };

  const handleEditMonitor = async (data: Omit<Monitor, "id" | "created_at">) => {
    if (!editingMonitor) return;
    try {
      await updateMonitor(editingMonitor.id, data);
      await loadMonitors();
      setEditingMonitor(null);
    } catch (err) {
      console.error("Failed to update monitor:", err);
    }
  };

  const handleDeleteMonitor = async (id: number) => {
    if (!confirm("Delete this monitor?")) return;
    try {
      await deleteMonitor(id);
      await loadMonitors();
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    }
  };

  const handleToggleActive = async (monitor: Monitor) => {
    try {
      await updateMonitor(monitor.id, { active: !monitor.active });
      await loadMonitors();
    } catch (err) {
      console.error("Failed to toggle monitor:", err);
    }
  };

  const handleManualCheck = async (id: number) => {
    setChecking(id);
    try {
      const result = await manualCheck(id);
      alert(`Check complete! Found ${result.slots_found} new slot(s).`);
      await loadMonitors();
    } catch (err) {
      console.error("Manual check failed:", err);
    } finally {
      setChecking(null);
    }
  };

  const handleCheckAll = async () => {
    setCheckingAll(true);
    try {
      await checkAll();
      alert("All monitors checked!");
    } catch (err) {
      console.error("Check all failed:", err);
    } finally {
      setCheckingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-zinc-900 text-white p-1.5 rounded-lg">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">TableSnipe</h1>
              <p className="text-xs text-zinc-500">Reservation Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckAll}
              disabled={checkingAll}
            >
              {checkingAll ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Check All
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="monitors">
          <TabsList className="mb-6">
            <TabsTrigger value="monitors" className="gap-1.5">
              <SearchIcon className="h-3.5 w-3.5" />
              Monitors
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Monitors Tab */}
          <TabsContent value="monitors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Active Monitors</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Polling every 15 minutes for new availability
                </p>
              </div>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Monitor
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : monitors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UtensilsCrossed className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
                  <p className="text-zinc-500 text-sm font-medium">No monitors yet</p>
                  <p className="text-zinc-400 text-xs mt-1 mb-4">
                    Add a restaurant to start monitoring for reservations
                  </p>
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Your First Monitor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {monitors.map((monitor) => (
                  <Card key={monitor.id} className={!monitor.active ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm truncate">
                              {monitor.restaurant_name}
                            </h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              ID: {monitor.restaurant_id}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {monitor.party_size} {monitor.party_size === 1 ? "person" : "people"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {monitor.time_start} - {monitor.time_end}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {monitor.weeks_ahead}w ahead
                            </span>
                          </div>

                          <div className="flex gap-1">
                            {DAY_LABELS.map((day, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-medium ${
                                  monitor.days_of_week.includes(idx)
                                    ? "bg-zinc-900 text-white"
                                    : "bg-zinc-100 text-zinc-400"
                                }`}
                              >
                                {day}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch
                            checked={monitor.active}
                            onCheckedChange={() => handleToggleActive(monitor)}
                          />
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManualCheck(monitor.id)}
                          disabled={checking === monitor.id}
                          className="text-xs"
                        >
                          {checking === monitor.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Zap className="mr-1 h-3 w-3" />
                          )}
                          Check Now
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMonitor(monitor)}
                          className="text-xs"
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMonitor(monitor.id)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Activity Log</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Found slots and notification history
              </p>
            </div>
            <ActivityLog />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Settings</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure Twilio SMS and OpenTable API credentials
              </p>
            </div>
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Monitor Form Dialog */}
      <MonitorForm
        open={showForm || !!editingMonitor}
        onClose={() => {
          setShowForm(false);
          setEditingMonitor(null);
        }}
        onSubmit={editingMonitor ? handleEditMonitor : handleCreateMonitor}
        editMonitor={editingMonitor}
      />
    </div>
  );
}

export default App;
