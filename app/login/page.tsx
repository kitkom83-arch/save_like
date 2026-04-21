"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.message || "Login failed");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container paused-shell">
      <form onSubmit={handleSubmit} className="paused-panel grid" style={{ maxWidth: 460 }}>
        <div className="section-head">
          <h1>Admin Login</h1>
          <p className="small">Enter admin PIN to continue.</p>
        </div>
        <div>
          <label htmlFor="admin-pin">PIN</label>
          <input
            id="admin-pin"
            name="pin"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="Enter PIN"
            autoComplete="off"
          />
        </div>
        {error ? <p className="small">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
