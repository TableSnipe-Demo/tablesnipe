import { useState } from "react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { MonitorsPanel } from "@/components/MonitorsPanel";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Radar, Settings2, Bell, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "monitors" | "notifications" | "settings";

const TABS: { id: Tab; label: string; icon: typeof Radar }[] = [
  { id: "monitors", label: "Monitors", icon: Radar },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("monitors");

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 text-white p-2 rounded-lg">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TableSnipe</h1>
              <p className="text-xs text-zinc-500">Restaurant reservation monitor</p>
            </div>
          </div>
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === "monitors" && <MonitorsPanel />}
        {activeTab === "notifications" && <NotificationsPanel />}
        {activeTab === "settings" && <SettingsPanel />}
      </main>
    </div>
  );
}

export default App;
