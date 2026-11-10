
import { LISTINGS, HANDOFF_TEMPLATE, SUCCESSOR_TYPES } from 'file:///C:/dev/exit-ready/site/data/listings.js';
import { esc } from 'file:///C:/dev/exit-ready/site/data/format.js';
import {
  STATE_LABEL, STATUS_ORDER, OWNER_LABEL, ADAPTATION,
  milestoneState, counts, applyStatus, formatTimestamp, isComplete,
} from 'file:///C:/dev/exit-ready/site/data/tracker.js';
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';

const id = new URLSearchParams(location.search).get('id');
const l = store.findListing(id) || LISTINGS[0];
const KEY = `exit-ready:deal:${l.id}`;
const root = document.getElementById('deal-root');

document.title = `${l.name} — handoff tracker — Exit-Ready`;

function load() {
  const deal = store.getDeal(l.id);
  return deal?.milestones || {};
}
function save() {
  const deal = store.getDeal(l.id) || { listingId: l.id };
  deal.milestones = state;
  store.setDeal(l.id, deal);
}

let state = load();

const ms = (m) => milestoneState(state, l, m.id);
const dealCounts = () => counts(state, l, HANDOFF_TEMPLATE);

function render() {
  const c = dealCounts();
  const wanted = l.successor_types_wanted.map(sid => SUCCESSOR_TYPES.find(s => s.id === sid)).filter(Boolean);
  const adaptIds = [...new Set(l.successor_types_wanted)];
  const adaptHtml = adaptIds.map(id2 => {
    const s = SUCCESSOR_TYPES.find(x => x.id === id2);
    const notes = ADAPTATION[id2] || [];
    return `
      <div style="margin-bottom: var(--s-4)">
        <h3 style="font-family: var(--font-ui); font-size: var(--step--1); margin-bottom: var(--s-2)">${esc(s ? s.label : id2)}</h3>
        <ul style="font-family: var(--font-ui); font-size: var(--step--1); color: var(--ink-muted); padding-left: 1.15em; margin: 0">
          ${notes.map(n => `<li>${esc(n)}</li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  root.innerHTML = `
    <p style="font-family: var(--font-ui); font-size: var(--step--1); margin-bottom: var(--s-4)">
      <a href="browse.html">Browse</a> <span class="muted">/</span>
      <a href="listing.html?id=${encodeURIComponent(l.id)}">${esc(l.name)}</a> <span class="muted">/</span>
      <span class="muted">Handoff tracker</span>
    </p>

    <h1 style="font-size: var(--step-4); letter-spacing:-0.025em; margin-bottom: var(--s-3)">
      Handoff tracker
    </h1>
    <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1); margin-bottom: var(--s-5); max-width: 62ch">
      ${esc(l.name)} · ${esc(l.city)}, ${esc(l.area)}. Twelve milestones, each signed off by both
      sides before it counts as done. Changes are stored in this browser only.
    </p>

    <div class="deal__progress">
      <span><strong id="deal-done">${c.done}</strong> of <strong>${c.total}</strong> milestones done</span>
      <span>·</span>
      <span><strong id="deal-signed">${c.signed}</strong> fully signed off</span>
    </div>
    <div class="deal__bar" aria-hidden="true"><span id="deal-bar" style="width:${(c.done / c.total) * 100}%"></span></div>

    <div id="deal-rows"></div>

    <div class="deal__actions">
      <button class="btn btn--ghost" id="deal-reset" type="button">Reset to sample state</button>
      <a class="btn btn--ghost" href="listing.html?id=${encodeURIComponent(l.id)}">Back to listing</a>
      <a class="btn btn--ghost" href="offer.html?id=${encodeURIComponent(l.id)}">Offer and NDA</a>
      <a class="btn btn--ghost" href="loi.html?id=${encodeURIComponent(l.id)}">Letter of intent</a>
    </div>

    <div class="panel" style="margin-top: var(--s-7)">
      <h2>How this plan adapts to the successor</h2>
      <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1); margin-bottom: var(--s-4)">
        The same twelve milestones run every deal. What changes is the pace, which milestones
        carry a payment, and how long the training and support windows run.
        This listing is open to: <strong>${wanted.map(s => esc(s.label)).join(', ') || 'any successor'}</strong>.
      </p>
      ${adaptHtml}
    </div>
  `;

  const rows = document.getElementById('deal-rows');
  HANDOFF_TEMPLATE.forEach((m, i) => {
    const s = ms(m);
    const row = document.createElement('div');
    row.className = 'deal__row';
    row.dataset.state = s.status;
    row.dataset.milestone = m.id;
    row.innerHTML = `
      <div class="deal__top">
        <div class="deal__label">
          <span class="deal__index">${String(i + 1).padStart(2, '0')}</span>
          ${esc(m.label)}
        </div>
        <div class="deal__field" style="min-width: 150px">
          <span>Status</span>
          <select data-role="status" aria-label="Status for ${esc(m.label)}">
            ${STATUS_ORDER.map(v =>
              `<option value="${v}" ${v === s.status ? 'selected' : ''}>${STATE_LABEL[v]}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="deal__grid">
        <div class="deal__field">
          <span>Who moves it</span>
          <select data-role="owner" aria-label="Owner for ${esc(m.label)}">
            ${Object.keys(OWNER_LABEL).map(v =>
              `<option value="${v}" ${v === s.owner ? 'selected' : ''}>${OWNER_LABEL[v]}</option>`).join('')}
          </select>
        </div>
        <div class="deal__field">
          <span>Due date</span>
          <input type="date" data-role="due" value="${esc(s.due)}" aria-label="Due date for ${esc(m.label)}">
        </div>
        <div class="deal__field deal__field--wide">
          <span>Evidence note</span>
          <input type="text" data-role="evidence" value="${esc(s.evidence)}"
                 placeholder="e.g. NDA signed, reference 2026-11-08" aria-label="Evidence note for ${esc(m.label)}">
        </div>
      </div>

      <div class="deal__sign">
        <label><input type="checkbox" data-role="seller" ${s.seller ? 'checked' : ''}> Seller signed off</label>
        <label><input type="checkbox" data-role="buyer" ${s.buyer ? 'checked' : ''}> Buyer signed off</label>
        <span class="deal__status deal__status--${s.status}" data-role="status-label">${STATE_LABEL[s.status]}</span>
        <span class="deal__status" data-role="completed" style="color: var(--ink-faint); font-weight:400">
          ${s.completed_at ? `Completed ${esc(s.completed_at)}` : ''}
        </span>
      </div>
      <p class="deal__hint" data-role="hint" hidden></p>
    `;
    rows.appendChild(row);
  });

  root.querySelectorAll('.deal__row').forEach(bindRow);
  document.getElementById('deal-reset').addEventListener('click', () => {
    const deal = store.getDeal(l.id) || { listingId: l.id };
    deal.milestones = {};
    store.setDeal(l.id, deal);
    state = {};
    render();
  });
}

function bindRow(row) {
  const mId = row.dataset.milestone;
  const m = HANDOFF_TEMPLATE.find(x => x.id === mId);
  const s = () => ms(m);
  const hint = row.querySelector('[data-role="hint"]');
  const statusSelect = row.querySelector('[data-role="status"]');
  const statusLabel = row.querySelector('[data-role="status-label"]');
  const completedEl = row.querySelector('[data-role="completed"]');

  function showHint(text) {
    hint.textContent = text;
    hint.hidden = !text;
  }

  function refreshProgress() {
    const c = dealCounts();
    document.getElementById('deal-done').textContent = c.done;
    document.getElementById('deal-signed').textContent = c.signed;
    document.getElementById('deal-bar').style.width = `${(c.done / c.total) * 100}%`;
  }

  function changeStatus(next) {
    const cur = s();
    const result = applyStatus(state, l, mId, next, formatTimestamp(new Date()));
    if (result.error === 'signoff_required') {
      showHint('Both sides must sign off before a milestone can be marked done.');
      statusSelect.value = cur.status;
      return;
    }
    state = result.state;
    showHint('');
    row.dataset.state = next;
    statusLabel.textContent = STATE_LABEL[next];
    statusLabel.className = `deal__status deal__status--${next}`;
    completedEl.textContent = state[mId].completed_at ? `Completed ${state[mId].completed_at}` : '';
    refreshProgress();
  }

  statusSelect.addEventListener('change', () => changeStatus(statusSelect.value));

  row.querySelector('[data-role="owner"]').addEventListener('change', e => {
    state[mId] = { ...s(), owner: e.target.value };
    save();
  });

  row.querySelector('[data-role="due"]').addEventListener('change', e => {
    state[mId] = { ...s(), due: e.target.value };
    save();
  });

  row.querySelector('[data-role="evidence"]').addEventListener('input', e => {
    state[mId] = { ...s(), evidence: e.target.value };
    save();
  });

  row.querySelector('[data-role="seller"]').addEventListener('change', e => {
    state[mId] = { ...s(), seller: e.target.checked };
    save();
    if (e.target.checked && s().status === 'done' && s().buyer) showHint('');
  });

  row.querySelector('[data-role="buyer"]').addEventListener('change', e => {
    state[mId] = { ...s(), buyer: e.target.checked };
    save();
    if (e.target.checked && s().status === 'done' && s().seller) showHint('');
  });

  if (s().status === 'done' && !isComplete(s())) {
    showHint('Marked done, but both sign-offs are not recorded yet.');
  }
}

render();
