/* Exit-Ready — data-driven dot-matrix world map.
 * Pure helpers are exported for tests. renderMap is the only DOM entry point.
 * All data comes from store.js; nothing here touches localStorage or the network.
 */

import * as store from './store.js';
import { HANDOFF_TEMPLATE } from './listings.js';
import { esc } from './format.js';

const DAY = 86400000;

function stamp(l, key) {
  const raw = l?.[key] || l?.[key === 'soldAt' ? 'sold_at' : key];
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

function hidden(l) {
  return Boolean(l.hideFromMap || l.hide_from_map || l.status === 'hidden');
}

function marketMatches(l, market) {
  if (!market) return false;
  const key = String(l.market || l.region || '').toLowerCase();
  return key === String(market.id || '').toLowerCase()
    || key === String(market.code || '').toLowerCase();
}

/** Rows that size the live markers: live + under_offer, never hidden or sold. */
export function visibleListings(listings, settings = {}, now = Date.now()) {
  return (listings || []).filter((l) => {
    if (hidden(l)) return false;
    const status = l.status || 'live';
    return status === 'live' || status === 'under_offer';
  });
}

/** A sold listing shows a small badge only while it is within the sold window. */
export function isRecentlySold(l, settings = {}, now = Date.now()) {
  if (!l || hidden(l) || l.status !== 'sold') return false;
  if (settings.showSold === false) return false;
  const at = stamp(l, 'soldAt');
  if (at === null) return false;
  const days = Math.max(0, Number(settings.soldDays ?? 90));
  return at <= now && now - at <= days * DAY;
}

export function soldBadgeCount(listings, market, settings = {}, now = Date.now()) {
  return (listings || []).filter((l) => marketMatches(l, market) && isRecentlySold(l, settings, now)).length;
}

export function countForMarket(listings, market, settings = {}, now = Date.now(), industry = null) {
  return visibleListings(listings, settings, now).filter((l) =>
    marketMatches(l, market) && (!industry || l.industry === industry)).length;
}

/** Every displayed number is derived from the store and the handoff template. */
export function mapCounts(listings, markets, settings = {}, now = Date.now()) {
  const rows = visibleListings(listings, settings, now);
  const used = new Set();
  for (const l of rows) {
    const m = (markets || []).find((candidate) => marketMatches(l, candidate));
    if (m && m.active !== false) used.add(m.id);
  }
  return {
    live: rows.length,
    markets: used.size,
    milestones: HANDOFF_TEMPLATE.length,
  };
}

/** Blocks a market delete while listings still reference it. */
export function canDeleteMarket(id, listings) {
  const needle = String(id || '').toLowerCase();
  const matches = (listings || []).filter((l) => {
    const key = String(l.market || l.region || '').toLowerCase();
    return key === needle || key.toUpperCase() === needle.toUpperCase();
  });
  return { ok: matches.length === 0, count: matches.length, reason: matches.length ? 'in_use' : 'ok' };
}

function industryKey(name) {
  return String(name || 'Other').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function markerRadius(count) {
  return count ? 5 + Math.sqrt(count) * 4.2 : 3.5;
}

function svgEl(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * Render the map into `el`.
 * opts: { listings, markets, settings, now, mini, compact }
 * Returns a controller with refresh() and destroy().
 */
export function renderMap(el, opts = {}) {
  if (!el) return { refresh() {}, destroy() {} };
  const NS = 'http://www.w3.org/2000/svg';
  const state = { market: null, industry: null };
  let disposed = false;
  let ro = null;

  const data = () => ({
    listings: opts.listings || store.listAllListings(),
    markets: (opts.markets || store.listMarkets()).filter((m) => m.active !== false || opts.allMarkets),
    settings: opts.settings || store.getMapSettings(),
    now: opts.now || Date.now(),
  });

  function landPath() {
    const W = globalThis.WorldMap;
    if (!W) return '';
    return W.dots().map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0`).join('');
  }

  function markerPoint(m) {
    const W = globalThis.WorldMap;
    if (!W) return [0, 0];
    return W.project(Number(m.lon) || 0, Number(m.lat) || 0);
  }

  function industries(rows) {
    const tally = {};
    for (const l of rows) tally[l.industry || 'Other'] = (tally[l.industry || 'Other'] || 0) + 1;
    return Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function cardMarkup(markets, rows, d) {
    const m = markets.find((x) => x.id === state.market);
    if (m) {
      const list = industries(rows.filter((l) => marketMatches(l, m)));
      const sold = soldBadgeCount(d.listings, m, d.settings, d.now);
      const total = countForMarket(d.listings, m, d.settings, d.now, state.industry);
      return `<h4>${esc(m.name)}</h4>
        <p>${total} live listing${total === 1 ? '' : 's'}${state.industry ? ' · ' + esc(state.industry) : ''}</p>
        ${list.map(([name, count]) => `<div class="map__row"><i class="map__swatch map__swatch--${industryKey(name)}"></i><span>${esc(name)}</span><b>${count}</b></div>`).join('')}
        ${sold ? `<div class="map__row map__row--sold"><span>Recently sold</span><b>${sold}</b></div>` : ''}
        <a class="map__browse" href="browse.html?region=${encodeURIComponent(m.code)}">Browse these →</a>`;
    }
    const top = markets
      .map((x) => [x, countForMarket(d.listings, x, d.settings, d.now, state.industry)])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return `<h4>${state.industry ? esc(state.industry) : 'All markets'}</h4>
      <p>${d.listings.filter((l) => visibleListings([l], d.settings, d.now).length && (!state.industry || l.industry === state.industry)).length} live listings</p>
      ${top.map(([x, n]) => `<div class="map__row"><i class="map__swatch map__swatch--default"></i><span>${esc(x.name)}</span><b>${n}</b></div>`).join('')}
      <p class="map__hint">Select a market pin or chip for the industry breakdown.</p>`;
  }

  function render() {
    if (disposed) return;
    const d = data();
    const W = globalThis.WorldMap;
    const counts = mapCounts(d.listings, d.markets, d.settings, d.now);
    const mini = Boolean(opts.mini);

    el.innerHTML = `<div class="map__panel">
      ${mini ? '' : `<div class="map__stats">
        <div class="map__stat map__stat--big"><b>${counts.live}</b><span>Live listings</span></div>
        <div class="map__stat"><b>${counts.markets}</b><span>Markets</span></div>
        <div class="map__stat"><b>${counts.milestones}</b><span>Milestones tracked</span></div>
      </div>`}
      <div class="map__box">
        <svg class="map__svg" viewBox="0 0 ${W ? W.width : 1000} ${W ? W.height : 435}" role="img" aria-label="World map of live listings by market">
          <path class="map__land" d="${landPath()}" stroke-width="${W ? (W.step * 0.52).toFixed(2) : 3}"></path>
          <g class="map__markers"></g>
        </svg>
        ${mini ? '' : '<div class="map__card" aria-live="polite"></div>'}
      </div>
      ${mini ? '' : `<div class="map__labels">
        <div class="map__label">Industry</div><div class="map__chips" data-kind="industry"></div>
        <div class="map__label">Market</div><div class="map__chips" data-kind="market"></div>
      </div>
      <div class="map__note">Counts reflect the listings in this browser. Real inventory replaces the sample data before public use.</div>`}
    </div>`;

    const svg = el.querySelector('.map__svg');
    const markers = el.querySelector('.map__markers');

    for (const m of d.markets) {
      const count = countForMarket(d.listings, m, d.settings, d.now, state.industry);
      const sold = soldBadgeCount(d.listings, m, d.settings, d.now);
      const [x, y] = markerPoint(m);
      const g = svgEl('g', {
        class: `map__marker${count ? '' : ' map__marker--zero'}${state.market === m.id ? ' map__marker--selected' : ''}`,
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
        role: 'button', tabindex: '0',
        'aria-label': `${m.name}: ${count} live listing${count === 1 ? '' : 's'}${sold ? ', ' + sold + ' recently sold' : ''}`,
      });
      const r = markerRadius(count);
      g.appendChild(svgEl('circle', { class: 'map__ring', r: (r + 2).toFixed(1) }));
      g.appendChild(svgEl('circle', { class: 'map__core', r: r.toFixed(1) }));
      g.appendChild(svgEl('circle', { class: 'map__hit', r: '8' }));
      const code = svgEl('text', {
        class: 'map__code',
        x: String(m.labelDx || 0), y: String(m.labelDy || -14),
        'text-anchor': (m.labelDx || 0) > 0 ? 'start' : (m.labelDx || 0) < 0 ? 'end' : 'middle',
      });
      code.textContent = m.code || m.name.slice(0, 2).toUpperCase();
      g.appendChild(code);
      const num = svgEl('text', { class: 'map__num', x: '0', y: '4', 'text-anchor': 'middle' });
      num.textContent = String(count);
      g.appendChild(num);
      if (sold) {
        const badge = svgEl('text', { class: 'map__sold', x: '0', y: String(-r - 10), 'text-anchor': 'middle' });
        badge.textContent = `SOLD ${sold}`;
        g.appendChild(badge);
      }
      const pick = () => { state.market = state.market === m.id ? null : m.id; render(); };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault(); pick();
      });
      markers.appendChild(g);
    }

    if (!mini) {
      const card = el.querySelector('.map__card');
      card.innerHTML = cardMarkup(d.markets, d.listings, d);
      const allIndustries = industries(visibleListings(d.listings, d.settings, d.now));
      const byMarket = d.markets
        .map((m) => [m, countForMarket(d.listings, m, d.settings, d.now)])
        .sort((a, b) => b[1] - a[1]);
      const chip = (kind, key, label, count, swatch) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `map__chip${state[kind] === key ? ' map__chip--on' : ''}`;
        b.innerHTML = `${swatch ? `<i class="map__swatch map__swatch--${swatch}"></i>` : ''}<span>${esc(label)}</span><em>${count}</em>`;
        b.addEventListener('click', () => {
          state[kind] = state[kind] === key ? null : key;
          render();
        });
        return b;
      };
      const ind = el.querySelector('[data-kind="industry"]');
      for (const [name, n] of allIndustries) ind.appendChild(chip('industry', name, name, n, industryKey(name)));
      const mkt = el.querySelector('[data-kind="market"]');
      for (const [m, n] of byMarket) mkt.appendChild(chip('market', m.id, m.name, n));
    }

    syncHits(svg);
  }

  function syncHits(svg) {
    if (!svg) return;
    const width = svg.clientWidth || 1000;
    const scale = width / 1000;
    const r = scale > 0 ? Math.max(8, 22 / scale) : 44;
    for (const hit of el.querySelectorAll('.map__hit')) hit.setAttribute('r', r.toFixed(2));
  }

  function onChange() { render(); }

  if (!opts.mini) document.addEventListener(store.CHANGE_EVENT, onChange);
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      const svg = el.querySelector('.map__svg');
      if (svg) syncHits(svg);
    });
    ro.observe(el);
  }
  render();

  return {
    refresh: render,
    destroy() {
      disposed = true;
      document.removeEventListener(store.CHANGE_EVENT, onChange);
      if (ro) ro.disconnect();
    },
  };
}
