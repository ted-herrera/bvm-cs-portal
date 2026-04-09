// Shared in-memory store — singleton across routes via globalThis.
// Will be replaced with Supabase.
//
// This works alongside lib/mock-data.ts (which owns the ClientProfile map).
// Here we add: build records, dev<->rep messages, pulse timers, and notifications.

import type { ClientProfile, QAReport } from "./pipeline";
import { getClient, updateClient } from "./mock-data";

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
  day7At: number; // epoch ms
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

interface StoreShape {
  builds: Map<string, BuildRecord>;
  messages: Map<string, BuildMessage[]>; // keyed by buildId
  pulseTimers: Map<string, PulseTimer>; // keyed by clientId
  notifications: Map<string, Notification>; // keyed by notification id
}

declare global {
  // eslint-disable-next-line no-var
  var __bvm_shared_store__: StoreShape | undefined;
}

function getStore(): StoreShape {
  if (!globalThis.__bvm_shared_store__) {
    globalThis.__bvm_shared_store__ = {
      builds: new Map<string, BuildRecord>(),
      messages: new Map<string, BuildMessage[]>(),
      pulseTimers: new Map<string, PulseTimer>(),
      notifications: new Map<string, Notification>(),
    };
  }
  return globalThis.__bvm_shared_store__;
}

// ─── Builds ──────────────────────────────────────────────────────────────

export function addBuild(build: BuildRecord): BuildRecord {
  getStore().builds.set(build.id, build);
  return build;
}

export function getBuild(id: string): BuildRecord | undefined {
  return getStore().builds.get(id);
}

export function getBuildByClientId(clientId: string): BuildRecord | undefined {
  for (const b of getStore().builds.values()) {
    if (b.clientId === clientId) return b;
  }
  return undefined;
}

export function getAllBuilds(): BuildRecord[] {
  return Array.from(getStore().builds.values());
}

export function updateBuild(id: string, updates: Partial<BuildRecord>): BuildRecord | null {
  const store = getStore();
  const existing = store.builds.get(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates };
  store.builds.set(id, merged);
  return merged;
}

// ─── Messages ────────────────────────────────────────────────────────────

export function addBuildMessage(msg: BuildMessage): void {
  const store = getStore();
  const list = store.messages.get(msg.buildId) || [];
  list.push(msg);
  store.messages.set(msg.buildId, list);
}

export function getBuildMessages(buildId: string): BuildMessage[] {
  return getStore().messages.get(buildId) || [];
}

// ─── Pulse Timers ────────────────────────────────────────────────────────

export function setPulseTimer(clientId: string, startMs: number): PulseTimer {
  const timer: PulseTimer = {
    clientId,
    day7At: startMs + 7 * 24 * 60 * 60 * 1000,
    day14At: startMs + 14 * 24 * 60 * 60 * 1000,
    day30At: startMs + 30 * 24 * 60 * 60 * 1000,
    lastSentAt: null,
    lastScore: null,
  };
  getStore().pulseTimers.set(clientId, timer);
  return timer;
}

export function getPulseTimer(clientId: string): PulseTimer | undefined {
  return getStore().pulseTimers.get(clientId);
}

export function updatePulseTimer(clientId: string, updates: Partial<PulseTimer>): PulseTimer | null {
  const store = getStore();
  const existing = store.pulseTimers.get(clientId);
  if (!existing) return null;
  const merged = { ...existing, ...updates };
  store.pulseTimers.set(clientId, merged);
  return merged;
}

// ─── Notifications ───────────────────────────────────────────────────────

export function addNotification(notif: Notification): Notification {
  getStore().notifications.set(notif.id, notif);
  return notif;
}

export function getNotifications(): Notification[] {
  return Array.from(getStore().notifications.values())
    .filter((n) => !n.dismissed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function dismissNotification(id: string): void {
  const store = getStore();
  const existing = store.notifications.get(id);
  if (existing) {
    store.notifications.set(id, { ...existing, dismissed: true });
  }
}

export function markNotificationRead(id: string): void {
  const store = getStore();
  const existing = store.notifications.get(id);
  if (existing) {
    store.notifications.set(id, { ...existing, read: true });
  }
}

// ─── Client helpers (re-exports for convenience) ─────────────────────────

export { getClient, updateClient };
export type { ClientProfile };
