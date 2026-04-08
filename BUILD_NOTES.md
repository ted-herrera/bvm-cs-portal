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
