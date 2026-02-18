import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings, type AppSettings } from "@/lib/api";
import { Settings, Save, CheckCircle } from "lucide-react";

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [userPhone, setUserPhone] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
      setUserPhone(data.user_phone || "");
      setTwilioSid(data.twilio_account_sid || "");
      setTwilioPhone(data.twilio_phone_number || "");
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const update: Record<string, string> = {};
      if (userPhone) update.user_phone = userPhone;
      if (twilioSid) update.twilio_account_sid = twilioSid;
      if (twilioToken) update.twilio_auth_token = twilioToken;
      if (twilioPhone) update.twilio_phone_number = twilioPhone;

      const data = await updateSettings(update);
      setSettings(data);
      setTwilioToken(""); // Clear after save
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save settings");
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Twilio & Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Your Phone Number</Label>
          <Input
            placeholder="+1234567890"
            value={userPhone}
            onChange={(e) => setUserPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            SMS notifications will be sent to this number
          </p>
        </div>

        <div className="space-y-2">
          <Label>Twilio Account SID</Label>
          <Input
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={twilioSid}
            onChange={(e) => setTwilioSid(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Twilio Auth Token</Label>
          <Input
            type="password"
            placeholder={
              settings?.twilio_auth_token_set
                ? "••••••••••••••••"
                : "Enter auth token"
            }
            value={twilioToken}
            onChange={(e) => setTwilioToken(e.target.value)}
          />
          {settings?.twilio_auth_token_set && !twilioToken && (
            <p className="text-xs text-green-600">Auth token is configured</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Twilio Phone Number</Label>
          <Input
            placeholder="+1234567890"
            value={twilioPhone}
            onChange={(e) => setTwilioPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            SMS will be sent from this Twilio number
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saved ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
