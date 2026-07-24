"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export function SignupForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp({ name, email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="label-caps">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 w-full rounded-md border border-wt-border bg-wt-bg-2 px-3 text-sm text-wt-text placeholder:text-wt-text-dim focus:border-wt-accent focus:outline-none focus:ring-2 focus:ring-wt-accent/60"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="label-caps">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full rounded-md border border-wt-border bg-wt-bg-2 px-3 text-sm text-wt-text placeholder:text-wt-text-dim focus:border-wt-accent focus:outline-none focus:ring-2 focus:ring-wt-accent/60"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="label-caps">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 w-full rounded-md border border-wt-border bg-wt-bg-2 px-3 text-sm text-wt-text placeholder:text-wt-text-dim focus:border-wt-accent focus:outline-none focus:ring-2 focus:ring-wt-accent/60"
        />
        <p className="text-xs text-wt-text-dim">At least 8 characters.</p>
      </div>

      {error && (
        <p className="rounded-md border border-wt-danger/40 bg-wt-danger/10 px-3 py-2 text-sm text-wt-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="h-10 w-full rounded-md bg-wt-accent text-sm font-medium text-white transition-colors hover:bg-wt-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-wt-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-wt-accent-2 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
