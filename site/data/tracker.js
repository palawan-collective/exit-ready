/* Exit-Ready — handoff tracker state logic.
 *
 * Pure functions only: no DOM, no storage. The page owns rendering and
 * persistence; this module owns the rules, so they can be tested directly.
 */

export const STATE_LABEL = {
  pending: 'pending',
  in_progress: 'in progress',
  done: 'done',
  blocked: 'blocked',
};

export const STATUS_ORDER = ['pending', 'in_progress', 'done', 'blocked'];

/* Which side moves each milestone by default. The parties can change this per deal. */
export const DEFAULT_OWNER = {
  loi: 'joint',
  nda: 'buyer',
  verification: 'buyer',
  offer: 'joint',
  deposit: 'buyer',
  consent: 'seller',
  licence: 'seller',
  staff: 'seller',
  training: 'seller',
  accounts: 'seller',
  final: 'buyer',
  support: 'joint',
};

export const OWNER_LABEL = {
  seller: 'Seller',
  buyer: 'Buyer',
  joint: 'Both sides',
};

/* How the plan adapts, keyed by successor type. Rendered on the deal page. */
export const ADAPTATION = {
  employee: [
    'Training period is typically longest, because the buyer is learning ownership rather than the trade.',
    'Staged payments are normal. Milestone five and milestone eleven often carry instalments.',
    'Staff notification is sensitive: the team is the buyer, so sequencing matters.',
    'Post-sale support usually runs longest here. The seller often stays reachable for months.',
  ],
  local_operator: [
    'Diligence is fastest. The buyer already knows the trade and often the area.',
    'Training period is short. Handover of accounts and credentials is the bulk of it.',
    'Earn-outs are less common; a straightforward purchase with a deposit is more typical.',
  ],
  first_time: [
    'Financing takes longest. The verification window matters most here.',
    'Training runs long, and often covers basic business administration, not just the trade.',
    'Licence and permit transfer is more likely to need hand-holding.',
    'Post-sale support is essential. Budget for it explicitly rather than promising it verbally.',
  ],
  any: ['Open to any verified successor. Sequence and pace are agreed case by case.'],
};

/** Read one milestone's effective state, falling back to the listing's sample progress. */
export function milestoneState(state, listing, milestoneId) {
  const saved = (state && state[milestoneId]) || {};
  return {
    status: saved.status || listing.handoff_progress?.[milestoneId] || 'pending',
    owner: saved.owner || DEFAULT_OWNER[milestoneId] || 'joint',
    due: saved.due || '',
    evidence: saved.evidence || '',
    seller: Boolean(saved.seller),
    buyer: Boolean(saved.buyer),
    completed_at: saved.completed_at || '',
  };
}

/** Count milestones done and fully signed off. */
export function counts(state, listing, template) {
  const all = template.map((m) => milestoneState(state, listing, m.id));
  return {
    total: template.length,
    done: all.filter((s) => s.status === 'done').length,
    signed: all.filter((s) => s.status === 'done' && s.seller && s.buyer).length,
  };
}

/**
 * Attempt a status change. A milestone can only be marked done once both sides
 * have signed off. Returns the next state and an error code (or null).
 */
export function applyStatus(state, listing, milestoneId, next, now = '') {
  const current = milestoneState(state, listing, milestoneId);
  if (!STATUS_ORDER.includes(next)) {
    return { state, error: 'invalid_status' };
  }
  if (next === 'done' && !(current.seller && current.buyer)) {
    return { state, error: 'signoff_required' };
  }
  const nextState = {
    ...state,
    [milestoneId]: {
      ...current,
      status: next,
      completed_at: next === 'done' ? current.completed_at || now : '',
    },
  };
  return { state: nextState, error: null };
}

/** Locale-independent timestamp: YYYY-MM-DD HH:MM */
export function formatTimestamp(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} `
    + `${p(date.getHours())}:${p(date.getMinutes())}`;
}

/** True when the milestone is done and both parties have signed. */
export function isComplete(s) {
  return s.status === 'done' && s.seller && s.buyer;
}
