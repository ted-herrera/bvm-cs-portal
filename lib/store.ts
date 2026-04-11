// Shared store — Supabase-backed with in-memory fallback.

import type { ClientProfile, QAReport } from "./pipeline";
import { getClient, updateClient } from "./mock-data";
import { getSupabase } from "./supabase";

export type BuildStatus = "unassigned" | "claimed" | "ready-for-qa" | "live";

export interface BuildRecord {
  id: string;
  clientId: string;
  businessName: string;
  city: string;
  zip: string;
  services: string[];
  look: string;
  tagline: string;
  cta: string;
  sbrData: Record<string, unknown> | null;
  generatedSiteHTML: string;
  status: BuildStatus;
  assignedDev: string | null;
  createdAt: string;
  claimedAt: string | null;
  readyAt: string | null;
  liveAt: string | null;
  liveUrl: string | null;
  qaReport: QAReport | null;
}

export interface BuildMessage {
  id: string;
  buildId: string;
  from: "rep" | "dev";
  text: string;
  timestamp: string;
}

export interface PulseTimer {
  clientId: string;
  day7At: number;
  day14At: number;
  day30At: number;
  lastSentAt: number | null;
  lastScore: number | null;
}

export interface Notification {
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

// ─── Row mappers ────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToBuild(r: any): BuildRecord {
  return {
    id: r.id,
    clientId: r.client_id,
    businessName: r.business_name,
    city: r.city,
    zip: r.zip,
    services: r.services ?? [],
    look: r.look ?? "",
    tagline: r.tagline ?? "",
    cta: r.cta ?? "",
    sbrData: r.sbr_data ?? null,
    generatedSiteHTML: r.generated_site_html ?? "",
    status: r.status ?? "unassigned",
    assignedDev: r.assigned_dev ?? null,
    createdAt: r.created_at,
    claimedAt: r.claimed_at ?? null,
    readyAt: r.ready_at ?? null,
    liveAt: r.live_at ?? null,
    liveUrl: r.live_url ?? null,
    qaReport: r.qa_report ?? null,
  };
}

function buildToRow(b: BuildRecord): Record<string, unknown> {
  return {
    id: b.id,
    client_id: b.clientId,
    business_name: b.businessName,
    city: b.city,
    zip: b.zip,
    services: b.services,
    look: b.look,
    tagline: b.tagline,
    cta: b.cta,
    sbr_data: b.sbrData,
    generated_site_html: b.generatedSiteHTML,
    status: b.status,
    assigned_dev: b.assignedDev,
    created_at: b.createdAt,
    claimed_at: b.claimedAt,
    ready_at: b.readyAt,
    live_at: b.liveAt,
    live_url: b.liveUrl,
    qa_report: b.qaReport,
  };
}

function rowToMessage(r: any): BuildMessage {
  return {
    id: r.id,
    buildId: r.build_id,
    from: r.sender_role as "rep" | "dev",
    text: r.content,
    timestamp: r.created_at,
  };
}

function rowToNotification(r: any): Notification {
  return {
    id: r.id,
    type: r.type,
    clientId: r.client_id,
    businessName: r.business_name,
    message: r.message,
    createdAt: r.created_at,
    read: r.read,
    dismissed: r.dismissed,
    meta: r.meta ?? undefined,
  };
}

function rowToPulseTimer(r: any): PulseTimer {
  return {
    clientId: r.client_id,
    day7At: r.day7_at,
    day14At: r.day14_at,
    day30At: r.day30_at,
    lastSentAt: r.last_sent_at ?? null,
    lastScore: r.last_score ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── In-memory fallback ─────────────────────────────────────────────────

interface FallbackStore {
  builds: Map<string, BuildRecord>;
  messages: Map<string, BuildMessage[]>;
  pulseTimers: Map<string, PulseTimer>;
  notifications: Map<string, Notification>;
}

declare global {
  // eslint-disable-next-line no-var
  var __bvm_shared_store__: FallbackStore | undefined;
}

function getFallback(): FallbackStore {
  if (!globalThis.__bvm_shared_store__) {
    globalThis.__bvm_shared_store__ = {
      builds: new Map(),
      messages: new Map(),
      pulseTimers: new Map(),
      notifications: new Map(),
    };
  }
  return globalThis.__bvm_shared_store__;
}

// ─── Builds ─────────────────────────────────────────────────────────────

export async function addBuild(build: BuildRecord): Promise<BuildRecord> {
  getFallback().builds.set(build.id, build);
  const sb = getSupabase();
  if (sb) await sb.from("builds").upsert(buildToRow(build), { onConflict: "id" });
  return build;
}

export async function getBuild(id: string): Promise<BuildRecord | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("builds").select("*").eq("id", id).single();
    if (data) return rowToBuild(data);
  }
  return getFallback().builds.get(id);
}

export async function getBuildByClientId(clientId: string): Promise<BuildRecord | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("builds").select("*").eq("client_id", clientId).limit(1).single();
    if (data) return rowToBuild(data);
  }
  for (const b of getFallback().builds.values()) {
    if (b.clientId === clientId) return b;
  }
  return undefined;
}

export async function getAllBuilds(): Promise<BuildRecord[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("builds").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) return data.map(rowToBuild);
  }
  return Array.from(getFallback().builds.values());
}

export async function updateBuild(id: string, updates: Partial<BuildRecord>): Promise<BuildRecord | null> {
  const fb = getFallback();
  const existing = fb.builds.get(id);
  const sb = getSupabase();

  if (sb) {
    const { data: row } = await sb.from("builds").select("*").eq("id", id).single();
    if (row) {
      const current = rowToBuild(row);
      const merged = { ...current, ...updates };
      await sb.from("builds").upsert(buildToRow(merged), { onConflict: "id" });
      fb.builds.set(id, merged);
      return merged;
    }
  }

  if (!existing) return null;
  const merged = { ...existing, ...updates };
  fb.builds.set(id, merged);
  return merged;
}

// ─── Messages ───────────────────────────────────────────────────────────

export async function addBuildMessage(msg: BuildMessage): Promise<void> {
  const fb = getFallback();
  const list = fb.messages.get(msg.buildId) || [];
  list.push(msg);
  fb.messages.set(msg.buildId, list);

  const sb = getSupabase();
  if (sb) {
    await sb.from("messages").insert({
      id: msg.id,
      build_id: msg.buildId,
      sender_role: msg.from,
      content: msg.text,
      created_at: msg.timestamp,
    });
  }
}

export async function getBuildMessages(buildId: string): Promise<BuildMessage[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("messages").select("*").eq("build_id", buildId).order("created_at");
    if (data && data.length > 0) return data.map(rowToMessage);
  }
  return getFallback().messages.get(buildId) || [];
}

// ─── Pulse Timers ───────────────────────────────────────────────────────

export async function setPulseTimer(clientId: string, startMs: number): Promise<PulseTimer> {
  const timer: PulseTimer = {
    clientId,
    day7At: startMs + 7 * 24 * 60 * 60 * 1000,
    day14At: startMs + 14 * 24 * 60 * 60 * 1000,
    day30At: startMs + 30 * 24 * 60 * 60 * 1000,
    lastSentAt: null,
    lastScore: null,
  };
  getFallback().pulseTimers.set(clientId, timer);

  const sb = getSupabase();
  if (sb) {
    await sb.from("pulse_timers").upsert({
      client_id: clientId,
      day7_at: timer.day7At,
      day14_at: timer.day14At,
      day30_at: timer.day30At,
      last_sent_at: null,
      last_score: null,
    }, { onConflict: "client_id" });
  }
  return timer;
}

export async function getPulseTimer(clientId: string): Promise<PulseTimer | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("pulse_timers").select("*").eq("client_id", clientId).single();
    if (data) return rowToPulseTimer(data);
  }
  return getFallback().pulseTimers.get(clientId);
}

export async function updatePulseTimer(clientId: string, updates: Partial<PulseTimer>): Promise<PulseTimer | null> {
  const current = await getPulseTimer(clientId);
  if (!current) return null;
  const merged = { ...current, ...updates };
  getFallback().pulseTimers.set(clientId, merged);

  const sb = getSupabase();
  if (sb) {
    await sb.from("pulse_timers").upsert({
      client_id: merged.clientId,
      day7_at: merged.day7At,
      day14_at: merged.day14At,
      day30_at: merged.day30At,
      last_sent_at: merged.lastSentAt,
      last_score: merged.lastScore,
    }, { onConflict: "client_id" });
  }
  return merged;
}

// ─── Notifications ──────────────────────────────────────────────────────

export async function addNotification(notif: Notification): Promise<Notification> {
  getFallback().notifications.set(notif.id, notif);

  const sb = getSupabase();
  if (sb) {
    await sb.from("notifications").insert({
      id: notif.id,
      type: notif.type,
      client_id: notif.clientId,
      business_name: notif.businessName,
      message: notif.message,
      created_at: notif.createdAt,
      read: notif.read,
      dismissed: notif.dismissed,
      meta: notif.meta ?? null,
    });
  }
  return notif;
}

export async function getNotifications(): Promise<Notification[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("notifications")
      .select("*")
      .eq("dismissed", false)
      .order("created_at", { ascending: false });
    if (data && data.length > 0) return data.map(rowToNotification);
  }
  return Array.from(getFallback().notifications.values())
    .filter((n) => !n.dismissed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function dismissNotification(id: string): Promise<void> {
  const fb = getFallback();
  const existing = fb.notifications.get(id);
  if (existing) fb.notifications.set(id, { ...existing, dismissed: true });

  const sb = getSupabase();
  if (sb) await sb.from("notifications").update({ dismissed: true }).eq("id", id);
}

export async function markNotificationRead(id: string): Promise<void> {
  const fb = getFallback();
  const existing = fb.notifications.get(id);
  if (existing) fb.notifications.set(id, { ...existing, read: true });

  const sb = getSupabase();
  if (sb) await sb.from("notifications").update({ read: true }).eq("id", id);
}

// ─── Client helpers (re-exports for convenience) ────────────────────────

export { getClient, updateClient };
export type { ClientProfile };
