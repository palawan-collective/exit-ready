# Exit-Ready — working prototype

A marketplace for retiring owners to sell their business to a verified successor
(employee, local operator, or first-time buyer), with a milestone-tracked handoff.

**Launch regions:** US + UK + Philippines
**Business types (wedge):** asset-light main-street & online services
**Buyer personas:** employee buyout / local operator / first-time buyer

---

## Status: working prototype

Everything here runs locally with no build step and no backend. **All listings are
sample data** — invented names, figures and locations used to exercise the layout.
Nothing is a real business. Replace before any public use.

## Run it

```
cd site
npx http-server -p 4174 -c-1 .
```

Then open <http://localhost:4174/index.html>.

**Do not use `npx serve`.** Its clean-URL redirect strips the query string, which
breaks `listing.html?id=...`. `http-server` serves the files as-is.

## Test

```
node tests/tracker.test.mjs
node tests/verification.test.mjs
```

22 assertions on the handoff tracker state logic and 46 on verification and readiness scoring.
No dependencies, no test runner.

## Pages

| File | What it is |
|---|---|
| `index.html` | Landing. Hero, the four differentiators, sample listings, successor types |
| `browse.html` | All listings with working filters: region, industry, successor type, price, sort |
| `listing.html` | Listing detail. Figures, disclosure flags, operations, handoff plan, buyer readiness |
| `sell.html` | Create-listing form. Live preview, indicative range, validation, disclosure flags |
| `verify.html` | Verification for both sides. Buyers get a readiness score with a breakdown; sellers confirm identity, business existence and authority to sell |
| `how-it-works.html` | The six stages, what verification checks, the NDA gate, pricing, regions |
| `handoff.html` | The twelve milestones and how they adapt per successor type |
| `deal.html` | Interactive handoff tracker for one listing. Status, owner, due date, evidence note and two-sided sign-off, stored in `localStorage` |

## Files

| File | Role |
|---|---|
| `styles.css` | All styling. Tokens at `:root`, no literal colours or fonts past that block |
| `data/listings.js` | Sample listings, regions, successor types, disclosure flags, handoff template, sample buyers |
| `data/format.js` | Currency, compact money, date, and HTML-escape helpers |
| `data/tracker.js` | Handoff tracker state logic — pure functions, no DOM. The rules for status, sign-off and counts |
| `data/verification.js` | Verification rules and readiness scoring — pure functions, no DOM. Weights, validation, form mapping |

## The differentiators (what makes this not another classifieds site)

1. **Buyer readiness score** — identity, funding path, NDA, prior ownership, references.
   Visible to the seller before anything is released.
2. **NDA gate** — deal shape public; financial detail behind one standard agreement,
   every signature and release timestamped.
3. **Handoff plan** — twelve milestones, both sides sign off. Adapts by successor type.
4. **Disclosure flags** — required and timestamped, including the always-on
   unaudited-financials flag and the explicit inventory-inclusion flag.

## Guardrails

Exit-Ready is a marketplace and tooling provider. **Not** a broker, **not** a
valuation provider, **not** a financial/legal/tax adviser. Every figure is
owner-reported and unaudited. Regulated steps route to licensed professionals.
These statements are carried on every page footer.

## Known limitations

- No backend. Nothing submits or persists. Form data stays in the browser.
- The price filter requires a region, because listings use three currencies and
  raw numbers are not comparable. The result line says so rather than lying.
- UK and PH listing conventions were **not** observed from a live source
  (RightBiz returned 403; businessforsale.ph redirected to a parked domain).
  UK and PH fields are design decisions, flagged in
  `../research/listing-schema-observed.md`.
- Photos are absent by choice. No stock imagery was used and no logo was invented.

## Verified

- All 5 pages render, zero console errors
- Listing detail resolves `?id=` and loads the correct region's currency (₱ / £ / $)
- Browse filters work: region, industry, successor, sort, reset
- Sell form validation blocks incomplete submissions with field-level errors,
  passes when complete, and computes an indicative range from SDE multiples
- Primary buttons 7.19:1 contrast, muted text 6.08:1, ghost buttons 17.24:1
- Zero horizontal overflow; responsive breakpoints at 760 / 940 / 1000 / 1080
