"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
      }

      // On success, go to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const title = mode === "signin" ? "Sign in" : "Create your account";
  const buttonLabel =
    mode === "signin" ? "Sign in to LemonsLemons" : "Sign up";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Toggle */}
        <div className="flex gap-2 rounded-full bg-muted p-1">
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("signin")}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("signup")}
          >
            Sign up
          </Button>
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Use your email and password to access your LemonsLemons dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Please wait..." : buttonLabel}
          </Button>
        </form>

        {mode === "signin" && (
          <p className="text-xs text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </p>
        )}

        {mode === "signup" && (
          <p className="text-xs text-center text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}