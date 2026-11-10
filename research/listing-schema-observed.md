# Exit-Ready — Observed Listing & Valuation Schema

**Method:** BrowserOS neo public-page observation (read-only). No auth bypass, no private data,
no proprietary code/assets copied. Sources below are public marketing/listing pages used as
*pattern references* for field structure only.

**Observation date:** 2026-11-09 (Asia/Manila)

---

## Source A — BizBuySell (US) `bizbuysell.com`

### A1. Home / category structure (observed)
- Nav: Buy a Business / Buy a Franchise / Sell a Business / Tools & Advice / Business Brokers
- Search: free-text location ("Search City, County or State") + "All Industries" filter
- Category taxonomy is **location + industry** path-based:
  `/california/restaurants-and-food-businesses-for-sale/`
- Homepage sections observed: Top Business Categories, Sell Your Business Online,
  Featured Businesses, Spotlight Franchises (ads), Top Brokers, Recent Listings,
  SBA Loan Eligible Listings, Recent Sold Businesses (with sold price).
- Claimed scale (their marketing, not verified): 200,000+ successful sales, 120,000 listings/yr,
  20m monthly page views, 4m visits/month.

**Design takeaway:** taxonomy = geography × industry; there is an explicit **"SBA Loan Eligible"**
badge and a **"Recent Sold"** surface with realized prices. Both are trust signals Exit-Ready
should mirror (financing-ready badge; closed-deal comparables).

### A2. Valuation tool fields (observed at `/BizWorth-Business-Valuation/`)
| Field | Type | Options / notes |
|---|---|---|
| Business Country | select | United States, Canada |
| Business Zip Code | text | |
| Search Industry | text | free text |
| Annual Revenue | text | |
| Annual Cash Flow (SDE) | text | SDE = seller's discretionary earnings |
| Role | select | Business Owner, Business Broker, Franchisor, Business Buyer, Lender, CPA/Accountant, Attorney, Other |
| Timeframe for Sale? | select | Now!, 1-3 months, 4-6 months, 6+ months, Not Sure If I Want To Sell |

**Design takeaway:** the minimum viable input set for an indicative valuation is
**country + location + industry + revenue + SDE + role + timeframe**. `Role` and `Timeframe`
are lead-qualification fields, not valuation inputs — they segment intent. Steal this.

### A3. Listing detail fields (observed on a live listing)
**Header block**
- Title, Location (city, state, county)
- Asking Price
- Cash Flow (SDE)
- EBITDA (may be "Not Disclosed")
- Gross Revenue
- Established (year)

**Narrative**
- Business Description
- Business Highlights (bulleted; monthly gross sales, monthly net income)
- Rent + NNN, Size (SF), Lease Term, Hours of Operation, Staffing, Payroll
- Seller motivation line ("seller is motivated due to personal reasons and is willing to
  provide transition support")
- Broker/Office ID, Ad# (listing identifier)

**Detailed Information**
| Field | Example observed |
|---|---|
| Inventory | $5,000 — *"Not included in asking price"* |
| Employees | 4 Part-time |
| Reason for Selling | Personal |
| Franchise | "This business is an established franchise" |

**Business Location**
| Field | Example observed |
|---|---|
| Location | Los Angeles, CA |
| Real Estate | Leased |
| Building SF | 792 |
| Lease Expiration | 03/31/2028 |

**Design takeaway — the canonical listing object.** Fields present on every real listing:
price, cash flow/SDE, gross revenue, established year, employees, reason for selling,
real-estate status, lease expiry, inventory handling. Note the **inventory inclusion flag**
("not included in asking price") — a small field that causes huge post-offer disputes.
Exit-Ready should make it a first-class, required field.

---

## Source B — RightBiz (UK) `rightbiz.co.uk`
- Returned **HTTP 403 (Cloudflare challenge)** on public navigation. No data captured.
- **Decision:** UK schema differences will be treated as design decisions, not observed facts.
  Flagged as an open research item (see `open-questions.md`).

## Source C — `businessforsale.ph`
- Domain redirected to an unrelated parking/ad-spam destination. **Unusable.** Discarded.
- **Decision:** PH localization is a design decision pending a real source.

---

## What we observed vs. what we decided

| Item | Status |
|---|---|
| US listing field set | **Observed** (BizBuySell listing detail) |
| US valuation input set | **Observed** (BizWorth form) |
| US taxonomy (geo × industry) | **Observed** |
| SBA-eligible badge, sold-price surface | **Observed** |
| UK field differences | **Unresolved** — blocked by 403 |
| PH field differences, peso/deposit norms | **Unresolved** — no valid source yet |

## Gap analysis — where Exit-Ready wins

Observed weaknesses in the incumbent pattern:
1. **No structured buyer verification.** Listings are public; inquiry is a lead form. Nothing
   proves a buyer can actually close.
2. **NDA/data-room gating is opaque.** Financial detail is behind broker contact, not a
   standardized gate.
3. **No handoff object.** "Willing to provide transition support" is a *sentence in prose*,
   not a milestone-tracked deliverable.
4. **Inventory/lease/assets ambiguity** is disclosed in prose, causing post-offer disputes.
5. **No successor-type matching.** Nothing distinguishes an employee buyout from an
   outside buyer, despite very different deal structures (earn-out vs. cash+loan).

**Exit-Ready wedge:** keep the familiar listing object, then add the four things the
incumbent pattern omits — **verified buyer**, **standardized NDA gate**, **milestone-tracked
handoff**, and **successor-type matching** (employee / local operator / first-time buyer).
