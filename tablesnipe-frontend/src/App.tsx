import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MonitorForm } from "@/components/MonitorForm";
import { MonitorList } from "@/components/MonitorList";
import { SettingsPanel } from "@/components/SettingsPanel";
import { NotificationList } from "@/components/NotificationList";
import {
  getMonitors,
  getNotifications,
  triggerPoll,
  type Monitor,
  type Notification,
} from "@/lib/api";
import { RefreshCw, Loader2, Utensils } from "lucide-react";

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [polling, setPolling] = useState(false);

  const loadMonitors = useCallback(async () => {
    setLoadingMonitors(true);
    try {
      const data = await getMonitors();
      setMonitors(data.monitors);
    } catch (err) {
      console.error("Failed to load monitors:", err);
    } finally {
      setLoadingMonitors(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    loadNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadMonitors, loadNotifications]);

  const handlePoll = async () => {
    setPolling(true);
    try {
      await triggerPoll();
      // Wait a moment then refresh notifications
      setTimeout(async () => {
        await loadNotifications();
        setPolling(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to trigger poll:", err);
      setPolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-zinc-900 text-white">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TableSnipe</h1>
              <p className="text-xs text-zinc-500">
                Restaurant reservation monitor
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePoll}
            disabled={polling}
          >
            {polling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Now
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="monitors" className="space-y-6">
          <TabsList>
            <TabsTrigger value="monitors">Monitors</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {notifications.filter((n) => n.status === "pending").length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs px-1.5 min-w-5 h-5">
                  {notifications.filter((n) => n.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="monitors" className="space-y-6">
            <MonitorForm onCreated={loadMonitors} />
            {loadingMonitors ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <MonitorList monitors={monitors} onRefresh={loadMonitors} />
            )}
          </TabsContent>

          <TabsContent value="notifications">
            {loadingNotifs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <NotificationList notifications={notifications} />
            )}
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
