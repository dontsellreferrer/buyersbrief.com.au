import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      navigate("/");
    },
    onError: (err) => {
      setError(err.message || "Invalid email or password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bb-offwhite)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <a href="/" className="flex items-center">
          <img src="/bb-logo.svg" alt="Buyers Brief" className="h-10" />
        </a>
        <Link href="/signup">
          <Button variant="ghost" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
            Create account
          </Button>
        </Link>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <img src="/bb-icon.png" alt="" className="h-12 w-12 mx-auto" />
              <h1 className="text-2xl font-bold font-[var(--font-outfit)] text-[var(--color-bb-charcoal)]">
                Welcome back
              </h1>
              <p className="text-sm text-[var(--color-bb-mid)]">
                Sign in to your Buyers Brief account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-lg border-gray-200 focus:border-[var(--color-bb-sky)] focus:ring-[var(--color-bb-sky)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-lg border-gray-200 focus:border-[var(--color-bb-sky)] focus:ring-[var(--color-bb-sky)]"
                />
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-11 rounded-lg bg-[var(--color-bb-sky)] hover:bg-[var(--color-bb-sky-dark)] text-white font-semibold text-sm transition-all active:scale-[0.97]"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-[var(--color-bb-mid)]">
                Don't have an account?{" "}
                <Link href="/signup" className="text-[var(--color-bb-sky)] hover:text-[var(--color-bb-sky-dark)] font-medium">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
