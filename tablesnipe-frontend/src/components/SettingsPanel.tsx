import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Phone, Key } from "lucide-react";
import { Settings, getSettings, updateSettings } from "@/lib/api";

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    user_phone_number: "",
    opentable_auth_token: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updates: Partial<Settings> = {};
      // Only send non-masked values
      if (settings.twilio_account_sid && !settings.twilio_account_sid.startsWith("****")) {
        updates.twilio_account_sid = settings.twilio_account_sid;
      }
      if (settings.twilio_auth_token && !settings.twilio_auth_token.startsWith("****")) {
        updates.twilio_auth_token = settings.twilio_auth_token;
      }
      if (settings.twilio_phone_number) {
        updates.twilio_phone_number = settings.twilio_phone_number;
      }
      if (settings.user_phone_number) {
        updates.user_phone_number = settings.user_phone_number;
      }
      if (settings.opentable_auth_token && !settings.opentable_auth_token.startsWith("****")) {
        updates.opentable_auth_token = settings.opentable_auth_token;
      }
      const data = await updateSettings(updates);
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-zinc-100">Twilio Configuration</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Configure your Twilio account for SMS notifications. Set up at{" "}
            <a href="https://console.twilio.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
              console.twilio.com
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Account SID</Label>
              <Input
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.twilio_account_sid}
                onChange={(e) => setSettings({ ...settings, twilio_account_sid: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Auth Token</Label>
              <Input
                type="password"
                placeholder="Enter auth token..."
                value={settings.twilio_auth_token}
                onChange={(e) => setSettings({ ...settings, twilio_auth_token: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Twilio Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={settings.twilio_phone_number}
                onChange={(e) => setSettings({ ...settings, twilio_phone_number: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Your Phone Number</Label>
              <Input
                placeholder="+1234567890"
                value={settings.user_phone_number}
                onChange={(e) => setSettings({ ...settings, user_phone_number: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-zinc-100">OpenTable Configuration</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Your OpenTable Bearer token for API access. Obtain this from the OpenTable
            mobile app or website network requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-zinc-300">Bearer Token</Label>
            <Input
              type="password"
              placeholder="Enter OpenTable bearer token..."
              value={settings.opentable_auth_token}
              onChange={(e) => setSettings({ ...settings, opentable_auth_token: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-400">Settings saved successfully!</span>
        )}
      </div>
    </div>
  );
}
