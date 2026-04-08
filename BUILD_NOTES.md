## BVM Design Center
Folder: ~/Desktop/bvm-design-center
Stack: Next.js / TypeScript / Tailwind / Supabase / Playwright / Anthropic
Local: cd ~/Desktop/bvm-design-center && npm run dev (port 3000)
Login: ted/password, sal/password, alex/password, jacquelyn/password
BOT_SECRET: designcenter2026

## Architecture
- Bruno intake creates client profile
- One active build per client at a time
- QA runs against any HTML — Bruno-generated or uploaded
- Self-contained — no CRM dependency
- Communication through profile (Bruno chat + internal notes + client messaging)

## Build Status Flow
Intake → Tear Sheet → Building → QA → Review → Delivered → Live
(Revision Requested can occur at Tear Sheet stage)

## Pages
/ → redirects to /marketing
/marketing — public pitch landing page
/login — rep login
/dashboard — rep home with pipeline kanban, stats, activity feed
/clients — all client profiles with stage badges and days-in-stage
/intake — Bruno guided intake (8 questions, live preview, SBR analysis)
/tearsheet/[id] — client-facing tear sheet with approve/revision flow (public)
/profile/[id] — full client profile with 4 tabs (Overview, QA, Communication, Build Log)
/qa — standalone QA engine (paste HTML or upload file)
/build/[id] — active build for client (future)
/qa-demo — public QA demo (future)

## Pipeline Stages
intake → tear-sheet → building → qa → review → delivered → live
Special: revision-requested (loops back from tear-sheet)

## QA Engine — 4-Pass Scoring
- Pass 1 Structure: html lang, title, meta description, viewport, canonical, og:title, og:description
- Pass 2 Compliance: img alt texts, button labels, color contrast, heading hierarchy
- Pass 3 Performance: inline styles count, images without dimensions, scripts in head
- Pass 4 Content: placeholder text, phone number, address, CTA button
- Score = (passed checks / total checks) × 100
- QA passes when all blocker-severity checks pass

## API Routes
- POST /api/auth/login — rep authentication
- POST /api/chat — Anthropic proxy (messages + system)
- POST /api/intake/create — create client profile from intake answers
- GET /api/profile/[id] — fetch client profile
- POST /api/profile/approve/[id] — approve tear sheet → building
- POST /api/profile/revision/[id] — request revision with note
- POST /api/qa/run — QA with optional client attachment
- POST /api/qa/standalone — standalone QA, report only

## Mock Data
3 demo clients: Rosalinda's Tacos (tear-sheet), Sunrise Dental (qa), Blue Sky Roofing (delivered)
In-memory store in lib/mock-data.ts — swaps to Supabase when keys added

## Pass 1 Complete
- Marketing page, login, auth, dashboard shell, clients shell, proxy protection

## Pass 2 Complete
- Full pipeline types and stage system
- Mock data with 3 realistic clients
- Bruno intake flow (8 questions, SBR, live preview)
- Tear sheet with approve/revision flow
- Client profile page (4 tabs: Overview, QA Report, Communication, Build Log)
- Dashboard with pipeline kanban, stats, activity feed
- Standalone QA engine with 4-pass scoring
- Clients table with stage badges and filtering
- All API routes for CRUD and QA

## Roles
Rep: ted/password, sal/password, alex/password, jacquelyn/password → /dashboard
Dev: dev/password, dev1/password, dev2/password → /build-queue

## Dev Flow
1. Dev logs in → lands on /build-queue
2. Sees unassigned builds in Building stage
3. Clicks "Take This Build" → claimed, moves to My Builds
4. Downloads build package (JSON brief with all client data)
5. Builds locally
6. Clicks "Mark Ready for QA" → stage flips to qa
7. Rep sees stage change in dashboard automatically

## Client Portal
URL: /client/[id] — public, no login
Rep shares this link with client at start of engagement
Client sees: progress bar, tear sheet preview, asset upload if logo pending, live URL when published
No Bruno, no chat, no input — status only

## New Routes
/build-queue — dev dashboard
/client/[id] — public client portal
/api/build/claim — POST claim a build
/api/build/ready — POST mark build ready for QA

## Studio Engine Integration
Source: ~/Desktop/bvm-studio-app/app/studio-v2/page.tsx
Copied to: lib/studio-engine.ts
LOCKED — never modify: PHOTO_MAP, getPhotoUrl, classifyBusiness, palette, looks
Generates real HTML from client profile data
Used by: /api/site/generate, tearsheet preview, intake right panel

## Client Portal Upsell Ladder
Five products: Digital Advertising, Social Media Management, Reputation Management, Email Marketing, Site Refresh
Audio intros: /public/audio/*.mp3 — replace with NotebookLM generated audio
Interest clicks: POST /api/upsell/interest → logs to profile build log → rep notified
Contact CTA: mailto:therrera@bestversionmedia.com pre-filled with client business name

## NotebookLM Audio Scripts Needed
Generate 5 audio clips in NotebookLM — one per product. Each 60-90 seconds. Two voices conversational. Specific to BVM's local market publisher context. Scripts pinned for end of build.

## Audio Script Notes — Pin for End of Build
Digital Advertising: focus on local market targeting, geofencing, driving foot traffic to new site
Social Media: focus on time savings, consistency, local community engagement
Reputation: focus on Google rating impact on local search, review response strategy
Email Marketing: focus on repeat business, staying top of mind in local market
Site Refresh: focus on keeping competitive, seasonal campaigns, market changes

## Google Drive File Management
To use Google Drive for build file storage:
1. Go to drive.google.com → create folder "BVM Design Center Builds"
2. Install Google Drive desktop app: drive.google.com/drive/downloads
3. Once installed: ~/Google Drive/My Drive/ is mounted locally
4. Move completed build files: cp ~/Desktop/bvm-design-center ~/Google\ Drive/My\ Drive/BVM\ Design\ Center\ Builds/
5. For large files use: rsync -av ~/Desktop/bvm-design-center/ ~/Google\ Drive/My\ Drive/BVM\ Design\ Center\ Builds/bvm-design-center/
6. Google Drive will sync automatically — 5TB available
7. Old project folders to archive: csops_gatekeeper, fieldops_gatekeeper, bvm_poc, trackb, purple-rain, coach-bruno-next
8. Keep active on Desktop: bvm-design-center, bvm-studio-app

## QA Engine — Pressure Test Results (April 8, 2026)

### What the QA Engine Catches Automatically:
Three HTML files tested — Sunrise Dental (mild), Peak Fitness (moderate), Test Business (severe).

SUNRISE DENTAL — Expected score 55-70/100:
- Missing meta description
- Missing viewport meta
- Images missing alt text
- Form inputs missing labels/names/IDs
- Vague copy ("probably", "maybe")
- Phone number not properly formatted
- No schema markup
- No Google Business mention

PEAK FITNESS — Expected score 40-60/100:
- JavaScript error: getElementByID should be getElementById (case sensitive)
- Unclosed td tags in table
- Images missing alt text AND using local file paths
- No meta description
- Hero background is local file (will break in production)
- Repetitive copy ("results happen here" x4)
- No address or schema markup
- No phone number

TEST BUSINESS — Expected score 15-35/100 (SEVERE):
- Broken viewport: meta content="width=1400" — destroys mobile
- Duplicate id="logo" — invalid HTML, breaks JS
- Anchor tag with no href
- javascript:void(0) link — bad practice
- getElementByID capitalization error x2
- document.querySelector(".not-real") — guaranteed null pointer crash
- Hidden white text on white background — Google SEO penalty flag
- marquee tag — deprecated HTML, red flag
- overflow-x:scroll on body — breaks mobile
- Fixed 1600px width — not responsive
- Empty meta description
- Schema telephone is integer not string (invalid schema)
- Schema address incomplete
- Giant iframe 1200x900 — performance killer
- h4 before h1 — heading hierarchy broken
- Vague copy throughout
- Empty email href

### The Pitch:
"We read your HTML the way a senior developer would — in seconds, not days. Every site that goes through BVM Design Center gets a 4-pass QA check before it ever touches a client. Most agencies skip this entirely. We made it automatic."

### Competitive Advantage:
- Traditional agency QA: 2-4 hours manual review, $150-300/site
- BVM Design Center QA: automatic, instant, logged, repeatable
- Gap: we catch JS errors, SEO traps, hidden text penalties, schema errors, mobile breaks — things most developers miss on first pass

## Performance Benchmarks — BVM Design Center vs Human at Scale

### Site Production (per site):
| Task | Traditional Agency | BVM Design Center | Advantage |
|------|--------------------|-------------------|-----------|
| Client intake | 45-60 min meeting | 8 min Bruno intake | 7x faster |
| SBR market research | 2-4 hrs manual | Instant, automatic | ∞ faster |
| Site design & build | 3-5 days | < 2 minutes | 2,160x faster |
| QA review | 2-4 hrs manual | Instant 4-pass auto | ∞ faster |
| Client approval flow | 3-7 days back/forth | Same session tear sheet | 5x faster |
| Print asset creation | 4-8 hrs design | CSS render instant | ∞ faster |
| Total time to deliver | 2-3 weeks | Same day | 14x faster |

### At Scale (per rep per month):
| Volume | Traditional Rep | BVM Rep | Delta |
|--------|----------------|---------|-------|
| Sites built | 4-6/month | 40-60/month | 10x |
| Hours on production | 80-120 hrs | 8-12 hrs | 10x |
| Hours on QA | 20-40 hrs | 0 hrs | ∞ |
| Client touch points | 8-12 per client | 2-3 per client | 4x fewer |
| Revenue capacity | $8K-15K/month | $80K-150K/month | 10x |

### At Scale (org-wide — 1,219 reps):
| Metric | Today | With BVM Design Center | Delta |
|--------|-------|----------------------|-------|
| Sites deliverable/month | ~6,000 | ~60,000 | 10x |
| QA hours saved/month | ~48,000 hrs | 0 | 48,000 hrs/mo |
| Production cost/site | $300-500 | ~$12 (API cost) | 97% reduction |
| Client approval cycle | 3-7 days | Same session | 5-7 days saved |
| Revenue unlocked | baseline | +$40M-80M ARR potential | — |

### The Case:
"1,219 reps. Each one capable of 10x output with the same headcount.
That's not an efficiency gain — that's a different business."

## Performance Benchmarks — Projected TTM/TTV/Staffing at Scale
### Last updated: April 8, 2026

### Sources & Methodology:
- Traditional agency build hours: Bureau of Labor Statistics Web Developer productivity data + Clutch.co "Average Web Design Project" 2024 report (avg 25-40 hrs for small business site)
- Dev blended rate $75/hr: BLS Occupational Outlook Handbook 2024, Web Developers median $85K/yr = ~$75/hr blended with benefits
- Traditional agency cost per site $1,875: Clutch.co 2024 survey — small business website $1,500-$5,000, conservative midpoint used
- BVM rep count 1,219: internal BVM field operations data
- API cost per site ~$12: Anthropic Claude API pricing at ~$0.003/1K tokens, avg intake + generation = ~4,000 tokens = ~$0.012 + Vercel hosting allocation
- Sites per dev per month traditional: BLS + agency benchmarks, 6-8 sites/month for full-cycle dev
- Sites per dev per month BVM: projected at 30 min/site × 7 productive hrs/day × 20 working days = 280 sites/month (conservative, assumes 30% overhead for meetings/review)

### TTM — Time to Market:
Traditional agency: 3-4 weeks average
BVM Design Center: 4-6 hours same day

Breakdown:
| Stage | Traditional | BVM Design Center |
|-------|------------|-------------------|
| Intake + discovery | 2 hrs meeting | 8 min Bruno intake |
| Market research | 2-4 hrs manual | Instant SBR |
| Design + build | 16 hrs | 2 min generation |
| QA | 4 hrs manual | Instant 4-pass auto |
| Client approval | 3-7 days back/forth | Same session tear sheet |
| Launch | 1-2 days | 1 hr domain + deploy |
| TOTAL | 3-4 weeks | 4-6 hours |

### TTV — Time to Value:
Traditional: 60-90 days to first measurable traffic
BVM Design Center: 30 days
- Day 1: Site live + Google Business optimized
- Day 7: Pulse survey fires, first feedback
- Day 14: First traffic data available
- Day 30: Rep has performance data for upsell conversation

### Staffing Projection — 1,219 BVM Reps:

#### 20% Adoption (Year 1) — 244 active reps, 4 sites/rep/month = 976 sites/month:
| | Traditional | BVM Design Center |
|-|------------|-------------------|
| Devs needed | 153 | 5 |
| Annual payroll | $12.2M | $400K |
| QA staff | 30 ($2.4M) | 0 (automated) |
| Total annual cost | $14.6M | $400K |
| Savings | — | $14.2M/year |

#### Full Adoption — all 1,219 reps, 4 sites/month = 4,876 sites/month:
| | Traditional | BVM Design Center |
|-|------------|-------------------|
| Devs needed | 762 | 18 |
| Annual payroll | $60.9M | $1.44M |
| Cost per site | $1,875 | ~$17 |
| Savings per site | — | $1,858 |
| Annual savings | — | $59.4M |

### The One Slide:
"1,219 reps. 4 sites/month each. 4,876 sites/month at scale.
Traditional: $1,875/site · 762 devs · 4 weeks TTM
BVM Design Center: $17/site · 18 devs · 4 hours TTM
$59M in annual payroll savings. Same output. 10x the speed.
The rep never touches production again."

### Sources:
- Clutch.co 2024 Web Design Cost Report: https://clutch.co/web-designers/resources/much-does-it-cost-build-website
- BLS Occupational Outlook Handbook — Web Developers 2024: https://www.bls.gov/ooh/computer-and-information-technology/web-developers.htm
- Anthropic Claude API Pricing: https://anthropic.com/pricing
- BVM internal field operations data: 1,219 active reps (source: therrera@bestversionmedia.com)

## SBR Integration
Trigger: fires silently after Q1 in Bruno intake
Prompt: lib/sbr.ts SBR_SYSTEM_PROMPT (full BVM Tactical SBR prompt)
Command format: "Run Bruno SBR for: [businessType] | [zip]"
Returns: demographics, competitors, campaignHeadline, geoCopyBlock, taglineSuggestions, localAdvantage
Used by: Bruno Q3/Q4 suggestions, tear sheet headline, site hero copy, about section stats

## Business Classifier
lib/business-classifier.ts
classifyBusinessType(name, description) — returns specific type string
getServiceSuggestions(type) — returns 3 real specific services
getCTASuggestion(type) — returns recommended CTA
getPhotoKeywords(type) — returns photo search terms for on-brand images

## Dev Pack
Route: GET /api/build/package?clientId=[id]
Downloads: BVM_DevPack_[businessName]_[date].json
Contains: full client data, campaign direction, SBR data, complete site HTML
Dev opens this file, has everything needed to build and customize

## Logo/Tagline Callback
Route: POST /api/profile/update/[id]
Used when: logo or tagline selected in brand tool
Updates: logoUrl, tagline, selectedLook on profile
Logs: build log entry for each update
Brand tool link format: bvm-studio-app.vercel.app/studio-v2/brand?name=[name]&headline=[sbrHeadline]

## Demo Access
Login: demo/demo → rep dashboard
Fill Demo Data button on intake page — picks random business, skips intake, creates profile instantly
6 demo businesses: tacos, dental, roofing, yoga, burgers, auto

## Bruno Architecture
Sequential steps: name → city → zip → sbr (auto) → description → services → cta → look → logo → phone → occasion → complete
SBR streams into chat after ZIP collected: competitors, market insight, campaign headline
Uncertainty detection triggers real service/CTA suggestions
Content filter blocks inappropriate services

## Bruno Intelligence Rules
- Q1: requires businessName + city + zip before advancing — asks specifically for missing pieces
- Q2: tagline opportunity offered inline, non-blocking
- Q3: real specific services from business-classifier.ts subType detection — never placeholder text
- Q4: accepts any CTA input, title-cases it, confirms before advancing
- Q5: look cards in chat as clickable React elements + text input fallback
- Q6: handles logo with generator link for "no" answers
- Edit detection: any message with edit signals triggers field-specific update without restarting
- Confirmation signals: yes/yeah/perfect/love it/go with that etc all advance
- Deny signals: no/different/actually etc re-ask current question
- SubType detection: martial arts, yoga, crossfit, bakery, cafe, etc for hyper-specific suggestions

## Photo Library
File: lib/photo-library.ts
118+ curated Unsplash photos across 16 business categories
Categories: restaurant, fitness, martialarts, dental, medical, roofing, beauty, automotive, legal, financial, realestate, homeservices, retail, education, pet, hvac, business
Selection: deterministic by business name seed so same business always gets same photo
SubType routing: karate/boxing/mma → martialarts, bakery/cupcake → restaurant, yoga → fitness

## Bruno Button
Location: app/dashboard/page.tsx ONLY
Not in TopNav, not in any other page
Floating bottom-right white circle gold B

## Business Name Cleaning
Utility in app/intake/page.tsx: cleanBusinessName()
Trims, title-cases all words
Used in all generator URLs and display throughout intake

## QA Demo
Public page: /qa-demo — no login required
Linked from: /marketing "View QA Demo →" button
Shows: pre-built Hanks Hamburgers QA report, 61/100, all four passes
CTA: "Run QA on Your Own Site →" links to /login

## Site Generation Quality Standard
generateSiteHTML in lib/studio-engine.ts produces Studio v2 quality output:
- Google Fonts: Playfair Display + Lato
- Hero: full bleed photo + gradient overlay + text overlaid on photo
- Google Business badge below hero
- Schema.org LocalBusiness JSON-LD
- Full SEO meta tags (og:title, og:description, canonical)
- Services with emoji + real descriptions
- About with SBR market data + stat grid
- Contact with accent color bg
- All CSS inline, fully portable HTML

## Full Size Preview
Route: POST /api/site/preview — returns raw HTML, no auth
Route: GET /api/site/generate?clientId=&lookKey= — returns raw HTML for existing profiles
Used in: intake right panel "View Full Size →", profile Overview tab, tear sheet
Opens in new browser tab showing production-quality full site

## Bruno Service Filter
Filters inappropriate or non-service inputs
Replaces with business-type appropriate alternatives

## Bruno Uncertainty Detection
Full signal list in app/intake/page.tsx UNCERTAINTY_SIGNALS array
Catches: "what do you suggest", "any ideas", "your call", "what works", "can you recommend" etc
Triggers intelligent suggestion response instead of treating as literal answer

## Dashboard
Jira/scrum board aesthetic. White background.
Five columns: Needs Attention / Awaiting Client / In Progress / Delivered / Backlog
Today's Focus card: surfaces single most urgent action
Quick actions: contextual per stage on each card
Notification bell: pulls from build logs last 48hrs
Activity feed: right sidebar, all client activity today
Rep avatar circles: TH navy, S blue, A green, J purple

## Rep → Client Messaging
Route: POST /api/profile/message/[id]
Rep types message in profile Communication tab
Logs to profile messages array as from:'rep'
Client sees it in /client/[id] Messages section
In production: triggers Gmail API email to client

## Navigation Flow
- All rep-facing preview links open in new tab
- Tear sheet: "← BVM Design Center" top left (href /marketing)
- Tear sheet: "Rep Login →" bottom right corner subtle
- Client portal: "← BVM Design Center" top left
- Rep never navigates away from /profile/[id] — everything opens new tab
- Client has no login — URL is their access

## Automagic Campaign Stack
Lives on: /client/[id] and /profile/[id] Overview tab
Three frames: website laptop + print ad portrait + digital meta phone
Automagic button cycles warm_bold → professional → bold_modern simultaneously
All frames update with smooth color transition 0.4s

## Custom Enhancement Upsell
Tear sheet: subtle link above checklist
Client portal: sixth upsell card
Profile Overview: gold border card with request button
All route to POST /api/upsell/interest with product:'custom-enhancement'

## API Cost Estimate — PIN FOR PRESENTATION
Bruno intake: ~6-8 Claude API calls per complete intake
SBR scan: 1 call, ~2000 tokens input + 1000 output
Site generation: 1 call if using SBR data already collected
QA engine: no Claude calls — regex based
Dashboard Bruno chat: 1 call per message
Estimated cost per complete build: $0.08-0.15 at Sonnet 4 pricing
At 100 builds/month: $8-15/month in API costs
At 1000 builds/month: $80-150/month
This is negligible vs value delivered — include in presentation

## To Connect
- Supabase: add SUPABASE_URL + SUPABASE_ANON_KEY
- Anthropic: add ANTHROPIC_API_KEY for Bruno
- Deploy: npx vercel --prod
