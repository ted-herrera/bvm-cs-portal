import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";
import {
  getBuild,
  updateBuild,
  addNotification,
  setPulseTimer,
} from "@/lib/store";
import type { BuildLogEntry } from "@/lib/pipeline";
import { sendEmailViaAppsScript, goLiveNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { buildId, clientId, liveUrl } = (await request.json()) as {
    buildId?: string;
    clientId?: string;
    liveUrl?: string;
  };

  if (!buildId && !clientId) {
    return NextResponse.json(
      { error: "buildId or clientId required" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const nowMs = Date.now();

  let build = buildId ? await getBuild(buildId) : null;
  if (!build && clientId) {
    // Search by clientId
    const { getBuildByClientId } = await import("@/lib/store");
    build = await getBuildByClientId(clientId) || null;
  }

  if (build) {
    await updateBuild(build.id, {
      status: "live",
      liveAt: now,
      liveUrl: liveUrl || build.liveUrl,
    });
  }

  const targetClientId = clientId || build?.clientId;
  if (!targetClientId) {
    return NextResponse.json(
      { error: "Could not resolve client" },
      { status: 404 },
    );
  }

  const client = await getClient(targetClientId);
  if (client) {
    const logEntry: BuildLogEntry = {
      from: client.stage,
      to: "live",
      timestamp: now,
      triggeredBy: "dev",
    };

    await updateClient(targetClientId, {
      stage: "live",
      published_url: liveUrl || client.published_url || null,
      delivered_at: now,
      buildLog: [...client.buildLog, logEntry],
      buildNotes: [...client.buildNotes, `Site went live: ${liveUrl || "(no URL)"}`],
    });

    // Start Day 7/14/30 pulse timer
    await setPulseTimer(targetClientId, nowMs);

    // Notify rep dashboard — build complete
    await addNotification({
      id: `notif-live-${build?.id || targetClientId}-${nowMs.toString(36)}`,
      type: "build-complete",
      clientId: targetClientId,
      businessName: client.business_name,
      message: `🎉 ${client.business_name} is live`,
      createdAt: now,
      read: false,
      dismissed: false,
      meta: { liveUrl: liveUrl || null },
    });

    // Handwrytten task
    await addNotification({
      id: `notif-hw-${build?.id || targetClientId}-${nowMs.toString(36)}`,
      type: "handwrytten-task",
      clientId: targetClientId,
      businessName: client.business_name,
      message: `✉️ Send handwritten card to ${client.business_name} — their site is live! Click to send.`,
      createdAt: now,
      read: false,
      dismissed: false,
    });

    // Fire go-live notification email (best-effort)
    if (client.contact_email && (liveUrl || client.published_url)) {
      sendEmailViaAppsScript(
        goLiveNotificationEmail({
          clientName: client.business_name,
          repName: client.assigned_rep || "your BVM rep",
          liveUrl: liveUrl || client.published_url || "",
          toEmail: client.contact_email,
        }),
      ).catch((err) => console.error("[build/complete] email failed:", err));
    }
  }

  return NextResponse.json({ success: true });
}
