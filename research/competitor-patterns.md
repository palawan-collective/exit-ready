# Exit-Ready — Competitor pattern observations

**Method:** read-only browser observation of public pages. No accounts created, no authentication
bypassed, no code or assets copied. Patterns and field structures only — never proprietary content.
**Date:** 2026-11-10 · BrowserOS neo unavailable, observed through the in-app browser.

## Sources

| Site | Access | Key content captured |
|---|---|---|
| **Acquire.com** | **Full** | Home, `/pricing/`, `/buyers/`, listing URL structure, site index |
| **Empire Flippers** | **Full** | Home, listing card structure, unlock model, blog |
| **BusinessesForSale.com** | **Full** | Home, category/location counts, selling guides, mid-market |
| **BizBuySell** | **Full** | Home, search taxonomy, BizWorth valuation form, listing detail |
| **Flippa** | **Blocked** | Cloudflare interstitial ("Performing security verification"). No data. |

---

## 1. Acquire.com — the product benchmark

**Scale claims (their marketing):** 500k+ entrepreneurs, $500M+ closed deal volume, 2,000+
startups sold, $2B+ in verified buyer funds, 20+ years' experience.
**Legal entity:** "Acquire.com Brokerage Services, Inc., CA DRE # 02167544" — they *are* a
licensed brokerage. We are not, and must not imply that we are.

### Buyer flow (their own words)
- "Tell us your goals and we'll find you matching startups, or filter the marketplace"
- "Filter listings by industry, price, revenue, profit, and more"
- "Get instant notifications of new listings matching your criteria"
- "Unlock acquisition financing with the SBA and other lenders"
- "**Auto-sign NDAs** to get instant access to founder data"
- "Build and send **LOIs and APAs** in minutes"
- "Close safely and securely with Escrow.com"
- Metrics: "financial snapshots and P&L summaries", "revenue, customers, and churn",
  "audience and customer acquisition data"

### Monetization — a two-tier freemium
| Tier | Price | What it unlocks |
|---|---|---|
| Basic | Free | Public listings, browse vetted startups, basic company information |
| Buyer membership | **From $390** | Instant connections to founders, key performance metrics + standardised financials, AI acquisition tools, Acquire Academy, community |

Paid-tier features worth copying: criteria notifications, standardised financials, legal/diligence
/closing tools, LOI and APA generation, direct founder contact.

### Listing URL convention
Headline metrics are embedded in the listing slug, e.g.
`...-2-8m-rev-864k-profit-30-growth`, `...-230k-arr-93-gm-28k-affiliates`,
`...-245k-arr-205k-profit-on-239k-revenue`.

**Takeaway: the metric goes in the title.** "2.8M revenue, 864K profit, 30% growth" is more
persuasive than any tagline.

---

## 2. Empire Flippers — the curated/teaser model

- $607M+ overall sales, 616 weekly NDAs/LOIs signed, $16B claimed verified buyer network.
- **Every listing card shows only: business model, niche, yearly net profit, asking price.**
- "Create a free account and **verify your funds** to unlock listings in your price range,
  including the URL, traffic data and P&L."
- Scarcity: 163 listings total, ~6 new per week.
- Free valuation tool; "This Week in M&A" newsletter (weekly content marketing).

**Takeaway: the teaser.** Public = model, niche, net profit, asking price. Everything else (URL,
traffic, P&L) sits behind an NDA *and* proof of funds. Buyer funds verification doubles as a
price-range entitlement.

---

## 3. BusinessesForSale.com — the global directory

- 52,890 businesses for sale, 130+ countries, 32 staff.
- Homepage surfaces **counts per category and per location** (Cafes 6,974 · Food Businesses
  10,591 · B&Bs 1,014 · Florida 2,948 · Dubai 369 · The Philippines 21).
- Selling guides: Timing the Sale, Using a Broker, Preparation, Valuing, Negotiating, Due Diligence.
- Curated surfaces: "Hidden Gems", "Featured Businesses", "Mid Market Businesses".

**Takeaway: counts are navigation and social proof.** They tell a seller where the demand is and a
buyer where the inventory is.

---

## 4. BizBuySell — the main-street benchmark

Already observed on 2026-11-09 (see `listing-schema-observed.md`). Reinforced:
- 20m monthly page views, 120,000+ listings a year, 200,000+ successful sales.
- Map-based search, geography × industry taxonomy, an explicit **SBA Loan Eligible** badge and a
  **Recent Sold** surface with realised prices.

---

## Where Exit-Ready should beat them

| Pattern | Who does it | What we build |
|---|---|---|
| Metrics in the headline | Acquire.com | Put revenue/profit/growth in the listing title and card |
| Teaser unlock | Empire Flippers | Public card shows model, niche, net profit, asking. URL, traffic and P&L only after NDA **and** funds verification |
| Auto-sign NDA | Acquire.com | One-click standard NDA that unlocks detail instantly and is timestamped |
| LOI + APA generation | Acquire.com | Generate both documents from the listing and the offer terms |
| Criteria alerts | Acquire.com | Buyer states criteria once; gets told the moment a match goes live |
| Freemium buyer tier | Acquire.com | Free browsing; paid tier unlocks metrics, direct contact, documents, alerts |
| Funds verification | Empire Flippers | Buyer declares funding path *and* capacity; unlocks the matching price range |
| Category/location counts | BusinessesForSale | Counts on the home page and browse header |
| Weekly cadence + newsletter | Empire Flippers | New listings published weekly; "This Week in M&A" digest |
| Sold-price comparables | BizBuySell | Show recent closed prices per region and industry |

## What not to copy

- **Their brokerage licence.** Acquire.com and Empire Flippers are licensed brokers. We are a
  marketplace and tooling provider. Never imply brokerage, valuation or advisory status.
- **Their vetting labour.** Empire Flippers' curation is done by people — that is their cost and
  their bottleneck. Ours is automated or it does not scale.
- **Paid-tier gating of *basic* trust.** Only the depth (metrics, documents, direct contact) is
  gated. The disclosure flags, the readiness score and the handoff plan stay free — they are our
  differentiator, not upsell bait.
