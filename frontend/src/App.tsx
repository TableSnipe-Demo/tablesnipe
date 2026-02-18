import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonitorCard } from "@/components/MonitorCard";
import { AddMonitorDialog } from "@/components/AddMonitorDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import {
  getMonitors,
  getPollStatus,
  triggerPoll,
  type Monitor,
  type PollStatus,
} from "@/lib/api";
import {
  Plus,
  RefreshCw,
  Crosshair,
  Settings,
  Utensils,
} from "lucide-react";

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [pollStatus, setPollStatus] = useState<PollStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [polling, setPolling] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [monitorsData, statusData] = await Promise.all([
        getMonitors(),
        getPollStatus(),
      ]);
      setMonitors(monitorsData);
      setPollStatus(statusData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleTriggerPoll() {
    setPolling(true);
    try {
      await triggerPoll();
      await loadData();
    } catch (err) {
      console.error("Failed to trigger poll:", err);
    } finally {
      setPolling(false);
    }
  }

  const activeCount = monitors.filter((m) => m.active).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Crosshair className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">TableSnipe</h1>
                <p className="text-xs text-muted-foreground">
                  Restaurant reservation monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="mr-1.5 h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Settings Panel (collapsible) */}
        {showSettings && (
          <div className="mb-6">
            <SettingsPanel />
          </div>
        )}

        {/* Status Bar */}
        <div className="mb-6 flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={activeCount > 0 ? "default" : "secondary"}>
                {activeCount} active
              </Badge>
              <span className="text-sm text-muted-foreground">
                {monitors.length} total {monitors.length === 1 ? "monitor" : "monitors"}
              </span>
            </div>

            {pollStatus?.last_poll && (
              <span className="text-xs text-muted-foreground">
                Last checked:{" "}
                {new Date(pollStatus.last_poll).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerPoll}
              disabled={polling}
            >
              <RefreshCw
                className={`mr-1.5 h-4 w-4 ${polling ? "animate-spin" : ""}`}
              />
              {polling ? "Checking..." : "Check Now"}
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Monitor
            </Button>
          </div>
        </div>

        {/* Monitors List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : monitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <Utensils className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No monitors yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a restaurant to start monitoring for reservations
            </p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Monitor
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {monitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onUpdate={loadData}
              />
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Polling every 15 minutes for availability via OpenTable</p>
          <p className="mt-1">
            Configure Twilio in Settings to receive SMS notifications
          </p>
        </div>
      </main>

      {/* Add Monitor Dialog */}
      <AddMonitorDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={loadData}
      />
    </div>
  );
}

export default App
