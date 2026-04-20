export function classifyBusinessType(businessName: string, description: string): string {
  const a = `${businessName} ${description}`.toLowerCase();
  if (a.match(/karate|martial art|taekwondo|judo|boxing|mma|kickboxing|bjj|jiu.?jitsu|wrestling|dojo|kung fu|aikido|self.?defense/)) return "fitness";
  if (a.match(/yoga|pilates|barre|meditation/)) return "fitness";
  if (a.match(/gym|crossfit|fitness|personal train|workout/)) return "fitness";
  if (a.match(/dance|ballet|zumba|studio/)) return "fitness";
  if (a.match(/taco|tacos|burger|pizza|restaurant|cafe|coffee|bakery|cupcake|donut|sushi|bbq|grill|diner|bistro|brewery|winery|bar|pub|food|eat|cuisine|kitchen|deli|sandwich|wing|steak|seafood|noodle|ramen|pho|thai|chinese|indian|mexican|italian/)) return "restaurant";
  if (a.match(/dental|dentist|orthodont|teeth|smile|oral/)) return "dental";
  if (a.match(/medical|doctor|physician|clinic|urgent care|health|family medicine|pediatric|nurse|therapy|chiropractic|physical therapy/)) return "medical";
  if (a.match(/law|attorney|lawyer|legal|firm|counsel/)) return "legal";
  if (a.match(/hvac|heating|cooling|air condition|furnace|plumbing|plumber/)) return "hvac";
  if (a.match(/roof|roofing|gutter|siding|exterior/)) return "roofing";
  if (a.match(/auto|car|vehicle|mechanic|tire|oil change|body shop|collision|transmission/)) return "automotive";
  if (a.match(/salon|hair|nail|spa|beauty|barber|wax|lash|brow|makeup|cosmet/)) return "beauty";
  if (a.match(/real estate|realtor|realty|property|mortgage|homes/)) return "realestate";
  if (a.match(/financial|finance|insurance|accounting|tax|wealth|investment|advisor|bank|credit union/)) return "financial";
  if (a.match(/vet|veterinar|pet|animal|grooming|kennel|dog|cat/)) return "pet";
  if (a.match(/shop|store|boutique|market|supply|wholesale|retail|cloth/)) return "retail";
  if (a.match(/school|academy|tutoring|learning|education|childcare|daycare|preschool/)) return "education";
  if (a.match(/landscap|lawn|cleaning|maid|pest|window|painting|handyman|electrician|contractor|remodel|renovation/)) return "homeservices";
  return "business";
}

export function detectSubType(businessName: string, description: string): string {
  const a = `${businessName} ${description}`.toLowerCase();
  if (a.match(/karate|martial art|taekwondo|judo|mma|kickboxing|bjj|jiu.?jitsu|dojo|kung fu|aikido|self.?defense/)) return "martialarts";
  if (a.match(/yoga|meditation|mindful/)) return "yoga";
  if (a.match(/crossfit/)) return "crossfit";
  if (a.match(/dance|ballet|zumba/)) return "dance";
  if (a.match(/pilates|barre/)) return "pilates";
  if (a.match(/taco|tacos|mexican|burrito|tex.?mex/)) return "mexican";
  if (a.match(/pizza|italian/)) return "pizza";
  if (a.match(/burger|hamburger/)) return "burger";
  if (a.match(/bakery|cake|cupcake|pastry|donut/)) return "bakery";
  if (a.match(/cafe|coffee|espresso|brew(?!ery)/)) return "cafe";
  if (a.match(/sushi|ramen|japanese/)) return "japanese";
  if (a.match(/bar|pub|tavern|brewery|brew(?!ery)|grill|gastropub|saloon|lounge|nightclub|club/)) return "bar";
  if (a.match(/bbq|barbecue|smokehouse/)) return "bbq";
  if (a.match(/salon|barber|stylist/)) return "salon";
  if (a.match(/spa|massage|facial/)) return "spa";
  if (a.match(/vet|veterinar/)) return "veterinary";
  if (a.match(/pharma|drugstore/)) return "pharmacy";
  if (a.match(/optom|optical|eyewear|glasses/)) return "optical";
  if (a.match(/chiro/)) return "chiropractic";
  if (a.match(/physical.*therapy|rehab/)) return "physical_therapy";
  if (a.match(/childcare|daycare|preschool/)) return "childcare";
  if (a.match(/pet.*groom|dog.*walk/)) return "pet_services";
  if (a.match(/plumb/)) return "plumbing";
  if (a.match(/electric/)) return "electrical";
  if (a.match(/paint/)) return "painting";
  if (a.match(/floor/)) return "flooring";
  if (a.match(/remodel|renovat/)) return "remodeling";
  if (a.match(/photograph/)) return "photography";
  if (a.match(/cater/)) return "catering";
  if (a.match(/tutor/)) return "tutoring";
  return classifyBusinessType(businessName, description);
}

const SUBTYPE_SERVICES: Record<string, string[]> = {
  martialarts: ["Beginner Classes", "Advanced Training", "Private Lessons"],
  yoga: ["Group Classes", "Private Sessions", "Wellness Workshops"],
  crossfit: ["WOD Classes", "Personal Training", "Nutrition Coaching"],
  dance: ["Group Classes", "Private Lessons", "Performance Training"],
  pilates: ["Mat Classes", "Reformer Sessions", "Private Instruction"],
  mexican: ["Dine-In", "Takeout & Delivery", "Catering & Events"],
  taco: ["Dine-In", "Takeout & Delivery", "Catering & Events"],
  pizza: ["Dine-In", "Delivery & Takeout", "Party Catering"],
  burger: ["Dine-In", "Drive-Thru & Takeout", "Catering"],
  bakery: ["Custom Cakes & Cupcakes", "Walk-In Pastries", "Catering & Events"],
  cafe: ["Espresso & Coffee", "Pastries & Light Bites", "Catering"],
  japanese: ["Fresh Rolls & Sashimi", "Omakase Experience", "Takeout & Delivery"],
  sushi: ["Fresh Rolls & Sashimi", "Omakase Experience", "Takeout & Delivery"],
  bar: ["Draft Beer Selection", "Craft Cocktails & Spirits", "Happy Hour Specials"],
  bbq: ["Dine-In", "Takeout & Catering", "Smoked Meats by the Pound"],
  salon: ["Cut & Color", "Blowouts & Styling", "Special Occasion Packages"],
  spa: ["Massage Therapy", "Facials & Skincare", "Wellness Packages"],
  veterinary: ["Wellness Exams", "Vaccinations", "Surgical Services"],
  pharmacy: ["Prescription Fills", "Compounding", "Vaccinations"],
  optical: ["Eye Exams", "Frames & Lenses", "Contact Lenses"],
  chiropractic: ["Adjustments", "Therapeutic Massage", "Custom Treatment Plans"],
  physical_therapy: ["Injury Rehab", "Post-Surgery Recovery", "Sports Therapy"],
  childcare: ["Full-Day Programs", "Half-Day & Part-Time", "Summer Camps"],
  pet_services: ["Grooming", "Boarding & Daycare", "Walking & Sitting"],
  plumbing: ["Emergency Repair", "Fixture Installation", "Drain Cleaning"],
  electrical: ["Panel Upgrades", "Wiring & Repair", "Lighting Installation"],
  painting: ["Interior Painting", "Exterior Painting", "Color Consultation"],
  flooring: ["Hardwood Installation", "Tile & Stone", "Refinishing"],
  remodeling: ["Kitchen Remodels", "Bathroom Renovations", "Whole-Home Projects"],
  photography: ["Portrait Sessions", "Events & Weddings", "Commercial Work"],
  catering: ["Corporate Catering", "Weddings & Events", "Drop-Off Service"],
  tutoring: ["One-on-One", "Group Sessions", "Test Prep"],
};

const SERVICE_MAP: Record<string, string[]> = {
  restaurant: ["Dine-In", "Takeout & Delivery", "Catering & Events"],
  dental: ["General Dentistry", "Cosmetic Dentistry", "Emergency Care"],
  medical: ["Primary Care", "Preventive Wellness", "Urgent Care Visits"],
  legal: ["Free Consultation", "Case Representation", "Document Review"],
  hvac: ["AC Installation & Repair", "Heating & Furnace Service", "Preventive Maintenance"],
  roofing: ["Roof Replacement", "Storm Damage Repair", "Free Inspections"],
  automotive: ["Oil Change & Tune-Up", "Brake Service", "Full Diagnostics"],
  beauty: ["Haircut & Styling", "Color & Highlights", "Special Occasion Packages"],
  fitness: ["Personal Training", "Group Classes", "Nutrition Coaching"],
  realestate: ["Home Buying", "Home Selling", "Market Analysis"],
  financial: ["Financial Planning", "Insurance Review", "Tax Strategy"],
  pet: ["Wellness Exams", "Vaccinations", "Emergency Care"],
  retail: ["In-Store Shopping", "Custom Orders", "Gift Wrapping & Delivery"],
  education: ["One-on-One Tutoring", "Group Sessions", "Progress Assessments"],
  homeservices: ["Free Estimate", "Recurring Service Plans", "Emergency Calls"],
  business: ["Core Service Package", "Premium Offering", "Free Consultation"],
};

export function getServiceSuggestions(businessType: string, subType?: string): string[] {
  if (subType && SUBTYPE_SERVICES[subType]) return SUBTYPE_SERVICES[subType];
  return SERVICE_MAP[businessType] || SERVICE_MAP.business;
}

const SUBTYPE_CTA: Record<string, string> = {
  martialarts: "Book a Free Class",
  yoga: "Book a Class",
  crossfit: "Start Your Trial",
  dance: "Book a Class",
  bakery: "Order Now",
  cafe: "Order Online",
  bar: "Reserve a Table",
  bbq: "Order Now",
};

const CTA_MAP: Record<string, string> = {
  restaurant: "Order Now",
  dental: "Book Now",
  medical: "Book Now",
  legal: "Get a Free Consultation",
  financial: "Get a Free Consultation",
  hvac: "Call Us Today",
  roofing: "Call Us Today",
  homeservices: "Call Us Today",
  beauty: "Book Now",
  fitness: "Book Now",
  automotive: "Schedule Service",
  realestate: "See Listings",
  retail: "Shop Now",
  education: "Enroll Today",
  pet: "Book Now",
  business: "Get Started",
};

export function getCTASuggestion(businessType: string, subType?: string): string {
  if (subType && SUBTYPE_CTA[subType]) return SUBTYPE_CTA[subType];
  return CTA_MAP[businessType] || CTA_MAP.business;
}

const SUBTYPE_KEYWORDS: Record<string, string[]> = {
  martialarts: ["martial arts", "karate", "dojo", "training", "discipline"],
  yoga: ["yoga", "meditation", "wellness", "studio", "pose"],
  crossfit: ["crossfit", "gym", "weights", "training", "box"],
  dance: ["dance", "studio", "ballet", "performance", "movement"],
};

const PHOTO_KEYWORDS: Record<string, string[]> = {
  restaurant: ["food", "restaurant", "dining", "chef", "kitchen"],
  dental: ["dental", "dentist", "teeth", "smile", "clinic"],
  medical: ["medical", "doctor", "clinic", "health", "care"],
  legal: ["law", "professional", "office", "attorney", "justice"],
  hvac: ["hvac", "technician", "service", "home", "repair"],
  roofing: ["roofing", "construction", "house", "roof", "workers"],
  automotive: ["car", "auto", "mechanic", "garage", "vehicle"],
  beauty: ["salon", "hair", "beauty", "spa", "style"],
  fitness: ["gym", "fitness", "workout", "training", "health"],
  realestate: ["house", "home", "real estate", "property", "neighborhood"],
  financial: ["finance", "business", "professional", "office", "planning"],
  pet: ["dog", "cat", "pet", "veterinary", "animal"],
  retail: ["store", "shopping", "retail", "products", "boutique"],
  education: ["education", "learning", "students", "classroom", "teaching"],
  homeservices: ["home", "service", "house", "professional", "contractor"],
  business: ["professional", "business", "office", "team", "service"],
};

export function getPhotoKeywords(businessType: string, subType?: string): string[] {
  if (subType && SUBTYPE_KEYWORDS[subType]) return SUBTYPE_KEYWORDS[subType];
  return PHOTO_KEYWORDS[businessType] || PHOTO_KEYWORDS.business;
}
