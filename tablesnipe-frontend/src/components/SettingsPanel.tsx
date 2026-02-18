import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings, type Settings } from "@/lib/api";
import { Settings2, Loader2, Save, CheckCircle } from "lucide-react";

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data.settings);
      setAccountSid(data.settings.twilio_account_sid || "");
      setAuthToken("");
      setTwilioPhone(data.settings.twilio_phone_number || "");
      setUserPhone(data.settings.user_phone_number || "");
      setWebhookUrl(data.settings.webhook_base_url || "");
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
      if (accountSid) updates.twilio_account_sid = accountSid;
      if (authToken) updates.twilio_auth_token = authToken;
      if (twilioPhone) updates.twilio_phone_number = twilioPhone;
      if (userPhone) updates.user_phone_number = userPhone;
      if (webhookUrl) updates.webhook_base_url = webhookUrl;

      const data = await updateSettings(updates);
      setSettings(data.settings);
      setAuthToken("");
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
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  const isConfigured = settings?.twilio_account_sid && settings?.twilio_phone_number && settings?.user_phone_number;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Twilio Settings
          {isConfigured ? (
            <span className="ml-auto text-xs font-normal text-green-600 bg-green-50 px-2 py-1 rounded">Configured</span>
          ) : (
            <span className="ml-auto text-xs font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded">Not configured</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500">
          Configure Twilio to receive SMS alerts when reservations become available.
          Set your Twilio webhook URL to <code className="bg-zinc-100 px-1 rounded text-xs">{`{your-server}/api/twilio/webhook`}</code>
        </p>

        <div className="space-y-2">
          <Label>Twilio Account SID</Label>
          <Input
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Twilio Auth Token</Label>
          <Input
            type="password"
            placeholder={settings?.twilio_auth_token_masked || "Enter auth token"}
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
          />
          {settings?.twilio_auth_token_masked && (
            <p className="text-xs text-zinc-400">
              Current: {settings.twilio_auth_token_masked} (leave blank to keep)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Twilio Phone Number</Label>
          <Input
            placeholder="+1234567890"
            value={twilioPhone}
            onChange={(e) => setTwilioPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Your Phone Number</Label>
          <Input
            placeholder="+1234567890"
            value={userPhone}
            onChange={(e) => setUserPhone(e.target.value)}
          />
          <p className="text-xs text-zinc-400">
            SMS alerts will be sent to this number
          </p>
        </div>

        <div className="space-y-2">
          <Label>Webhook Base URL (optional)</Label>
          <Input
            placeholder="https://your-server.com"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-zinc-400">
            Used for Twilio webhook configuration
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
