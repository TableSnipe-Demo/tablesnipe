"use client";

import { useState } from "react";

interface LoginScreenProps {
  onSuccess: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.firstTime) {
          // First time setup - secret was just created
        }
        onSuccess();
      } else {
        setError(data.error || "Invalid secret");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-indigo-400">Table</span>
            <span className="text-emerald-400">Snipe</span>
          </h1>
          <p className="text-gray-500 text-sm">
            OpenTable Reservation Monitor
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="secret"
              className="block text-sm text-gray-400 mb-1"
            >
              Enter your secret to continue
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Secret key"
              className="w-full"
              autoFocus
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              First time? This will become your access key.
            </p>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
          >
            {loading ? "Authenticating..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
