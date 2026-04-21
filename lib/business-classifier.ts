export function classifyBusinessType(businessName: string, description: string): string {
  console.log("[classifyBusiness] input:", { businessName, description });
  const result = _classifyBusinessTypeImpl(businessName, description);
  console.log("[classifyBusiness] → type:", result);
  return result;
}

function _classifyBusinessTypeImpl(businessName: string, description: string): string {
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
  console.log("[classifyBusiness/subtype] input:", { businessName, description });
  const result = _detectSubTypeImpl(businessName, description);
  console.log("[classifyBusiness/subtype] → subtype:", result);
  return result;
}

function _detectSubTypeImpl(businessName: string, description: string): string {
  const a = `${businessName} ${description}`.toLowerCase();

  // — fitness / movement —
  if (a.match(/karate|martial art|taekwondo|judo|mma|kickboxing|bjj|jiu.?jitsu|dojo|kung fu|aikido|self.?defense/)) return "martialarts";
  if (a.match(/yoga|meditation|mindful/)) return "yoga";
  if (a.match(/crossfit/)) return "crossfit";
  if (a.match(/dance|ballet|zumba|ballroom/)) return "dance";
  if (a.match(/pilates|barre/)) return "pilates";
  if (a.match(/\bgym\b|weightlifting|strength train|powerlifting/)) return "gym";
  if (a.match(/fitness|personal train|workout|bootcamp/)) return "fitness";

  // — food & beverage —
  if (a.match(/taco|tacos|mexican|burrito|tex.?mex|quesadilla|enchilada/)) return "mexican";
  if (a.match(/pizza|pizzeria|italian/)) return "pizza";
  if (a.match(/burger|hamburger|cheeseburger|smash/)) return "burger";
  if (a.match(/bakery|bakeries|baked.?goods|baker\b|pastry|pastries|bread|breads|cake|cakes|cupcake|cupcakes|donut|doughnut|chocolate|chocolatier|sweets|sweet.?shop|confection|confectioner|macaron|croissant|scone|muffin/)) return "bakery";
  if (a.match(/coffee|cafe|espresso|latte|roaster/)) return "cafe";
  if (a.match(/sushi|ramen|japanese|udon|teriyaki/)) return "japanese";
  if (a.match(/bbq|barbecue|smokehouse|bar-b-que/)) return "bbq";
  if (a.match(/wine|winery|vineyard|cellar/)) return "wine";
  if (a.match(/brewery|brewing|brewpub|craft beer/)) return "brewery";
  if (a.match(/distillery|distill|whiskey|bourbon|vodka|gin distill|rum distill/)) return "distillery";
  if (a.match(/bar\b|pub|tavern|gastropub|saloon|lounge|nightclub|cocktail/)) return "bar";
  if (a.match(/cater/)) return "catering";
  if (a.match(/grocery|grocer|supermarket|corner store|market\b|produce|butcher/)) return "grocery";
  if (a.match(/restaurant|diner|bistro|eatery|food|cuisine|kitchen|deli|sandwich|wing|steak|seafood|noodle|pho|thai|chinese|indian/)) return "restaurant";

  // — health & medical —
  if (a.match(/dental|dentist|orthodont|teeth|smile|oral surgery/)) return "dental";
  if (a.match(/veterinar|\bvet\b|animal hospital/)) return "veterinary";
  if (a.match(/pharma|drugstore|prescription/)) return "pharmacy";
  if (a.match(/optom|optical|eyewear|glasses|eye.?doctor/)) return "optical";
  if (a.match(/chiro/)) return "chiropractic";
  if (a.match(/physical.*therapy|rehab|\bpt\b/)) return "physical_therapy";
  if (a.match(/medical|doctor|physician|clinic|urgent care|health|family medicine|pediatric|nurse/)) return "medical";

  // — personal care —
  if (a.match(/barber|barbershop/)) return "salon";
  if (a.match(/salon|stylist|hair\b|haircut|nail|lash|brow|waxing|makeup|cosmet/)) return "salon";
  if (a.match(/spa|massage|facial|aesthetic/)) return "spa";
  if (a.match(/beauty/)) return "beauty";

  // — professional services —
  if (a.match(/law\b|lawyer|attorney|legal|counsel|esquire/)) return "law";
  if (a.match(/accounting|accountant|\bcpa\b|bookkeep|tax prep/)) return "accounting";
  if (a.match(/insurance|insurer|underwriter/)) return "insurance";
  if (a.match(/financial|finance|wealth|investment|advisor|bank|credit union|mortgage lender/)) return "financial";
  if (a.match(/real estate|realtor|realty/)) return "real_estate";
  if (a.match(/marketing|advertising|branding|digital agency|pr agency/)) return "marketing";
  if (a.match(/staffing|recruit|staffing agency|hr consult/)) return "staffing";
  if (a.match(/nonprofit|non.?profit|charity|foundation|ngo/)) return "nonprofit";

  // — home services —
  if (a.match(/hvac|heating|cooling|air condition|furnace/)) return "hvac";
  if (a.match(/plumb/)) return "plumbing";
  if (a.match(/electric/)) return "electrical";
  if (a.match(/paint/)) return "painting";
  if (a.match(/floor/)) return "flooring";
  if (a.match(/remodel|renovat/)) return "remodeling";
  if (a.match(/roof|gutter|siding/)) return "roofing";
  if (a.match(/landscap|lawn|garden(?!.*center)/)) return "landscaping";
  if (a.match(/cleaning|maid|janitorial|housekeeping/)) return "cleaning";
  if (a.match(/moving|mover|relocation/)) return "moving";
  if (a.match(/storage|self.?storage|warehousing/)) return "storage";
  if (a.match(/handyman|contractor|construction/)) return "remodeling";

  // — auto —
  if (a.match(/auto.*repair|mechanic|oil.?change|tire|body shop|collision|transmission|muffler/)) return "auto_repair";
  if (a.match(/auto|\bcar\b|vehicle|dealership/)) return "auto_repair";

  // — pet —
  if (a.match(/pet.*groom|dog.*walk|dog.*board|kennel/)) return "pet_services";
  if (a.match(/\bpet\b|animal|dog\b|cat\b/)) return "pet_services";

  // — education —
  if (a.match(/tutor/)) return "tutoring";
  if (a.match(/childcare|daycare|preschool/)) return "childcare";

  // — retail & specialty —
  if (a.match(/bookstore|book.?store|\bbooks?\b|library|\bused.?books?\b|\bsecondhand.?books?\b|\bpre.?owned.?books?\b|rare books/)) return "bookstore";
  if (a.match(/florist|flower shop|bouquet|floral/)) return "florist";
  if (a.match(/jewelry|jeweler|diamond|engagement ring|fine gold/)) return "jewelry";
  if (a.match(/hardware|lumber|home improvement|building supply/)) return "hardware";
  if (a.match(/hotel|resort|inn\b|boutique hotel|bed.?and.?breakfast|b&b/)) return "hotel";
  if (a.match(/motel|lodge/)) return "hotel";
  if (a.match(/boutique|clothing|apparel|fashion|shoe/)) return "retail";
  if (a.match(/retail|shop\b|store\b|wholesale/)) return "retail";

  // — creative / media services —
  if (a.match(/photograph/)) return "photography_studio";
  if (a.match(/printing|printer|print shop|copy shop|sign shop/)) return "printing";

  // Final fallback: classifier's top-level type, then generic.
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
  bookstore: ["New & Used Books", "Author Events & Readings", "Special Orders"],
  florist: ["Bouquets & Arrangements", "Weddings & Events", "Same-Day Delivery"],
  jewelry: ["Custom Design", "Repairs & Resizing", "Fine Watches & Gifts"],
  brewery: ["Taproom Pours", "Growler Fills", "Private Events"],
  wine: ["Tastings & Flights", "Curated Wine Club", "Private Events"],
  distillery: ["Tastings", "Bottle Shop", "Private Tours"],
  hotel: ["Room Bookings", "Events & Meetings", "Weekend Packages"],
  grocery: ["Fresh Produce & Meat", "Prepared Meals", "Local Delivery"],
  hardware: ["Tools & Supplies", "Lumber & Building", "Expert Advice"],
  florist_weddings: ["Wedding Flowers", "Arrangements", "Delivery"],
  moving: ["Local Moves", "Long-Distance", "Packing Service"],
  storage: ["Climate-Controlled Units", "Short-Term Rental", "Vehicle Storage"],
  printing: ["Business Printing", "Signage & Banners", "Rush Orders"],
  staffing: ["Temp & Temp-to-Hire", "Direct Placement", "Executive Search"],
  accounting: ["Tax Preparation", "Bookkeeping", "Advisory Services"],
  marketing: ["Strategy & Branding", "Campaign Execution", "Analytics & Reporting"],
  nonprofit: ["Donate", "Volunteer", "Upcoming Events"],
  photography_studio: ["Portrait Sessions", "Events & Weddings", "Commercial Work"],
  gym: ["Memberships", "Group Classes", "Personal Training"],
  real_estate: ["Buy", "Sell", "Market Analysis"],
  law: ["Free Consultation", "Case Representation", "Document Review"],
  dental: ["General Dentistry", "Cosmetic Dentistry", "Emergency Care"],
  medical: ["Primary Care", "Preventive Wellness", "Urgent Care Visits"],
  roofing: ["Roof Replacement", "Storm Damage Repair", "Free Inspections"],
  landscaping: ["Lawn Maintenance", "Design & Install", "Seasonal Cleanup"],
  cleaning: ["One-Time Clean", "Recurring Service", "Deep & Move-Out"],
  fitness: ["Personal Training", "Group Classes", "Nutrition Coaching"],
  hvac: ["AC Installation & Repair", "Heating & Furnace Service", "Preventive Maintenance"],
  beauty: ["Haircut & Styling", "Color & Highlights", "Special Occasion Packages"],
  insurance: ["Auto & Home", "Business Insurance", "Life & Health"],
  financial: ["Financial Planning", "Insurance Review", "Tax Strategy"],
  restaurant: ["Dine-In", "Takeout & Delivery", "Catering & Events"],
  auto_repair: ["Oil Change & Tune-Up", "Brake Service", "Full Diagnostics"],
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
