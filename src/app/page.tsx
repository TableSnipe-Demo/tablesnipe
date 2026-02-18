"use client";

import { useState, useEffect, useCallback } from "react";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/monitors");
      if (res.ok) {
        setAuthenticated(true);
      }
    } catch {
      // Not authenticated
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}
