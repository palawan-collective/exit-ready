/* Exit-Ready — local admin console.
 * Scope: no backend, no network, no dependencies. All app data goes through
 * data/store.js. The passcode below is a PLACEHOLDER, NOT SECURITY: it only
 * hides the console from a casual visitor in this prototype.
 */

import * as store from './store.js';
import * as map from './map.js';
import * as pkg from './package.js';
import { MARKETS, REGIONS } from './listings.js';
import { esc } from './format.js';

export const CITY_PRESETS = [
  { name: 'New York', lon: -74.0, lat: 40.7 }, { name: 'Los Angeles', lon: -118.2, lat: 34.1 },
  { name: 'Chicago', lon: -87.6, lat: 41.9 }, { name: 'Houston', lon: -95.4, lat: 29.8 },
  { name: 'Portland', lon: -122.7, lat: 45.5 }, { name: 'Seattle', lon: -122.3, lat: 47.6 },
  { name: 'Toronto', lon: -79.4, lat: 43.7 }, { name: 'Vancouver', lon: -123.1, lat: 49.3 },
  { name: 'London', lon: -0.13, lat: 51.5 }, { name: 'Manchester', lon: -2.24, lat: 53.5 },
  { name: 'Bristol', lon: -2.59, lat: 51.45 }, { name: 'Leeds', lon: -1.55, lat: 53.8 },
  { name: 'Dublin', lon: -6.26, lat: 53.35 }, { name: 'Paris', lon: 2.35, lat: 48.86 },
  { name: 'Amsterdam', lon: 4.9, lat: 52.37 }, { name: 'Berlin', lon: 13.4, lat: 52.52 },
  { name: 'Madrid', lon: -3.7, lat: 40.42 }, { name: 'Lisbon', lon: -9.14, lat: 38.72 },
  { name: 'Stockholm', lon: 18.07, lat: 59.33 }, { name: 'Oslo', lon: 10.75, lat: 59.91 },
  { name: 'Copenhagen', lon: 12.57, lat: 55.68 }, { name: 'Helsinki', lon: 24.94, lat: 60.17 },
  { name: 'Warsaw', lon: 21.01, lat: 52.23 }, { name: 'Prague', lon: 14.44, lat: 50.08 },
  { name: 'Dubai', lon: 55.3, lat: 25.2 }, { name: 'Abu Dhabi', lon: 54.38, lat: 24.45 },
  { name: 'Riyadh', lon: 46.72, lat: 24.71 }, { name: 'Doha', lon: 51.53, lat: 25.29 },
  { name: 'Singapore', lon: 103.8, lat: 1.35 }, { name: 'Kuala Lumpur', lon: 101.69, lat: 3.14 },
  { name: 'Bangkok', lon: 100.5, lat: 13.76 }, { name: 'Ho Chi Minh City', lon: 106.7, lat: 10.82 },
  { name: 'Manila', lon: 120.98, lat: 14.6 }, { name: 'Cebu City', lon: 123.89, lat: 10.32 },
  { name: 'Hong Kong', lon: 114.17, lat: 22.32 }, { name: 'Taipei', lon: 121.56, lat: 25.03 },
  { name: 'Tokyo', lon: 139.69, lat: 35.69 }, { name: 'Osaka', lon: 135.5, lat: 34.69 },
  { name: 'Seoul', lon: 126.98, lat: 37.57 }, { name: 'Sydney', lon: 151.21, lat: -33.87 },
  { name: 'Melbourne', lon: 144.96, lat: -37.81 }, { name: 'Brisbane', lon: 153.03, lat: -27.47 },
  { name: 'Auckland', lon: 174.76, lat: -36.85 }, { name: 'Johannesburg', lon: 28.05, lat: -26.2 },
  { name: 'Nairobi', lon: 36.82, lat: -1.29 }, { name: 'São Paulo', lon: -46.63, lat: -23.55 },
];

const PASSCODE_KEY = 'exit-ready:admin';
const PLACEHOLDER_PASSCODE = 'exit-ready-admin';

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Pure form → market mapping, used by the admin form and its mini preview. */
export function formToMarket(v = {}) {
  return {
    id: String(v.id || '').trim(),
    name: String(v.name || '').trim(),
    code: String(v.code || '').trim().toUpperCase(),
    lon: num(v.lon),
    lat: num(v.lat),
    labelDx: num(v.labelDx),
    labelDy: num(v.labelDy),
    active: v.active === true || v.active === 'on' || v.active === 'true' || v.active === '1',
  };
}

function listingValues(l) {
  if (!l) return {};
  return {
    business_name: l.name || '', tagline: l.tagline || '', region: l.region || 'US',
    city: l.city || '', area: l.area || '', industry: l.industry || 'Other',
    established: l.established || '', asking_price: l.asking_price || '',
    cash_flow: l.cash_flow_sde || '', description: l.description || '',
    successor: (l.successor_types_wanted || [])[0] || 'any',
    owner_name: l.owner?.name || '', owner_email: l.owner?.email || '',
    status: l.status || 'live', show_on_map: !l.hideFromMap,
  };
}

function field(name, label, value = '', type = 'text') {
  return `<label class="field"><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(String(value))}"></label>`;
}

function listingForm(l) {
  const v = listingValues(l);
  const regionOptions = REGIONS.map((r) => `<option value="${r.code}"${r.code === v.region ? ' selected' : ''}>${esc(r.label)}</option>`).join('');
  const industries = ['Food & Beverage', 'Trades & Services', 'Professional Services', 'Personal Services', 'eCommerce', 'Hospitality', 'Healthcare', 'Other']
    .map((n) => `<option${n === v.industry ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const statusOptions = ['live', 'under_offer', 'sold', 'hidden']
    .map((s) => `<option value="${s}"${s === v.status ? ' selected' : ''}>${s.replace('_', ' ')}</option>`).join('');
  return `<form class="admin__form" data-listing-form>
    <h3>${l ? 'Edit listing' : 'Add listing'}</h3>
    <div class="admin__grid">
      ${field('business_name', 'Business name', v.business_name)}
      ${field('city', 'City', v.city)}
      <label class="field"><span>Region</span><select name="region">${regionOptions}</select></label>
      <label class="field"><span>Industry</span><select name="industry">${industries}</select></label>
      ${field('asking_price', 'Asking price', v.asking_price, 'number')}
      ${field('cash_flow', 'Cash flow (SDE)', v.cash_flow, 'number')}
      <label class="field"><span>Status</span><select name="status">${statusOptions}</select></label>
      <label class="field field--check"><span>Show on map</span><input name="show_on_map" type="checkbox"${v.show_on_map ? ' checked' : ''}></label>
    </div>
    <label class="field"><span>Description</span><textarea name="description" rows="3">${esc(v.description)}</textarea></label>
    <div class="admin__actions"><button class="btn btn--primary" type="submit">${l ? 'Save listing' : 'Add listing'}</button>
      ${l ? '<button class="btn btn--ghost" type="button" data-cancel-listing>Cancel</button>' : ''}</div>
  </form>`;
}

function marketForm(m) {
  const v = m || { name: '', code: '', lon: 0, lat: 0, labelDx: 0, labelDy: 0, active: true };
  const presets = CITY_PRESETS.map((c, i) => `<option value="${i}">${esc(c.name)}</option>`).join('');
  return `<form class="admin__form" data-market-form>
    <h3>${m ? 'Edit market' : 'Add market'}</h3>
    <label class="field"><span>City preset</span><select data-preset><option value="">Choose a city…</option>${presets}</select></label>
    <div class="admin__grid">
      ${field('name', 'Name', v.name)}
      ${field('code', 'Code', v.code)}
      ${field('lon', 'Longitude', v.lon, 'number')}
      ${field('lat', 'Latitude', v.lat, 'number')}
      ${field('labelDx', 'Label X offset', v.labelDx, 'number')}
      ${field('labelDy', 'Label Y offset', v.labelDy, 'number')}
      <label class="field field--check"><span>Active</span><input name="active" type="checkbox"${v.active !== false ? ' checked' : ''}></label>
    </div>
    <div class="admin__preview" data-map-preview aria-label="Market pin preview"></div>
    <div class="admin__actions"><button class="btn btn--primary" type="submit">${m ? 'Save market' : 'Add market'}</button>
      ${m ? '<button class="btn btn--ghost" type="button" data-cancel-market>Cancel</button>' : ''}</div>
  </form>`;
}

export function initAdmin() {
  const root = document.getElementById('admin-app');
  if (!root) return;
  const unlocked = () => {
    try { return sessionStorage.getItem(PASSCODE_KEY) === '1'; } catch { return false; }
  };
  const unlock = () => {
    try { sessionStorage.setItem(PASSCODE_KEY, '1'); } catch { /* private mode: session only */ }
    location.reload();
  };

  if (!unlocked()) {
    root.innerHTML = `<section class="panel admin__gate">
      <p class="eyebrow">Local admin</p><h1>Exit-Ready console</h1>
      <p class="muted">Placeholder passcode for this prototype: <code>${PLACEHOLDER_PASSCODE}</code>. This is NOT SECURITY — real auth arrives with the Supabase migration.</p>
      <form data-passcode><label class="field"><span>Passcode</span><input name="code" type="password" autocomplete="off"></label>
      <button class="btn btn--primary" type="submit">Open console</button></form>
    </section>`;
    root.querySelector('[data-passcode]').addEventListener('submit', (e) => {
      e.preventDefault();
      const code = new FormData(e.currentTarget).get('code');
      if (String(code) === PLACEHOLDER_PASSCODE) unlock();
      else e.currentTarget.querySelector('input').setCustomValidity('Incorrect placeholder passcode');
    });
    return;
  }

  const ui = { tab: 'listings', editingListing: null, editingMarket: null };
  let previewController = null;

  const tabs = () => `<div class="admin__tabs" role="tablist">
    ${['listings', 'markets', 'settings'].map((t) => `<button type="button" role="tab" aria-selected="${ui.tab === t}" data-tab="${t}" class="${ui.tab === t ? 'is-on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
  </div>`;

  const listingsPanel = () => {
    const rows = store.listAllListings();
    return `${listingForm(ui.editingListing)}
      <div class="admin__rows">
        ${rows.map((l) => `<article class="admin__row">
          <div class="admin__rowhead"><b>${esc(l.name)}</b><span class="admin__pill">${esc(l.status || 'live')}</span></div>
          <p class="muted">${esc(l.region)} · ${esc(l.industry || 'Other')} · ${esc(l.city || '')}</p>
          <div class="admin__quick">
            <button type="button" data-status="live" data-id="${l.id}">Live</button>
            <button type="button" data-status="under_offer" data-id="${l.id}">Under offer</button>
            <button type="button" data-status="sold" data-id="${l.id}">Mark sold</button>
            <button type="button" data-status="hidden" data-id="${l.id}">Hide</button>
          </div>
          <label class="field field--check"><span>Show on map</span><input type="checkbox" data-visibility="${l.id}"${l.hideFromMap ? '' : ' checked'}></label>
          <div class="admin__quick"><button type="button" data-edit-listing="${l.id}">Edit</button><button type="button" data-delete-listing="${l.id}">Delete</button></div>
        </article>`).join('')}
      </div>`;
  };

  const marketsPanel = () => {
    const rows = store.listMarkets();
    return `${marketForm(ui.editingMarket)}
      <div class="admin__rows">
        ${rows.map((m) => `<article class="admin__row">
          <div class="admin__rowhead"><b>${esc(m.name)}</b><span class="admin__pill">${esc(m.code)}${m.active === false ? ' · inactive' : ''}</span></div>
          <p class="muted">${Number(m.lon).toFixed(2)}, ${Number(m.lat).toFixed(2)}</p>
          <div class="admin__quick"><button type="button" data-edit-market="${m.id}">Edit</button><button type="button" data-delete-market="${m.id}">Delete</button></div>
        </article>`).join('')}
      </div>`;
  };

  const settingsPanel = () => {
    const s = store.getMapSettings();
    return `<form class="admin__form" data-settings-form>
      <h3>Map settings</h3>
      <label class="field field--check"><span>Show recently sold badges</span><input name="showSold" type="checkbox"${s.showSold ? ' checked' : ''}></label>
      ${field('soldDays', 'Sold window (days)', s.soldDays, 'number')}
      <div class="admin__actions"><button class="btn btn--primary" type="submit">Save settings</button></div>
    </form>`;
  };

  function render() {
    if (!unlocked()) return;
    root.innerHTML = `<div class="container admin">
      <div class="admin__top"><div><p class="eyebrow">Local admin</p><h1>Exit-Ready console</h1></div>
        <a class="btn btn--ghost" href="index.html">Back to site</a></div>
      <p class="notice notice--warn">Placeholder passcode only — NOT SECURITY. Edits live in this browser until the Supabase migration.</p>
      ${tabs()}
      <div class="panel admin__panel">${ui.tab === 'listings' ? listingsPanel() : ui.tab === 'markets' ? marketsPanel() : settingsPanel()}</div>
    </div>`;
    bind();
  }

  function preview() {
    const form = root.querySelector('[data-market-form]');
    if (!form) return;
    const draft = formToMarket(Object.fromEntries(new FormData(form)));
    if (!draft.name) draft.name = 'New market';
    if (!draft.code) draft.code = 'NEW';
    const holder = root.querySelector('[data-map-preview]');
    if (!holder) return;
    if (previewController) previewController.destroy();
    previewController = map.renderMap(holder, {
      mini: true, allMarkets: true, listings: [], markets: [draft],
      settings: store.getMapSettings(),
    });
  }

  function bind() {
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      ui.tab = b.dataset.tab; ui.editingListing = null; ui.editingMarket = null; render();
    }));

    const lf = root.querySelector('[data-listing-form]');
    if (lf) {
      lf.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(lf));
        const base = pkg.listingFromForm({ ...v, country: v.region });
        const existing = ui.editingListing ? store.findListing(ui.editingListing) : null;
        const next = {
          ...(existing || {}), ...base,
          id: existing ? existing.id : base.id,
          status: v.status || 'live',
          hideFromMap: !v.show_on_map,
          soldAt: v.status === 'sold' ? (existing?.soldAt || new Date().toISOString()) : null,
        };
        store.upsertListing(next);
        ui.editingListing = null; render();
      });
      const cancel = root.querySelector('[data-cancel-listing]');
      if (cancel) cancel.addEventListener('click', () => { ui.editingListing = null; render(); });
    }

    const mf = root.querySelector('[data-market-form]');
    if (mf) {
      const preset = mf.querySelector('[data-preset]');
      preset?.addEventListener('change', () => {
        const c = CITY_PRESETS[Number(preset.value)];
        if (!c) return;
        mf.elements.lon.value = String(c.lon);
        mf.elements.lat.value = String(c.lat);
        if (!mf.elements.name.value) mf.elements.name.value = c.name;
        preview();
      });
      mf.addEventListener('input', () => preview());
      mf.addEventListener('submit', (e) => {
        e.preventDefault();
        const next = formToMarket(Object.fromEntries(new FormData(mf)));
        if (!next.name || !next.code) { mf.reportValidity(); return; }
        if (!next.id) next.id = next.code.toLowerCase();
        store.upsertMarket(next);
        ui.editingMarket = null; render();
      });
      const cancel = root.querySelector('[data-cancel-market]');
      if (cancel) cancel.addEventListener('click', () => { ui.editingMarket = null; render(); });
      preview();
    }

    const sf = root.querySelector('[data-settings-form]');
    if (sf) sf.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(sf));
      store.setMapSettings({ showSold: Boolean(v.showSold), soldDays: Math.max(1, num(v.soldDays, 90)) });
      render();
    });

    root.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => {
      store.setStatus(b.dataset.id, b.dataset.status);
      render();
    }));
    root.querySelectorAll('[data-visibility]').forEach((box) => box.addEventListener('change', () => {
      const l = store.findListing(box.dataset.visibility);
      if (l) store.upsertListing({ ...l, hideFromMap: !box.checked });
    }));
    root.querySelectorAll('[data-edit-listing]').forEach((b) => b.addEventListener('click', () => {
      ui.editingListing = b.dataset.editListing; render();
      root.querySelector('[data-listing-form]')?.scrollIntoView({ block: 'start' });
    }));
    root.querySelectorAll('[data-delete-listing]').forEach((b) => b.addEventListener('click', () => {
      const l = store.findListing(b.dataset.deleteListing);
      if (l && confirm(`Delete “${l.name}”?`)) store.deleteListing(l.id);
    }));
    root.querySelectorAll('[data-edit-market]').forEach((b) => b.addEventListener('click', () => {
      ui.editingMarket = b.dataset.editMarket; render();
      root.querySelector('[data-market-form]')?.scrollIntoView({ block: 'start' });
    }));
    root.querySelectorAll('[data-delete-market]').forEach((b) => b.addEventListener('click', () => {
      const result = store.deleteMarket(b.dataset.deleteMarket);
      if (result.ok) return;
      if (result.reason !== 'in_use') { alert('That market could not be deleted.'); return; }
      const others = store.listMarkets().filter((m) => m.id !== b.dataset.deleteMarket);
      const target = others[0];
      const source = store.listMarkets().find((m) => m.id === b.dataset.deleteMarket);
      if (!target || !source) { alert('Add another market before deleting the last one.'); return; }
      if (!confirm(`${result.count} listings use this market. Reassign them to ${target.name} and delete?`)) return;
      for (const l of store.listAllListings()) {
        if (l.region === source.code || l.market === source.id) {
          store.upsertListing({ ...l, region: target.code, market: target.id });
        }
      }
      store.deleteMarket(source.id);
    }));
  }

  render();
  document.addEventListener(store.CHANGE_EVENT, () => render());
}
