
import { HANDOFF_TEMPLATE, REGIONS } from 'file:///C:/dev/exit-ready/site/data/listings.js';
import { listingFromForm, exitPack } from 'file:///C:/dev/exit-ready/site/data/package.js';
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';
import { fullMoney, esc } from 'file:///C:/dev/exit-ready/site/data/format.js';

const form = document.getElementById('listing-form');
const status = document.getElementById('form-status');
const preview = document.getElementById('preview');
const curLabel = document.getElementById('cur-label');
const rangeOut = document.getElementById('range-out');
const rangeText = document.getElementById('range-text');

/* Handoff preview */
document.getElementById('handoff-preview').innerHTML = HANDOFF_TEMPLATE.map((m, i) => `
  <li data-state="pending"><span class="track__label">${esc(m.label)}</span>
  <span class="track__state">${i === 0 ? 'starts here' : 'pending'}</span></li>
`).join('');

/* Currency label follows country */
const country = document.getElementById('country');
function syncCurrency() {
  const r = REGIONS.find(x => x.code === country.value);
  curLabel.textContent = `(${r.currency})`;
}
country.addEventListener('change', syncCurrency);
syncCurrency();

/* Live preview */
function updatePreview() {
  const name = form.business_name.value.trim();
  if (!name) {
    preview.textContent = 'Start filling the form and your listing card appears here.';
    return;
  }
  const r = REGIONS.find(x => x.code === form.country.value);
  const price = form.asking_price.value ? fullMoney(form.asking_price.value, r.symbol) : '—';
  const rev = form.gross_revenue.value ? fullMoney(form.gross_revenue.value, r.symbol) : '—';
  const cf = form.cash_flow.value ? fullMoney(form.cash_flow.value, r.symbol) : '—';
  const flags = [...form.querySelectorAll('input[name="flag"]:checked')].length;

  preview.innerHTML = `
    <div class="card" style="border:1px solid var(--rule); border-radius:var(--radius); padding:var(--s-4); background:var(--surface-raised)">
      <div class="card__meta">${esc(r.label)}${form.city.value ? ' · ' + esc(form.city.value) : ''}${form.industry.value ? ' · ' + esc(form.industry.value) : ''}</div>
      <div class="card__name" style="font-size:var(--step-1)">${esc(name)}</div>
      <dl class="card__figures" style="margin-top:var(--s-3)">
        <div class="figure"><dt>Asking</dt><dd>${price}</dd></div>
        <div class="figure"><dt>Revenue</dt><dd>${rev}</dd></div>
        <div class="figure"><dt>Cash flow</dt><dd>${cf}</dd></div>
      </dl>
      <p class="muted" style="font-size:0.75rem; margin:var(--s-3) 0 0">
        ${flags} disclosure flag${flags === 1 ? '' : 's'} declared
      </p>
    </div>`;
}

/* Indicative range from SDE multiple */
const MULTIPLES = { "Food & Beverage": [1.5, 2.5], "Personal Services": [1.2, 2.0],
  "Trades & Services": [1.5, 2.5], "Healthcare": [2.0, 3.5], "Retail": [1.2, 2.2],
  "eCommerce": [2.0, 3.5], "Professional Services": [2.0, 3.5], "Other": [1.5, 2.5] };

function updateRange() {
  const cf = Number(form.cash_flow.value);
  const ind = form.industry.value;
  if (!cf || !ind) { rangeOut.hidden = true; return; }
  const [lo, hi] = MULTIPLES[ind] || MULTIPLES.Other;
  const r = REGIONS.find(x => x.code === form.country.value);
  rangeText.textContent =
    `${fullMoney(Math.round(cf * lo), r.symbol)} to ${fullMoney(Math.round(cf * hi), r.symbol)}`
    + `, based on ${lo}x to ${hi}x annual cash flow for ${ind.toLowerCase()}.`;
  rangeOut.hidden = false;
}

form.addEventListener('input', () => { updatePreview(); updateRange(); });
form.addEventListener('change', () => { updatePreview(); updateRange(); });
form.addEventListener('reset', () => setTimeout(() => { updatePreview(); updateRange(); }, 0));

/* Validation + packaging */
function readValues() {
  const v = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      if (el.name === 'flag' || el.name === 'successor') {
        v[el.name] = [...form.querySelectorAll(`input[name="${el.name}"]:checked`)].map((i) => i.value);
      } else {
        v[el.name] = el.checked;
      }
    } else if (el.type === 'radio') {
      if (el.checked) v[el.name] = el.value;
    } else {
      v[el.name] = el.value;
    }
  }
  return v;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let ok = true;

  for (const el of form.querySelectorAll('[required]')) {
    const err = form.querySelector(`.field__error[data-for="${el.id}"]`);
    const bad = !el.value.trim();
    if (err) err.hidden = !bad;
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (bad) ok = false;
  }

  const succErr = form.querySelector('.field__error[data-for="successor"]');
  const succCount = form.querySelectorAll('input[name="successor"]:checked').length;
  if (succErr) succErr.hidden = succCount > 0;
  if (succCount === 0) ok = false;

  if (!ok) {
    status.hidden = false;
    status.className = 'notice notice--warn';
    status.innerHTML = '<h3>Not ready to publish</h3><p>Check the fields marked above.</p>';
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  const v = readValues();
  const owner = store.getVerification('owner');
  const listing = listingFromForm(v);
  if (owner?.full_name && !listing.owner.name) listing.owner.name = owner.full_name;
  if (owner?.email && !listing.owner.email) listing.owner.email = owner.email;
  listing.status = owner?.attested ? 'live' : 'draft';
  store.addListing(listing);

  const pack = exitPack(listing);
  const r = REGIONS.find((x) => x.code === listing.region);
  const flags = listing.disclosure_flags.length;

  status.hidden = false;
  status.className = 'notice notice--info';
  status.innerHTML = `
    <h3>${listing.status === 'live' ? 'Listing published' : 'Listing saved as a draft'}</h3>
    <p>
      <strong>${esc(listing.name)}</strong> is
      ${listing.status === 'live'
        ? 'live and visible to buyers'
        : 'saved as a draft until you verify your identity'},
      with ${flags} disclosure flags declared, including the mandatory unaudited-financials flag.
    </p>
    <div class="prose" style="margin-top:var(--s-3)">
      ${pack.summary.map((p) => `<p style="margin-bottom:var(--s-2)">${esc(p)}</p>`).join('')}
    </div>
    ${pack.range ? `
      <p style="margin-top:var(--s-3)"><strong>Indicative range:</strong>
        ${fullMoney(pack.range.low, r.symbol)} to ${fullMoney(pack.range.high, r.symbol)}
        <span class="muted">(${pack.range.lowMultiple}x–${pack.range.highMultiple}x annual cash flow)</span>
      </p>` : ''}
    <p style="margin-top:var(--s-4); display:flex; gap:var(--s-2); flex-wrap:wrap">
      <a class="btn btn--primary" href="dashboard.html">Go to your dashboard</a>
      <a class="btn btn--ghost" href="listing.html?id=${encodeURIComponent(listing.id)}">View the listing</a>
      ${listing.status !== 'live' ? '<a class="btn btn--ghost" href="verify.html">Verify to publish</a>' : ''}
    </p>
    <p class="muted" style="font-size:0.75rem; margin-top:var(--s-3)">
      Stored in this browser only. The exit pack is generated automatically — orientation, not a valuation.
    </p>`;
  status.scrollIntoView({ block: 'center', behavior: 'smooth' });
});

updatePreview();
