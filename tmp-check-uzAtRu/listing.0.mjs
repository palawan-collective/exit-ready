
import {
  LISTINGS, REGIONS, SUCCESSOR_TYPES, DISCLOSURE_FLAGS, HANDOFF_TEMPLATE,
  SAMPLE_BUYERS
} from 'file:///C:/dev/exit-ready/site/data/listings.js';
import { readinessScore, readinessBand } from 'file:///C:/dev/exit-ready/site/data/verification.js';
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';
import { fullMoney, shorten, num, longDateLabel, esc } from 'file:///C:/dev/exit-ready/site/data/format.js';

const id = new URLSearchParams(location.search).get('id');
const root = document.getElementById('detail-root');
const l = store.findListing(id) || LISTINGS[0];
const isOwn = store.isUserListing(l.id);
const r = REGIONS.find(x => x.code === l.region);

document.title = `${l.name} — Exit-Ready`;

/* ---- Financials: some fields are NDA-gated ---- */
const gated = `
  <div class="notice notice--info" style="margin-top: var(--s-5)">
    <h3>Financial detail is behind the NDA gate</h3>
    <p>
      Revenue, cash flow and cost breakdown are owner-reported and unaudited.
      Full figures, monthly breakdowns and supporting documents are released once you
      sign the standard NDA. That signature is timestamped and visible to the owner.
    </p>
    <p><a class="btn btn--primary" href="how-it-works.html#nda">Sign the NDA to see the numbers</a></p>
  </div>`;

/* ---- Disclosure flags ---- */
const activeFlags = l.disclosure_flags.map(fid => DISCLOSURE_FLAGS.find(f => f.id === fid)).filter(Boolean);
const flagsHtml = activeFlags.map(f => `
  <li>
    <strong>${esc(f.label)}</strong>
    ${f.blurb ? `<br><span class="muted">${esc(f.blurb)}</span>` : ''}
  </li>`).join('');

/* ---- Handoff plan ---- */
const hp = l.handoff_progress || {};
const handoffHtml = HANDOFF_TEMPLATE.map(m => {
  const state = hp[m.id] || 'pending';
  const label = { done: 'done', in_progress: 'in progress', blocked: 'blocked', pending: 'pending' }[state];
  return `<li data-state="${state}">
    <span class="track__label">${esc(m.label)}</span>
    <span class="track__state">${label}</span>
  </li>`;
}).join('');
const doneCount = HANDOFF_TEMPLATE.filter(m => hp[m.id] === 'done').length;

/* ---- Successor types ---- */
const succHtml = l.successor_types_wanted.map(sid => {
  const s = SUCCESSOR_TYPES.find(x => x.id === sid);
  return s ? `<span class="tag">${esc(s.label)}</span>` : '';
}).join('');

/* ---- Deal structure tags ---- */
const dealTags = [
  l.seller_financing_offered ? '<span class="tag tag--good">Seller financing offered</span>' : '',
  l.earn_out_offered ? '<span class="tag tag--good">Earn-out considered</span>' : '',
  l.financing_ready ? '<span class="tag tag--good">Bank financing ready</span>' : '',
  l.inventory_included_in_price
    ? '<span class="tag">Inventory included</span>'
    : '<span class="tag tag--warn">Inventory excluded from price</span>',
].filter(Boolean).join('');

/* ---- Buyer readiness (only shown as a preview of what the seller sees) ---- */
const buyersHtml = SAMPLE_BUYERS.map(b => {
  const score = readinessScore(b);
  const band = readinessBand(score);
  const persona = SUCCESSOR_TYPES.find(s => s.id === b.persona);
  return `
  <tr>
    <th scope="row">
      ${esc(b.display_name)}<br>
      <span class="muted" style="font-weight:400">${esc(persona ? persona.label : b.persona)}</span>
    </th>
    <td>
      <span class="tag tag--${band.tone}">${band.label} · ${score}</span><br>
      <span class="muted" style="font-weight:400; font-size:0.75rem">${esc(b.funding_path)}</span>
    </td>
  </tr>`;
}).join('');

root.innerHTML = `
  <p style="font-family: var(--font-ui); font-size: var(--step--1); margin-bottom: var(--s-4)">
    <a href="browse.html">Browse</a> <span class="muted">/</span>
    <a href="browse.html?region=${l.region}">${esc(r.label)}</a> <span class="muted">/</span>
    <span class="muted">${esc(l.name)}</span>
  </p>

  <h1 style="font-size: var(--step-4); letter-spacing:-0.025em; margin-bottom: var(--s-3)">${esc(l.name)}</h1>
  <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1); margin-bottom: var(--s-5)">
    ${esc(l.city)}, ${esc(l.area)} · ${esc(l.industry)} · Established ${l.established}
  </p>

  ${isOwn ? `<div class="tags" style="margin-bottom: var(--s-5)"><span class="tag tag--good">Your listing</span></div>` : ''}

  <div class="detail">
    <div>
      <!-- ============ FIGURES ============ -->
      <div class="panel">
        <h2>At a glance</h2>
        <table class="deftable">
          <tbody>
            <tr><th scope="row">Asking price</th><td>${fullMoney(l.asking_price, r.symbol)}</td></tr>
            <tr><th scope="row">Gross revenue (annual)</th><td>${fullMoney(l.gross_revenue, r.symbol)}</td></tr>
            <tr><th scope="row">Cash flow (SDE)</th><td>${fullMoney(l.cash_flow_sde, r.symbol)}</td></tr>
            <tr><th scope="row">EBITDA</th><td>${l.ebitda ? fullMoney(l.ebitda, r.symbol) : 'Not disclosed'}</td></tr>
            <tr><th scope="row">Inventory</th><td>${fullMoney(l.inventory_amount, r.symbol)}
              <br><span class="muted" style="font-weight:400">${l.inventory_included_in_price ? 'Included in asking price' : 'Not included in asking price'}</span></td></tr>
            <tr><th scope="row">Established</th><td>${l.established}</td></tr>
            <tr><th scope="row">Reason for selling</th><td>${esc(l.reason_for_selling)}</td></tr>
          </tbody>
        </table>
        ${dealTags ? `<div class="tags" style="margin-top: var(--s-4)">${dealTags}</div>` : ''}
      </div>

      <!-- ============ DISCLOSURE ============ -->
      <div class="panel">
        <h2>Disclosure flags</h2>
        <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1)">
          Declared by the owner at listing time and timestamped. These are the things that
          usually surface late and break a deal. Here they are up front.
        </p>
        <ul style="font-family: var(--font-ui); font-size: var(--step--1); padding-left: 1.15em; margin: 0">
          ${flagsHtml}
        </ul>
      </div>

      <!-- ============ DESCRIPTION ============ -->
      <div class="panel prose">
        <h2 style="font-family: var(--font-ui); font-size: var(--step--1); color: var(--ink-muted)">Business description</h2>
        <p>${esc(l.description)}</p>
        <h2 style="font-family: var(--font-ui); font-size: var(--step--1); color: var(--ink-muted)">Highlights</h2>
        <ul>${l.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>

      <!-- ============ OPERATIONS ============ -->
      <div class="panel">
        <h2>Operations</h2>
        <table class="deftable">
          <tbody>
            <tr><th scope="row">Employees</th><td>${num(l.employees_count)} · ${esc(l.employee_type)}</td></tr>
            <tr><th scope="row">Monthly payroll</th><td>${l.monthly_payroll ? fullMoney(l.monthly_payroll, r.symbol) : '—'}</td></tr>
            <tr><th scope="row">Real estate</th><td>${esc(l.real_estate_status)}</td></tr>
            ${l.building_sf ? `<tr><th scope="row">Floor area</th><td>${num(l.building_sf)} sq ft</td></tr>` : ''}
            ${l.monthly_rent ? `<tr><th scope="row">Monthly rent</th><td>${fullMoney(l.monthly_rent, r.symbol)}${l.nnn ? ` + ${fullMoney(l.nnn, r.symbol)} NNN` : ''}</td></tr>` : ''}
            ${l.lease_expiration ? `<tr><th scope="row">Lease expires</th><td>${longDateLabel(l.lease_expiration)}</td></tr>` : ''}
            <tr><th scope="row">Hours</th><td>${esc(l.hours)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ ASIDE ============ -->
    <aside class="detail__aside">
      <div class="panel">
        <h2>Handoff plan</h2>
        <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1); margin-bottom: var(--s-4)">
          ${doneCount} of ${HANDOFF_TEMPLATE.length} milestones complete.
          Every one is signed off by both sides.
        </p>
        <ol class="track">${handoffHtml}</ol>
        <p style="margin-top: var(--s-4)">
          <a class="btn btn--ghost btn--block" href="deal.html?id=${encodeURIComponent(l.id)}">Open the handoff tracker</a>
        </p>
      </div>

      <div class="panel">
        <h2>Successor wanted</h2>
        <div class="tags">${succHtml}</div>
      </div>

      <div class="panel">
        <h2>Buyer readiness</h2>
        <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1)">
          What the owner sees for each interested buyer, before releasing anything.
        </p>
        <table class="deftable"><tbody>${buyersHtml}</tbody></table>
      </div>

      <div class="panel" id="nda-panel" ${isOwn ? 'hidden' : ''}>
        <h2>Owner details and full financials</h2>
        <div id="nda-lock">
          <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1)">
            The owner's contact details, the exact monthly figures, and the supporting documents
            stay behind one standard agreement.
          </p>
          <p style="margin: var(--s-3) 0 0">
            <button class="btn btn--primary btn--block" id="nda-sign" type="button">Sign the standard NDA to unlock</button>
          </p>
        </div>
        <div id="nda-open" hidden>
          <table class="deftable">
            <tbody>
              <tr><th scope="row">Owner</th><td>${esc(l.owner?.name || 'On file')}</td></tr>
              <tr><th scope="row">Email</th><td>${esc(l.owner?.email || 'On file')}</td></tr>
              <tr><th scope="row">Monthly revenue</th><td>${l.gross_revenue ? fullMoney(Math.round(l.gross_revenue / 12), r.symbol) : '—'}</td></tr>
              <tr><th scope="row">Monthly cash flow</th><td>${l.cash_flow_sde ? fullMoney(Math.round(l.cash_flow_sde / 12), r.symbol) : '—'}</td></tr>
              <tr><th scope="row">Monthly rent</th><td>${l.monthly_rent ? fullMoney(l.monthly_rent, r.symbol) : '—'}</td></tr>
              <tr><th scope="row">Monthly payroll</th><td>${l.monthly_payroll ? fullMoney(l.monthly_payroll, r.symbol) : '—'}</td></tr>
              <tr><th scope="row">Inventory</th><td>${fullMoney(l.inventory_amount, r.symbol)}<br>
                <span class="muted" style="font-weight:400">${l.inventory_included_in_price ? 'Included in asking price' : 'Not included in asking price'}</span></td></tr>
            </tbody>
          </table>
          <p class="muted" style="font-family: var(--font-ui); font-size: 0.75rem" id="nda-note"></p>
        </div>
      </div>

      <div class="panel">
        <h2>${isOwn ? 'Your listing' : 'Interested?'}</h2>
        <p class="muted" style="font-family: var(--font-ui); font-size: var(--step--1)">
          ${isOwn
            ? 'This listing is yours. You can follow the deal from the handoff tracker.'
            : 'Verification comes first. You will confirm identity and declare a funding path before the NDA is presented.'}
        </p>
        <p style="margin-bottom: var(--s-3)">
          ${isOwn
            ? `<a class="btn btn--primary btn--block" href="deal.html?id=${encodeURIComponent(l.id)}">Open the handoff tracker</a>`
            : `<a class="btn btn--primary btn--block" href="offer.html?id=${encodeURIComponent(l.id)}">Make an offer</a>`}
        </p>
        <p style="margin-bottom: var(--s-3)">
          <button class="btn btn--ghost btn--block" type="button" id="save-btn">
            ${store.isSaved(l.id) ? 'Saved' : 'Save for later'}
          </button>
        </p>
        <p style="margin-bottom: var(--s-3)">
          <a class="btn btn--ghost btn--block" href="messages.html?id=${encodeURIComponent(l.id)}">${isOwn ? 'View messages' : 'Message the owner'}</a>
        </p>
        <p style="margin: 0">
          <a class="btn btn--ghost btn--block" href="handoff.html">See the handoff plan</a>
        </p>
      </div>
    </aside>
  </div>

  ${gated}
`;

const saveBtn = document.getElementById('save-btn');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    store.toggleSaved(l.id);
    saveBtn.textContent = store.isSaved(l.id) ? 'Saved' : 'Save for later';
  });
}

/* One-click NDA unlock */
const ndaLock = document.getElementById('nda-lock');
const ndaOpen = document.getElementById('nda-open');
const ndaSign = document.getElementById('nda-sign');
const ndaNote = document.getElementById('nda-note');
if (ndaLock && ndaOpen) {
  const applyNda = () => {
    const deal = store.getDeal(l.id);
    if (deal?.nda?.signed) {
      ndaLock.hidden = true;
      ndaOpen.hidden = false;
      if (ndaNote) {
        ndaNote.textContent = `NDA signed by ${deal.nda.signer} on ${deal.nda.at ? deal.nda.at.slice(0, 10) : '—'}. `
          + 'The signature is timestamped and visible to the owner.';
      }
    } else {
      ndaLock.hidden = false;
      ndaOpen.hidden = true;
    }
  };
  if (ndaSign) {
    ndaSign.addEventListener('click', () => {
      const buyer = store.getVerification('buyer');
      const deal = store.getDeal(l.id) || { listingId: l.id };
      deal.nda = { signed: true, signer: buyer?.full_name || 'Verified buyer', at: new Date().toISOString() };
      store.setDeal(l.id, deal);
      applyNda();
    });
  }
  applyNda();
}
