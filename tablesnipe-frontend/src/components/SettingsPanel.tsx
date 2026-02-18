import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getSettings, updateSettings } from "../api";
import type { AppSettings } from "../api";
import { Settings, Save } from "lucide-react";

export default function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await getSettings();
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
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof AppSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Twilio Settings */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Twilio Configuration
          </h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="twilio_sid">Account SID</Label>
              <Input
                id="twilio_sid"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.twilio_account_sid || ""}
                onChange={(e) => updateField("twilio_account_sid", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="twilio_token">Auth Token</Label>
              <Input
                id="twilio_token"
                type="password"
                placeholder="Enter auth token..."
                value={settings.twilio_auth_token || ""}
                onChange={(e) => updateField("twilio_auth_token", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="from_number">From Number (Twilio)</Label>
                <Input
                  id="from_number"
                  placeholder="+1234567890"
                  value={settings.twilio_from_number || ""}
                  onChange={(e) => updateField("twilio_from_number", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to_number">Your Phone Number</Label>
                <Input
                  id="to_number"
                  placeholder="+1234567890"
                  value={settings.twilio_to_number || ""}
                  onChange={(e) => updateField("twilio_to_number", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* OpenTable Settings */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            OpenTable Configuration
          </h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bearer_token">Bearer Token (optional)</Label>
              <Input
                id="bearer_token"
                type="password"
                placeholder="Enter OpenTable bearer token..."
                value={settings.opentable_bearer_token || ""}
                onChange={(e) =>
                  updateField("opentable_bearer_token", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Required for booking. Obtain from OpenTable mobile app network traffic.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Twilio Webhook Info */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Twilio Webhook URL
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Set this as your Twilio number's incoming message webhook:
          </p>
          <code className="block p-2 bg-muted rounded text-sm break-all">
            {`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/twilio/webhook`}
          </code>
          <p className="text-xs text-muted-foreground mt-1">
            Method: HTTP POST
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
