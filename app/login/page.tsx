"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function demoLogin() {
    setUsername("demo");
    setPassword("demo");
    setLoading(true);
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "demo", password: "demo" }),
    }).then((res) => {
      if (res.ok) router.push("/dashboard");
      else setError("Demo login failed");
      setLoading(false);
    }).catch(() => { setError("Something went wrong"); setLoading(false); });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column" }}>
      {/* Gold top bar */}
      <div style={{ height: 4, background: "#F5C842", flexShrink: 0 }} />

      {/* Centered content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Bruno image floating above card */}
          <img
            src="/bruno-login.png"
            alt="Bruno"
            style={{ width: 240, display: "block", margin: "0 auto", marginBottom: -60, position: "relative", zIndex: 10, mixBlendMode: "multiply", background: "transparent" }}
          />

          {/* Login card */}
          <div style={{ background: "#ffffff", border: "none", borderRadius: 20, padding: "40px 36px", position: "relative", zIndex: 1, overflow: "visible", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#0d1a2e", textAlign: "center", margin: "0 0 4px" }}>
              BVM DESIGN CENTER
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#0d1a2e", textAlign: "center", margin: "0 0 24px" }}>
              Welcome back
            </h1>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="username" style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#0d1a2e", outline: "none", boxSizing: "border-box" }}
                  placeholder="Enter username"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="password" style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#0d1a2e", outline: "none", boxSizing: "border-box" }}
                  placeholder="Enter password"
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", background: "#F5C842", color: "#0d1a2e", border: "none",
                  padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
                  marginTop: 8,
                }}
              >
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                type="button"
                onClick={demoLogin}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", padding: 0 }}
              >
                Just exploring? <span style={{ color: "#F5C842", fontWeight: 600 }}>Demo Login →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
