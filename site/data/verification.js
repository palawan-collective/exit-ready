/* Exit-Ready — verification and buyer readiness scoring.
 *
 * Pure functions only: no DOM, no storage. The page owns rendering and
 * persistence; this module owns the rules.
 *
 * Scoring model: five declared facts, each worth a fixed number of points,
 * 100 in total. Identity is a gate as well as a factor — an unverified buyer
 * is not shown to sellers at all.
 */

export const READINESS_WEIGHTS = [
  { key: 'identity_verified', label: 'Identity verified', points: 25 },
  { key: 'funding_path_declared', label: 'Funding path declared', points: 25 },
  { key: 'nda_signed', label: 'NDA signed', points: 20 },
  { key: 'prior_ownership', label: 'Prior ownership experience', points: 15 },
  { key: 'references_provided', label: 'References provided', points: 15 },
];

export const MAX_SCORE = READINESS_WEIGHTS.reduce((n, w) => n + w.points, 0);

export const ID_TYPES = [
  'Passport',
  "Driver's licence",
  'National ID card',
  'Other government ID',
];

export const FUNDING_PATHS = [
  'Cash',
  'Bank loan (pre-qualified)',
  'Seller financing',
  'Investor or partner',
  'Combination of the above',
  'Other',
];

export const TIMELINES = ['1–3 months', '3–6 months', '6+ months', 'Not sure yet'];

const DEPOSIT_BANDS = {
  US: ['Under $10k', '$10k – $25k', '$25k – $50k', '$50k – $100k', '$100k+'],
  UK: ['Under £10k', '£10k – £25k', '£25k – £50k', '£50k – £100k', '£100k+'],
  PH: ['Under ₱500k', '₱500k – ₱1M', '₱1M – ₱2M', '₱2M – ₱5M', '₱5M+'],
};

export function depositBands(country) {
  return DEPOSIT_BANDS[country] || DEPOSIT_BANDS.US;
}

/** Points earned per factor, in the order they are shown to the seller. */
export function readinessBreakdown(buyer) {
  return READINESS_WEIGHTS.map((w) => ({
    key: w.key,
    label: w.label,
    points: w.points,
    earned: buyer[w.key] ? w.points : 0,
  }));
}

export function readinessScore(buyer) {
  return readinessBreakdown(buyer).reduce((n, row) => n + row.earned, 0);
}

export function readinessBand(score) {
  if (score >= 80) return { label: 'Ready', tone: 'good' };
  if (score >= 55) return { label: 'Developing', tone: 'warn' };
  return { label: 'Early', tone: 'low' };
}

/** A funding path is only "declared" when how, how much and when are all stated. */
export function isFundingPathDeclared(buyer) {
  return Boolean(buyer.funding_path && buyer.deposit_band && buyer.timeline);
}

/** Validate a buyer verification submission. Returns { ok, errors }. */
export function validateBuyer(v) {
  const errors = {};
  if (!v.full_name?.trim()) errors.full_name = 'Enter your full name.';
  if (!v.email?.trim()) errors.email = 'Enter an email address.';
  if (!v.id_type) errors.id_type = 'Select an identity document type.';
  if (!v.id_number?.trim()) errors.id_number = 'Enter the document number.';
  if (!v.country) errors.country = 'Select a country.';
  if (!v.funding_path) errors.funding_path = 'Select how you will fund the purchase.';
  if (!v.deposit_band) errors.deposit_band = 'Select a deposit capacity band.';
  if (!v.timeline) errors.timeline = 'Select a timeline.';
  if (v.prior_ownership === undefined || v.prior_ownership === null || v.prior_ownership === '') {
    errors.prior_ownership = 'Select yes or no.';
  }
  if (!v.attest) errors.attest = 'Confirm the information is accurate.';
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Validate an owner verification submission. Returns { ok, errors }. */
export function validateOwner(v) {
  const errors = {};
  if (!v.full_name?.trim()) errors.full_name = 'Enter your full name.';
  if (!v.email?.trim()) errors.email = 'Enter an email address.';
  if (!v.phone?.trim()) errors.phone = 'Enter a phone number.';
  if (!v.id_type) errors.id_type = 'Select an identity document type.';
  if (!v.id_number?.trim()) errors.id_number = 'Enter the document number.';
  if (!v.country) errors.country = 'Select a country.';
  if (!v.business_name?.trim()) errors.business_name = 'Enter the business name.';
  if (!v.registration_number?.trim()) errors.registration_number = 'Enter the registration number.';
  if (!v.tax_id?.trim()) errors.tax_id = 'Enter the tax ID.';
  if (!v.authority) errors.authority = 'Confirm you are entitled to sell this business.';
  if (!v.attest) errors.attest = 'Confirm the information is accurate.';
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Build the buyer object the readiness score reads, from form values. */
export function buyerFromForm(v) {
  return {
    full_name: v.full_name,
    email: v.email,
    country: v.country,
    identity_verified: true,
    funding_path: v.funding_path,
    deposit_capacity_band: v.deposit_band,
    timeline: v.timeline,
    funding_path_declared: isFundingPathDeclared(v),
    prior_ownership: v.prior_ownership === 'yes',
    references_provided: Number(v.references) > 0,
    nda_signed: Boolean(v.nda_agreed),
  };
}

/** Build the owner record from form values. */
export function ownerFromForm(v) {
  return {
    full_name: v.full_name,
    email: v.email,
    phone: v.phone,
    country: v.country,
    id_type: v.id_type,
    id_number: v.id_number,
    business_name: v.business_name,
    registration_number: v.registration_number,
    tax_id: v.tax_id,
    authority_confirmed: Boolean(v.authority),
    attested: Boolean(v.attest),
  };
}
