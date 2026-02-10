import { useState, useEffect, useCallback } from "react";
import { api, Monitor, Booking } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MonitorForm } from "@/components/MonitorForm";
import { MonitorList } from "@/components/MonitorList";
import { BookingList } from "@/components/BookingList";
import { SettingsForm } from "@/components/SettingsForm";
import { Plus, Crosshair, Loader2 } from "lucide-react";

function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [m, b] = await Promise.all([
        api.getMonitors(),
        api.getBookings(),
      ]);
      setMonitors(m);
      setBookings(b);
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

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="h-6 w-6 text-zinc-900" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              TableSnipe
            </h1>
          </div>
          <p className="text-xs text-zinc-500 hidden sm:block">
            Restaurant reservation monitor
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Tabs defaultValue="monitors">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="monitors">
              Monitors ({monitors.length})
            </TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="monitors">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Active Monitors
              </h2>
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Monitor
              </Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <MonitorList monitors={monitors} onRefresh={loadData} />
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              Booking History
            </h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <BookingList bookings={bookings} />
            )}
          </TabsContent>

          <TabsContent value="settings">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              Settings
            </h2>
            <SettingsForm />
          </TabsContent>
        </Tabs>
      </main>

      <MonitorForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={loadData}
      />
    </div>
  );
}

export default App;
