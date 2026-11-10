
import { LISTINGS, REGIONS, SUCCESSOR_TYPES, DISCLOSURE_FLAGS } from 'file:///C:/dev/exit-ready/site/data/listings.js';
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';
import { shorten, esc } from 'file:///C:/dev/exit-ready/site/data/format.js';

const ALL = store.allListings();
const owned = new Set(store.userListings().map((l) => l.id));
const visible = (l) => owned.has(l.id) || (l.status || 'live') === 'live';

const params = new URLSearchParams(location.search);
const filters = document.getElementById('filters');
const fRegion = document.getElementById('f-region');
const fIndustry = document.getElementById('f-industry');
const fSuccessor = document.getElementById('f-successor');
const fMax = document.getElementById('f-max');
const fSort = document.getElementById('f-sort');
const grid = document.getElementById('listing-grid');
const count = document.getElementById('result-count');
const noResults = document.getElementById('no-results');

// Populate selects
REGIONS.forEach(r => fRegion.add(new Option(r.label, r.code)));
[...new Set(ALL.map(l => l.industry))].sort()
  .forEach(i => fIndustry.add(new Option(i, i)));
SUCCESSOR_TYPES.filter(s => s.id !== 'any')
  .forEach(s => fSuccessor.add(new Option(s.label, s.id)));

// Apply URL params
if (params.get('region')) fRegion.value = params.get('region');
if (params.get('industry')) fIndustry.value = params.get('industry');
if (params.get('successor')) fSuccessor.value = params.get('successor');
if (params.get('max')) fMax.value = params.get('max');

function render() {
  const region = fRegion.value;
  const industry = fIndustry.value;
  const successor = fSuccessor.value;
  const max = fMax.value ? Number(fMax.value) : null;
  const sort = fSort.value;

  let rows = ALL.filter(l => {
    if (!visible(l)) return false;
    if (region && l.region !== region) return false;
    if (industry && l.industry !== industry) return false;
    if (successor && !l.successor_types_wanted.includes(successor)
        && !l.successor_types_wanted.includes('any')) return false;
    if (max !== null) {
      // Currencies are not comparable, so the price filter only applies when a
      // single region is selected. With no region chosen, we compare against the
      // region's own band by converting nothing and skipping the filter, and we
      // say so in the result line rather than returning a misleading list.
      if (!region) return true;
      if (l.asking_price > max) return false;
    }
    return true;
  });

  if (sort === 'price-asc')  rows = rows.slice().sort((a,b) => a.asking_price - b.asking_price);
  if (sort === 'price-desc') rows = rows.slice().sort((a,b) => b.asking_price - a.asking_price);
  if (sort === 'revenue')    rows = rows.slice().sort((a,b) => b.gross_revenue - a.gross_revenue);

  let msg = rows.length + (rows.length === 1 ? ' listing' : ' listings')
    + (region || industry || successor || max ? ' matching your filters' : '');
  if (max !== null && !region) {
    msg += '. Price filtering needs a region, because listings are priced in three currencies';
  }
  count.textContent = msg;

  if (rows.length === 0) {
    grid.innerHTML = '';
    noResults.hidden = false;
    return;
  }
  noResults.hidden = true;

  grid.innerHTML = rows.map(l => {
    const r = REGIONS.find(x => x.code === l.region);
    const flags = l.disclosure_flags
      .filter(id => !DISCLOSURE_FLAGS.find(f => f.id === id)?.always)
      .slice(0, 2)
      .map(id => {
        const f = DISCLOSURE_FLAGS.find(x => x.id === id);
        return f ? `<span class="tag">${esc(f.label)}</span>` : '';
      }).join('');

    return `
    <a class="card" href="listing.html?id=${l.id}">
      <div class="card__meta">${esc(r.label)} · ${esc(l.city)} · ${esc(l.industry)}</div>
      <div class="card__name">${esc(l.name)}</div>
      <div class="card__tagline">${esc(l.tagline)}</div>
      ${flags ? `<div class="tags">${flags}</div>` : ''}
      ${owned.has(l.id) ? `<div class="tags"><span class="tag tag--${(l.status || 'draft') === 'live' ? 'good' : 'warn'}">${(l.status || 'draft') === 'live' ? 'Your live listing' : 'Your draft'}</span></div>` : ''}
      <dl class="card__figures">
        <div class="figure"><dt>Asking</dt><dd>${shorten(l.asking_price, r.symbol)}</dd></div>
        <div class="figure"><dt>Revenue</dt><dd>${shorten(l.gross_revenue, r.symbol)}</dd></div>
        <div class="figure"><dt>Cash flow</dt><dd>${shorten(l.cash_flow_sde, r.symbol)}</dd></div>
      </dl>
    </a>`;
  }).join('');
}

filters.addEventListener('input', render);
filters.addEventListener('submit', e => e.preventDefault());
filters.addEventListener('reset', () => setTimeout(render, 0));
document.getElementById('f-reset-2').addEventListener('click', () => {
  filters.reset(); setTimeout(render, 0);
});

render();
