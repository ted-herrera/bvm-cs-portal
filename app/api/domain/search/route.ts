import { NextResponse } from "next/server";

// Domain search — best-effort availability check via RDAP (free, public).
// Returns: { query, primary: {domain, available, price}, alternatives: [...] }

const TLDS = [".com", ".net", ".co", ".org", ".biz"];
const PRICE_BY_TLD: Record<string, string> = {
  ".com": "$12.99/yr",
  ".net": "$14.99/yr",
  ".co": "$24.99/yr",
  ".org": "$13.99/yr",
  ".biz": "$15.99/yr",
};

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 42);
}

async function checkRdap(domain: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      cache: "no-store",
      headers: { Accept: "application/rdap+json" },
    });
    // 404 from RDAP = domain not registered (available)
    if (res.status === 404) return true;
    // 200 = registered (not available)
    if (res.status === 200) return false;
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();
  const city = (searchParams.get("city") || "").trim();

  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const base = slugify(query);
  const citySlug = slugify(city);

  // Build candidates: businessname + TLDs, plus some city variants on .com
  const candidates = [
    `${base}.com`,
    `${base}.net`,
    `${base}.co`,
    `${base}.org`,
    `${base}.biz`,
    citySlug ? `${base}${citySlug}.com` : `${base}local.com`,
    citySlug ? `my${base}.com` : `${base}online.com`,
  ];

  const results = await Promise.all(
    candidates.map(async (domain) => {
      const available = await checkRdap(domain);
      const tld = "." + domain.split(".").pop();
      return {
        domain,
        available: available === null ? null : available,
        price: PRICE_BY_TLD[tld] || "$14.99/yr",
        purchaseUrl: `https://www.ionos.com/domains/domain-checker?query=${encodeURIComponent(domain)}`,
      };
    }),
  );

  const primary = results[0];
  const alternatives = results.slice(1, 5);

  return NextResponse.json({
    query,
    primary,
    alternatives,
  });
}
