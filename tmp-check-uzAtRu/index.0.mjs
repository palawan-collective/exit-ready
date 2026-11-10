
import { LISTINGS, REGIONS } from 'file:///C:/dev/exit-ready/site/data/listings.js';
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';
import { money, shorten } from 'file:///C:/dev/exit-ready/site/data/format.js';

const owned = new Set(store.userListings().map((l) => l.id));
const el = document.getElementById('home-listings');
el.innerHTML = store.allListings()
  .filter((l) => owned.has(l.id) || (l.status || 'live') === 'live')
  .slice(0, 6)
  .map(l => {
  const r = REGIONS.find(x => x.code === l.region);
  return `
  <a class="card" href="listing.html?id=${l.id}">
    <div class="card__meta">${r.label} · ${l.city} · ${l.industry}</div>
    <div class="card__name">${l.name}</div>
    <div class="card__tagline">${l.tagline}</div>
    <dl class="card__figures">
      <div class="figure"><dt>Asking</dt><dd>${shorten(l.asking_price, r.symbol)}</dd></div>
      <div class="figure"><dt>Revenue</dt><dd>${shorten(l.gross_revenue, r.symbol)}</dd></div>
      <div class="figure"><dt>Cash flow</dt><dd>${shorten(l.cash_flow_sde, r.symbol)}</dd></div>
    </dl>
  </a>`;
}).join('');

// Inventory counts — industries and locations
const counts = document.getElementById('counts');
if (counts) {
  const live = store.allListings()
    .filter((l) => owned.has(l.id) || (l.status || 'live') === 'live');
  const byIndustry = {};
  const byCity = {};
  for (const l of live) {
    byIndustry[l.industry] = (byIndustry[l.industry] || 0) + 1;
    const r = REGIONS.find((x) => x.code === l.region);
    byCity[`${l.city}, ${r.label}`] = (byCity[`${l.city}, ${r.label}`] || 0) + 1;
  }
  const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
  const tile = (n, label) => `<div class="panel"><div class="dash__num">${n}</div><div class="dash__label">${esc(label)}</div></div>`;
  counts.innerHTML = tile(live.length, 'Live listings')
    + top(byIndustry, 4).map(([k, v]) => tile(v, k)).join('')
    + top(byCity, 3).map(([k, v]) => tile(v, k)).join('');
}

// One restrained reveal
const obs = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach(n => obs.observe(n));
