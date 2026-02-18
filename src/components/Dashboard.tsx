"use client";

import { useState } from "react";
import MonitorsPanel from "./MonitorsPanel";
import AlertsPanel from "./AlertsPanel";
import SettingsPanel from "./SettingsPanel";

type Tab = "monitors" | "alerts" | "settings";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("monitors");

  const tabs: { id: Tab; label: string }[] = [
    { id: "monitors", label: "Monitors" },
    { id: "alerts", label: "Alerts" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="text-indigo-400">Table</span>
            <span className="text-emerald-400">Snipe</span>
          </h1>
          <nav className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "monitors" && <MonitorsPanel />}
        {activeTab === "alerts" && <AlertsPanel />}
        {activeTab === "settings" && <SettingsPanel />}
      </main>
    </div>
  );
}
