/* Exit-Ready — remote data layer (Supabase).
 *
 * Every call here is async and maps one-to-one onto the `exit_ready` schema.
 * Nothing in this file touches the DOM. `store.js` is the seam the pages use;
 * this is what sits on the other side of it when the browser has a network.
 */

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

let clientPromise = null;

/** Lazily create the Supabase client from the CDN module. */
export function client() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
      .then((m) => m.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      }))
      .catch((e) => { clientPromise = null; throw e; });
  }
  return clientPromise;
}

export function isRemote() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

/* PostgREST exposes views, and a view does not inherit its table's column
 * defaults. Generate identifiers and timestamps here so inserts through the
 * `er_*` views work without relying on base-table defaults. */
function newId() {
  return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}
function nowIso() { return new Date().toISOString(); }

/* ---------- auth ---------- */

export async function currentSession() {
  const c = await client();
  const { data, error } = await c.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password, { displayName = '', role = 'buyer' } = {}) {
  const c = await client();
  const { data, error } = await c.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    await ensureProfile(data.user.id, { email, displayName, role });
  }
  return data.user;
}

export async function signInWithPassword(email, password) {
  const c = await client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    const profile = await ensureProfile(data.user.id, { email: data.user.email || email });
    return { user: data.user, profile };
  }
  return { user: null, profile: null };
}

export async function signOut() {
  const c = await client();
  const { error } = await c.auth.signOut();
  if (error) throw error;
}

/** Create the caller's profile row on first contact; never overwrite an existing role. */
export async function ensureProfile(userId, { email = '', displayName = '', role = '' } = {}) {
  const c = await client();
  const { data: existing } = await c
    .schema('public').from('er_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await c
    .schema('public').from('er_profiles')
    .insert({ id: userId, role: role || 'buyer', email, display_name: displayName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProfile(userId) {
  const c = await client();
  const { data, error } = await c.schema('public').from('er_profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, patch) {
  const c = await client();
  const { data, error } = await c.schema('public').from('er_profiles').update(patch).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

/* ---------- listings ---------- */

const LISTING_COLUMNS = [
  'id', 'owner_id', 'region', 'name', 'tagline', 'city', 'area', 'industry', 'established',
  'asking_price', 'gross_revenue', 'cash_flow_sde', 'ebitda', 'inventory_amount',
  'inventory_included_in_price', 'financing_ready', 'employees_count', 'employee_type',
  'real_estate_status', 'building_sf', 'lease_expiration', 'monthly_rent', 'nnn', 'hours',
  'monthly_payroll', 'reason_for_selling', 'successor_types_wanted', 'seller_financing_offered',
  'earn_out_offered', 'disclosure_flags', 'description', 'highlights', 'owner_name', 'owner_email',
  'status', 'created_at', 'updated_at',
].join(',');

export async function listListings({ status = 'live', limit = 200 } = {}) {
  const c = await client();
  let q = c.schema('public').from('er_listings').select(LISTING_COLUMNS).order('created_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getListing(id) {
  const c = await client();
  const { data, error } = await c.schema('public').from('er_listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createListing(fields) {
  const c = await client();
  const { data, error } = await c.schema('public').from('er_listings')
    .insert({ id: newId(), ...fields }).select().single();
  if (error) throw error;
  return data;
}

export async function updateListing(id, patch) {
  const c = await client();
  const { data, error } = await c
    .schema('public').from('er_listings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteListing(id) {
  const c = await client();
  const { error } = await c.schema('public').from('er_listings').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- verification ---------- */

export async function getVerification(userId, role) {
  const c = await client();
  const { data, error } = await c
    .schema('public').from('er_verification')
    .select('data')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

export async function setVerification(userId, role, data) {
  const c = await client();
  const { error } = await c
    .schema('public').from('er_verification')
    .upsert({ id: newId(), user_id: userId, role, data }, { onConflict: 'user_id,role' });
  if (error) throw error;
}

/* ---------- deals ---------- */

export async function getDeal(listingId, buyerId) {
  const c = await client();
  const { data, error } = await c
    .schema('public').from('er_deals')
    .select('*')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertDeal(listingId, buyerId, patch) {
  const c = await client();
  const { data, error } = await c
    .schema('public').from('er_deals')
    .upsert({ id: newId(), listing_id: listingId, buyer_id: buyerId, ...patch, updated_at: nowIso() },
      { onConflict: 'listing_id,buyer_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------- messages ---------- */

export async function getThread(listingId) {
  const c = await client();
  const { data, error } = await c
    .schema('public').from('er_messages')
    .select('id, listing_id, from_role, sender_name, body, created_at')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendMessage({ listingId, dealId = null, senderId, fromRole, senderName, body }) {
  const c = await client();
  const { data, error } = await c
    .schema('public').from('er_messages')
    .insert({
      id: newId(),
      listing_id: listingId, deal_id: dealId, sender_id: senderId,
      from_role: fromRole, sender_name: senderName, body,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------- saved listings and alerts ---------- */

export async function getSaved(userId) {
  const c = await client();
  const { data, error } = await c.schema('public').from('er_saved_listings').select('listing_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((r) => r.listing_id);
}

export async function toggleSaved(userId, listingId) {
  const c = await client();
  const { data } = await c.schema('public').from('er_saved_listings')
    .select('listing_id').eq('user_id', userId).eq('listing_id', listingId).maybeSingle();
  if (data) {
    const { error } = await c.schema('public').from('er_saved_listings')
      .delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) throw error;
    return false;
  }
  const { error } = await c.schema('public').from('er_saved_listings')
    .insert({ user_id: userId, listing_id: listingId, created_at: nowIso() });
  if (error) throw error;
  return true;
}

export async function getAlertsSeen(userId) {
  const c = await client();
  const { data, error } = await c.schema('public').from('er_alerts_seen').select('seen_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? data.seen_at : null;
}

export async function markAlertsSeen(userId) {
  const c = await client();
  const { error } = await c.schema('public').from('er_alerts_seen').upsert(
    { user_id: userId, seen_at: nowIso() },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

/* ---------- site settings (the admin screen's data) ---------- */

export async function getSiteSettings() {
  const c = await client();
  const { data, error } = await c.schema('public').from('er_site_settings').select('*').eq('id', 'default').maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSiteSettings(patch) {
  const c = await client();
  const { data, error } = await c
    .schema('public').from('er_site_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 'default')
    .select()
    .single();
  if (error) throw error;
  return data;
}
