"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientProfile, PipelineStage } from "@/lib/pipeline";
import { STAGE_LABELS } from "@/lib/pipeline";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// Initials from a business name: first letter of first word + first letter of
// last word. Single-word names return a single initial. Always uppercase.
function getInitials(name: string | null | undefined): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return (words[0][0] || "—").toUpperCase();
  const first = words[0][0] || "";
  const last = words[words.length - 1][0] || "";
  return (first + last).toUpperCase();
}

// Revenue-per-month estimate from intake print size.
function clientMRR(c: ClientProfile): number {
  const intake = (c.intakeAnswers || {}) as Record<string, string>;
  const size = (intake.q5 || intake.printSize || "").toLowerCase();
  if (size.includes("cover")) return 2400;
  if (size.includes("full")) return 1800;
  if (size.includes("half") || size.includes("1/2")) return 1200;
  if (size.includes("third") || size.includes("1/3")) return 900;
  if (size.includes("quarter") || size.includes("1/4")) return 700;
  if (size.includes("eighth") || size.includes("1/8")) return 450;
  return 550;
}

// Potential revenue if this client were upgraded to the next natural product.
function clientUpsidePotential(c: ClientProfile): number {
  const intake = (c.intakeAnswers || {}) as Record<string, string>;
  const size = (intake.q5 || intake.printSize || "").toLowerCase();
  const currentMRR = clientMRR(c);
  let sizeUpgrade = 0;
  if (size.includes("eighth") || size.includes("1/8")) sizeUpgrade = 700 - currentMRR;
  else if (size.includes("quarter") || size.includes("1/4")) sizeUpgrade = 1200 - currentMRR;
  else if (size.includes("third") || size.includes("1/3")) sizeUpgrade = 1800 - currentMRR;
  else if (size.includes("half") || size.includes("1/2")) sizeUpgrade = 1800 - currentMRR;
  else if (size.includes("full")) sizeUpgrade = 2400 - currentMRR;
  sizeUpgrade = Math.max(0, sizeUpgrade);
  const interests = (c.interests || {}) as Record<string, unknown>;
  const digital = interests["digital-ads"] ? 0 : 800;
  const website = interests["website"] ? 0 : 500;
  return sizeUpgrade + digital + website;
}

// Client health: higher = healthier.
function clientHealthScore(c: ClientProfile): number {
  const d = daysSince(lastStageDate(c));
  let score = 70;
  if (c.stage === "live") score = 95;
  else if (c.stage === "delivered") score = 85;
  else if (c.stage === "building" || c.stage === "qa" || c.stage === "review") score = 75;
  else if (c.stage === "tear-sheet") score = Math.max(35, 65 - d * 3);
  else if (c.stage === "intake") score = Math.max(30, 60 - d * 2);
  if (c.stage === "revision-requested") score -= 12;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Decode the dc_session cookie on the client to get the logged-in rep username.
function getSessionUsername(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/dc_session=([^;]+)/);
  if (!m) return "";
  try {
    const encoded = decodeURIComponent(m[1]).split(".")[0];
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return (payload.username || "").toLowerCase();
  } catch {
    return "";
  }
}

function prettyUpsell(kind: "size-upgrade" | "digital-ads" | "website"): string {
  if (kind === "size-upgrade") return "Size upgrade";
  if (kind === "digital-ads") return "Digital advertising";
  return "Website";
}

function lastStageDate(c: ClientProfile): string {
  return c.buildLog[c.buildLog.length - 1]?.timestamp || c.created_at;
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AFFIRMATIONS = [
  "The rep who shows up prepared wins the room every time.",
  "Every great client started as a cold call someone almost didn't make.",
  "Your pipeline is a reflection of your last 30 days of activity.",
  "Speed is a feature. The rep who moves fastest wins.",
  "A confused client says no. A confident rep creates clarity.",
  "Your best upsell is a client who trusts you completely.",
  "Show them the site before they ask to see it.",
  "The follow-up is where the money lives.",
  "Every 'not interested' is just 'not yet'.",
  "You're not selling a website. You're selling their neighborhood seeing them.",
  "The best time to plant a tree was 20 years ago. The second best time is today's intake.",
  "A rep with a system outperforms a rep with talent every time.",
  "Your clients don't know what they want until you show them.",
  "The difference between a good rep and a great rep is one more follow-up.",
  "Build the site. Send the link. Let Bruno close.",
];

function getStoryPill(c: ClientProfile): { icon: string; text: string; color: string; urgency: number } {
  const days = daysSince(lastStageDate(c));
  if (c.interests?.featured_placement) return { icon: "👑", text: "Featured Placement requested — CALL NOW", color: "#ef4444", urgency: 0 };
  if (c.stage === "revision-requested") return { icon: "💬", text: "Client replied — unread message", color: "#ef4444", urgency: 1 };
  if (c.stage === "tear-sheet" && days > 7) return { icon: "🔴", text: `Stuck ${days} days — Tear Sheet not opened`, color: "#ef4444", urgency: 2 };
  if (c.interests?.print) {
    const size = typeof c.interests.print === "string" ? c.interests.print : "print";
    return { icon: "📰", text: `${size} print selected — follow up`, color: "#f59e0b", urgency: 3 };
  }
  if (c.qaReport && c.qaReport.score < 50) return { icon: "⚠️", text: `QA Score ${c.qaReport.score} — needs dev attention`, color: "#f59e0b", urgency: 4 };
  if (c.stage === "tear-sheet") return { icon: "📧", text: `Awaiting client — ${days}d`, color: "#f59e0b", urgency: 5 };
  if (c.stage === "delivered" || c.approved_at) return { icon: "✅", text: "Approved — ready to deploy", color: "#22c55e", urgency: 6 };
  if (c.stage === "live") return { icon: "🟢", text: "Live", color: "#22c55e", urgency: 8 };
  return { icon: "🔵", text: `${STAGE_LABELS[c.stage]} — ${days}d`, color: "#3b82f6", urgency: 7 };
}

function getAction(c: ClientProfile): { label: string; href: string } {
  if (c.interests?.featured_placement) return { label: "Call Client →", href: `tel:${c.phone?.replace(/\D/g, "")}` };
  if (c.stage === "revision-requested") return { label: "View Message →", href: `/tearsheet/${c.id}` };
  if (c.stage === "tear-sheet") return { label: "Open Tear Sheet →", href: `/tearsheet/${c.id}` };
  if (c.stage === "qa") return { label: "Review QA →", href: `/tearsheet/${c.id}` };
  if (c.stage === "live") return { label: "View Site →", href: c.published_url || `/tearsheet/${c.id}` };
  return { label: "View Profile →", href: `/tearsheet/${c.id}` };
}

const BVM_SAMPLE_SITES = [
  { label: "Evergreen Landscapes (Local)", url: "https://evergreen-landscapes.bvmlocal.com/" },
  { label: "Best Oishi Media (Premier)", url: "https://bestoishimedia-examplesite.bvmlocal.com/" },
  { label: "Hurst Roofers (Community)", url: "https://hurstroofers-examplesite.bvmlocal.com/" },
  { label: "Best Captain Law (Community)", url: "https://bestcaptainlaw-examplesite.bvmlocal.com/" },
];

function addToCalendar(title: string, details: string) {
  const start = new Date(Date.now() + 86400000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(Date.now() + 86400000 + 3600000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`, "_blank");
}

// ─── Main ───────────────────────────────────────────────────────────────────

interface StoreNotification {
  id: string;
  type: "build-complete" | "handwrytten-task" | "pulse-response" | "upsell-interest" | "new-client";
  clientId: string;
  businessName: string;
  message: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
  meta?: Record<string, unknown>;
}

interface PulseTimerInfo {
  clientId: string;
  day7At: number;
  day14At: number;
  day30At: number;
  lastSentAt: number | null;
  lastScore: number | null;
}

function handleSignOut(router: ReturnType<typeof useRouter>) {
  document.cookie = "dc_session=; path=/; max-age=0";
  try {
    localStorage.removeItem("dc_auth_token");
  } catch {
    /* ignore */
  }
  router.push("/login");
}

export default function DashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState<Set<string>>(new Set());
  const [storeNotifs, setStoreNotifs] = useState<StoreNotification[]>([]);
  const [pulseTimer, setPulseTimer] = useState<PulseTimerInfo | null>(null);
  const [pulseStatus, setPulseStatus] = useState("");
  const [affIdx, setAffIdx] = useState(Math.floor(new Date().getTime() / 86400000) % AFFIRMATIONS.length);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [slideOutOpen, setSlideOutOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "comm" | "actions">("overview");
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [, setWeather] = useState<{ temp: string; icon: string } | null>(null);
  const [clock, setClock] = useState(new Date());
  const [clientWeather, setClientWeather] = useState<string>("");
  const [clientTz, setClientTz] = useState<string>("");
  const [gcalConnected, setGcalConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [actionPopover, setActionPopover] = useState<"note" | "task" | null>(null);
  const [actionText, setActionText] = useState("");
  const [actionDue, setActionDue] = useState("");
  const [actionConfirm, setActionConfirm] = useState("");
  const [brunoQuery, setBrunoQuery] = useState("");
  const [brunoResponse, setBrunoResponse] = useState("");
  const [brunoLoading, setBrunoLoading] = useState(false);
  const [brunoOpen, setBrunoOpen] = useState(false);
  const brunoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/clients");
        const d = await r.json();
        setClients(d.clients || []);
      } catch {
        // Retry once — covers race conditions on cold start
        try {
          const r2 = await fetch("/api/clients");
          const d2 = await r2.json();
          setClients(d2.clients || []);
        } catch {
          setClients([]);
        }
      }
      try {
        const nr = await fetch("/api/notifications");
        const nd = await nr.json();
        setStoreNotifs(nd.notifications || []);
      } catch {
        /* ignore */
      }
      setLoading(false);
    }
    load();
    // Weather
    fetch("https://wttr.in/Tulsa?format=j1").then((r) => r.json()).then((d) => {
      const cur = d?.current_condition?.[0];
      if (cur) setWeather({ temp: `${cur.temp_F}°F`, icon: cur.weatherDesc?.[0]?.value || "" });
    }).catch(() => {});
    // Calendar
    setGcalConnected(localStorage.getItem("gcal_connected") === "true");
  }, []);

  // Poll clients + notifications every 30s
  useEffect(() => {
    const i = setInterval(() => {
      fetch("/api/clients")
        .then((r) => r.json())
        .then((d) => setClients(d.clients || []))
        .catch(() => {});
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setStoreNotifs(d.notifications || []))
        .catch(() => {});
    }, 30000);
    const clockInterval = setInterval(() => setClock(new Date()), 1000);
    return () => {
      clearInterval(i);
      clearInterval(clockInterval);
    };
  }, []);

  // Fetch pulse timer for selected client
  useEffect(() => {
    if (!selectedClient) {
      setPulseTimer(null);
      return;
    }
    fetch(`/api/pulse/send?clientId=${encodeURIComponent(selectedClient.id)}`)
      .then((r) => r.json())
      .then((d) => setPulseTimer(d.timer || null))
      .catch(() => setPulseTimer(null));
  }, [selectedClient]);

  async function sendPulseNow() {
    if (!selectedClient) return;
    setPulseStatus("Sending...");
    try {
      const r = await fetch("/api/pulse/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClient.id }),
      });
      const d = await r.json();
      if (d.timer) setPulseTimer(d.timer);
      setPulseStatus("Pulse sent ✓");
      setTimeout(() => setPulseStatus(""), 3000);
    } catch {
      setPulseStatus("Failed — try again");
      setTimeout(() => setPulseStatus(""), 3000);
    }
  }

  async function dismissStoreNotif(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "dismiss" }),
      });
    } catch {
      /* ignore */
    }
    setStoreNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [slideOutOpen, selectedClient]);

  // Fetch client local weather + derive timezone
  useEffect(() => {
    if (!selectedClient?.city) { setClientWeather(""); setClientTz(""); return; }
    const cityClean = selectedClient.city.split(",")[0].trim();
    fetch(`https://wttr.in/${encodeURIComponent(cityClean)}?format=j1`)
      .then((r) => r.json())
      .then((j: { current_condition?: Array<{ temp_F?: string; weatherDesc?: Array<{ value?: string }> }> }) => {
        const cur = j?.current_condition?.[0];
        if (cur) {
          const desc = cur.weatherDesc?.[0]?.value?.trim() || "";
          const temp = cur.temp_F ? `${cur.temp_F}°F` : "";
          setClientWeather([temp, desc].filter(Boolean).join(" · "));
        } else {
          setClientWeather("");
        }
      })
      .catch(() => setClientWeather(""));
    // Naive timezone from common US cities
    const tzMap: Record<string, string> = {
      tulsa: "America/Chicago", denver: "America/Denver", nashville: "America/Chicago",
      "new york": "America/New_York", "los angeles": "America/Los_Angeles",
      chicago: "America/Chicago", houston: "America/Chicago", phoenix: "America/Phoenix",
      miami: "America/New_York", seattle: "America/Los_Angeles", boston: "America/New_York",
      atlanta: "America/New_York", dallas: "America/Chicago", austin: "America/Chicago",
    };
    setClientTz(tzMap[cityClean.toLowerCase()] || "America/Chicago");
  }, [selectedClient?.city]);

  // Close Bruno panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (brunoRef.current && !brunoRef.current.contains(e.target as Node)) setBrunoOpen(false);
    }
    if (brunoOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [brunoOpen]);

  async function askBruno() {
    if (!brunoQuery.trim() || brunoLoading) return;
    setBrunoLoading(true);
    setBrunoOpen(true);
    setBrunoResponse("");
    const clientSummary = clients.map((c) => ({
      id: c.id, name: c.business_name, city: c.city, stage: c.stage,
      look: c.selectedLook, phone: c.phone,
      daysSinceLastUpdate: daysSince(lastStageDate(c)),
      interests: c.interests ? Object.keys(c.interests).filter((k) => !k.endsWith("_at") && c.interests?.[k]) : [],
      messageCount: c.messages.length,
      approved: !!c.approved_at,
    }));
    const system = `You are Bruno, a VA for BVM account managers. You have access to this rep's client list:\n${JSON.stringify(clientSummary, null, 2)}\n\nAnswer questions about the pipeline, suggest actions, flag at-risk clients. Be direct and concise. You can also tell the rep to enroll a client in a Close CRM sequence or send a Handwrytten card.`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, messages: [{ role: "user", content: brunoQuery }], temperature: 0.5 }),
      });
      const data = await res.json();
      setBrunoResponse(data.response || data.error || "No response");
    } catch {
      setBrunoResponse("Something went wrong — try again.");
    }
    setBrunoLoading(false);
  }

  // Notifications — merge store notifications + recent stage changes
  const storeNotifEntries = storeNotifs.map((n) => ({
    id: n.id,
    name: n.businessName,
    msg: n.message,
    time: timeAgo(n.createdAt),
    clientId: n.clientId,
    type: n.type,
    isStore: true as const,
  }));

  const stageNotifEntries = clients.flatMap((c) =>
    c.buildLog.slice(-3).map((e) => ({
      id: `${c.id}-${e.timestamp}`,
      name: c.business_name,
      msg: `${STAGE_LABELS[e.from]} → ${STAGE_LABELS[e.to]}`,
      time: timeAgo(e.timestamp),
      clientId: c.id,
      type: "stage" as const,
      isStore: false as const,
    }))
  );

  const notifications = [...storeNotifEntries, ...stageNotifEntries]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 30);

  const unread =
    storeNotifs.filter((n) => !n.read).length +
    stageNotifEntries.filter((n) => !readNotifs.has(n.id)).length;

  const handwryttenTasks = storeNotifs.filter((n) => n.type === "handwrytten-task");

  // Priority queue
  const priorityQueue = [...clients].map((c) => ({ client: c, story: getStoryPill(c) })).sort((a, b) => a.story.urgency - b.story.urgency);

  // Kanban
  const kanbanCols: PipelineStage[] = ["intake", "tear-sheet", "building", "qa", "review", "delivered", "live"];

  // Right panel data
  const followUps = clients.filter((c) => c.stage === "tear-sheet" && daysSince(lastStageDate(c)) >= 2);
  const interests = clients.filter((c) => c.interests && Object.keys(c.interests).some((k) => !k.endsWith("_at") && c.interests?.[k]));

  // Stats
  const delivered = clients.filter((c) => c.stage === "delivered" || c.stage === "live").length;
  const qaClients = clients.filter((c) => c.qaReport);
  const avgQA = qaClients.length ? Math.round(qaClients.reduce((s, c) => s + (c.qaReport?.score || 0), 0) / qaClients.length) : 0;

  async function sendMessage() {
    if (!msgInput.trim() || !selectedClient || msgSending) return;
    setMsgSending(true);
    try {
      await fetch(`/api/profile/message/${selectedClient.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgInput, from: "rep", repName: "Ted" }),
      });
      const newMsg = { from: "rep", text: msgInput, timestamp: new Date().toISOString() };
      const updated = { ...selectedClient, messages: [...selectedClient.messages, newMsg] };
      setSelectedClient(updated);
      setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setMsgInput("");
    } catch { /* ignore */ }
    setMsgSending(false);
  }

  // ── Center panel tab state ─────────────────────────────────────────────────
  const [centerTab, setCenterTab] = useState<"priority" | "pipeline" | "stats" | "review">("priority");
  const [toast, setToast] = useState("");
  const [sendBackId, setSendBackId] = useState<string | null>(null);
  const [sendBackNote, setSendBackNote] = useState("");
  const [sendingBack, setSendingBack] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  // ── Right panel collapse state ─────────────────────────────────────────────
  const [followUpsOpen, setFollowUpsOpen] = useState(true);
  const [interestsOpen, setInterestsOpen] = useState(true);

  // ── Left panel: selected client info ────────────────────────────────────────
  const leftInitials = selectedClient ? getInitials(selectedClient.business_name) : "";
  const leftName = selectedClient ? selectedClient.business_name : "";
  const leftSub = selectedClient ? `${selectedClient.city}${selectedClient.zip ? `, ${selectedClient.zip}` : ""}` : "";

  // ── Logged-in rep: filter the full client list to just this rep's book ─────
  const [repUsername, setRepUsername] = useState<string>("");
  useEffect(() => { setRepUsername(getSessionUsername()); }, []);
  const myClients = repUsername
    ? clients.filter((c) => (c.assigned_rep || "").toLowerCase() === repUsername)
    : clients;

  // ── Book of Business metrics ────────────────────────────────────────────────
  const bookMRR = myClients.reduce((sum, c) => sum + clientMRR(c), 0);
  const declinedClients = myClients.filter((c) => (c.buildNotes || []).some((n) => /declin|cancel|lost|churn/i.test(n)));
  const declinedRevenue = declinedClients.reduce((sum, c) => sum + clientMRR(c), 0);
  const riskClients = myClients.filter((c) => c.stage === "intake" || c.stage === "tear-sheet" || c.stage === "revision-requested");
  const riskPct = myClients.length > 0 ? Math.round((riskClients.length / myClients.length) * 100) : 0;
  const avgHealth = myClients.length > 0
    ? Math.round(myClients.reduce((sum, c) => sum + clientHealthScore(c), 0) / myClients.length)
    : 0;
  const activeClients = myClients.filter((c) => c.stage !== "intake" && !(c.buildNotes || []).some((n) => /cancel|lost|churn/i.test(n))).length;
  const pendingApprovals = myClients.filter((c) => c.stage === "tear-sheet").length;

  // ── Bruno coaching directive (live) ────────────────────────────────────────
  const overduePending = myClients
    .filter((c) => c.stage === "tear-sheet" && daysSince(lastStageDate(c)) >= 5)
    .sort((a, b) => clientMRR(b) - clientMRR(a));
  const stalledIntakes = myClients
    .filter((c) => c.stage === "intake" && daysSince(lastStageDate(c)) >= 3)
    .sort((a, b) => clientMRR(b) - clientMRR(a));
  const featuredRequests = myClients.filter((c) => c.interests?.featured_placement);
  let brunoDirective = "";
  if (featuredRequests.length > 0) {
    brunoDirective = `${featuredRequests.length} Featured Placement request${featuredRequests.length > 1 ? "s" : ""} waiting. Call ${featuredRequests[0].business_name} first.`;
  } else if (overduePending.length > 0) {
    brunoDirective = `You have ${overduePending.length} client${overduePending.length > 1 ? "s" : ""} pending approval over 5 days. Start with ${overduePending[0].business_name}.`;
  } else if (stalledIntakes.length > 0) {
    brunoDirective = `${stalledIntakes.length} intake${stalledIntakes.length > 1 ? "s" : ""} stalled for 3+ days. Nudge ${stalledIntakes[0].business_name} today.`;
  } else if (pendingApprovals > 0) {
    brunoDirective = `${pendingApprovals} tearsheet${pendingApprovals > 1 ? "s" : ""} awaiting client review. Send reminders.`;
  } else if (myClients.length === 0) {
    brunoDirective = "No clients in your book yet. Start an intake to seed your pipeline.";
  } else {
    brunoDirective = `Book is healthy at ${avgHealth}. Focus on the top upsell candidate in your hot list.`;
  }

  // ── Hot list: top 5 clients to reach out to today ─────────────────────────
  function hotListReason(c: ClientProfile): string {
    if (c.interests?.featured_placement) return "Featured Placement requested — time-sensitive call";
    if (c.stage === "revision-requested") return "Client replied to a revision request";
    if (c.stage === "tear-sheet" && daysSince(lastStageDate(c)) >= 5) return "Tearsheet pending > 5 days — push for approval";
    if (c.stage === "intake" && daysSince(lastStageDate(c)) >= 3) return "Intake stalled — nudge to finish";
    if (clientUpsidePotential(c) >= 2000) return "High upgrade potential — proactive outreach";
    if (c.stage === "live" && daysSince(lastStageDate(c)) >= 30) return "Live 30+ days — check satisfaction + renewal";
    return "Revenue opportunity worth a touch today";
  }
  function hotListOpType(c: ClientProfile): string {
    if (c.interests?.featured_placement) return "Featured Placement";
    if (c.stage === "tear-sheet") return "Close approval";
    if (c.stage === "revision-requested") return "Revision reply";
    if (c.stage === "live") return "Renewal / upsell";
    return "Upsell";
  }
  const hotList = [...myClients]
    .map((c) => ({ c, value: clientUpsidePotential(c), reason: hotListReason(c), op: hotListOpType(c) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // ── Upsell opportunities ────────────────────────────────────────────────
  function sizeUpgradeCandidates(): ClientProfile[] {
    return [...myClients]
      .filter((c) => {
        const intake = (c.intakeAnswers || {}) as Record<string, string>;
        const size = (intake.q5 || intake.printSize || "").toLowerCase();
        return !size.includes("cover") && !size.includes("full");
      })
      .sort((a, b) => clientUpsidePotential(b) - clientUpsidePotential(a))
      .slice(0, 5);
  }
  function digitalCandidates(): ClientProfile[] {
    return [...myClients]
      .filter((c) => !(c.interests || {})["digital-ads"])
      .sort((a, b) => clientMRR(b) - clientMRR(a))
      .slice(0, 5);
  }
  function websiteCandidates(): ClientProfile[] {
    return [...myClients]
      .filter((c) => !(c.interests || {})["website"])
      .sort((a, b) => clientMRR(b) - clientMRR(a))
      .slice(0, 5);
  }
  const sizeUpgrades = sizeUpgradeCandidates();
  const digitalOps = digitalCandidates();
  const websiteOps = websiteCandidates();

  function currentProductLabel(c: ClientProfile): string {
    const intake = (c.intakeAnswers || {}) as Record<string, string>;
    const size = (intake.q5 || intake.printSize || "").toLowerCase();
    if (size.includes("cover")) return "Cover";
    if (size.includes("full")) return "Full";
    if (size.includes("half") || size.includes("1/2")) return "Half";
    if (size.includes("third") || size.includes("1/3")) return "Third";
    if (size.includes("quarter") || size.includes("1/4")) return "Quarter";
    if (size.includes("eighth") || size.includes("1/8")) return "Eighth";
    return "Print";
  }

  // ── Communications: merge real messages + mock dev/client messages ─────────
  const ROLE_COLORS: Record<string, string> = { rep: "#2d3e50", dev: "#7c3aed", client: "#0891b2" };
  const ROLE_LABELS: Record<string, string> = { rep: "REP", dev: "DEV", client: "CLIENT" };
  const mockCommsMessages = selectedClient ? [
    ...(selectedClient.messages.length > 0 ? selectedClient.messages : []),
    ...(!selectedClient.messages.some((m) => m.from === "dev") ? [
      { from: "dev", text: `Site build started for ${selectedClient.business_name}. Hero section done, working on services.`, timestamp: new Date(Date.now() - 7200000).toISOString() },
      { from: "dev", text: "QA passed — ready for rep review.", timestamp: new Date(Date.now() - 3600000).toISOString() },
    ] : []),
    ...(!selectedClient.messages.some((m) => m.from === "client") ? [
      { from: "client", text: "Looks great! Can we change the phone number though?", timestamp: new Date(Date.now() - 1800000).toISOString() },
    ] : []),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [];

  // Unified activity feed across all clients (when no client selected)
  const allCommsMessages = clients.flatMap((c) =>
    c.messages.map((m) => ({ ...m, bizName: c.business_name }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", flexDirection: "column" }}>
        {/* HubSpot-style top nav */}
        <nav style={{ background: "#2d3e50", height: 56, display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0 }}>
          <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, objectFit: "contain" }} />
        </nav>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
          <div style={{ width: 32, height: 32, border: "3px solid #F5C842", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1B2A4A", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#fff", padding: "10px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700, zIndex: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          ✓ {toast}
        </div>
      )}

      {/* ── TOP NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        background: "#2d3e50",
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 16,
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        {/* Logo + clock */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <img src="/bvm_logo.png" alt="BVM" style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              {clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Ask Bruno search bar */}
        <div ref={brunoRef} style={{ flex: 1, maxWidth: 480, margin: "0 auto", position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: brunoOpen ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)",
            border: brunoOpen ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6, padding: "6px 14px", transition: "all 0.15s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={brunoQuery}
              onChange={(e) => setBrunoQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askBruno()}
              onFocus={() => { if (brunoResponse) setBrunoOpen(true); }}
              placeholder="Ask Bruno..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 13, color: "#fff", caretColor: "#F5C842",
              }}
            />
            {brunoQuery.trim() && (
              <button onClick={askBruno} disabled={brunoLoading} style={{
                background: "#F5C842", color: "#1B2A4A", border: "none", borderRadius: 4,
                padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                opacity: brunoLoading ? 0.5 : 1, flexShrink: 0,
              }}>
                {brunoLoading ? "..." : "Ask"}
              </button>
            )}
          </div>

          {/* Bruno response dropdown */}
          {brunoOpen && (brunoLoading || brunoResponse) && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
              background: "#fff", borderRadius: 10, padding: "16px 20px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)", border: "1px solid #e5e9ef",
              zIndex: 200, maxHeight: 320, overflowY: "auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#1B2A4A", fontSize: 10 }}>B</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2332" }}>Bruno</span>
              </div>
              {brunoLoading ? (
                <p style={{ fontSize: 13, color: "#7a8a9a", margin: 0 }}>Thinking...</p>
              ) : (
                <p style={{ fontSize: 13, color: "#1a2332", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{brunoResponse}</p>
              )}
            </div>
          )}
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <Link
            href="/intake"
            style={{
              background: "#f59e0b",
              color: "#1B2A4A",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          >
            New Intake →
          </Link>

          {/* Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setBellOpen(!bellOpen)}
              style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6, width: 36, height: 36, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.75)", fontSize: 16,
              }}
            >
              🔔
              {unread > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff",
                  fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {unread}
                </span>
              )}
            </button>
          </div>

          {/* Avatar with hover tooltip */}
          <div style={{ position: "relative" }} className="nav-avatar-wrap">
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "#F5C842", color: "#2d3e50",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, letterSpacing: "-0.5px", flexShrink: 0,
              cursor: "default",
            }}>
              TH
            </div>
          </div>

          {/* Log out */}
          <button
            onClick={() => handleSignOut(router)}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* ── BODY: THREE-COLUMN ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
        <aside style={{
          width: 280, flexShrink: 0, background: "#fff",
          borderRight: "1px solid #e5e9ef",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Contact card */}
          <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid #e5e9ef", textAlign: "center" }}>
            {selectedClient ? (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "#2d3e50", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, fontWeight: 800, margin: "0 auto 14px",
                  boxShadow: "0 2px 10px rgba(45,62,80,0.2)",
                }}>
                  {leftInitials}
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1a2332", margin: 0 }}>{leftName}</p>
                <p style={{ fontSize: 12, color: "#7a8a9a", margin: "3px 0 0" }}>{leftSub}</p>
              </>
            ) : (
              <div style={{ padding: "20px 0" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "#e5e9ef", color: "#7a8a9a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, margin: "0 auto 14px",
                }}>?</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#7a8a9a", margin: 0 }}>Select a client</p>
                <p style={{ fontSize: 12, color: "#b0b8c4", margin: "4px 0 0" }}>Click any client to view details</p>
              </div>
            )}
          </div>

          {/* Quick action row */}
          <div style={{
            display: "flex", justifyContent: "space-around",
            padding: "16px 12px", borderBottom: "1px solid #e5e9ef",
            position: "relative",
          }}>
            {[
              { icon: "📝", label: "Note", action: () => { if (!selectedClient) return; setActionPopover("note"); setActionText(""); setActionConfirm(""); } },
              { icon: "✉️", label: "Email", action: () => { if (!selectedClient) return; window.open(`mailto:${selectedClient.business_name.toLowerCase().replace(/\s+/g, "")}@email.com`); setActionConfirm("Email client opened"); setTimeout(() => setActionConfirm(""), 3000); } },
              { icon: "📞", label: "Call", action: () => { if (!selectedClient) return; window.open(`tel:${selectedClient.phone?.replace(/\D/g, "") || ""}`); setActionConfirm(`Calling ${selectedClient.phone || "client"}`); setTimeout(() => setActionConfirm(""), 3000); } },
              { icon: "✅", label: "Task", action: () => { if (!selectedClient) return; setActionPopover("task"); setActionText(""); setActionDue(""); setActionConfirm(""); } },
            ].map((btn) => (
              <button key={btn.label} onClick={btn.action} disabled={!selectedClient} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 8,
                padding: "10px 14px", cursor: selectedClient ? "pointer" : "not-allowed", color: "#4a5568",
                fontSize: 11, fontWeight: 600, opacity: selectedClient ? 1 : 0.4,
              }}>
                <span style={{ fontSize: 17 }}>{btn.icon}</span>
                {btn.label}
              </button>
            ))}

            {/* Confirmation toast */}
            {actionConfirm && (
              <div style={{ position: "absolute", bottom: -32, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 10 }}>
                {actionConfirm}
              </div>
            )}

            {/* Note popover */}
            {actionPopover === "note" && selectedClient && (
              <div style={{ position: "absolute", top: "100%", left: 12, right: 12, background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1a2332", margin: "0 0 8px" }}>Add Note — {selectedClient.business_name}</p>
                <textarea value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Type your note..." rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, resize: "none", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={async () => {
                    if (!actionText.trim()) return;
                    await fetch(`/api/profile/message/${selectedClient.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: actionText, from: "rep", repName: "Ted" }) });
                    setActionPopover(null); setActionConfirm("Note saved"); setTimeout(() => setActionConfirm(""), 3000);
                  }} style={{ background: "#F5C842", color: "#1a2332", border: "none", padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save Note</button>
                  <button onClick={() => setActionPopover(null)} style={{ background: "none", border: "1px solid #e5e9ef", padding: "6px 16px", borderRadius: 6, fontSize: 12, color: "#7a8a9a", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Task popover */}
            {actionPopover === "task" && selectedClient && (
              <div style={{ position: "absolute", top: "100%", left: 12, right: 12, background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1a2332", margin: "0 0 8px" }}>Create Task — {selectedClient.business_name}</p>
                <textarea value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Task description..." rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, resize: "none", boxSizing: "border-box" }} />
                <input type="date" value={actionDue} onChange={(e) => setActionDue(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e9ef", fontSize: 12, marginTop: 6, boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => {
                    if (!actionText.trim()) return;
                    setActionPopover(null); setActionConfirm("Task created — sync to Close CRM when connected"); setTimeout(() => setActionConfirm(""), 4000);
                  }} style={{ background: "#F5C842", color: "#1a2332", border: "none", padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Create Task</button>
                  <button onClick={() => setActionPopover(null)} style={{ background: "none", border: "1px solid #e5e9ef", padding: "6px 16px", borderRadius: 6, fontSize: 12, color: "#7a8a9a", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Property rows */}
          {selectedClient && (
          <div style={{ padding: "4px 0", borderBottom: "1px solid #e5e9ef" }}>
            {[
              { label: "Stage", value: STAGE_LABELS[selectedClient.stage], highlight: true, link: (selectedClient.stage === "tear-sheet" || selectedClient.stage === "intake") ? `/client/${selectedClient.id}` : undefined },
              { label: "Last Contacted", value: timeAgo(selectedClient.buildLog[selectedClient.buildLog.length - 1]?.timestamp || selectedClient.created_at) },
              { label: "Agreement #", value: "Pull from Close CRM" },
              { label: "Look", value: selectedClient.selectedLook?.replace(/_/g, " ") || "—" },
              { label: "Phone", value: selectedClient.phone || "—" },
              { label: "City", value: selectedClient.city || "—" },
            ].map((row) => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "10px 20px",
                background: "#f8fafc",
                borderBottom: "1px solid #edf0f4",
              }}>
                <span style={{ fontSize: 12, color: "#7a8a9a", fontWeight: 500, flexShrink: 0, paddingRight: 8 }}>
                  {row.label}
                </span>
                {row.link ? (
                  <Link href={row.link} style={{
                    fontSize: 12, color: "#F5C842", fontWeight: 600,
                    textDecoration: "underline", textAlign: "right",
                  }}>
                    {row.value} →
                  </Link>
                ) : (
                  <span style={{
                    fontSize: 12, color: row.highlight ? "#F5C842" : "#1a2332", fontWeight: 600,
                    textAlign: "right", textTransform: row.label === "Look" ? "capitalize" : undefined,
                  }}>
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Affirmation */}
          <div
            onClick={() => setAffIdx((affIdx + 1) % AFFIRMATIONS.length)}
            style={{
              margin: 16, padding: "14px 16px", borderRadius: 10,
              background: "#fffbea", border: "1px solid #F5C842",
              cursor: "pointer", animation: "fadeIn 0.4s",
            }}
          >
            <p style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 12, fontStyle: "italic", color: "#7a5a00",
              margin: 0, lineHeight: 1.6,
            }}>
              ✨ {AFFIRMATIONS[affIdx]}
            </p>
            <p style={{ fontSize: 10, color: "#b08800", margin: "6px 0 0", fontWeight: 600 }}>
              Tap for next →
            </p>
          </div>

          {/* Calendar connection */}
          <div style={{ padding: "0 16px 16px" }}>
            {!gcalConnected ? (
              <button
                onClick={() => { localStorage.setItem("gcal_connected", "true"); setGcalConnected(true); }}
                style={{
                  width: "100%", padding: "9px 14px", borderRadius: 7,
                  border: "1px solid #e5e9ef", background: "#fff",
                  color: "#4a5568", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                📅 Connect Google Calendar
              </button>
            ) : (
              <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600, padding: "8px 0" }}>
                📅 Calendar Connected
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER PANEL ─────────────────────────────────────────────────── */}
        <main style={{
          flex: 1, background: "#1B2A4A", overflowY: "auto",
          display: "flex", flexDirection: "column", minWidth: 0,
        }}>
          {/* Featured Placement urgent alert */}
          {clients.filter((c) => c.interests?.featured_placement).length > 0 && (
            <div style={{
              background: "#fef2f2", borderBottom: "1px solid #fecaca",
              borderLeft: "4px solid #ef4444", padding: "10px 24px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
                👑 Featured Placement Requests — Call These Clients Now:
              </span>
              <span style={{ fontSize: 13, color: "#dc2626" }}>
                {clients.filter((c) => c.interests?.featured_placement).map((c) => c.business_name).join(", ")}
              </span>
            </div>
          )}

          {/* ── BOOK OF BUSINESS ────────────────────────────────────────────── */}
          <div style={{ padding: "20px 24px 6px", background: "#1B2A4A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#F5C842", textTransform: "uppercase", margin: 0 }}>Book of Business</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: 0 }}>{myClients.length} client{myClients.length === 1 ? "" : "s"}{repUsername ? ` · ${repUsername}` : ""}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {[
                { label: "MRR", value: `$${bookMRR.toLocaleString()}`, color: "#F5C842" },
                { label: "Declined", value: `$${declinedRevenue.toLocaleString()}`, color: "#fca5a5" },
                { label: "Risk", value: `${riskPct}%`, color: riskPct >= 40 ? "#f87171" : "#fbbf24" },
                { label: "Health", value: `${avgHealth}`, color: avgHealth >= 70 ? "#34d399" : avgHealth >= 50 ? "#fbbf24" : "#f87171" },
                { label: "Active", value: `${activeClients}`, color: "#fff" },
                { label: "Pending", value: `${pendingApprovals}`, color: pendingApprovals > 0 ? "#fbbf24" : "#fff" },
              ].map((tile) => (
                <div key={tile.label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", margin: 0 }}>{tile.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: tile.color, margin: "4px 0 0" }}>{tile.value}</p>
                </div>
              ))}
            </div>

            {/* Bruno directive */}
            <div style={{ marginTop: 14, background: "rgba(245,200,66,0.12)", border: "1px solid rgba(245,200,66,0.35)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1B2A4A", flexShrink: 0 }}>B</div>
              <p style={{ fontSize: 13, color: "#fff", margin: 0, fontWeight: 500 }}>{brunoDirective}</p>
            </div>
          </div>

          {/* ── HOT LIST ────────────────────────────────────────────────────── */}
          {hotList.length > 0 && (
            <div style={{ padding: "16px 24px", background: "#1B2A4A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#F5C842", textTransform: "uppercase", margin: 0 }}>Hot List — Call today</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: 0 }}>Top 5 by opportunity</p>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden" }}>
                {hotList.map((row, i) => (
                  <div
                    key={row.c.id}
                    onClick={() => { setSelectedClient(row.c); setSlideOutOpen(true); setDrawerTab("overview"); }}
                    style={{ display: "grid", gridTemplateColumns: "36px 1.6fr 1fr 0.8fr 2fr", gap: 12, alignItems: "center", padding: "10px 14px", cursor: "pointer", borderTop: i === 0 ? "none" : "1px solid #e5e9ef" }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1B2A4A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{getInitials(row.c.business_name)}</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2332" }}>{row.c.business_name}</span>
                    <span style={{ fontSize: 12, color: "#475569" }}>{row.op}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1B2A4A" }}>${row.value.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: "#7a8a9a" }}>{row.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── UPSELL OPPORTUNITIES ────────────────────────────────────────── */}
          {(sizeUpgrades.length > 0 || digitalOps.length > 0 || websiteOps.length > 0) && (
            <div style={{ padding: "16px 24px", background: "#1B2A4A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#F5C842", textTransform: "uppercase", margin: "0 0 10px" }}>Upsell opportunities</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { title: "Size upgrade", list: sizeUpgrades, kind: "size-upgrade" as const },
                  { title: "Digital advertising", list: digitalOps, kind: "digital-ads" as const },
                  { title: "Website", list: websiteOps, kind: "website" as const },
                ].map((col) => (
                  <div key={col.title} style={{ background: "#fff", borderRadius: 8, padding: "12px 14px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1a2332", margin: "0 0 8px" }}>{col.title}</p>
                    {col.list.length === 0 ? (
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>No candidates right now.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {col.list.map((c) => {
                          const potential = col.kind === "size-upgrade"
                            ? Math.max(0, clientMRR(c) * 1.6 - clientMRR(c))
                            : col.kind === "digital-ads" ? 800 : 500;
                          const reason = col.kind === "size-upgrade"
                            ? `Currently ${currentProductLabel(c)} — room to grow`
                            : col.kind === "digital-ads"
                              ? `${c.city || "Local"} has room for geo-targeted digital`
                              : `No site yet — capture traffic from the print ad`;
                          return (
                            <div
                              key={`${col.kind}-${c.id}`}
                              onClick={() => { setSelectedClient(c); setSlideOutOpen(true); setDrawerTab("overview"); }}
                              style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: "#f8fafc" }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "#1a2332", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.business_name}</p>
                                <p style={{ fontSize: 10, color: "#7a8a9a", margin: "1px 0 0" }}>{prettyUpsell(col.kind)} · {reason}</p>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#1B2A4A", whiteSpace: "nowrap" }}>+${Math.round(potential).toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab row */}
          <div style={{
            display: "flex", borderBottom: "2px solid #e5e9ef",
            padding: "0 24px", background: "#fff", flexShrink: 0,
          }}>
            {(["priority", "pipeline", "review", "stats"] as const).map((tab) => {
              const labels = { priority: "Priority Queue", pipeline: "Pipeline", review: "AM Review", stats: "Stats" };
              const active = centerTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setCenterTab(tab)}
                  style={{
                    padding: "14px 20px", border: "none", background: "transparent",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? "#2d3e50" : "#7a8a9a",
                    borderBottom: active ? "2px solid #F5C842" : "2px solid transparent",
                    marginBottom: -2, cursor: "pointer", transition: "color 0.15s",
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ padding: 24, flex: 1 }}>

            {/* PRIORITY QUEUE TAB */}
            {centerTab === "priority" && (
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: "#7a8a9a", marginBottom: 14,
                }}>
                  {priorityQueue.length} active clients
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {priorityQueue.slice(0, 8).map(({ client: c, story }) => {
                    const action = getAction(c);
                    return (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setSlideOutOpen(true); setDrawerTab("overview"); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          background: "#fff", border: "1px solid #e5e9ef",
                          borderLeft: `4px solid ${story.color}`,
                          borderRadius: 8, padding: "12px 16px",
                          cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2d3e50", flexShrink: 0 }}>
                          {getInitials(c.business_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a2332", margin: 0 }}>{c.business_name}</p>
                          <p style={{ fontSize: 11, color: "#7a8a9a", margin: "2px 0 0" }}>{c.city}</p>
                        </div>
                        <span style={{
                          fontSize: 11, padding: "4px 10px", borderRadius: 999,
                          background: `${story.color}15`, color: story.color,
                          fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                          border: `1px solid ${story.color}30`,
                        }}>
                          {story.icon} {story.text}
                        </span>
                        <a
                          href={action.href}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 12, color: "#2d3e50", fontWeight: 600,
                            textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
                            padding: "6px 12px", borderRadius: 6,
                            border: "1px solid #e5e9ef", background: "#f8fafc",
                          }}
                        >
                          {action.label}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PIPELINE TAB */}
            {centerTab === "pipeline" && (
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: "#7a8a9a", marginBottom: 14,
                }}>
                  Pipeline
                </p>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${kanbanCols.length}, 1fr)`, gap: 8, overflowX: "auto" }}>
                  {kanbanCols.map((stage) => {
                    const stageClients = clients.filter((c) => c.stage === stage);
                    return (
                      <div key={stage} style={{
                        background: "#f8fafc", borderRadius: 10,
                        padding: 10, minHeight: 200,
                        border: "1px solid #e5e9ef",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#7a8a9a", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            {STAGE_LABELS[stage]}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, background: "#e5e9ef",
                            color: "#4a5568", width: 20, height: 20, borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {stageClients.length}
                          </span>
                        </div>
                        {stageClients.map((c) => {
                          const days = daysSince(lastStageDate(c));
                          const dayColor = days > 10 ? "#ef4444" : days > 5 ? "#f59e0b" : "#94a3b8";
                          return (
                            <div
                              key={c.id}
                              onClick={() => { setSelectedClient(c); setSlideOutOpen(true); setDrawerTab("overview"); }}
                              style={{
                                background: "#fff", border: "1px solid #e5e9ef",
                                borderRadius: 8, padding: "10px 12px", marginBottom: 6,
                                cursor: "pointer", fontSize: 12,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                              }}
                            >
                              <p style={{ fontWeight: 700, color: "#1a2332", margin: 0 }}>{c.business_name}</p>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                <span style={{ color: "#7a8a9a", fontSize: 11 }}>{c.city}</span>
                                <span style={{ color: dayColor, fontSize: 10, fontWeight: 600 }}>{days}d</span>
                              </div>
                              {c.interests?.print && <span style={{ fontSize: 9, color: "#92400e", fontWeight: 700 }}>📰</span>}
                              {c.interests?.featured_placement && <span style={{ fontSize: 9, color: "#dc2626", fontWeight: 700 }}> 👑</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AM REVIEW TAB */}
            {centerTab === "review" && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7a8a9a", marginBottom: 14 }}>
                  Ready for Review
                </p>
                {(() => {
                  const reviewClients = clients.filter((c) => c.stage === "review" || c.stage === "delivered");
                  if (reviewClients.length === 0) return (
                    <div style={{ background: "#f8fafc", border: "1px dashed #e5e9ef", borderRadius: 10, padding: 40, textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "#7a8a9a", margin: 0 }}>No builds awaiting AM review</p>
                    </div>
                  );
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {reviewClients.map((c) => (
                        <div key={c.id} style={{ background: "#fff", border: "1px solid #e5e9ef", borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 700, color: "#1a2332", margin: 0 }}>{c.business_name}</p>
                              <p style={{ fontSize: 11, color: "#7a8a9a", margin: "2px 0 0" }}>{c.city} · {c.selectedLook?.replace(/_/g, " ") || "—"}</p>
                            </div>
                            <a href={`/tearsheet/${c.id}`} target="_blank" style={{ fontSize: 11, color: "#0091ae", fontWeight: 600, textDecoration: "none" }}>
                              Preview →
                            </a>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#7a8a9a", marginBottom: 12 }}>
                            <span>QA: {c.qaReport?.score ?? "—"}</span>
                            <span>·</span>
                            <span>Services: {c.intakeAnswers?.q3 || "—"}</span>
                          </div>

                          {sendBackId === c.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <textarea
                                value={sendBackNote}
                                onChange={(e) => setSendBackNote(e.target.value)}
                                placeholder="What needs to be fixed?"
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e9ef", borderRadius: 6, fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box" }}
                                rows={2}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={async () => {
                                    if (!sendBackNote.trim()) return;
                                    setSendingBack(true);
                                    try {
                                      await fetch(`/api/profile/update/${c.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "building" }) });
                                      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "build-complete", clientId: c.id, businessName: c.business_name, message: `AM flagged: ${sendBackNote}` }) }).catch(() => {});
                                      setClients(prev => prev.map(cl => cl.id === c.id ? { ...cl, stage: "building" as const } : cl));
                                      setSendBackId(null); setSendBackNote("");
                                      setToast(`${c.business_name} sent back to dev`);
                                      setTimeout(() => setToast(""), 3000);
                                    } catch { /* ignore */ }
                                    setSendingBack(false);
                                  }}
                                  disabled={sendingBack || !sendBackNote.trim()}
                                  style={{ flex: 1, background: "#ff7a59", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: sendBackNote.trim() ? "pointer" : "not-allowed", opacity: sendBackNote.trim() ? 1 : 0.5 }}
                                >
                                  {sendingBack ? "Sending..." : "Send Back →"}
                                </button>
                                <button onClick={() => { setSendBackId(null); setSendBackNote(""); }} style={{ background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 6, padding: "8px 14px", fontSize: 11, color: "#7a8a9a", cursor: "pointer" }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={async () => {
                                  setApproving(c.id);
                                  try {
                                    await fetch(`/api/profile/update/${c.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "live", published_url: c.published_url || null }) });
                                    setClients(prev => prev.map(cl => cl.id === c.id ? { ...cl, stage: "live" as const } : cl));
                                    setToast(`${c.business_name} approved — client notified`);
                                    setTimeout(() => setToast(""), 3000);
                                  } catch { /* ignore */ }
                                  setApproving(null);
                                }}
                                disabled={approving === c.id}
                                style={{ flex: 1, background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              >
                                {approving === c.id ? "Approving..." : "Approve →"}
                              </button>
                              <button
                                onClick={() => setSendBackId(c.id)}
                                style={{ flex: 1, background: "#fff", color: "#ff7a59", border: "1px solid #ff7a59", borderRadius: 6, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              >
                                Send Back →
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* STATS TAB */}
            {centerTab === "stats" && (
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: "#7a8a9a", marginBottom: 20,
                }}>
                  Performance Overview
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  {[
                    { value: delivered, label: "Sites Delivered", icon: "🚀" },
                    { value: "4.2 hrs", label: "Avg TTM", icon: "⏱️" },
                    { value: `${avgQA}%`, label: "QA Pass Rate", icon: "✅" },
                    { value: `${clients.filter((c) => c.messages.length > 0).length}/${clients.length}`, label: "Client Response", icon: "💬" },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: "#fff", border: "1px solid #e5e9ef", borderRadius: 12,
                      padding: "24px 20px", textAlign: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}>
                      <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#2d3e50", lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "#7a8a9a", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* greeting in stats */}
                <div style={{ marginTop: 28, padding: "20px 24px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e5e9ef" }}>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#1a2332", margin: 0 }}>
                    {getGreeting()}, Ted
                  </h2>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL: Communications ────────────────────────────────── */}
        <aside style={{
          width: 320, flexShrink: 0, background: "#fff",
          borderLeft: "1px solid #e5e9ef",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid #e5e9ef",
            background: "#fff",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2d3e50", margin: 0 }}>
              {selectedClient ? `Communications — ${selectedClient.business_name}` : "Recent Communications"}
            </p>
          </div>

          {/* Thread */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {selectedClient ? (
              mockCommsMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <p style={{ fontSize: 13, color: "#7a8a9a" }}>No messages yet</p>
                </div>
              ) : (
                mockCommsMessages.map((m, i) => {
                  const roleColor = ROLE_COLORS[m.from] || "#7a8a9a";
                  const roleLabel = ROLE_LABELS[m.from] || m.from.toUpperCase();
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                          letterSpacing: "0.05em", color: "#fff", background: roleColor,
                          padding: "2px 7px", borderRadius: 4,
                        }}>{roleLabel}</span>
                        <span style={{ fontSize: 10, color: "#b0b8c4" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#1a2332", margin: 0, lineHeight: 1.5, paddingLeft: 2 }}>{m.text}</p>
                    </div>
                  );
                })
              )
            ) : (
              allCommsMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <p style={{ fontSize: 13, color: "#7a8a9a" }}>No activity yet</p>
                </div>
              ) : (
                allCommsMessages.map((m, i) => {
                  const roleColor = ROLE_COLORS[m.from] || "#7a8a9a";
                  const roleLabel = ROLE_LABELS[m.from] || m.from.toUpperCase();
                  return (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                          letterSpacing: "0.05em", color: "#fff", background: roleColor,
                          padding: "2px 7px", borderRadius: 4,
                        }}>{roleLabel}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#1a2332" }}>{m.bizName}</span>
                        <span style={{ fontSize: 10, color: "#b0b8c4" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#1a2332", margin: 0, lineHeight: 1.5, paddingLeft: 2 }}>{m.text}</p>
                    </div>
                  );
                })
              )
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message input */}
          {selectedClient && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e9ef", background: "#f8fafc", display: "flex", gap: 8 }}>
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #e5e9ef", fontSize: 13, outline: "none",
                  background: "#fff", color: "#1a2332",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={msgSending || !msgInput.trim()}
                style={{
                  background: "#F5C842", color: "#1a2332", border: "none",
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", opacity: msgSending || !msgInput.trim() ? 0.5 : 1,
                }}
              >
                Send
              </button>
            </div>
          )}

          {/* Collapsible sections below thread */}
          <div style={{ borderTop: "1px solid #e5e9ef" }}>
            {/* Follow Up Today */}
            <button
              onClick={() => setFollowUpsOpen(!followUpsOpen)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", background: "#f8fafc", border: "none", borderBottom: "1px solid #e5e9ef",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2d3e50" }}>
                Follow Up Today ({followUps.length})
              </span>
              <span style={{ fontSize: 11, color: "#7a8a9a", transform: followUpsOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
            </button>
            {followUpsOpen && (
              <div style={{ padding: "8px 14px 12px" }}>
                {followUps.length === 0 && <p style={{ fontSize: 12, color: "#7a8a9a", fontStyle: "italic" }}>All caught up!</p>}
                {followUps.slice(0, 3).map((c) => (
                  <div key={c.id} style={{ background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 6, padding: "8px 10px", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "#1a2332" }}>{c.business_name}</span>
                    <span style={{ color: "#7a8a9a", marginLeft: 6 }}>{daysSince(lastStageDate(c))}d</span>
                  </div>
                ))}
              </div>
            )}

            {/* Campaign Interest */}
            <button
              onClick={() => setInterestsOpen(!interestsOpen)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", background: "#f8fafc", border: "none", borderBottom: "1px solid #e5e9ef",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2d3e50" }}>
                Campaign Interest ({interests.length})
              </span>
              <span style={{ fontSize: 11, color: "#7a8a9a", transform: interestsOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
            </button>
            {interestsOpen && (
              <div style={{ padding: "8px 14px 12px" }}>
                {interests.length === 0 && <p style={{ fontSize: 12, color: "#7a8a9a", fontStyle: "italic" }}>No signals yet.</p>}
                {interests.slice(0, 3).map((c) => {
                  const types = Object.keys(c.interests || {}).filter((k) => !k.endsWith("_at") && c.interests?.[k]);
                  return (
                    <div key={c.id} style={{ background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 6, padding: "8px 10px", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: "#1a2332" }}>{c.business_name}</span>
                      <span style={{ color: "#F5C842", fontWeight: 600, marginLeft: 6 }}>{types.join(", ")}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── NOTIFICATION DRAWER ──────────────────────────────────────────────── */}
      {bellOpen && (
        <>
          <div onClick={() => setBellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 48 }} />
          <div style={{
            position: "fixed", top: 60, right: 24, width: 360,
            background: "#fff", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            border: "1px solid #e5e9ef", zIndex: 100,
            maxHeight: "70vh", overflowY: "auto",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #e5e9ef",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2332" }}>Notifications</span>
              <button
                onClick={() => setReadNotifs(new Set(notifications.map((n) => n.id)))}
                style={{ background: "none", border: "none", fontSize: 11, color: "#3b82f6", cursor: "pointer" }}
              >
                Mark all read
              </button>
            </div>
            {notifications.map((n) => {
              const isLive = n.type === "build-complete";
              const isHw = n.type === "handwrytten-task";
              const bg = isHw ? "#fffbea" : isLive ? "#ecfdf5" : readNotifs.has(n.id) ? "#fff" : "#f8fafc";
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    const target = clients.find((c) => c.id === n.clientId);
                    if (target) {
                      setSelectedClient(target);
                      setSlideOutOpen(true);
                      setDrawerTab(isHw ? "actions" : "overview");
                    }
                    setBellOpen(false);
                  }}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 16px",
                    borderBottom: "1px solid #f0f2f5",
                    background: bg,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2332", margin: 0 }}>{n.name}</p>
                    <p style={{ fontSize: 11, color: "#7a8a9a", margin: "2px 0 0" }}>{n.msg}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {n.time}
                    </span>
                    {n.isStore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissStoreNotif(n.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94a3b8",
                          fontSize: 10,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── SLIDE-OUT PANEL ──────────────────────────────────────────────────── */}
      {slideOutOpen && selectedClient && (
        <>
          <div onClick={() => setSlideOutOpen(false)} style={{ position: "fixed", top: 0, left: 280, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 49 }} />
          <div style={{
            position: "fixed", top: 56, right: 0, width: 420, maxWidth: "calc(100vw - 280px)", height: "calc(100vh - 56px)",
            background: "#fff", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
            zIndex: 50, display: "flex", flexDirection: "column",
            animation: "slideIn 0.25s ease-out",
          }}>
            <div style={{
              padding: "20px", borderBottom: "1px solid #e5e9ef",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#f8fafc",
            }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#1a2332", margin: 0 }}>
                  {selectedClient.business_name}
                </h2>
                <p style={{ fontSize: 12, color: "#7a8a9a", margin: "2px 0 0" }}>
                  {selectedClient.city} · {STAGE_LABELS[selectedClient.stage]}
                </p>
              </div>
              <button
                onClick={() => setSlideOutOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "none",
                  background: "#e5e9ef", fontSize: 16, color: "#475569",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e5e9ef" }}>
              {([{ key: "overview" as const, label: "Overview" }, { key: "comm" as const, label: "Communication" }, { key: "actions" as const, label: "Actions" }]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDrawerTab(t.key)}
                  style={{
                    flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: drawerTab === t.key ? 700 : 500,
                    color: drawerTab === t.key ? "#2d3e50" : "#94a3b8",
                    background: "transparent",
                    borderBottom: drawerTab === t.key ? "2px solid #F5C842" : "2px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {drawerTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                  {/* Client local time + weather */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a8a9a", margin: "0 0 4px" }}>Client Local Time</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#1a2332", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                        {clientTz ? clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: clientTz }) : "—"}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a8a9a", margin: "0 0 4px" }}>Weather</p>
                      <p style={{ fontSize: 13, color: "#1a2332", margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                        {clientWeather
                          ? (() => {
                              const clean = clientWeather.replace(/<[^>]*>/g, "").trim();
                              const lower = clean.toLowerCase();
                              const icon =
                                lower.includes("sun") || lower.includes("clear") ? "☀️" :
                                lower.includes("rain") || lower.includes("shower") ? "🌧️" :
                                lower.includes("snow") ? "❄️" :
                                lower.includes("storm") || lower.includes("thunder") ? "⛈️" :
                                lower.includes("fog") || lower.includes("mist") ? "🌫️" :
                                lower.includes("cloud") || lower.includes("overcast") ? "☁️" :
                                "🌤️";
                              return (<><span aria-hidden>{icon}</span><span>{clean}</span></>);
                            })()
                          : <span style={{ color: "#7a8a9a", fontWeight: 500 }}>Loading…</span>}
                      </p>
                    </div>
                  </div>
                  <div><span style={{ color: "#7a8a9a" }}>Phone: </span><span style={{ color: "#1a2332", fontWeight: 600 }}>{selectedClient.phone || "—"}</span></div>
                  <div><span style={{ color: "#7a8a9a" }}>Look: </span><span style={{ color: "#1a2332", fontWeight: 600, textTransform: "capitalize" }}>{selectedClient.selectedLook?.replace(/_/g, " ") || "—"}</span></div>
                  <div><span style={{ color: "#7a8a9a" }}>Services: </span><span style={{ color: "#1a2332" }}>{selectedClient.intakeAnswers?.q3 || "—"}</span></div>
                  <div><span style={{ color: "#7a8a9a" }}>CTA: </span><span style={{ color: "#1a2332" }}>{selectedClient.intakeAnswers?.q4 || "—"}</span></div>
                  <div>
                    <span style={{ color: "#7a8a9a" }}>Stage: </span>
                    {(selectedClient.stage === "tear-sheet" || selectedClient.stage === "intake") ? (
                      <Link href={`/client/${selectedClient.id}`} style={{ color: "#F5C842", fontWeight: 600, textDecoration: "underline" }}>{STAGE_LABELS[selectedClient.stage]} →</Link>
                    ) : (
                      <span style={{ color: "#F5C842", fontWeight: 600 }}>{STAGE_LABELS[selectedClient.stage]}</span>
                    )}
                  </div>
                  <div><span style={{ color: "#7a8a9a" }}>Created: </span><span style={{ color: "#1a2332" }}>{new Date(selectedClient.created_at).toLocaleDateString()}</span></div>
                  {selectedClient.interests && Object.keys(selectedClient.interests).filter((k) => !k.endsWith("_at") && selectedClient.interests?.[k]).length > 0 && (
                    <div><span style={{ color: "#7a8a9a" }}>Interests: </span><span style={{ color: "#F5C842", fontWeight: 600 }}>{Object.keys(selectedClient.interests).filter((k) => !k.endsWith("_at") && selectedClient.interests?.[k]).join(", ")}</span></div>
                  )}

                  {/* BVM Sample Sites */}
                  <div style={{ marginTop: 12, padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e9ef" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a8a9a", margin: "0 0 10px" }}>
                      BVM Sample Sites
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {BVM_SAMPLE_SITES.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12,
                            color: "#0091ae",
                            fontWeight: 600,
                            textDecoration: "none",
                            padding: "6px 10px",
                            background: "#fff",
                            border: "1px solid #e7edf3",
                            borderRadius: 6,
                            display: "block",
                          }}
                        >
                          {s.label} →
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Approval Receipt */}
                  <div style={{ marginTop: 12, padding: "16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e9ef" }}>
                    {selectedClient.approved_at ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>✓</div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2332" }}>Campaign Approved</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                          <div><span style={{ color: "#7a8a9a" }}>Approved: </span><span style={{ color: "#1a2332" }}>{new Date(selectedClient.approved_at).toLocaleString()}</span></div>
                          <div><span style={{ color: "#7a8a9a" }}>Look: </span><span style={{ color: "#1a2332", textTransform: "capitalize" }}>{selectedClient.selectedLook?.replace(/_/g, " ") || "—"}</span></div>
                          <div><span style={{ color: "#7a8a9a" }}>Tagline: </span><span style={{ color: "#1a2332" }}>{(selectedClient.sbrData as Record<string, unknown>)?.suggestedTagline as string || (selectedClient.sbrData as Record<string, unknown>)?.tagline as string || "—"}</span></div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                            {["Name", "Phone", "Services", "CTA"].map((item) => (
                              <span key={item} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534", fontWeight: 600 }}>✓ {item}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>!</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Pending Approval</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === "comm" && (
                <div>
                  {selectedClient.messages.length === 0 && <p style={{ color: "#7a8a9a", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No messages yet.</p>}
                  {selectedClient.messages.map((m, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1a2332" }}>{m.from}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(m.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#4a5568", margin: "4px 0 0", lineHeight: 1.5 }}>{m.text}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              {drawerTab === "actions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href={`/client/${selectedClient.id}`} style={{ display: "block", background: "#F5C842", color: "#1a2332", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>Open Client Portal →</Link>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/client/${selectedClient.id}`); }} style={{ background: "#f8fafc", border: "1px solid #e5e9ef", color: "#1a2332", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Copy Client Portal Link</button>
                  {gcalConnected && (
                    <button onClick={() => addToCalendar(`Follow up: ${selectedClient.business_name}`, `Check in on ${selectedClient.business_name} build status. Stage: ${STAGE_LABELS[selectedClient.stage]}`)} style={{ background: "#f8fafc", border: "1px solid #e5e9ef", color: "#1a2332", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📅 Add Calendar Reminder</button>
                  )}
                  <Link href={`/tearsheet/${selectedClient.id}`} style={{ display: "block", background: "#f8fafc", color: "#1a2332", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center", border: "1px solid #e5e9ef" }}>Open Tearsheet</Link>

                  <div style={{ height: 1, background: "#e5e9ef", margin: "4px 0" }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a8a9a", margin: "4px 0" }}>Pulse</p>

                  <div style={{ background: "#f8fafc", border: "1px solid #e5e9ef", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7a8a9a", marginBottom: 6 }}>
                      <span>Last Pulse score</span>
                      <span style={{ color: "#1a2332", fontWeight: 700 }}>
                        {pulseTimer?.lastScore != null ? `${pulseTimer.lastScore}/10` : "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7a8a9a", marginBottom: 10 }}>
                      <span>Next Pulse</span>
                      <span style={{ color: "#1a2332", fontWeight: 700 }}>
                        {pulseTimer?.day7At && pulseTimer.day7At > Date.now()
                          ? new Date(pulseTimer.day7At).toLocaleDateString()
                          : pulseTimer?.day14At && pulseTimer.day14At > Date.now()
                            ? new Date(pulseTimer.day14At).toLocaleDateString()
                            : pulseTimer?.day30At && pulseTimer.day30At > Date.now()
                              ? new Date(pulseTimer.day30At).toLocaleDateString()
                              : "—"}
                      </span>
                    </div>
                    <button
                      onClick={sendPulseNow}
                      style={{
                        background: "#0d1a2e",
                        color: "#fff",
                        border: "none",
                        padding: "8px 14px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      📊 Send Pulse Survey
                    </button>
                    {pulseStatus && (
                      <p style={{ fontSize: 11, color: "#22c55e", margin: "6px 0 0", textAlign: "center", fontWeight: 600 }}>
                        {pulseStatus}
                      </p>
                    )}
                  </div>

                  {/* Handwrytten auto-task */}
                  {handwryttenTasks.filter((t) => t.clientId === selectedClient.id).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: "#fffbea",
                        border: "1px solid #f59e0b",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      <p style={{ fontSize: 12, color: "#92400e", margin: "0 0 8px", fontWeight: 600 }}>
                        {task.message}
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={async () => {
                            try {
                              await fetch("https://api.handwrytten.com/v2/orders", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: "Bearer 4c12347d298b4867a5c73f5ad3b4559d",
                                },
                                body: JSON.stringify({
                                  card_id: "congrats",
                                  message: `Congratulations on your new site, ${selectedClient.business_name}! — The BVM Team`,
                                  recipients: [
                                    {
                                      name: selectedClient.business_name,
                                      city: selectedClient.city,
                                      zip: selectedClient.zip || "",
                                    },
                                  ],
                                }),
                              });
                            } catch {
                              /* endpoint may not exist */
                            }
                            dismissStoreNotif(task.id);
                            setActionConfirm("Handwritten card sent");
                            setTimeout(() => setActionConfirm(""), 3000);
                          }}
                          style={{
                            flex: 1,
                            background: "#f59e0b",
                            color: "#0d1a2e",
                            border: "none",
                            padding: "7px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Send Card
                        </button>
                        <button
                          onClick={() => dismissStoreNotif(task.id)}
                          style={{
                            background: "none",
                            border: "1px solid #f59e0b",
                            color: "#92400e",
                            padding: "7px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}

                  <div style={{ height: 1, background: "#e5e9ef", margin: "4px 0" }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a8a9a", margin: "4px 0" }}>Integrations</p>

                  {/* Send Reminder — Close CRM */}
                  <button onClick={async () => {
                    setActionConfirm("");
                    try {
                      await fetch("/api/activity", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clientId: selectedClient.id, agreementNumber: "Pull from Close CRM", activityType: "Tearsheet Reminder Sent", businessName: selectedClient.business_name }),
                      });
                    } catch { /* endpoint may not exist yet */ }
                    setActionConfirm("Reminder logged in Close CRM"); setTimeout(() => setActionConfirm(""), 4000);
                  }} style={{ background: "#1a2332", border: "none", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
                    📋 Send Reminder — Close CRM
                  </button>

                  {/* Escalate Print Issue */}
                  <button
                    onClick={async () => {
                      setActionConfirm("Sending...");
                      try {
                        const res = await fetch("/api/email/escalate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            clientName: selectedClient.business_name,
                            repName: "Ted Herrera",
                            stage: STAGE_LABELS[selectedClient.stage],
                          }),
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        // Log to activity feed
                        try {
                          await fetch(`/api/profile/message/${selectedClient.id}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              message: "⚠ Escalation email sent to Ted",
                              from: "rep",
                              repName: "Ted",
                            }),
                          });
                        } catch {
                          /* ignore */
                        }
                        setActionConfirm("✓ Escalation sent to Ted");
                      } catch {
                        setActionConfirm("Email failed — try again");
                      }
                      setTimeout(() => setActionConfirm(""), 5000);
                    }}
                    style={{
                      background: "#ff7a59",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    ⚠ Escalate Print Issue
                  </button>

                  {/* Send Card — Handwrytten */}
                  <button onClick={async () => {
                    setActionConfirm("");
                    try {
                      await fetch("https://api.handwrytten.com/v2/orders", {
                        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer 4c12347d298b4867a5c73f5ad3b4559d" },
                        body: JSON.stringify({
                          card_id: "welcome",
                          message: `Welcome to BVM, ${selectedClient.business_name}! We're excited to build your campaign.`,
                          recipients: [{ name: selectedClient.business_name, city: selectedClient.city, state: "", zip: selectedClient.zip || "" }],
                        }),
                      });
                    } catch { /* endpoint may reject without full address */ }
                    setActionConfirm("Handwritten card on its way!"); setTimeout(() => setActionConfirm(""), 4000);
                  }} style={{ background: "#7c3aed", border: "none", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
                    ✉️ Send Handwrytten Card
                  </button>
                </div>
              )}
            </div>

            {/* Message input for comm tab */}
            {drawerTab === "comm" && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e9ef", display: "flex", gap: 8, background: "#f8fafc" }}>
                <input
                  type="text"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Send message to client..."
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: "1px solid #e5e9ef", fontSize: 13, outline: "none",
                    background: "#fff", color: "#1a2332",
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={msgSending || !msgInput.trim()}
                  style={{
                    background: "#F5C842", color: "#1a2332", border: "none",
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", opacity: msgSending ? 0.5 : 1,
                  }}
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
