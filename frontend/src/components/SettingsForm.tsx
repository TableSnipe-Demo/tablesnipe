import { useState, useEffect } from "react";
import { api, Settings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    user_phone_number: "",
    opentable_api_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
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
      const s = await api.updateSettings(settings);
      setSettings(s);
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
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Twilio Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sid">Account SID</Label>
            <Input
              id="sid"
              value={settings.twilio_account_sid}
              onChange={(e) =>
                setSettings({ ...settings, twilio_account_sid: e.target.value })
              }
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Auth Token</Label>
            <Input
              id="token"
              type="password"
              value={settings.twilio_auth_token}
              onChange={(e) =>
                setSettings({ ...settings, twilio_auth_token: e.target.value })
              }
              placeholder="Your Twilio auth token"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twilio-phone">Twilio Phone Number</Label>
            <Input
              id="twilio-phone"
              value={settings.twilio_phone_number}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  twilio_phone_number: e.target.value,
                })
              }
              placeholder="+1234567890"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">OpenTable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="ot-key">API Key</Label>
            <Input
              id="ot-key"
              type="password"
              value={settings.opentable_api_key}
              onChange={(e) =>
                setSettings({ ...settings, opentable_api_key: e.target.value })
              }
              placeholder="Your OpenTable API key"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Phone Number</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="user-phone">Phone Number for Notifications</Label>
            <Input
              id="user-phone"
              value={settings.user_phone_number}
              onChange={(e) =>
                setSettings({ ...settings, user_phone_number: e.target.value })
              }
              placeholder="+1234567890"
            />
            <p className="text-xs text-zinc-500">
              You'll receive SMS alerts at this number when reservations open up
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}
