import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, Loader2 } from "lucide-react";

interface LoginGateProps {
  onAuthenticated: () => void;
}

export function LoginGate({ onAuthenticated }: LoginGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.verifyPassword(password);
      sessionStorage.setItem("ts_auth", "true");
      onAuthenticated();
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Crosshair className="h-8 w-8 text-zinc-900" />
          </div>
          <CardTitle className="text-xl">TableSnipe</CardTitle>
          <p className="text-sm text-zinc-500">Enter password to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter dashboard password"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
