"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../providers/auth-provider";

export function AuthScreen() {
  const router = useRouter();
  const { login, signUp, user, ready } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, router, user]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "signup")
        signUp({
          name: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        });
      else
        login(
          String(form.get("email") || ""),
          String(form.get("password") || ""),
        );
      router.replace("/");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to continue.",
      );
    }
  }

  if (ready && user)
    return <main className="auth-loading">Opening your workspace…</main>;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="brand auth-brand" href="/" aria-label="WebNest home">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span className="brand-wordmark">
            Web<span>Nest</span>
          </span>
        </Link>
        <p className="eyebrow">YOUR WORKSPACE, YOUR WAY</p>
        <h1 id="auth-title">
          {mode === "login" ? "Welcome back" : "Create your WebNest account"}
        </h1>
        <p className="muted">
          {mode === "login"
            ? "Sign in to continue where you left off."
            : "Start organizing your team’s next big thing."}
        </p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label>
              Username
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                placeholder="Alex Morgan"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" type="submit">
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "New to WebNest?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="auth-note">
          Demo accounts are stored only in this browser. Do not use a real
          password.
        </p>
      </section>
    </main>
  );
}
