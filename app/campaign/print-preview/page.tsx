"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { CampaignClient } from "@/lib/campaign";
import {
  renderPrintAd,
  getSizeSpec,
  normalizeSize,
  type PrintVariation,
} from "@/lib/print-engine";
import { clientToAdData } from "@/components/PrintAdPreview";

function PreviewInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const mode = (params.get("mode") || "bleed") as "bleed" | "trim";
  const variationParam = params.get("variation") as PrintVariation | null;
  const sub = Number(params.get("sub") || 0);

  const [client, setClient] = useState<CampaignClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setError("Supabase not configured"); return; }
    const sb = createClient(url, key);
    sb.from("campaign_clients").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { setError(error?.message || "Not found"); return; }
      setClient(data as CampaignClient);
    });
  }, [id]);

  if (error) return <div style={{ padding: 40 }}>{error}</div>;
  if (!client) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading print asset…</div>;

  const ad = clientToAdData(client, variationParam ?? undefined, sub || 0);
  const spec = getSizeSpec(normalizeSize(client.ad_size));
  const showBleed = mode === "bleed";

  const html = renderPrintAd(ad, {
    dpi: 300,
    showBleed,
    showSafeZone: false,
    showTrimMarks: showBleed,
  });

  return (
    <div style={{
      minHeight: "100vh", background: "#2a2a2a", display: "flex", flexDirection: "column",
      alignItems: "center", padding: 32, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ color: "#fff", marginBottom: 16, textAlign: "center", maxWidth: 800 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: "#D4A843", fontWeight: 700 }}>
          Print-Ready Asset
        </div>
        <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", marginTop: 6 }}>
          {client.business_name}
        </div>
        <div style={{ fontSize: 13, color: "#ccc", marginTop: 4 }}>
          {mode === "bleed" ? "Print-Ready (with bleed, 300 DPI)" : "Display Size (trim, 300 DPI)"} · {spec.label} · {showBleed ? `${spec.bleedPx300.w} × ${spec.bleedPx300.h}` : `${spec.trimPx300.w} × ${spec.trimPx300.h}`} px
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 10 }}>
          To save: right-click the ad → &ldquo;Save image as&rdquo;, or use browser Print → Save as PDF.
        </div>
      </div>
      <div style={{ background: "#fff", padding: 16, borderRadius: 6, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

export default function PrintPreviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading...</div>}>
      <PreviewInner />
    </Suspense>
  );
}
