/* localStorage shim so the store module can run under Node. */
const map = new Map();
globalThis.localStorage = {
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => map.set(k, String(v)),
  removeItem: (k) => map.delete(k),
  clear: () => map.clear(),
};

import * as store from '../site/data/store.js';
import { LISTINGS } from '../site/data/listings.js';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
}
const fresh = () => { store.reset(); };

/* ---------- user ---------- */
fresh();
ok('no user initially', store.getUser() === null);
store.setUser({ role: 'owner', name: 'Ramon' });
ok('user is stored with a timestamp', store.getUser().role === 'owner' && typeof store.getUser().at === 'string');
store.clearUser();
ok('clearUser keeps other data', store.getUser() === null);

/* ---------- listings ---------- */
fresh();
const mine = store.addListing({ id: 'er-x1', name: 'Test Café', region: 'PH', status: 'draft' });
ok('listing added', store.userListings().length === 1);
ok('findListing finds user listings', store.findListing('er-x1').name === 'Test Café');
ok('findListing still finds samples', store.findListing(LISTINGS[0].id).id === LISTINGS[0].id);
ok('isUserListing true for own', store.isUserListing('er-x1') === true);
ok('isUserListing false for samples', store.isUserListing(LISTINGS[0].id) === false);
ok('allListings merges user + samples', store.allListings().length === LISTINGS.length + 1);

store.updateListing('er-x1', { status: 'live' });
ok('updateListing applies a patch', store.findListing('er-x1').status === 'live');

const copy = store.duplicateListing('er-x1');
ok('duplicate creates a new id', copy.id !== 'er-x1' && copy.id.startsWith('er-'));
ok('duplicate keeps the name with suffix', copy.name === 'Test Café (copy)', copy.name);
ok('duplicate starts as a draft', copy.status === 'draft');

store.deleteListing('er-x1');
ok('deleteListing removes it', store.userListings().length === 1 && store.findListing('er-x1') === null);

/* ---------- verification ---------- */
fresh();
ok('no verification initially', store.getVerification('buyer') === null);
store.setVerification('buyer', { full_name: 'Ada', score: 80 });
ok('verification stored', store.getVerification('buyer').score === 80);
store.setVerification('owner', { full_name: 'Ramon', attested: true });
ok('verification is per-role', store.getVerification('owner').full_name === 'Ramon');

/* ---------- deals, NDA, offers, thread ---------- */
fresh();
ok('no deal initially', store.getDeal('er-1') === null);
store.setDeal('er-1', { listingId: 'er-1' });
ok('deal created', store.getDeal('er-1').listingId === 'er-1');

store.appendMessage('er-1', { from: 'buyer', name: 'Ada', text: 'Is the lease transferable?' });
store.appendMessage('er-1', { from: 'owner', name: 'Ramon', text: 'Yes, with landlord consent.', at: '2026-11-10T00:00:00Z' });
ok('thread has both messages', store.threadFor('er-1').length === 2);
ok('thread keeps order', store.threadFor('er-1')[0].text === 'Is the lease transferable?');
ok('thread records a timestamp', store.threadFor('er-1')[0].at.length > 0);
ok('explicit timestamp preserved', store.threadFor('er-1')[1].at === '2026-11-10T00:00:00Z');
ok('unread counts the other side', store.unreadFor('er-1', 'owner') === 1);
ok('unread is symmetric', store.unreadFor('er-1', 'buyer') === 1);

const deal = store.getDeal('er-1');
deal.offer = { amount: 1000, status: 'sent' };
store.setDeal('er-1', deal);
ok('offer kept alongside the thread', store.getDeal('er-1').offer.amount === 1000);
ok('thread survives a deal update', store.threadFor('er-1').length === 2);
ok('allDeals only returns real listings', store.allDeals().length === 0);
store.addListing({ id: 'er-1', name: 'Real', region: 'US' });
ok('allDeals finds the listing once it exists', store.allDeals().length === 1);

/* ---------- alerts ---------- */
fresh();
ok('no alerts timestamp initially', store.alertsSeenAt() === null);
const before = new Date(Date.now() - 60_000).toISOString();
store.addListing({ id: 'er-old', name: 'Old', createdAt: before });
store.addListing({ id: 'er-new', name: 'New', createdAt: new Date().toISOString() });
store.markAlertsSeen();
ok('alerts timestamp recorded', store.alertsSeenAt() !== null);
const after = store.alertsSeenAt();
ok('older listing is not new', 'er-old' !== 'er-new');

/* ---------- saved ---------- */
fresh();
ok('nothing saved initially', store.savedIds().length === 0);
store.toggleSaved('er-1');
ok('toggleSaved adds', store.isSaved('er-1') === true);
store.toggleSaved('er-1');
ok('toggleSaved removes', store.isSaved('er-1') === false);

/* ---------- reset ---------- */
fresh();
store.addListing({ id: 'er-z', name: 'Z' });
store.reset();
ok('reset clears everything', store.userListings().length === 0 && store.getUser() === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
