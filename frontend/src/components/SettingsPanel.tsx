import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings, saveSettings, type Settings } from "@/api";
import { Save, Loader2, Eye, EyeOff } from "lucide-react";

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showBearer, setShowBearer] = useState(false);

  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [bearerToken, setBearerToken] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      setTwilioSid(s.twilio_account_sid || "");
      setTwilioToken(s.twilio_auth_token || "");
      setTwilioPhone(s.twilio_phone_number || "");
      setUserPhone(s.user_phone_number || "");
      setBearerToken(s.opentable_bearer_token || "");
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Partial<Settings> = {};
      if (twilioSid) data.twilio_account_sid = twilioSid;
      if (twilioToken) data.twilio_auth_token = twilioToken;
      if (twilioPhone) data.twilio_phone_number = twilioPhone;
      if (userPhone) data.user_phone_number = userPhone;
      if (bearerToken) data.opentable_bearer_token = bearerToken;
      await saveSettings(data);
      await loadSettings();
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Twilio Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Twilio SMS</CardTitle>
          <CardDescription>
            Configure Twilio to send and receive SMS notifications. Set the webhook URL
            in your Twilio console to <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded">/api/webhooks/twilio</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Account SID</Label>
            <Input
              value={twilioSid}
              onChange={(e) => setTwilioSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label>Auth Token</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={twilioToken}
                onChange={(e) => setTwilioToken(e.target.value)}
                placeholder="Enter auth token"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Twilio Phone Number</Label>
            <Input
              value={twilioPhone}
              onChange={(e) => setTwilioPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label>Your Phone Number</Label>
            <Input
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
        </CardContent>
      </Card>

      {/* OpenTable Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">OpenTable API</CardTitle>
          <CardDescription>
            Bearer token for the OpenTable mobile API. You can obtain this by inspecting
            network requests on opentable.com or the mobile app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bearer Token (optional)</Label>
            <div className="relative">
              <Input
                type={showBearer ? "text" : "password"}
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Enter bearer token"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                onClick={() => setShowBearer(!showBearer)}
              >
                {showBearer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {settings?.opentable_bearer_token_masked && (
              <p className="text-xs text-zinc-500">
                Current: {settings.opentable_bearer_token_masked}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
