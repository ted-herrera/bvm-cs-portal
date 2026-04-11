import { NextResponse } from "next/server";
import { getClient, updateClient } from "@/lib/mock-data";
import { getBuild, getBuildByClientId, updateBuild } from "@/lib/store";
import type { BuildLogEntry } from "@/lib/pipeline";

export async function POST(request: Request) {
  const { clientId, buildId, devUsername } = (await request.json()) as {
    clientId?: string;
    buildId?: string;
    devUsername: string;
  };

  const now = new Date().toISOString();

  // Update build record if present
  let build = buildId ? await getBuild(buildId) : null;
  if (!build && clientId) build = await getBuildByClientId(clientId) || null;
  if (build) {
    await updateBuild(build.id, {
      status: "claimed",
      assignedDev: devUsername,
      claimedAt: now,
    });
  }

  // Update client record
  const targetClientId = clientId || build?.clientId;
  if (targetClientId) {
    const client = await getClient(targetClientId);
    if (client) {
      const logEntry: BuildLogEntry = {
        from: client.stage,
        to: "building",
        timestamp: now,
        triggeredBy: devUsername,
      };
      await updateClient(targetClientId, {
        stage: "building",
        assignedDev: devUsername,
        buildLog: [...client.buildLog, logEntry],
      });
    }
  }

  return NextResponse.json({ success: true });
}
