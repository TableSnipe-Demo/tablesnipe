import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Bell, Settings, LogOut, RefreshCw, Zap } from "lucide-react";
import { LoginScreen } from "@/components/LoginScreen";
import { MonitorCard } from "@/components/MonitorCard";
import { AddMonitorDialog } from "@/components/AddMonitorDialog";
import { SettingsPanel } from "@/components/SettingsPanel";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import {
  login,
  setApiKey,
  getMonitors,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  checkNow,
  Monitor,
  MonitorCreate,
} from "@/lib/api";

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("tablesnipe_key");
    if (savedKey) {
      setApiKey(savedKey);
      setAuthenticated(true);
    }
  }, []);

  const loadMonitors = useCallback(async () => {
    setLoading(true);
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
    if (authenticated) {
      loadMonitors();
    }
  }, [authenticated, loadMonitors]);

  const handleLogin = async (secret: string): Promise<boolean> => {
    const result = await login(secret);
    if (result.status === "ok" && result.token) {
      setApiKey(result.token);
      localStorage.setItem("tablesnipe_key", result.token);
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setApiKey("");
    localStorage.removeItem("tablesnipe_key");
    setAuthenticated(false);
    setMonitors([]);
  };

  const handleAddMonitor = async (monitor: MonitorCreate) => {
    await createMonitor(monitor);
    await loadMonitors();
  };

  const handleToggleMonitor = async (id: number, enabled: boolean) => {
    await updateMonitor(id, { enabled });
    setMonitors((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled } : m))
    );
  };

  const handleDeleteMonitor = async (id: number) => {
    await deleteMonitor(id);
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCheckNow = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await checkNow();
      setCheckResult(
        result.slots_found > 0
          ? `Found ${result.slots_found} available slot(s)!`
          : "No new slots found."
      );
      setTimeout(() => setCheckResult(null), 5000);
    } catch (err) {
      setCheckResult("Error running check.");
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="h-6 w-6 text-emerald-500" />
            <h1 className="text-xl font-bold text-zinc-100">TableSnipe</h1>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">
              {monitors.filter((m) => m.enabled).length} active
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCheckNow}
              disabled={checking}
              className="text-zinc-400 hover:text-emerald-400"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              {checking ? "Checking..." : "Check Now"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {checkResult && (
          <div className="max-w-5xl mx-auto px-4 pb-3">
            <p className="text-sm text-emerald-400">{checkResult}</p>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="monitors" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger
              value="monitors"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
            >
              <Crosshair className="h-4 w-4 mr-1.5" />
              Monitors
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-400"
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Monitors Tab */}
          <TabsContent value="monitors" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Restaurant Monitors</h2>
                <p className="text-sm text-zinc-500">
                  Add restaurants to watch for open reservations. Polls every 15 minutes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadMonitors}
                  disabled={loading}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <AddMonitorDialog onAdd={handleAddMonitor} />
              </div>
            </div>

            {monitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Crosshair className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400 text-lg">No monitors yet</p>
                <p className="text-zinc-500 text-sm mt-1">
                  Add a restaurant to start watching for available tables
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {monitors.map((monitor) => (
                  <MonitorCard
                    key={monitor.id}
                    monitor={monitor}
                    onToggle={handleToggleMonitor}
                    onDelete={handleDeleteMonitor}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">Notifications</h2>
              <p className="text-sm text-zinc-500">
                SMS alerts sent when available slots are found.
                Reply YES/NO with the notification ID to confirm or skip.
              </p>
            </div>
            <NotificationsPanel />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
              <p className="text-sm text-zinc-500">
                Configure your Twilio and OpenTable credentials
              </p>
            </div>
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
