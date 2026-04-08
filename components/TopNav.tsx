"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type ActivePage = "dashboard" | "clients" | "intake" | "qa";

const pills: { label: string; href: string; page: ActivePage }[] = [
  { label: "Dashboard", href: "/dashboard", page: "dashboard" },
  { label: "Clients", href: "/clients", page: "clients" },
  { label: "New Intake", href: "/intake", page: "intake" },
  { label: "QA Engine", href: "/qa", page: "qa" },
];

export default function TopNav({ activePage }: { activePage: ActivePage }) {
  const router = useRouter();

  function handleSignOut() {
    document.cookie = "dc_session=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <>
      {/* Gold 4px top bar */}
      <div style={{ height: 4, background: "#F5C842", flexShrink: 0 }} />

      {/* White nav bar */}
      <nav
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "10px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* Left — brand */}
        <span
          style={{
            color: "#0d1a2e",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          BVM DESIGN CENTER
        </span>

        {/* Center — pill nav */}
        <div style={{ display: "flex", gap: 4 }}>
          {pills.map((p) => {
            const isActive = p.page === activePage;
            return (
              <Link
                key={p.page}
                href={p.href}
                style={{
                  padding: "6px 16px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s",
                  background: isActive ? "#F5C842" : "transparent",
                  color: isActive ? "#0d1a2e" : "#0d1a2e",
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                {p.label}
              </Link>
            );
          })}
        </div>

        {/* Right — rep + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#0d1a2e", fontWeight: 500 }}>
            Ted Herrera
          </span>
          <button
            onClick={handleSignOut}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}
