import {
  READINESS_WEIGHTS, MAX_SCORE, readinessScore, readinessBand, readinessBreakdown,
  ID_TYPES, FUNDING_PATHS, TIMELINES, depositBands, budgetBands, budgetCeiling,
  INDUSTRIES, SUCCESSOR_PERSONAS, isFundingPathDeclared,
  validateBuyer, validateOwner, buyerFromForm, ownerFromForm,
} from '../site/data/verification.js';
import { LISTINGS, SAMPLE_BUYERS } from '../site/data/listings.js';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
}

// --- scoring model ---
ok('MAX_SCORE is 100', MAX_SCORE === 100, String(MAX_SCORE));
ok('weights sum to MAX_SCORE', READINESS_WEIGHTS.reduce((n, w) => n + w.points, 0) === MAX_SCORE);
ok('five weighted factors', READINESS_WEIGHTS.length === 5, String(READINESS_WEIGHTS.length));

const allTrue = {
  identity_verified: true, funding_path_declared: true, nda_signed: true,
  prior_ownership: true, references_provided: true,
};
const allFalse = {
  identity_verified: false, funding_path_declared: false, nda_signed: false,
  prior_ownership: false, references_provided: false,
};
ok('all factors true scores 100', readinessScore(allTrue) === 100, String(readinessScore(allTrue)));
ok('no factors scores 0', readinessScore(allFalse) === 0, String(readinessScore(allFalse)));
ok('breakdown earned sums to score',
  readinessBreakdown(allTrue).reduce((n, r) => n + r.earned, 0) === readinessScore(allTrue));
ok('breakdown has one row per weight',
  readinessBreakdown(allTrue).length === READINESS_WEIGHTS.length);

// --- bands ---
ok('band 80 = Ready', readinessBand(80).label === 'Ready');
ok('band 100 = Ready', readinessBand(100).label === 'Ready');
ok('band 79 = Developing', readinessBand(79).label === 'Developing');
ok('band 55 = Developing', readinessBand(55).label === 'Developing');
ok('band 54 = Early', readinessBand(54).label === 'Early');
ok('band 0 = Early', readinessBand(0).label === 'Early');
ok('bands carry a tone', ['good', 'warn', 'low'].includes(readinessBand(80).tone));

// --- sample buyers keep their published scores ---
const scores = SAMPLE_BUYERS.map(readinessScore);
ok('sample buyer scores match published set', JSON.stringify(scores) === '[100,50,40,100,50,85,80,25]', JSON.stringify(scores));
ok('sample buyer bands match published set',
  JSON.stringify(SAMPLE_BUYERS.map(b => readinessBand(readinessScore(b)).label)) === '["Ready","Early","Early","Ready","Early","Ready","Ready","Early"]');

// --- funding path derivation ---
ok('funding declared when how+deposit+timeline set',
  isFundingPathDeclared({ funding_path: 'Cash', deposit_band: '$10k – $25k', timeline: '1–3 months' }) === true);
ok('funding not declared without deposit band',
  isFundingPathDeclared({ funding_path: 'Cash', timeline: '1–3 months' }) === false);
ok('funding not declared without timeline',
  isFundingPathDeclared({ funding_path: 'Cash', deposit_band: '$10k – $25k' }) === false);
ok('funding not declared without path',
  isFundingPathDeclared({ deposit_band: '$10k – $25k', timeline: '1–3 months' }) === false);

// --- region-aware deposit bands ---
ok('US bands use $', depositBands('US')[0].startsWith('Under $'), depositBands('US')[0]);
ok('UK bands use £', depositBands('UK')[0].startsWith('Under £'), depositBands('UK')[0]);
ok('PH bands use ₱', depositBands('PH')[0].startsWith('Under ₱'), depositBands('PH')[0]);
ok('unknown country falls back to US', depositBands('XX')[0] === depositBands('US')[0]);
ok('every region has five bands', ['US', 'UK', 'PH'].every(c => depositBands(c).length === 5));

// --- option lists ---
ok('ID types present', ID_TYPES.length >= 3, String(ID_TYPES.length));
ok('funding paths present', FUNDING_PATHS.length >= 4, String(FUNDING_PATHS.length));
ok('timelines present', TIMELINES.length >= 3, String(TIMELINES.length));
ok('industries present', INDUSTRIES.length >= 6, String(INDUSTRIES.length));
ok('personas present', SUCCESSOR_PERSONAS.length === 4, String(SUCCESSOR_PERSONAS.length));

// --- budget bands ---
ok('budget bands lead with Any', budgetBands('US')[0] === 'Any budget');
ok('budget bands use the region currency',
  budgetBands('US')[1].startsWith('Up to $') && budgetBands('UK')[1].startsWith('Up to £') && budgetBands('PH')[1].startsWith('Up to ₱'),
  budgetBands('US')[1]);
ok('unknown country falls back to US', budgetBands('XX')[1] === budgetBands('US')[1]);
ok('budgetCeiling parses millions', budgetCeiling('Up to ₱5M') === 5_000_000, String(budgetCeiling('Up to ₱5M')));
ok('budgetCeiling parses thousands', budgetCeiling('Up to $250k') === 250_000, String(budgetCeiling('Up to $250k')));
ok('budgetCeiling null for Any', budgetCeiling('Any budget') === null);
ok('budgetCeiling null for empty', budgetCeiling('') === null);

// --- buyer validation ---
const emptyBuyer = validateBuyer({});
ok('empty buyer rejected', emptyBuyer.ok === false);
ok('empty buyer reports all required fields',
  ['full_name', 'email', 'id_type', 'id_number', 'country', 'funding_path', 'deposit_band',
   'timeline', 'prior_ownership', 'industry', 'budget', 'persona', 'attest']
    .every(f => f in emptyBuyer.errors), JSON.stringify(Object.keys(emptyBuyer.errors)));

const goodBuyer = {
  full_name: 'Ada Santos', email: 'ada@example.com', id_type: 'Passport', id_number: 'P123',
  country: 'PH', funding_path: 'Bank loan (pre-qualified)', deposit_band: '₱1M – ₱2M',
  timeline: '3–6 months', prior_ownership: 'yes', references: '2', nda_agreed: true, attest: true,
  industry: 'Food & Beverage', budget: 'Up to ₱5M', persona: 'local_operator',
};
ok('complete buyer accepted', validateBuyer(goodBuyer).ok === true, JSON.stringify(validateBuyer(goodBuyer).errors));
ok('buyer without search criteria rejected', validateBuyer({ ...goodBuyer, industry: '' }).ok === false);
ok('missing budget is reported', 'budget' in validateBuyer({ ...goodBuyer, budget: '' }).errors);
ok('missing persona is reported', 'persona' in validateBuyer({ ...goodBuyer, persona: '' }).errors);

const derived = buyerFromForm(goodBuyer);
ok('buyerFromForm derives funding_path_declared', derived.funding_path_declared === true);
ok('buyerFromForm maps prior_ownership', derived.prior_ownership === true);
ok('buyerFromForm maps references', derived.references_provided === true);
ok('buyerFromForm maps nda', derived.nda_signed === true);
ok('buyerFromForm keeps identity verified', derived.identity_verified === true);
ok('derived buyer scores 100', readinessScore(derived) === 100, String(readinessScore(derived)));
ok('buyerFromForm carries search criteria',
  derived.industry === 'Food & Beverage' && derived.max_price === 5_000_000 && derived.persona === 'local_operator',
  JSON.stringify({ i: derived.industry, m: derived.max_price, p: derived.persona }));

const noRefs = buyerFromForm({ ...goodBuyer, references: '0' });
ok('zero references maps to false', noRefs.references_provided === false);
ok('zero references drops 15 points', readinessScore(noRefs) === 85, String(readinessScore(noRefs)));

// --- owner validation ---
const emptyOwner = validateOwner({});
ok('empty owner rejected', emptyOwner.ok === false);
ok('empty owner reports all required fields',
  ['full_name', 'email', 'phone', 'id_type', 'id_number', 'country', 'business_name', 'registration_number', 'tax_id', 'authority', 'attest']
    .every(f => f in emptyOwner.errors), JSON.stringify(Object.keys(emptyOwner.errors)));

const goodOwner = {
  full_name: 'Ramon Cruz', email: 'ramon@example.com', phone: '+63 917 000 0000',
  id_type: 'National ID card', id_number: 'N456', country: 'PH',
  business_name: 'Seaside Café and Bakery', registration_number: 'DTI-789', tax_id: 'TIN-123',
  authority: true, attest: true,
};
ok('complete owner accepted', validateOwner(goodOwner).ok === true, JSON.stringify(validateOwner(goodOwner).errors));
const ownerRecord = ownerFromForm(goodOwner);
ok('ownerFromForm keeps authority', ownerRecord.authority_confirmed === true);
ok('ownerFromForm keeps attestation', ownerRecord.attested === true);

// --- listings still resolve ---
ok('sample listings cover all destinations', LISTINGS.length === 26, String(LISTINGS.length));
ok('all regions represented', new Set(LISTINGS.map(l => l.region)).size === 9, String(new Set(LISTINGS.map(l => l.region)).size));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
