"use client";

import { useEffect, useRef } from "react";
import type { CampaignClient } from "@/lib/campaign";
import {
  renderPrintAd,
  getSizeSpec,
  normalizeSize,
  type PrintAdData,
  type PrintVariation,
} from "@/lib/print-engine";

const CATEGORY_PHOTOS: Record<string, string> = {
  restaurant: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200",
  healthcare: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200",
  legal: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200",
  home: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200",
  fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200",
  automotive: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200",
  default: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200",
};

function photoFromCategory(cat: string | null | undefined): string {
  const k = (cat || "").toLowerCase();
  if (k.includes("restaurant") || k.includes("food")) return CATEGORY_PHOTOS.restaurant;
  if (k.includes("dent") || k.includes("health") || k.includes("medical")) return CATEGORY_PHOTOS.healthcare;
  if (k.includes("legal") || k.includes("law")) return CATEGORY_PHOTOS.legal;
  if (k.includes("roof") || k.includes("home") || k.includes("construction")) return CATEGORY_PHOTOS.home;
  if (k.includes("fitness") || k.includes("yoga") || k.includes("gym")) return CATEGORY_PHOTOS.fitness;
  if (k.includes("auto")) return CATEGORY_PHOTOS.automotive;
  return CATEGORY_PHOTOS.default;
}

function brandFromCategory(cat: string | null | undefined): PrintAdData["brandColors"] {
  const k = (cat || "").toLowerCase();
  if (k.includes("restaurant") || k.includes("food")) return { primary: "#c0392b", secondary: "#f39c12", accent: "#2c3e50" };
  if (k.includes("dent") || k.includes("health")) return { primary: "#2980b9", secondary: "#ecf0f1", accent: "#1abc9c" };
  if (k.includes("roof") || k.includes("home")) return { primary: "#2c3e50", secondary: "#e74c3c", accent: "#f1c40f" };
  if (k.includes("fitness") || k.includes("yoga")) return { primary: "#16a34a", secondary: "#fbbf24", accent: "#0C2340" };
  return { primary: "#0C2340", secondary: "#475569", accent: "#D4A843" };
}

function mapVariation(selected: string | null | undefined): PrintVariation {
  if (!selected) return "clean_classic";
  const s = selected.toLowerCase();
  if (s.includes("bold") || s.includes("modern") || s.includes("b")) return "bold_modern";
  if (s.includes("premium") || s.includes("editorial") || s.includes("c")) return "premium_editorial";
  return "clean_classic";
}

export function clientToAdData(client: CampaignClient, variation?: PrintVariation, subVariation = 0): PrintAdData {
  const services = (client.services || "")
    .split(/[,;·•]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    businessName: client.business_name,
    tagline: client.tagline || "",
    city: client.city || "",
    services: services.length ? services : [client.category || "Our Services"],
    cta: client.tagline?.match(/^(Order|Visit|Call|Schedule|Book|Try|Get|Shop)\b/i)?.[0]
      ? client.tagline
      : "Visit Us Today",
    phone: client.contact_phone || "",
    photoUrl: photoFromCategory(client.category),
    brandColors: brandFromCategory(client.category),
    size: normalizeSize(client.ad_size),
    variation: variation || mapVariation(client.selected_direction),
    subVariation,
  };
}

interface Props {
  client: CampaignClient;
  variation?: PrintVariation;
  subVariation?: number;
  maxWidth?: number;
  showBleed?: boolean;
  showSafeZone?: boolean;
  showTrimMarks?: boolean;
  rounded?: number;
  shadow?: boolean;
}

export default function PrintAdPreview({
  client,
  variation,
  subVariation = 0,
  maxWidth = 480,
  showBleed = false,
  showSafeZone = false,
  showTrimMarks = false,
  rounded = 8,
  shadow = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adData = clientToAdData(client, variation, subVariation);
  const spec = getSizeSpec(adData.size);
  const targetW = Math.min(maxWidth, showBleed ? spec.bleedPx150.w : spec.trimPx150.w);
  const baseW = showBleed ? spec.bleedPx150.w : spec.trimPx150.w;
  const baseH = showBleed ? spec.bleedPx150.h : spec.trimPx150.h;
  const scale = targetW / baseW;

  useEffect(() => {
    if (!containerRef.current) return;
    const inner = containerRef.current.querySelector("[data-ad-inner]") as HTMLDivElement | null;
    if (inner) inner.style.transform = `scale(${scale})`;
  }, [scale, variation, subVariation, client.ad_size]);

  return (
    <div
      ref={containerRef}
      style={{
        width: targetW,
        height: baseH * scale,
        overflow: "hidden",
        position: "relative",
        borderRadius: rounded,
        background: "#fafaf7",
        boxShadow: shadow ? "0 20px 40px -20px rgba(15,23,42,0.25)" : undefined,
      }}
    >
      <div
        data-ad-inner
        style={{ width: baseW, height: baseH, transformOrigin: "top left" }}
        dangerouslySetInnerHTML={{
          __html: renderPrintAd(adData, { dpi: 150, showBleed, showSafeZone, showTrimMarks }),
        }}
      />
    </div>
  );
}
