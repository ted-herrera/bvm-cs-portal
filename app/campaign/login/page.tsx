"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function CampaignLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/campaign/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (data.success) {
        // Store in localStorage as backup to cookie
        localStorage.setItem("campaign_user", JSON.stringify({ username: username.trim(), role: data.role }));
        if (data.role === "admin") {
          window.location.href = "/campaign/admin";
        } else {
          window.location.href = "/campaign/dashboard";
        }
        return;
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{`@keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }`}</style>

      {/* Left panel — 60% */}
      <div style={{
        flex: "0 0 60%", background: "#ffffff", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 48px", position: "relative",
      }}>
        {/* BVM logo top left */}
        <div style={{ position: "absolute", top: 28, left: 32 }}>
          <img src="/bvm_logo.png" alt="BVM" style={{ height: 32 }} />
        </div>

        {/* Bruno image — large, floating */}
        <div style={{ marginBottom: 32, animation: "floating 3s ease-in-out infinite" }}>
          <Image
            src="/bruno-login.png"
            alt="Bruno — BVM Campaign Intelligence"
            width={400}
            height={400}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* Powered by Bruno */}
        <p style={{
          fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#1B2A4A",
          fontWeight: 700, margin: "0 0 24px", letterSpacing: "0.02em",
        }}>
          Powered by Bruno Intelligence
        </p>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["6,693 Clients", "Print + Digital", "Territory Intel"].map((pill) => (
            <div key={pill} style={{
              background: "rgba(27,42,74,0.06)", border: "1px solid rgba(27,42,74,0.12)",
              borderRadius: 20, padding: "8px 20px", fontSize: 13, fontWeight: 600,
              color: "#1B2A4A", whiteSpace: "nowrap",
            }}>
              {pill}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — 40% */}
      <div style={{
        flex: "0 0 40%", background: "#243454", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "40px 48px",
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#fff",
            fontWeight: 700, margin: "0 0 6px",
          }}>
            Welcome back
          </h1>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#F5C842", textTransform: "uppercase",
            letterSpacing: "0.15em", margin: "0 0 36px",
          }}>
            Campaign Portal
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                autoComplete="username"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#F5C842"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#F5C842"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                fontSize: 13, color: "#ef4444", fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              style={{
                width: "100%", padding: "14px 24px", borderRadius: 10,
                background: username.trim() && password ? "#F5C842" : "rgba(255,255,255,0.08)",
                color: username.trim() && password ? "#1B2A4A" : "rgba(255,255,255,0.3)",
                border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer",
                opacity: loading ? 0.6 : 1, transition: "all 0.15s",
              }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: "center" }}>
            <Link href="/login" style={{
              fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none",
              fontWeight: 600,
            }}>
              Design Center →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
