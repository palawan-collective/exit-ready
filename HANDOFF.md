# Exit-Ready — Developer Handoff

**Version:** prototype, feature-complete on the two core loops
**Repo:** `C:\dev\exit-ready`, git, branch `main`, no remote
**Last commit:** `3c83817` — homepage redesign
**Verified:** 13 pages, zero console errors; 119 assertions across 4 suites

---

## 1. What this is

A business-for-sale marketplace for retiring small-business owners. Sellers list; buyers are
verified; a 12-milestone handoff plan carries the deal from letter of intent to final payment.

The three things that make it different from BizBuySell / BusinessesForSale: **verified buyers**,
**an automatically generated exit pack**, and **a milestone-tracked handoff**. Empire Flippers does
all three by hand at broker cost; we do them in software.

Markets: US, UK, Philippines. Wedge: asset-light main-street and online services.

## 2. How to run it

```bash
cd C:/dev/exit-ready/site
npx http-server -p 4174 -c-1 .
```

Open <http://localhost:4174/index.html>.

No build step, no framework, no dependencies, no bundler. Plain ES modules served as static files.
**Do not use `npx serve`** — its clean-URL redirect strips the query string, which breaks
`listing.html?id=…`.

### Tests

```bash
node tests/tracker.test.mjs      # 22 — handoff milestone state rules
node tests/verification.test.mjs # 59 — readiness scoring and validation
node tests/package.test.mjs      # 38 — listing packaging, valuation, matching
node tests/scripts.test.mjs      # 11 — parses every inline page module, resolves every import
```

All pure Node, no runner. `scripts.test.mjs` is the one that catches a broken page after an edit.

## 3. Architecture

```
site/
  index  browse  listing  sell  verify  offer  loi  messages  deal
  dashboard  pricing  how-it-works  handoff   ← 13 pages, each self-contained
  role.js                                 ← mock role switch (no auth)
  styles.css                              ← the whole design system
  data/
    listings.js      sample data: 6 listings, regions, successor types, disclosure flags,
                     handoff template, sample buyers
    store.js         THE seam. One localStorage state object + sync API. The pages call
                     this and nothing else. Swap it for an API client and the app is remote.
    package.js       automation: form → listing, exit-pack generation, indicative
                     valuation, buyer↔listing matching
    verification.js  readiness scoring (5 factors, 100 pts), validation, form mapping
    tracker.js       milestone state rules: sign-off, ownership, timestamps
    db.js            Supabase client + every remote call
    config.js        Supabase URL + publishable key
    format.js        money, dates, HTML-escape
```

**The one design decision that matters:** `store.js` exposes a *synchronous* API so the pages stay
plain DOM code. Remote persistence hangs off it in `db.js`. The read path is in-memory state filled
by `store.ready()`; writes apply locally and mirror to Supabase when a session exists.

### There is no auth

Role selection is a mock toggle in the masthead, stored in `localStorage` under
`exit-ready-role` (`buyer` | `owner`). `site/role.js` handles it on every page. Which side you are
is derived: `owner` role **and** a listing you created = seller; everything else = buyer. That
derivation lives in `deal.html` (`ME`), `offer.html` (`VERIFIED`), `listing.html` (`isOwn`).

A real sign-in page and a full Supabase schema were built and then **deliberately removed** on the
owner's instruction — the product is meant to be demonstrable without accounts. The schema and
`db.js` remain in the repo and still work; nothing in the page flows calls them.

## 4. Data model (localStorage, key `exit-ready:state:v1`)

```
user           { role, name, email }
listings[]     the canonical listing object (see listings.js); one user-created per addListing()
verification   { owner: {...}, buyer: {...} }   buyer carries industry / max_price / persona
deals{listingId} {
                 nda: { signed, signer, at }
                 offer: { amount, deposit, funding, timeline, conditions, message,
                          status: sent|active|declined|withdrawn|cancelled, at, decidedAt }
                 milestones: { <id>: { status, owner, due, evidence, seller, buyer,
                                       completed_at } }
                 thread: [ { from: 'buyer'|'owner', name, text, at } ]
               }
saved[]        listing ids
alertsSeenAt   ISO timestamp — the "since your last visit" cursor
```

`store.js` is the only module that reads and writes this. Never touch `localStorage` directly from
a page.

## 5. The two loops

**Seller** — dashboard → verify (identity, business, authority) → create listing (auto exit pack +
indicative range + disclosure flags) → publish → matched buyers arrive → my-buyers roster →
reply → accept/decline → active deal → handoff tracker → letter of intent.
Listings can be unpublished, duplicated, marked sold, deleted.

**Buyer** — browse → search → filter → listing → one-click NDA unlocks owner details and monthly
figures → verify (readiness score) → offer → withdraw if needed → message → tracker → LOI.
Cannot offer without verifying.

**Both sides share:** the message thread per listing, the deal record, activity alerts.

## 6. Business rules that are enforced in code

| Rule | Where |
|---|---|
| A milestone cannot be `done` until **both** sides sign off | `tracker.js` `applyStatus` |
| Only the assigned side (or `joint`) can change a milestone | `deal.html` `canMove` |
| Only your own sign-off checkbox is enabled | `deal.html` sign block |
| Unverified buyers cannot reach the offer form | `offer.html` |
| Unpublishing a live listing cancels its open deals | `dashboard.html` |
| Draft listings are invisible to buyers | `store.js` / browse filters |
| A funding path only counts when how + deposit + timeline are all stated | `verification.js` |
| Price filters only apply when one region is selected (three currencies) | `browse.html` |

## 7. Design system

Token-based, in `styles.css` `:root`. Surfaces, ink, rules, signal colours, a type scale
(`--step--1` … `--step-5`), and a space scale (`--s-1` … `--s-9`). Nothing past the token block uses
a literal colour or font.

Key components: `.hero--band` (full-bleed inverse hero with `.hero__search`), `.card` with
`.cover` (per-industry generated covers — there is no photography anywhere, by design),
`.panel`, `.deftable`, `.track` (milestone list), `.dash__num`/`.dash__label` (stat tiles),
`.notice--info/warn`, `.role-switch`.

## 8. Known gaps

| # | Gap | Impact |
|---|---|---|
| 1 | **No shared data.** Every browser is its own island. The Supabase schema and `db.js` exist but are not wired into the flows. | **The blocker.** Two people cannot see the same listing. |
| 2 | **No real auth.** Roles are a mock toggle. | Follows from #1. |
| 3 | **No email.** Alerts are in-browser only. | Buyers and sellers must be on the site to see anything. |
| 4 | **No admin console.** Brand, sections, copy, images need code to change. | `site_settings` table exists with no UI. |
| 5 | **No file uploads.** No listing photos, no documents. | The covers are generated graphics, not photography. |
| 6 | **No payments, real ID verification, e-signature, or escrow.** | No revenue path wired. |
| 7 | **`schema/` is empty**; the canonical listing object lives in `spec/product-spec.md` §4. | Cosmetic. |
| 8 | **UK and PH conventions are unobserved.** RightBiz returned 403, businessforsale.ph parked. | Fields are design decisions, not facts. Flippa was Cloudflare-blocked. |

## 9. Suggested order of work

1. **Wire `db.js` into the flows** — make `store.js`'s write path call Supabase, and `ready()` pull
   on load. Everything downstream depends on this. `store.js` is already the only seam.
2. **Real auth + roles** — a sign-in page that sets `state.user` and signs into Supabase.
3. **File upload** — Supabase Storage; listing covers become real photos.
4. **Email** — verification, new-match alerts, offer notifications.
5. **Admin console** — surface the existing `site_settings` table.
6. **Payments** — Stripe for buyer membership, exit-prep packs, success fee.

## 10. Things that will trip you up

- **`store.ready()` must never block a render.** It returns immediately when there is no cached
  Supabase session and times out otherwise. This was a real bug — a hanging network call stopped
  parts of the homepage from rendering. Do not "simplify" the fast path away.
- **Role is derived, not stored per-listing.** `ME` in `deal.html` decides which side you are. If
  you add a third role, that derivation is the thing to revisit.
- **The `.mjs` page scripts are inline.** `scripts.test.mjs` extracts and parses them. A typo in an
  inline module will not fail any other test — run that one after every page edit.
- **Sample data lives in `listings.js`.** Anything not in `state.listings` is a sample and will
  persist across resets. User-created listings are `sample: false`.
- **`research/competitor-patterns.md`** records what was observed from BizBuySell, Acquire.com,
  Empire Flippers and BusinessesForSale, and what is still unresolved.