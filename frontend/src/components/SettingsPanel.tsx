import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api, type Settings } from "@/lib/api";
import { Settings2, Save, Eye, EyeOff } from "lucide-react";

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateSettings({
        twilio_account_sid: settings.twilio_account_sid,
        twilio_auth_token: settings.twilio_auth_token,
        twilio_phone_number: settings.twilio_phone_number,
        user_phone_number: settings.user_phone_number,
        opentable_auth_token: settings.opentable_auth_token,
        polling_enabled: settings.polling_enabled,
        polling_interval_minutes: settings.polling_interval_minutes,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <div className="p-8 text-center text-zinc-500">Loading settings...</div>;

  function update(field: keyof Settings, value: string | boolean | number) {
    setSettings((s) => (s ? { ...s, [field]: value } : s));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Twilio Configuration
          </CardTitle>
          <CardDescription>
            Configure your Twilio account for SMS notifications. Set up your webhook URL
            to <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">{"<your-server>/api/twilio/webhook"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twilio_sid">Account SID</Label>
              <Input
                id="twilio_sid"
                type={showTokens ? "text" : "password"}
                value={settings.twilio_account_sid}
                onChange={(e) => update("twilio_account_sid", e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio_token">Auth Token</Label>
              <Input
                id="twilio_token"
                type={showTokens ? "text" : "password"}
                value={settings.twilio_auth_token}
                onChange={(e) => update("twilio_auth_token", e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio_from">Twilio Phone Number</Label>
              <Input
                id="twilio_from"
                value={settings.twilio_phone_number}
                onChange={(e) => update("twilio_phone_number", e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_phone">Your Phone Number</Label>
              <Input
                id="user_phone"
                value={settings.user_phone_number}
                onChange={(e) => update("user_phone_number", e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            OpenTable Configuration
          </CardTitle>
          <CardDescription>
            Provide your OpenTable bearer token for API access. You can obtain this by
            inspecting network requests in the OpenTable mobile app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ot_token">Bearer Token</Label>
            <div className="flex gap-2">
              <Input
                id="ot_token"
                type={showTokens ? "text" : "password"}
                value={settings.opentable_auth_token}
                onChange={(e) => update("opentable_auth_token", e.target.value)}
                placeholder="eyJhbGciOiJSUzI1NiI..."
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowTokens(!showTokens)}
              >
                {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Polling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable automatic polling</Label>
              <p className="text-sm text-zinc-500">Check for availability on a schedule</p>
            </div>
            <Switch
              checked={settings.polling_enabled}
              onCheckedChange={(v) => update("polling_enabled", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">Polling Interval (minutes)</Label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={120}
              value={settings.polling_interval_minutes}
              onChange={(e) => update("polling_interval_minutes", parseInt(e.target.value) || 15)}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Settings saved!</span>}
      </div>
    </div>
  );
}
