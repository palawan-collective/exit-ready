/* Exit-Ready — Supabase connection.
 *
 * The publishable key is designed to be shipped in client code: it grants no
 * authority on its own, because every table is protected by Row Level Security
 * in the `exit_ready` schema. Do not put a service-role key in here.
 *
 * For local development copy this file's values into your environment, or edit
 * them directly before a deploy.
 */

export const SUPABASE_URL = 'https://khbtdhvoghdlicgidgkc.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jpdZ1_YxYDRsaGpvlcSbrg_tcJ8tAVX';

/** True when the browser should talk to Supabase instead of localStorage. */
export const REMOTE_ENABLED = SUPABASE_URL.startsWith('http') && SUPABASE_PUBLISHABLE_KEY.length > 20;
