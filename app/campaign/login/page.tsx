"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function CampaignLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/campaign/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(
          "campaign_user",
          JSON.stringify({ username: data.username, role: data.role }),
        );
        if (data.role === "admin") {
          window.location.href = "/campaign/admin";
        } else {
          window.location.href = "/campaign/dashboard";
        }
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left panel — 60% white */}
      <div
        style={{
          width: "60%",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ animation: "brunoFloat 3s ease-in-out infinite" }}>
          <Image
            src="/bruno-login.png"
            alt="Bruno"
            width={400}
            height={400}
            priority
            style={{ display: "block" }}
          />
        </div>
        <p
          style={{
            marginTop: 24,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          Powered by Bruno Intelligence
        </p>
      </div>

      {/* Right panel — 40% navy */}
      <div
        style={{
          width: "40%",
          background: "#1B2A4A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div style={{ width: "100%", maxWidth: 340 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#C8922A",
              margin: "0 0 8px",
            }}
          >
            Campaign Portal
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 32,
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 32px",
            }}
          >
            Welcome back
          </h1>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="cp-username"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#94a3b8",
                  marginBottom: 6,
                }}
              >
                Username
              </label>
              <input
                id="cp-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                style={{
                  width: "100%",
                  background: "#0f1d33",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#C8922A")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#334155")}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="cp-password"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#94a3b8",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                id="cp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                style={{
                  width: "100%",
                  background: "#0f1d33",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#C8922A")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#334155")}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#C8922A",
                color: "#ffffff",
                border: "none",
                padding: 14,
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                marginTop: 8,
              }}
            >
              {loading ? "Signing in..." : "Sign In \u2192"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                color: "#94a3b8",
                textDecoration: "none",
              }}
            >
              Design Center \u2192
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes brunoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  );
}
