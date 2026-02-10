import { useState, useEffect } from "react";
import { UtensilsCrossed, Settings, Bell, Plus, LogOut, RefreshCw, Search, Trash2, Power, PowerOff } from "lucide-react";
import api from "../api";

interface Monitor {
  id: number;
  restaurant_name: string;
  opentable_id: string;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  party_size: number;
  weeks_ahead: number;
  active: boolean;
  created_at: string;
}

interface Alert {
  id: number;
  monitor_id: number;
  restaurant_name: string;
  date: string;
  time: string;
  party_size: number;
  status: string;
  created_at: string;
}

interface SettingsData {
  twilio_sid: string;
  twilio_token: string;
  twilio_phone: string;
  user_phone: string;
  openai_key: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [tab, setTab] = useState<"monitors" | "alerts" | "settings">("monitors");
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<SettingsData>({
    twilio_sid: "",
    twilio_token: "",
    twilio_phone: "",
    user_phone: "",
    openai_key: "",
  });
  const [showAddMonitor, setShowAddMonitor] = useState(false);
  const [checking, setChecking] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    loadMonitors();
    loadAlerts();
    loadSettings();
  }, []);

  const loadMonitors = async () => {
    try {
      const res = await api.get("/api/monitors");
      setMonitors(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await api.get("/api/alerts");
      setAlerts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      setSettings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async () => {
    try {
      await api.put("/api/settings", settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      await api.post("/api/check-now");
      await loadAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const deleteMonitor = async (id: number) => {
    try {
      await api.delete(`/api/monitors/${id}`);
      await loadMonitors();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMonitor = async (monitor: Monitor) => {
    try {
      await api.put(`/api/monitors/${monitor.id}`, { active: !monitor.active });
      await loadMonitors();
    } catch (e) {
      console.error(e);
    }
  };

  const clearAlert = async (id: number) => {
    try {
      await api.post(`/api/alerts/${id}/clear`);
      await loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-white">TableSnipe</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={checkNow}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking..." : "Check Now"}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-xl p-1 w-fit">
          {[
            { id: "monitors" as const, label: "Monitors", icon: Search },
            { id: "alerts" as const, label: "Alerts", icon: Bell, count: alerts.filter((a) => a.status === "notified").length },
            { id: "settings" as const, label: "Settings", icon: Settings },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-amber-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count ? (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "monitors" && (
          <MonitorsTab
            monitors={monitors}
            showAdd={showAddMonitor}
            setShowAdd={setShowAddMonitor}
            onDelete={deleteMonitor}
            onToggle={toggleMonitor}
            onRefresh={loadMonitors}
          />
        )}

        {tab === "alerts" && (
          <AlertsTab alerts={alerts} onClear={clearAlert} onRefresh={loadAlerts} />
        )}

        {tab === "settings" && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            onSave={saveSettings}
            saved={settingsSaved}
          />
        )}
      </div>
    </div>
  );
}

function MonitorsTab({
  monitors,
  showAdd,
  setShowAdd,
  onDelete,
  onToggle,
  onRefresh,
}: {
  monitors: Monitor[];
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  onDelete: (id: number) => void;
  onToggle: (m: Monitor) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Restaurant Monitors</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </button>
      </div>

      {showAdd && (
        <AddMonitorForm
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            onRefresh();
          }}
        />
      )}

      {monitors.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No monitors yet</h3>
          <p className="text-slate-400 text-sm">Add a restaurant to start monitoring for open reservations</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {monitors.map((m) => (
            <div
              key={m.id}
              className={`bg-slate-800/50 border rounded-2xl p-5 transition-colors ${
                m.active ? "border-slate-700/50" : "border-slate-700/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold text-lg">{m.restaurant_name}</h3>
                  <p className="text-slate-400 text-sm mt-1">OpenTable ID: {m.opentable_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggle(m)}
                    className={`p-2 rounded-lg transition-colors ${
                      m.active
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        : "bg-slate-700/50 text-slate-500 hover:bg-slate-700"
                    }`}
                    title={m.active ? "Disable monitor" : "Enable monitor"}
                  >
                    {m.active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDelete(m.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Days: </span>
                  <span className="text-white">
                    {m.days_of_week.map((d) => DAY_NAMES[d]).join(", ")}
                  </span>
                </div>
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Time: </span>
                  <span className="text-white">{m.time_start} - {m.time_end}</span>
                </div>
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Party: </span>
                  <span className="text-white">{m.party_size}</span>
                </div>
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Ahead: </span>
                  <span className="text-white">{m.weeks_ahead} weeks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMonitorForm({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [restaurantName, setRestaurantName] = useState("");
  const [opentableId, setOpentableId] = useState("");
  const [days, setDays] = useState<number[]>([4, 5]);
  const [timeStart, setTimeStart] = useState("18:00");
  const [timeEnd, setTimeEnd] = useState("21:00");
  const [partySize, setPartySize] = useState(2);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; id: string; locality: string; neighborhood: string }>>([]);
  const [searching, setSearching] = useState(false);

  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get("/api/restaurants/search", { params: { q: searchQuery } });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || !opentableId) return;
    setSaving(true);
    try {
      await api.post("/api/monitors", {
        restaurant_name: restaurantName,
        opentable_id: opentableId,
        days_of_week: days,
        time_start: timeStart,
        time_end: timeEnd,
        party_size: partySize,
        weeks_ahead: weeksAhead,
      });
      onAdded();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-6">
      <h3 className="text-white font-semibold mb-4">Add Restaurant Monitor</h3>

      <div className="mb-4">
        <label className="block text-sm text-slate-400 mb-1">Search OpenTable</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchRestaurants())}
            className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Search for a restaurant..."
          />
          <button
            onClick={searchRestaurants}
            disabled={searching}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 bg-slate-900/80 border border-slate-700 rounded-xl max-h-48 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRestaurantName(r.name);
                  setOpentableId(r.id);
                  setSearchResults([]);
                  setSearchQuery("");
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-700/50 last:border-b-0 transition-colors"
              >
                <div className="text-white text-sm font-medium">{r.name}</div>
                <div className="text-slate-400 text-xs">{r.neighborhood || r.locality}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Restaurant Name</label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Restaurant name"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">OpenTable ID</label>
            <input
              type="text"
              value={opentableId}
              onChange={(e) => setOpentableId(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., 12345"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Days of Week</label>
          <div className="flex gap-2">
            {DAY_NAMES.map((name, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  days.includes(i)
                    ? "bg-amber-500 text-white"
                    : "bg-slate-900/50 text-slate-400 hover:text-white border border-slate-600"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Time Start</label>
            <input
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Time End</label>
            <input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Party Size</label>
            <input
              type="number"
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              min={1}
              max={20}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Weeks Ahead</label>
            <input
              type="number"
              value={weeksAhead}
              onChange={(e) => setWeeksAhead(Number(e.target.value))}
              min={1}
              max={12}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !restaurantName || !opentableId}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            {saving ? "Adding..." : "Add Monitor"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function AlertsTab({
  alerts,
  onClear,
  onRefresh,
}: {
  alerts: Alert[];
  onClear: (id: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Reservation Alerts</h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No alerts yet</h3>
          <p className="text-slate-400 text-sm">Alerts will appear here when open reservations are found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-medium">{a.restaurant_name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  {a.date} at {a.time} &middot; Party of {a.party_size}
                </p>
              </div>
              {a.status === "notified" && (
                <button
                  onClick={() => onClear(a.id)}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "notified": return "bg-blue-500/20 text-blue-400";
    case "confirmed": return "bg-green-500/20 text-green-400";
    case "denied": return "bg-red-500/20 text-red-400";
    case "dismissed": return "bg-slate-500/20 text-slate-400";
    default: return "bg-slate-500/20 text-slate-400";
  }
}

function SettingsTab({
  settings,
  setSettings,
  onSave,
  saved,
}: {
  settings: SettingsData;
  setSettings: (s: SettingsData) => void;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Settings</h2>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-medium">Twilio Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Account SID</label>
            <input
              type="text"
              value={settings.twilio_sid}
              onChange={(e) => setSettings({ ...settings, twilio_sid: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="AC..."
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Auth Token</label>
            <input
              type="password"
              value={settings.twilio_token}
              onChange={(e) => setSettings({ ...settings, twilio_token: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Auth token"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Twilio Phone Number</label>
            <input
              type="text"
              value={settings.twilio_phone}
              onChange={(e) => setSettings({ ...settings, twilio_phone: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="+1..."
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Your Phone Number</label>
            <input
              type="text"
              value={settings.user_phone}
              onChange={(e) => setSettings({ ...settings, user_phone: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="+1..."
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-medium">OpenAI Configuration</h3>
        <div>
          <label className="block text-sm text-slate-400 mb-1">API Key</label>
          <input
            type="password"
            value={settings.openai_key}
            onChange={(e) => setSettings({ ...settings, openai_key: e.target.value })}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="sk-..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onSave}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors text-sm"
        >
          Save Settings
        </button>
        {saved && (
          <span className="text-green-400 text-sm">Settings saved!</span>
        )}
      </div>
    </div>
  );
}
