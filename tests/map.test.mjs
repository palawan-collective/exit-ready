/* World map + store seam tests. Pure functions first, then the additive store API. */
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

const fired = [];
globalThis.document = {
  dispatchEvent: (e) => { fired.push(e.type); return true; },
};

const map = await import('../site/data/map.js');
const store = await import('../site/data/store.js');
const { MARKETS, HANDOFF_TEMPLATE } = await import('../site/data/listings.js');

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
}

const NOW = Date.parse('2026-11-23T00:00:00Z');
const US = MARKETS.find((m) => m.code === 'US');
const UK = MARKETS.find((m) => m.code === 'UK');
const settings = { showSold: true, soldDays: 90 };
const L = (id, patch) => ({ id, region: 'US', status: 'live', hideFromMap: false, ...patch });

/* ---------- pure visible rules ---------- */
const rows = [
  L('live-1', {}),
  L('offer-1', { status: 'under_offer' }),
  L('draft-1', { status: 'draft' }),
  L('hidden-1', { status: 'hidden' }),
  L('offmap-1', { hideFromMap: true }),
  L('sold-recent', { status: 'sold', soldAt: '2026-11-01T00:00:00Z' }),
  L('sold-old', { status: 'sold', soldAt: '2026-01-01T00:00:00Z' }),
];
const visible = map.visibleListings(rows, settings, NOW);
ok('visible keeps live and under_offer', visible.map((l) => l.id).join(',') === 'live-1,offer-1', visible.map((l) => l.id).join(','));
ok('visible drops hidden and hideFromMap', !visible.some((l) => l.id === 'hidden-1' || l.id === 'offmap-1'));
ok('visible excludes sold from marker size', !visible.some((l) => l.status === 'sold'));

ok('recent sold is visible as a badge', map.isRecentlySold(rows[5], settings, NOW) === true);
ok('sold older than soldDays drops off', map.isRecentlySold(rows[6], settings, NOW) === false);
ok('sold hidden by settings drops off', map.isRecentlySold(rows[5], { showSold: false, soldDays: 90 }, NOW) === false);
ok('sold badge count excludes old sales', map.soldBadgeCount(rows, US, settings, NOW) === 1);

/* ---------- derived counts ---------- */
const counts = map.mapCounts(rows, MARKETS, settings, NOW);
ok('live count is derived, not hardcoded', counts.live === 2, String(counts.live));
ok('market count only counts markets with visible listings', counts.markets === 1, String(counts.markets));
ok('milestones come from the handoff template', counts.milestones === HANDOFF_TEMPLATE.length);

const mixed = [
  L('a', { region: 'US', industry: 'Food & Beverage' }),
  L('b', { region: 'US', industry: 'Trades & Services' }),
  L('c', { region: 'UK', industry: 'Food & Beverage' }),
];
ok('market count derives from listings', map.countForMarket(mixed, US, settings, NOW) === 2);
ok('industry chip resizes the count', map.countForMarket(mixed, US, settings, NOW, 'Food & Beverage') === 1);
ok('second market has its own count', map.countForMarket(mixed, UK, settings, NOW) === 1);

/* ---------- market delete guard ---------- */
ok('delete guard blocks a market in use', map.canDeleteMarket('US', mixed).ok === false);
ok('delete guard reports how many listings use it', map.canDeleteMarket('US', mixed).count === 2);
ok('delete guard allows an unused market', map.canDeleteMarket('PT', mixed).ok === true);

/* ---------- store seam ---------- */
store.reset();
ok('markets are seeded from the region list', store.listMarkets().length === 9, String(store.listMarkets().length));
ok('sample markets carry coordinates', Number.isFinite(store.listMarkets()[0].lon) && Number.isFinite(store.listMarkets()[0].lat));

const m = store.upsertMarket({ id: 'zz', name: 'Test City', code: 'ZZ', lon: 1, lat: 2, active: true });
ok('upsertMarket writes a market', store.listMarkets().some((x) => x.id === 'zz' && x.name === 'Test City'));
ok('upsertMarket returns the market', m.code === 'ZZ');

store.upsertListing({ id: 'map-1', region: 'ZZ', name: 'Map listing' });
const blocked = store.deleteMarket('zz');
ok('deleteMarket refuses when listings exist', blocked.ok === false && blocked.reason === 'in_use');
ok('deleteMarket keeps the market on refusal', store.listMarkets().some((x) => x.id === 'zz'));

store.setStatus('map-1', 'sold', '2026-11-01T00:00:00Z');
ok('setStatus records soldAt', store.findListing('map-1').status === 'sold' && store.findListing('map-1').soldAt === '2026-11-01T00:00:00Z');
store.upsertListing({ id: 'map-1', region: 'ZZ', name: 'Map listing', status: 'live' });
ok('upsertListing defaults hideFromMap to false', store.findListing('map-1').hideFromMap === false);
ok('listAllListings goes through the store', store.listAllListings().some((l) => l.id === 'map-1'));

const settingsDefault = store.getMapSettings();
ok('map settings have safe defaults', settingsDefault.showSold === true && settingsDefault.soldDays === 90);
store.setMapSettings({ showSold: false, soldDays: 30 });
ok('map settings persist', store.getMapSettings().showSold === false && store.getMapSettings().soldDays === 30);

fired.length = 0;
store.upsertMarket({ id: 'yy', name: 'Event City', code: 'YY', lon: 3, lat: 4, active: true });
ok('writes emit a change event', fired.includes('exit-ready:change'));

store.upsertListing({ id: 'map-2', region: 'ZZ', name: 'Second' });
ok('deleteMarket succeeds once listings are gone', (store.deleteListing('map-1'), store.deleteListing('map-2'), store.deleteMarket('zz').ok === true));

/* ---------- admin pure helpers ---------- */
const admin = await import('../site/data/admin.js');
ok('city presets cover at least forty markets', admin.CITY_PRESETS.length >= 40, String(admin.CITY_PRESETS.length));
ok('city presets include London coordinates', admin.CITY_PRESETS.some((c) => c.name === 'London' && c.lon < 0 && c.lat > 50));
const draft = admin.formToMarket({ name: 'Test City', code: 'TC', lon: '12.5', lat: '-3.25', labelDx: '8', labelDy: '-4', active: 'on' });
ok('formToMarket maps a market row', draft.name === 'Test City' && draft.lon === 12.5 && draft.lat === -3.25 && draft.active === true);
ok('formToMarket defaults inactive when unchecked', admin.formToMarket({ name: 'X', code: 'XX', lon: '0', lat: '0' }).active === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
