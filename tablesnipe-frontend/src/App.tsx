import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import MonitorForm from "./components/MonitorForm";
import MonitorList from "./components/MonitorList";
import NotificationList from "./components/NotificationList";
import SettingsPanel from "./components/SettingsPanel";
import { getMonitors, getNotifications, triggerPoll } from "./api";
import type { Monitor, Notification } from "./api";
import { RefreshCw, Utensils } from "lucide-react";

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [polling, setPolling] = useState(false);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await getMonitors();
      setMonitors(data);
    } catch (err) {
      console.error("Failed to load monitors:", err);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMonitors, loadNotifications]);

  const handlePollNow = async () => {
    setPolling(true);
    try {
      await triggerPoll();
      setTimeout(() => {
        loadNotifications();
        setPolling(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to trigger poll:", err);
      setPolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TableSnipe</h1>
              <p className="text-xs text-muted-foreground">
                OpenTable reservation monitor
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePollNow}
            disabled={polling}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${polling ? "animate-spin" : ""}`}
            />
            {polling ? "Checking..." : "Check Now"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="monitors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monitors">
              Monitors ({monitors.length})
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="monitors" className="space-y-6">
            <MonitorForm onCreated={loadMonitors} />
            <MonitorList monitors={monitors} onRefresh={loadMonitors} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationList notifications={notifications} />
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
