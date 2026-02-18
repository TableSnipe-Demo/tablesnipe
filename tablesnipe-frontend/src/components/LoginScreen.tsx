import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface LoginScreenProps {
  onLogin: (secret: string) => Promise<boolean>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const success = await onLogin(secret);
      if (!success) {
        setError("Invalid secret. Please try again.");
      }
    } catch {
      setError("Connection error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <Lock className="h-7 w-7 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-100">TableSnipe</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your secret to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret" className="text-zinc-300">Secret</Label>
              <Input
                id="secret"
                type="password"
                placeholder="Enter your secret..."
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading || !secret}
            >
              {loading ? "Authenticating..." : "Unlock Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
