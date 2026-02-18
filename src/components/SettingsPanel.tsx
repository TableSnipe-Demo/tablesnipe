"use client";

import { useState, useEffect, useCallback } from "react";

interface SettingsConfig {
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  user_phone_number: string;
  opentable_token: string;
  opentable_gpid: string;
  opentable_diner_id: string;
  opentable_phone: string;
  webhook_url: string;
}

const EMPTY_SETTINGS: SettingsConfig = {
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_phone_number: "",
  user_phone_number: "",
  opentable_token: "",
  opentable_gpid: "",
  opentable_diner_id: "",
  opentable_phone: "",
  webhook_url: "",
};

const FIELD_GROUPS = [
  {
    title: "Twilio SMS",
    description: "Configure Twilio for SMS alerts and booking confirmations",
    fields: [
      {
        key: "twilio_account_sid" as const,
        label: "Account SID",
        placeholder: "AC...",
        sensitive: false,
      },
      {
        key: "twilio_auth_token" as const,
        label: "Auth Token",
        placeholder: "Your Twilio auth token",
        sensitive: true,
      },
      {
        key: "twilio_phone_number" as const,
        label: "Twilio Phone Number",
        placeholder: "+1234567890",
        sensitive: false,
      },
      {
        key: "user_phone_number" as const,
        label: "Your Phone Number",
        placeholder: "+1234567890",
        sensitive: false,
      },
    ],
  },
  {
    title: "OpenTable",
    description:
      "Your OpenTable bearer token for API access. Get this from the mobile app network traffic.",
    fields: [
      {
        key: "opentable_token" as const,
        label: "Bearer Token",
        placeholder: "Your OpenTable API token",
        sensitive: true,
      },
      {
        key: "opentable_gpid" as const,
        label: "GPID (optional)",
        placeholder: "Your OpenTable GPID",
        sensitive: false,
      },
      {
        key: "opentable_diner_id" as const,
        label: "Diner ID (optional)",
        placeholder: "Your diner ID",
        sensitive: false,
      },
      {
        key: "opentable_phone" as const,
        label: "Phone on OT account (optional)",
        placeholder: "+1234567890",
        sensitive: false,
      },
    ],
  },
  {
    title: "Webhook",
    description:
      "Set the public URL for the Twilio webhook. Point Twilio's incoming message webhook to this URL + /api/twilio/webhook",
    fields: [
      {
        key: "webhook_url" as const,
        label: "Base URL",
        placeholder: "https://your-app.example.com",
        sensitive: false,
      },
    ],
  },
];

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsConfig>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  // Track which fields the user has edited
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...EMPTY_SETTINGS, ...data });
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function handleChange(key: keyof SettingsConfig, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirtyFields((prev) => new Set(prev).add(key));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    // Only send fields that were actually edited
    const payload: Record<string, string> = {};
    for (const key of dirtyFields) {
      const value = settings[key as keyof SettingsConfig];
      if (value) {
        payload[key] = value;
      }
    }

    if (Object.keys(payload).length === 0) {
      setMessage("No changes to save");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("Settings saved!");
        setDirtyFields(new Set());
        fetchSettings();
      } else {
        setMessage("Failed to save settings");
      }
    } catch {
      setMessage("Connection error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-gray-500 text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
      {FIELD_GROUPS.map((group) => (
        <div
          key={group.title}
          className="bg-gray-900 border border-gray-800 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-1">{group.title}</h3>
          <p className="text-sm text-gray-500 mb-4">{group.description}</p>
          <div className="grid gap-4">
            {group.fields.map((field) => (
              <div key={field.key}>
                <label className="text-sm text-gray-400 block mb-1">
                  {field.label}
                </label>
                <input
                  type={field.sensitive ? "password" : "text"}
                  value={settings[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {message && (
        <div
          className={`text-sm rounded-lg p-3 ${
            message.includes("saved")
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || dirtyFields.size === 0}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
