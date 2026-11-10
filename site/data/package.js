/* Exit-Ready — listing packaging, indicative valuation and matching.
 *
 * This is the automation layer: turn a form submission into a structured
 * listing, generate the plain-English exit pack, and score how well a buyer
 * matches a listing. Pure functions; the page owns storage and rendering.
 */

import { HANDOFF_TEMPLATE, REGIONS } from './listings.js';

export const MULTIPLES = {
  'Food & Beverage': [1.5, 2.5],
  'Personal Services': [1.2, 2.0],
  'Trades & Services': [1.5, 2.5],
  Healthcare: [2.0, 3.5],
  Retail: [1.2, 2.2],
  eCommerce: [2.0, 3.5],
  'Professional Services': [2.0, 3.5],
  Other: [1.5, 2.5],
};

export const FUNDING_PATH_LABEL = {
  cash: 'Cash',
  loan: 'Bank loan',
  seller: 'Seller financing',
  investor: 'Investor or partner',
  combination: 'Combination',
  other: 'Other',
};

/** Turn the sell-form values into the canonical listing object. */
export function listingFromForm(v) {
  const id = 'er-' + Date.now().toString(36);
  return {
    id,
    sample: false,
    region: v.country || 'US',
    name: (v.business_name || '').trim(),
    tagline: (v.tagline || '').trim(),
    city: (v.city || '').trim(),
    area: (v.area || '').trim(),
    industry: v.industry || 'Other',
    established: v.established ? Number(v.established) : null,
    asking_price: v.asking_price ? Number(v.asking_price) : 0,
    gross_revenue: v.gross_revenue ? Number(v.gross_revenue) : 0,
    cash_flow_sde: v.cash_flow ? Number(v.cash_flow) : 0,
    ebitda: v.ebitda ? Number(v.ebitda) : null,
    inventory_amount: v.inventory ? Number(v.inventory) : 0,
    inventory_included_in_price: v.inventory_included === 'yes',
    financing_ready: Boolean(v.financing_ready),
    employees_count: v.employees ? Number(v.employees) : 0,
    employee_type: v.employee_type || '',
    real_estate_status: v.real_estate || '',
    building_sf: null,
    lease_expiration: v.lease_expiration || null,
    monthly_rent: v.monthly_rent ? Number(v.monthly_rent) : null,
    nnn: null,
    hours: '',
    monthly_payroll: v.monthly_payroll ? Number(v.monthly_payroll) : null,
    reason_for_selling: v.reason || '',
    successor_types_wanted: Array.isArray(v.successor) ? v.successor : (v.successor ? [v.successor] : []),
    seller_financing_offered: Boolean(v.seller_financing),
    earn_out_offered: Boolean(v.earn_out),
    disclosure_flags: ['financials_unaudited', ...(Array.isArray(v.flag) ? v.flag : [])],
    description: (v.description || '').trim(),
    highlights: (v.highlights || '').split('\n').map((s) => s.trim()).filter(Boolean),
    handoff_progress: {},
    owner: {
      name: (v.owner_name || '').trim(),
      email: (v.owner_email || '').trim(),
    },
    createdAt: new Date().toISOString(),
    status: 'draft',
  };
}

/** Indicative valuation range from annual SDE and industry multiples. */
export function indicativeRange(listing) {
  const [lo, hi] = MULTIPLES[listing.industry] || MULTIPLES.Other;
  const sde = listing.cash_flow_sde;
  if (!sde) return null;
  return { low: Math.round(sde * lo), high: Math.round(sde * hi), lowMultiple: lo, highMultiple: hi };
}

function regionLabel(code) {
  return (REGIONS.find((r) => r.code === code) || {}).label || code;
}

/** Plain-English summary generated from the listing. The "exit pack" narrative. */
export function summarizeListing(listing) {
  const where = [listing.city, listing.area].filter(Boolean).join(', ') || regionLabel(listing.region);
  const money = (n) => (n == null ? 'undisclosed' : Number(n).toLocaleString('en-US'));

  const first = `${listing.name} is a ${listing.industry.toLowerCase()} business`
    + `${listing.established ? ` established in ${listing.established}` : ''}`
    + ` in ${where}.`
    + (listing.employees_count
      ? ` It employs ${listing.employees_count} ${listing.employee_type ? listing.employee_type.toLowerCase() : ''} staff.`
      : ' There are no employees.');

  const second = listing.gross_revenue
    ? `The business reports about ${money(listing.gross_revenue)} in annual revenue and roughly`
      + ` ${money(listing.cash_flow_sde)} in annual cash flow (seller's discretionary earnings).`
    : 'Financial figures have not been provided yet.';

  const third = [
    listing.real_estate_status ? `Premises are ${listing.real_estate_status.toLowerCase()}.` : null,
    listing.inventory_amount
      ? `Inventory of about ${money(listing.inventory_amount)} is ${listing.inventory_included_in_price ? 'included' : 'not included'} in the asking price.`
      : null,
    listing.seller_financing_offered ? 'The owner will consider seller financing.' : null,
    listing.earn_out_offered ? 'An earn-out is also possible.' : null,
  ].filter(Boolean).join(' ');

  return [first, second, third].filter(Boolean);
}

/** The full exit pack: narrative, valuation range, and the handoff checklist. */
export function exitPack(listing) {
  return {
    summary: summarizeListing(listing),
    range: indicativeRange(listing),
    checklist: HANDOFF_TEMPLATE.map((m) => ({ id: m.id, label: m.label, done: false })),
    generatedAt: new Date().toISOString(),
  };
}

/** Score how well a buyer matches a listing. 0–100. */
export function matchScore(listing, criteria) {
  if (!criteria) return 0;
  let score = 0;
  let weight = 0;

  if (criteria.region) { weight += 30; if (listing.region === criteria.region) score += 30; }
  if (criteria.industry) { weight += 25; if (listing.industry === criteria.industry) score += 25; }
  if (criteria.maxPrice) {
    weight += 25;
    if (listing.asking_price && listing.asking_price <= criteria.maxPrice) score += 25;
    else if (listing.asking_price) {
      const over = (listing.asking_price - criteria.maxPrice) / criteria.maxPrice;
      if (over <= 0.2) score += 15;
    }
  }
  if (criteria.successorType) {
    weight += 20;
    if (listing.successor_types_wanted.includes(criteria.successorType)
      || listing.successor_types_wanted.includes('any')) score += 20;
  }
  return weight === 0 ? 0 : Math.round((score / weight) * 100);
}

/** Rank listings for a buyer, best first. */
export function recommendedForBuyer(listings, criteria, limit = 6) {
  return listings
    .map((l) => ({ listing: l, score: matchScore(l, criteria) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Rank buyers for a listing, best first. */
export function matchedBuyers(listing, buyers) {
  const regionSymbol = (REGIONS.find((r) => r.code === listing.region) || {}).symbol || '$';
  return buyers
    .map((b) => {
      const criteria = {
        region: b.region,
        industry: b.industry || null,
        maxPrice: b.maxPrice ? Number(b.maxPrice) : null,
        successorType: b.persona,
      };
      return { buyer: b, score: matchScore(listing, criteria), regionSymbol };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
