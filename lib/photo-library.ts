// ─── Photo library with multi-source fallback ───────────────────────────
// Primary: Unsplash (direct hotlinks)
// Fallback 1: Pexels free search
// Fallback 2: Pixabay free search

const PHOTO_LIBRARY: Record<string, string[]> = {
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1550966871-3ed3cbe818b5?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1560053608-13721e0d97a6?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200&q=85&fit=crop",
  ],
  fitness: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=85&fit=crop",
  ],
  martialarts: [
    "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1547153760-18fc86324498?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1591117207239-788bf8de6c3b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1600881333168-2ef49b341f30?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1607962837359-5e7e89f86776?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1616803689943-5601631c7fec?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1595078475328-1ab05d0a6a0e?w=1200&q=85&fit=crop",
  ],
  dance_studio: [
    "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1547153760-18fc86324498?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1517817748493-49ec54a32465?w=1200&q=85&fit=crop",
  ],
  yoga_pilates: [
    "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1593810450967-f9c42742e326?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=1200&q=85&fit=crop",
  ],
  tutoring: [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&q=85&fit=crop",
  ],
  cleaning: [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=1200&q=85&fit=crop",
  ],
  landscaping: [
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1600693669105-b05ae7e0b7d9?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&q=85&fit=crop",
  ],
  auto_repair: [
    "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1632823471565-1ecdf7a6df0a?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=85&fit=crop",
  ],
  insurance: [
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200&q=85&fit=crop",
  ],
  dental: [
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=85&fit=crop",
  ],
  medical: [
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1631815588090-d1bcbe9b4b38?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&q=85&fit=crop",
  ],
  roofing: [
    "https://images.unsplash.com/photo-1632889659658-369b01848454?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1591588582259-e675bd2e6088?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1605152276897-4f618f831968?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1622397942555-c6f90dd58da3?w=1200&q=85&fit=crop",
  ],
  beauty: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=85&fit=crop",
  ],
  automotive: [
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1562141961-b7fb1fb53b4f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1543465077-db45d34b88a5?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1600320254374-ce2d293cc86f?w=1200&q=85&fit=crop",
  ],
  legal: [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1453733190371-0a9bedd82893?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1593115057322-e94b77572f20?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1542621334-a254cf47733d?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=1200&q=85&fit=crop",
  ],
  financial: [
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1559526324-593bc073d938?w=1200&q=85&fit=crop",
  ],
  realestate: [
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1582407947304-fd86f28f3d35?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=85&fit=crop",
  ],
  homeservices: [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1573600073955-f15b3b6caab7?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=85&fit=crop",
  ],
  retail: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=85&fit=crop",
  ],
  education: [
    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85&fit=crop",
  ],
  pet: [
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1629740067899-1e3b0c8df3c4?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=1200&q=85&fit=crop",
  ],
  hvac: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=85&fit=crop",
  ],
  business: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=85&fit=crop",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=85&fit=crop",
  ],
};

// ─── Search terms for each category ─────────────────────────────────────

const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  restaurant: ["restaurant", "food", "dining"],
  fitness: ["fitness", "gym", "workout"],
  martialarts: ["karate", "martial arts", "dojo"],
  dance_studio: ["dance studio", "ballet", "dance class"],
  yoga_pilates: ["yoga", "pilates", "wellness"],
  tutoring: ["tutoring", "study", "education"],
  cleaning: ["cleaning service", "house cleaning", "maid"],
  landscaping: ["landscaping", "lawn care", "garden"],
  auto_repair: ["auto repair", "mechanic", "garage"],
  insurance: ["insurance", "office", "professional"],
  dental: ["dentist", "dental office", "smile"],
  medical: ["doctor", "medical", "clinic"],
  roofing: ["roofing", "roof repair", "contractor"],
  beauty: ["salon", "beauty", "haircut"],
  automotive: ["car", "auto", "mechanic"],
  legal: ["law office", "lawyer", "legal"],
  financial: ["finance", "banking", "investment"],
  realestate: ["real estate", "home", "property"],
  homeservices: ["home services", "contractor", "plumber"],
  retail: ["retail store", "shop", "boutique"],
  education: ["school", "classroom", "learning"],
  pet: ["pet", "dog", "veterinary"],
  hvac: ["hvac", "heating", "air conditioning"],
  business: ["business", "office", "professional"],
};

export type PhotoSource = "unsplash" | "pexels" | "pixabay";

export interface PhotoSourceInfo {
  source: PhotoSource;
  url: string;
}

export function getPhotoLibraryKey(businessType: string, subType?: string): string {
  if (subType) {
    const s = subType.toLowerCase();
    if (s.match(/karate|martial|boxing|mma|kickboxing|bjj|tae\s*kwon|jiu/)) return "martialarts";
    if (s.match(/dance|ballet|ballroom/)) return "dance_studio";
    if (s.match(/yoga|pilates|barre/)) return "yoga_pilates";
    if (s.match(/tutor|study|academic/)) return "tutoring";
    if (s.match(/clean|maid|janitorial/)) return "cleaning";
    if (s.match(/landscap|lawn|garden/)) return "landscaping";
    if (s.match(/auto.*repair|mechanic|oil.*change/)) return "auto_repair";
    if (s.match(/insurance/)) return "insurance";
    if (s.match(/bakery|cupcake|cafe|coffee/)) return "restaurant";
    if (s.match(/crossfit/)) return "fitness";
  }
  if (businessType === "hvac") return "hvac";
  if (businessType === "homeservices") return "homeservices";
  return PHOTO_LIBRARY[businessType] ? businessType : "business";
}

export function getPexelsSearchUrl(category: string): string {
  const term = (CATEGORY_SEARCH_TERMS[category]?.[0] || category).replace(/\s+/g, "-");
  return `https://www.pexels.com/search/${encodeURIComponent(term)}/`;
}

export function getPixabaySearchUrl(category: string): string {
  const term = (CATEGORY_SEARCH_TERMS[category]?.[0] || category).replace(/\s+/g, "-");
  return `https://pixabay.com/images/search/${encodeURIComponent(term)}/`;
}

/**
 * Returns a layered photo fallback list:
 *   1. Unsplash direct URLs (hotlinked)
 *   2. Pexels free search URL (fallback — browser navigates, cannot hotlink)
 *   3. Pixabay free search URL (fallback)
 *
 * Each entry is tagged with its source so the dev knows where it came from.
 */
export function getPhotoSourceList(businessType: string, subType?: string): PhotoSourceInfo[] {
  const key = getPhotoLibraryKey(businessType, subType);
  const unsplash: PhotoSourceInfo[] = (PHOTO_LIBRARY[key] || PHOTO_LIBRARY.business).map((url) => ({
    source: "unsplash" as const,
    url,
  }));
  const fallbacks: PhotoSourceInfo[] = [
    { source: "pexels", url: getPexelsSearchUrl(key) },
    { source: "pixabay", url: getPixabaySearchUrl(key) },
  ];
  console.log(
    `[photo-library] Category "${key}" — primary: unsplash (${unsplash.length}), fallbacks: pexels + pixabay`,
  );
  return [...unsplash, ...fallbacks];
}

export { getPhotoUrl } from "./studio-engine";
