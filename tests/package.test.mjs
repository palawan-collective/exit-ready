import {
  MULTIPLES, listingFromForm, indicativeRange, summarizeListing,
  exitPack, matchScore, recommendedForBuyer, matchedBuyers,
} from '../site/data/package.js';
import { LISTINGS, HANDOFF_TEMPLATE } from '../site/data/listings.js';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
}

/* ---------- listingFromForm ---------- */
const form = {
  business_name: 'Seaside Café and Bakery',
  tagline: 'Beachfront café with bakery',
  country: 'PH',
  city: 'San Vicente',
  established: '2017',
  industry: 'Food & Beverage',
  reason: 'Owner retiring',
  asking_price: '2800000',
  gross_revenue: '5400000',
  cash_flow: '1450000',
  inventory: '85000',
  inventory_included: 'no',
  employees: '7',
  employee_type: 'Mixed',
  real_estate: 'Leased',
  monthly_rent: '45000',
  lease_expiration: '2027-12-31',
  monthly_payroll: '98000',
  successor: ['local_operator', 'employee'],
  flag: ['inventory_excluded', 'lease_transfer_required'],
  seller_financing: true,
  earn_out: true,
  financing_ready: false,
  description: 'A beachfront café.',
  highlights: 'In-house bakery\nSeven staff\nOwner retiring',
  owner_name: 'Ramon Cruz',
  owner_email: 'ramon@example.com',
};
const l = listingFromForm(form);

ok('listing gets a stable id', typeof l.id === 'string' && l.id.startsWith('er-'), l.id);
ok('listing is marked as user data', l.sample === false);
ok('numbers are coerced', l.asking_price === 2800000 && l.cash_flow_sde === 1450000, JSON.stringify(l.asking_price));
ok('successor array is preserved', JSON.stringify(l.successor_types_wanted) === '["local_operator","employee"]');
ok('mandatory unaudited flag is first', l.disclosure_flags[0] === 'financials_unaudited', JSON.stringify(l.disclosure_flags));
ok('other flags follow', l.disclosure_flags.length === 3, String(l.disclosure_flags.length));
ok('highlights split on newlines', l.highlights.length === 3, String(l.highlights.length));
ok('inventory not included maps correctly', l.inventory_included_in_price === false);
ok('inventory included maps correctly', listingFromForm({ ...form, inventory_included: 'yes' }).inventory_included_in_price === true);
ok('owner details carried', l.owner.name === 'Ramon Cruz' && l.owner.email === 'ramon@example.com');
ok('listing starts as a draft', l.status === 'draft');
ok('empty form yields a zero listing', Number(listingFromForm({}).asking_price) === 0);

/* ---------- indicativeRange ---------- */
ok('range low equals SDE times the low multiple',
  indicativeRange(l).low === Math.round(l.cash_flow_sde * MULTIPLES['Food & Beverage'][0]),
  String(indicativeRange(l).low));
ok('range high equals SDE times the high multiple',
  indicativeRange(l).high === Math.round(l.cash_flow_sde * MULTIPLES['Food & Beverage'][1]),
  String(indicativeRange(l).high));
ok('range low is below high', indicativeRange(l).low < indicativeRange(l).high);
ok('range is null without cash flow', indicativeRange({ ...l, cash_flow_sde: 0 }) === null);
ok('unknown industry falls back to Other',
  indicativeRange({ ...l, industry: 'Nonexistent' }).lowMultiple === MULTIPLES.Other[0]);

/* ---------- exit pack ---------- */
const pack = exitPack(l);
ok('exit pack has narrative paragraphs', Array.isArray(pack.summary) && pack.summary.length === 3, String(pack.summary?.length));
ok('exit pack has the range', pack.range && pack.range.low > 0);
ok('exit pack has 12 milestones', pack.checklist.length === 12 && pack.checklist.length === HANDOFF_TEMPLATE.length);
ok('narrative names the business', pack.summary[0].includes('Seaside Café and Bakery'));
ok('narrative mentions the city', pack.summary[0].includes('San Vicente'));
ok('narrative reports revenue', pack.summary[1].includes('5,400,000'));
ok('minimal listing still summarises', exitPack({ ...l, description: '', city: '' }).summary.every(p => p.length > 0));

/* ---------- matchScore ---------- */
const sl = LISTINGS[0];
ok('full match is 100', matchScore(sl, { region: sl.region, industry: sl.industry, maxPrice: sl.asking_price, successorType: sl.successor_types_wanted[0] }) === 100);
ok('no criteria scores 0', matchScore(sl, {}) === 0);
ok('region only match is 100 of its weight', matchScore(sl, { region: sl.region }) === 100);
ok('region mismatch is 0 of its weight', matchScore(sl, { region: 'XX' }) === 0);
ok('budget mismatch is 0', matchScore(sl, { maxPrice: 1 }) === 0);
ok('successor "any" still matches', matchScore({ ...sl, successor_types_wanted: ['any'] }, { successorType: 'first_time' }) === 100);
ok('partial overlap scores partial', matchScore(sl, { region: sl.region, industry: 'Retail' }) < 100);

/* ---------- ranking ---------- */
const recs = recommendedForBuyer(LISTINGS, { region: 'US' }, 10);
ok('recommendations are sorted', recs.every((r, i) => i === 0 || recs[i - 1].score >= r.score));
ok('recommendations are limited', recs.length <= 10);
ok('recommendations exclude non-matching regions', recs.every(r => r.listing.region === 'US'));

const buyers = [
  { display_name: 'A', persona: 'employee', region: 'US', maxPrice: 200000, score: 80 },
  { display_name: 'B', persona: 'first_time', region: 'US', maxPrice: 100000000, score: 55 },
  { display_name: 'C', persona: 'local_operator', region: 'PH', maxPrice: 500000 },
];
const ranked = matchedBuyers(sl, buyers);
ok('buyers ranked by fit', ranked.length > 0 && ranked[0].score >= ranked[ranked.length - 1].score);
ok('every matched buyer has a positive score', ranked.every(r => r.score > 0), JSON.stringify(ranked.map(r => r.score)));
ok('the in-region buyer ranks first', ranked[0].buyer.region === sl.region, ranked[0].buyer.region);
ok('matched buyers carries a currency symbol', typeof ranked[0].regionSymbol === 'string');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
