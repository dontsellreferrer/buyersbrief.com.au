import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Signup() {
  const [, navigate] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      navigate("/");
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    signupMutation.mutate({
      email,
      password,
      firstName,
      lastName: lastName || undefined,
      mobile: mobile || undefined,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bb-offwhite)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <a href="/" className="flex items-center">
          <img src="/bb-logo.svg" alt="Buyers Brief" className="h-10" />
        </a>
        <Link href="/login">
          <Button variant="ghost" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
            Sign in
          </Button>
        </Link>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <img src="/bb-icon.png" alt="" className="h-12 w-12 mx-auto" />
              <h1 className="text-2xl font-bold font-[var(--font-outfit)] text-[var(--color-bb-charcoal)]">
                Create your account
              </h1>
              <p className="text-sm text-[var(--color-bb-mid)]">
                Start finding your perfect property match
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
                    First name *
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Liam"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-11 rounded-lg border-gray-200 focus:border-[var(--color-bb-sky)] focus:ring-[var(--color-bb-sky)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Optional"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 rounded-lg border-gray-200 focus:border-[var(--color-bb-sky)] focus:ring-[var(--color-bb-sky)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
                  Email *
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
                <Label htmlFor="mobile" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
                  Mobile
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="04XX XXX XXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="h-11 rounded-lg border-gray-200 focus:border-[var(--color-bb-sky)] focus:ring-[var(--color-bb-sky)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[var(--color-bb-charcoal)]">
                  Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 rounded-lg border-gray-200 focus:border-[var(--color-bb-sky)] focus:ring-[var(--color-bb-sky)]"
                />
              </div>

              <Button
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full h-11 rounded-lg bg-[var(--color-bb-sky)] hover:bg-[var(--color-bb-sky-dark)] text-white font-semibold text-sm transition-all active:scale-[0.97]"
              >
                {signupMutation.isPending ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-[var(--color-bb-mid)]">
                Already have an account?{" "}
                <Link href="/login" className="text-[var(--color-bb-sky)] hover:text-[var(--color-bb-sky-dark)] font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
