/* Exit-Ready — client-side store, with an optional Supabase mirror.
 *
 * The pages call this module synchronously. Reads come from an in-memory state
 * object that `ready()` fills; writes are applied locally and then mirrored to
 * Supabase when a session exists. With no network or no session the prototype
 * behaves exactly as it did before.
 */

import { LISTINGS as SAMPLE_LISTINGS } from './listings.js';
import * as db from './db.js';
import { REMOTE_ENABLED } from './config.js';

const KEY = 'exit-ready:state:v1';

let state = null;
let session = null;
let primed = false;

/* ---------- local persistence (always on) ---------- */

function load() {
  if (state !== null) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : {};
  } catch {
    state = {};
  }
  return state;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function reset() {
  state = {};
  save();
  return state;
}

/* ---------- user / session ---------- */

export function getUser() { return load().user || null; }

export function setUser(user) {
  load().user = { ...user, at: new Date().toISOString() };
  save();
  return load().user;
}

export function clearUser() {
  delete load().user;
  save();
}

export function currentSession() { return session; }

export function isSignedIn() { return Boolean(session?.userId); }
export function isAdmin() { return session?.profile?.role === 'admin'; }
export function isOwnerRole() { return session?.profile?.role === 'owner' || isAdmin(); }

/**
 * Fill the in-memory state from Supabase when a session exists.
 *
 * Fast path and timeout are both deliberate: this must never hold up a page
 * render. With no cached session it returns immediately; with one it still
 * gives up after a few seconds rather than hanging forever.
 */
export async function ready() {
  if (primed) return session;
  primed = true;
  if (!REMOTE_ENABLED || !db.isRemote() || !hasCachedSession()) return null;
  try {
    const s = await withTimeout(db.currentSession(), 4000);
    if (!s?.user) return null;
    const profile = await withTimeout(db.ensureProfile(s.user.id, { email: s.user.email || '' }), 4000);
    session = { userId: s.user.id, email: s.user.email || '', profile };
    await withTimeout(pullRemote(), 6000);
    setUser({
      role: profile.role === 'admin' ? 'owner' : profile.role,
      name: profile.display_name || s.user.email || '',
      email: s.user.email || '',
      remote: true,
    });
  } catch (e) {
    console.warn('Exit-Ready: remote state unavailable, continuing locally.', e);
    session = null;
  }
  return session;
}

function hasCachedSession() {
  try {
    const raw = localStorage.getItem('sb-khbtdhvoghdlicgidgkc-auth-token');
    return Boolean(raw && raw !== 'null');
  } catch { return false; }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function pullRemote() {
  const s = load();
  const [live, mine, verification, saved, seenAt] = await Promise.all([
    db.listListings({ status: 'live' }),
    db.listListings({ status: '' }),
    Promise.all([db.getVerification(session.userId, 'owner'), db.getVerification(session.userId, 'buyer')]),
    db.getSaved(session.userId),
    db.getAlertsSeen(session.userId),
  ]);

  const mineIds = new Set(mine.map((l) => l.id));
  s.listings = [...mine, ...live.filter((l) => !mineIds.has(l.id))].map(toLocalListing);
  s.verification = { owner: verification[0], buyer: verification[1] };
  s.saved = saved;
  s.alertsSeenAt = seenAt;

  const deals = {};
  for (const l of s.listings) {
    if (l.owner_id === session.userId) {
      // Seller side: every deal on this listing.
      await pullDeals(l.id, null, deals, true);
    } else {
      await pullDeals(l.id, session.userId, deals, false);
    }
  }
  s.deals = deals;
  save();
}

async function pullDeals(listingId, buyerId, into, asSeller) {
  const rows = asSeller
    ? await db.client().then((c) => c.from('exit_ready.deals').select('*').eq('listing_id', listingId))
    : await db.getDeal(listingId, buyerId);
  const list = asSeller ? (rows.data || []) : (rows ? [rows] : []);
  for (const row of list) {
    const thread = await db.getThread(listingId);
    into[listingId] = {
      listingId,
      buyerId: row.buyer_id,
      nda: row.nda || {},
      offer: row.offer || {},
      milestones: row.milestones || {},
      thread: thread.map((m) => ({ from: m.from_role, name: m.sender_name, text: m.body, at: m.created_at })),
    };
  }
}

function toLocalListing(row) {
  return {
    ...row,
    id: String(row.id),
    sample: false,
    owner: { name: row.owner_name || '', email: row.owner_email || '' },
    handoff_progress: undefined,
    createdByMe: false,
  };
}

/** Push a locally written listing to Supabase. Call after addListing. */
export async function persistListing(listing) {
  if (!isSignedIn()) return null;
  try {
    return await db.createListing(toRemoteListing(listing, session.userId));
  } catch (e) {
    console.warn('Exit-Ready: listing not saved remotely.', e);
    throw e;
  }
}

function toRemoteListing(l, ownerId) {
  return {
    owner_id: ownerId,
    region: l.region,
    name: l.name,
    tagline: l.tagline || '',
    city: l.city || '',
    area: l.area || '',
    industry: l.industry || 'Other',
    established: l.established || null,
    asking_price: l.asking_price || 0,
    gross_revenue: l.gross_revenue || 0,
    cash_flow_sde: l.cash_flow_sde || 0,
    ebitda: l.ebitda || null,
    inventory_amount: l.inventory_amount || 0,
    inventory_included_in_price: Boolean(l.inventory_included_in_price),
    financing_ready: Boolean(l.financing_ready),
    employees_count: l.employees_count || 0,
    employee_type: l.employee_type || '',
    real_estate_status: l.real_estate_status || '',
    building_sf: l.building_sf || null,
    lease_expiration: l.lease_expiration || null,
    monthly_rent: l.monthly_rent || null,
    nnn: l.nnn || null,
    hours: l.hours || '',
    monthly_payroll: l.monthly_payroll || null,
    reason_for_selling: l.reason_for_selling || '',
    successor_types_wanted: l.successor_types_wanted || [],
    seller_financing_offered: Boolean(l.seller_financing_offered),
    earn_out_offered: Boolean(l.earn_out_offered),
    disclosure_flags: l.disclosure_flags || [],
    description: l.description || '',
    highlights: l.highlights || [],
    owner_name: l.owner?.name || '',
    owner_email: l.owner?.email || '',
    status: l.status || 'draft',
  };
}

/* ---------- listings ---------- */

export function userListings() { return load().listings || []; }
export function allListings() { return [...userListings(), ...SAMPLE_LISTINGS]; }
export function findListing(id) { return allListings().find((l) => l.id === id) || null; }
export function isUserListing(id) { return userListings().some((l) => l.id === id); }

/** True when the listing was created in this browser. Used to decide which side you are. */
export function isOwnerOf(id) { return isUserListing(id); }

export function addListing(listing) {
  const s = load();
  s.listings = [...(s.listings || []), listing];
  save();
  return listing;
}

export async function updateListing(id, patch) {
  const s = load();
  s.listings = (s.listings || []).map((l) => (l.id === id ? { ...l, ...patch } : l));
  save();
  if (isSignedIn() && isOwnerRole()) {
    try { await db.updateListing(id, patch); } catch (e) { console.warn('Exit-Ready: update not saved remotely.', e); }
  }
  return findListing(id);
}

export async function deleteListing(id) {
  const s = load();
  s.listings = (s.listings || []).filter((l) => l.id !== id);
  save();
  if (isSignedIn() && isOwnerRole()) {
    try { await db.deleteListing(id); } catch (e) { console.warn('Exit-Ready: delete not saved remotely.', e); }
  }
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

/* ---------- sold state (the comparables engine) ---------- */

/** Close a listing on a sale. Records the realised price and the date. */
export async function markSold(id, soldPrice, soldOn = new Date().toISOString()) {
  const listing = findListing(id);
  if (!listing) return null;
  const patch = {
    status: 'sold',
    sold_price: Number(soldPrice) || 0,
    sold_at: soldOn,
  };
  if (isSignedIn() && isOwnerRole()) {
    try { await db.updateListing(id, patch); } catch (e) { console.warn('Exit-Ready: sold state not saved remotely.', e); }
  }
  const s = load();
  s.listings = (s.listings || []).map((l) => (l.id === id ? { ...l, ...patch } : l));
  save();
  return findListing(id);
}

export function soldListings() {
  return userListings().filter((l) => l.status === 'sold');
}

/** Median sold price for an industry, from everything sold in this browser. */
export function soldComparables(industry) {
  const rows = industry ? soldListings().filter((l) => l.industry === industry) : soldListings();
  if (!rows.length) return null;
  const prices = rows.map((l) => l.sold_price).filter((p) => p > 0).sort((a, b) => a - b);
  if (!prices.length) return null;
  const mid = Math.floor(prices.length / 2);
  return {
    count: prices.length,
    median: prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2),
    low: prices[0],
    high: prices[prices.length - 1],
  };
}

/* ---------- verification ---------- */

export function getVerification(role) { return (load().verification || {})[role] || null; }

export async function setVerification(role, value) {
  const s = load();
  s.verification = { ...(s.verification || {}), [role]: value };
  save();
  if (isSignedIn()) {
    try { await db.setVerification(session.userId, role, value); }
    catch (e) { console.warn('Exit-Ready: verification not saved remotely.', e); }
  }
  return value;
}

/* ---------- deals ---------- */

export function getDeal(listingId) { return (load().deals || {})[listingId] || null; }

/** Raw view of every deal, keyed by listing id. For bulk operations. */
export function allDealsRaw() { return load().deals || {}; }

export function replaceDeals(deals) {
  const s = load();
  s.deals = deals;
  save();
}

export function allDeals() {
  const out = [];
  for (const [listingId, deal] of Object.entries(load().deals || {})) {
    const listing = findListing(listingId);
    if (listing) out.push({ listingId, listing, deal });
  }
  return out;
}

export async function setDeal(listingId, deal) {
  const s = load();
  s.deals = { ...(s.deals || {}), [listingId]: deal };
  save();
  if (isSignedIn() && !isOwnerRole()) {
    try {
      await db.upsertDeal(listingId, session.userId, {
        nda: deal.nda || {},
        offer: deal.offer || {},
        milestones: deal.milestones || {},
      });
    } catch (e) { console.warn('Exit-Ready: deal not saved remotely.', e); }
  }
  return deal;
}

/* ---------- messages ---------- */

export function threadFor(listingId) { return (load().deals || {})[listingId]?.thread || []; }

export async function appendMessage(listingId, message) {
  const s = load();
  const deal = (s.deals || {})[listingId] || { listingId };
  deal.thread = [...(deal.thread || []), { ...message, at: message.at || new Date().toISOString() }];
  s.deals = { ...(s.deals || {}), [listingId]: deal };
  save();
  if (isSignedIn()) {
    try {
      await db.sendMessage({
        listingId,
        dealId: deal.buyerId ? null : null,
        senderId: session.userId,
        fromRole: message.from,
        senderName: message.name,
        body: message.text,
      });
    } catch (e) { console.warn('Exit-Ready: message not saved remotely.', e); }
  }
  return deal.thread;
}

export function unreadFor(listingId, role) {
  return threadFor(listingId).filter((m) => m.from !== role).length;
}

/* ---------- alerts ---------- */

export function alertsSeenAt() { return load().alertsSeenAt || null; }

export async function markAlertsSeen() {
  const s = load();
  s.alertsSeenAt = new Date().toISOString();
  save();
  if (isSignedIn()) {
    try { await db.markAlertsSeen(session.userId); }
    catch (e) { console.warn('Exit-Ready: alert timestamp not saved remotely.', e); }
  }
}

/* ---------- saved ---------- */

export function savedIds() { return load().saved || []; }

export async function toggleSaved(id) {
  const s = load();
  const now = !(s.saved || []).includes(id);
  s.saved = now ? [...(s.saved || []), id] : (s.saved || []).filter((x) => x !== id);
  save();
  if (isSignedIn()) {
    try { await db.toggleSaved(session.userId, id); }
    catch (e) { console.warn('Exit-Ready: save not saved remotely.', e); }
  }
  return s.saved;
}

export function isSaved(id) { return savedIds().includes(id); }
