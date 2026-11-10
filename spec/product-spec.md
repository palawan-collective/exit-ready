# Exit-Ready — Product Spec v0.1

**One-liner:** The marketplace where retiring owners sell to verified successors — employees,
local operators, and first-time buyers — with a structured, milestone-tracked handoff.

**Regions at launch:** US + UK + Philippines
**Business types (wedge):** asset-light main-street & online services
(salons, cafés/food, clinics, trades, small e-com, agencies). Expands to all types later.
**Buyer personas:** employee buyout / local operator / first-time (outside) buyer.

---

## 1. The problem

Owners are retiring. Their kids don't want the business. Today they face:
- Classifieds full of tire-kickers and no verification
- Brokers taking large commissions with slow, opaque processes
- Buyers who can't prove they can close
- "Transition support" promised verbally and never delivered

## 2. The core loop

```
 List  →  Exit Pack  →  Verify  →  NDA  →  Offer  →  Milestone Handoff
 (owner)  (indicative)  (both)    (gate)  (deal)     (escrow-style)
```

Every state transition is recorded. That record is the product.

## 3. What we build that incumbents don't

Observed gaps (see `research/listing-schema-observed.md`):

| # | Gap in incumbent pattern | Exit-Ready feature |
|---|---|---|
| 1 | No structured buyer verification | **Readiness Score** — buyer attestation + funding path, visible to seller |
| 2 | NDA gating is opaque/broker-manual | **Standard NDA gate** — one click, tracked, auto-logged |
| 3 | Handoff is prose, not deliverable | **Handoff Plan** — milestone checklist both sides sign off |
| 4 | Inventory/lease ambiguity | **Disclosure flags** — required, explicit, timestamped |
| 5 | No successor-type matching | **Successor Match** — employee / local / first-time routing |

## 4. Listing object (canonical)

Derived from observed public listing structure.

### Required — Basics
- `business_name`, `tagline`
- `country` (US | UK | PH), `city`, `region`
- `industry` (taxonomy), `established_year`
- `reason_for_selling` (free text + category)
- `successor_types_wanted[]` — employee | local_operator | first_time | any

### Required — Financials (KPIs)
- `asking_price` (local currency)
- `gross_revenue` (annual)
- `cash_flow_sde` (annual)
- `ebitda` (optional, `not_disclosed` allowed)
- `inventory_amount` + **`inventory_included_in_price` (boolean — required)**
- `financing_ready` (boolean) — mirrors incumbent "SBA eligible" badge

### Required — Operations
- `employees_count`, `employee_type` (full/part/mixed)
- `real_estate_status` (leased | owned | home_based | none)
- `building_sf` (if premises)
- `lease_expiration` (if leased)
- `monthly_rent` + `nnn` (if leased)
- `hours_of_operation`
- `monthly_payroll`

### Required — Narrative
- `description`
- `highlights[]` (bullets)

### Exit-Ready additions
- `disclosure_flags[]` — explicit acknowledgements (see §5)
- `handoff_plan` — milestones (see §6)
- `exit_pack` — generated summary + indicative range

## 5. Disclosure flags (required, timestamped)

Addresses the "inventory not included in asking price" class of post-offer dispute.

- `inventory_excluded`
- `lease_transfer_required`
- `owner_is_key_person` (business depends on owner's relationships/skills)
- `pending_litigation`
- `equipment_deferred_maintenance`
- `staff_retention_risk`
- `licence_transfer_required` (liquor, clinic, etc.)
- `financials_unaudited` — **the honest default, always shown**

Each flag: `acknowledged_by_owner: true`, `acknowledged_at`.

## 6. Handoff Plan (the differentiator)

A tracked checklist, not a promise. Template per successor type.

**Common milestones**
1. Letter of intent signed
2. NDA executed
3. Financial verification window opened
4. Offer accepted
5. Deposit / escrow funded
6. Supplier & landlord consent obtained
7. Licence/permit transfer initiated
8. Staff notified & retention confirmed
9. Training period (owner → successor) — `days`
10. Handover of accounts & credentials
11. Final payment / balance release
12. Post-sale support window — `days`

Each milestone: `status` (pending | in_progress | done | blocked), `due_date`,
`completed_at`, `evidence_note`.

**Earn-out / seller-finance friendly:** milestones 5 and 11 support staged payments;
`seller_financing_offered` and `earn_out_offered` are listing fields.

## 7. Verification

| Party | What we verify | How |
|---|---|---|
| Owner | Identity, business existence, contact | Document upload + attestation (v1: manual review) |
| Buyer | Identity, funding path, readiness | Attestation + funding-path declaration → **Readiness Score** |

**Readiness Score inputs:** funding path declared, deposit capacity, timeline, prior ownership
experience, NDA signed, references provided.

**Guardrail:** Exit-Ready is a *marketplace and tooling provider*. We are **not** a broker,
not a licensed valuation provider, and not a financial advisor. All valuation figures are
**indicative ranges**, clearly labelled. Regulated steps route to licensed partners.

## 8. Monetization

| Tier | Price (indicative) | Includes |
|---|---|---|
| Free listing | $0 | Public listing, limited fields, no exit pack |
| Exit-Prep Pack | one-time fee (per region) | Full fields, generated exit pack, indicative range, handoff template |
| Exit-Ready Pro | monthly | Verified badge, buyer Readiness Scores, NDA gate, Handoff Plan tracking |
| Success fee | % on closed deal | Below typical broker commission; charged on completed handoff |
| Referrals | referral fee | Lenders, accountants, attorneys, escrow partners |

## 9. Regional notes

| Region | Currency | Notes |
|---|---|---|
| US | USD | SBA-style financing language; state-level licence transfers |
| UK | GBP | Leasehold/freehold distinction matters; different licence regime |
| PH | PHP | DTI/Mayor's permit transfer, informal financials more common — **`financials_unaudited` flag will be the norm, by design** |

**Compliance note:** We make no BIR or government certification claims. Tax/regulatory
handling is flagged as *planned*, never *certified*.

## 10. Build order

1. ✅ Research & schema (done)
2. Listing + browse + detail pages (static-first, real data shapes)
3. Create-listing flow with disclosure flags
4. Handoff Plan tracker
5. Verification + Readiness Score
6. Monetization wiring (Stripe later)

## 11. Open questions

- UK leasehold/freehold field requirements — blocked by 403 on source; needs alternate research
- PH listing convention (deposit, "assume balance" norms) — no valid source yet
- Which region first for the concierge pilot
