/* Exit-Ready — client-side store.
 *
 * One localStorage-backed state object shared by every page. There is no
 * backend yet; this is the prototype's stand-in for accounts, listings,
 * verification, offers and deals. Everything a user enters survives a reload
 * and appears on the other side of the marketplace.
 */

import { LISTINGS as SAMPLE_LISTINGS } from './listings.js';

const KEY = 'exit-ready:state:v1';

let state = null;

export function load() {
  if (state !== null) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : {};
  } catch {
    state = {};
  }
  return state;
}

export function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function reset() {
  state = {};
  save();
  return state;
}

/* ---------- user ---------- */

export function getUser() { return load().user || null; }

export function setUser(user) {
  load().user = { ...user, at: new Date().toISOString() };
  save();
  return load().user;
}

/** Clear only the active role, keeping listings, verification and deals. */
export function clearUser() {
  delete load().user;
  save();
}

/* ---------- listings ---------- */

export function userListings() { return load().listings || []; }

export function allListings() { return [...userListings(), ...SAMPLE_LISTINGS]; }

export function findListing(id) { return allListings().find((l) => l.id === id) || null; }

export function isUserListing(id) { return userListings().some((l) => l.id === id); }

export function addListing(listing) {
  const s = load();
  s.listings = [...(s.listings || []), listing];
  save();
  return listing;
}

export function updateListing(id, patch) {
  const s = load();
  s.listings = (s.listings || []).map((l) => (l.id === id ? { ...l, ...patch } : l));
  save();
  return findListing(id);
}

/* ---------- verification ---------- */

export function getVerification(role) { return (load().verification || {})[role] || null; }

export function setVerification(role, value) {
  const s = load();
  s.verification = { ...(s.verification || {}), [role]: value };
  save();
  return value;
}

/* ---------- deals ---------- */

export function getDeal(listingId) { return (load().deals || {})[listingId] || null; }

export function allDeals() {
  const out = [];
  for (const [listingId, deal] of Object.entries(load().deals || {})) {
    const listing = findListing(listingId);
    if (listing) out.push({ listingId, listing, deal });
  }
  return out;
}

export function setDeal(listingId, deal) {
  const s = load();
  s.deals = { ...(s.deals || {}), [listingId]: deal };
  save();
  return deal;
}

/* ---------- message thread (buyer <-> owner, per listing) ---------- */

export function threadFor(listingId) {
  return (load().deals || {})[listingId]?.thread || [];
}

export function appendMessage(listingId, message) {
  const deal = getDeal(listingId) || { listingId };
  deal.thread = [...(deal.thread || []), {
    from: message.from,
    name: message.name,
    text: message.text,
    at: message.at || new Date().toISOString(),
  }];
  return setDeal(listingId, deal);
}

export function unreadFor(listingId, role) {
  return threadFor(listingId).filter((m) => m.from !== role).length;
}

/* ---------- alerts (buyer) ---------- */

export function alertsSeenAt() { return load().alertsSeenAt || null; }

export function markAlertsSeen() {
  const s = load();
  s.alertsSeenAt = new Date().toISOString();
  save();
}

/* ---------- listing lifecycle (owner) ---------- */

export function deleteListing(id) {
  const s = load();
  s.listings = (s.listings || []).filter((l) => l.id !== id);
  save();
}

export function duplicateListing(id) {
  const source = findListing(id);
  if (!source) return null;
  const copy = {
    ...source,
    id: 'er-' + Date.now().toString(36),
    name: `${source.name} (copy)`,
    createdAt: new Date().toISOString(),
    status: 'draft',
  };
  return addListing(copy);
}

/* ---------- saved listings (buyer) ---------- */

export function savedIds() { return load().saved || []; }

export function toggleSaved(id) {
  const s = load();
  const cur = s.saved || [];
  s.saved = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  save();
  return s.saved;
}

export function isSaved(id) { return savedIds().includes(id); }
