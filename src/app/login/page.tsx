"use client";

import { useState } from "react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "ログインできませんでした");
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-icon" aria-hidden>
          🌱
        </div>
        <h1>ふたりの妊活TODO</h1>
        <p className="muted">家族の合言葉を入力してください</p>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="合言葉"
          autoFocus
          autoComplete="current-password"
        />
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy || !passcode}>
          {busy ? "確認中…" : "はじめる"}
        </button>
      </form>
    </main>
  );
}
