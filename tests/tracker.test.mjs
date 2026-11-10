import {
  STATE_LABEL, STATUS_ORDER, DEFAULT_OWNER, OWNER_LABEL, ADAPTATION,
  milestoneState, counts, applyStatus, formatTimestamp, isComplete,
} from '../site/data/tracker.js';
import { LISTINGS, HANDOFF_TEMPLATE } from '../site/data/listings.js';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
}

const listing = LISTINGS.find(x => x.id === 'er-1003');

// 1. sample progress fallback
const s0 = milestoneState({}, listing, 'loi');
ok('sample progress fallback (loi=in_progress)', s0.status === 'in_progress', s0.status);
ok('default owner fallback (loi=joint)', s0.owner === DEFAULT_OWNER.loi, s0.owner);

// 2. done without sign-off is refused
let r = applyStatus({}, listing, 'loi', 'done', '2026-11-10 09:00');
ok('done without sign-off refused', r.error === 'signoff_required', JSON.stringify(r));
ok('state unchanged after refusal', r.state.loi === undefined, JSON.stringify(r.state));

// 3. sign both sides, then done
let state = { loi: { ...milestoneState({}, listing, 'loi'), seller: true, buyer: true } };
r = applyStatus(state, listing, 'loi', 'done', '2026-11-10 09:00');
ok('done with both sign-offs accepted', r.error === null && r.state.loi.status === 'done', JSON.stringify(r.state.loi));
ok('completed_at set on done', r.state.loi.completed_at === '2026-11-10 09:00', r.state.loi.completed_at);

// 4. moving out of done clears completed_at
r = applyStatus(r.state, listing, 'loi', 'in_progress', '2026-11-10 10:00');
ok('completed_at cleared when not done', r.state.loi.completed_at === '', JSON.stringify(r.state.loi));

// 5. blocked is allowed without sign-off
r = applyStatus({}, listing, 'nda', 'blocked');
ok('blocked allowed without sign-off', r.error === null && r.state.nda.status === 'blocked', JSON.stringify(r.state.nda));

// 6. invalid status refused
r = applyStatus({}, listing, 'loi', 'nonsense');
ok('invalid status refused', r.error === 'invalid_status', JSON.stringify(r));

// 7. counts
const c0 = counts({}, listing, HANDOFF_TEMPLATE);
ok('counts total = template length', c0.total === 12, String(c0.total));
ok('counts done = 0 for fresh state', c0.done === 0, String(c0.done));
ok('counts signed = 0 for fresh state', c0.signed === 0, String(c0.signed));

const doneState = {};
for (const m of HANDOFF_TEMPLATE) {
  doneState[m.id] = { status: 'done', seller: true, buyer: true, completed_at: '2026-11-10 09:00' };
}
const c1 = counts(doneState, listing, HANDOFF_TEMPLATE);
ok('counts done = 12 when all done', c1.done === 12, String(c1.done));
ok('counts signed = 12 when all done+signed', c1.signed === 12, String(c1.signed));

// 8. timestamp format
ok('timestamp format', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(formatTimestamp(new Date(2026, 10, 10, 9, 5))), formatTimestamp(new Date(2026, 10, 10, 9, 5)));

// 9. isComplete
ok('isComplete true when done+both', isComplete({ status: 'done', seller: true, buyer: true }) === true);
ok('isComplete false when done+one side', isComplete({ status: 'done', seller: true, buyer: false }) === false);
ok('isComplete false when not done', isComplete({ status: 'in_progress', seller: true, buyer: true }) === false);

// 10. label/owner/adaptation tables are complete
ok('STATUS_ORDER matches STATE_LABEL keys', JSON.stringify(STATUS_ORDER) === JSON.stringify(Object.keys(STATE_LABEL)));
ok('every template milestone has a default owner', HANDOFF_TEMPLATE.every(m => DEFAULT_OWNER[m.id]));
ok('every successor type has adaptation notes', ['employee', 'local_operator', 'first_time', 'any'].every(k => ADAPTATION[k]?.length));
ok('OWNER_LABEL has seller/buyer/joint', ['seller', 'buyer', 'joint'].every(k => OWNER_LABEL[k]));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
