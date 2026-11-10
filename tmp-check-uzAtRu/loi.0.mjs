
import { REGIONS, HANDOFF_TEMPLATE } from 'file:///C:/dev/exit-ready/site/data/listings.js';
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';
import { fullMoney, esc, longDateLabel } from 'file:///C:/dev/exit-ready/site/data/format.js';

const id = new URLSearchParams(location.search).get('id');
const listing = store.findListing(id);
const root = document.getElementById('root');

if (!listing) {
  root.innerHTML = `
    <div class="notice notice--warn">
      <h3>Listing not found</h3>
      <p><a href="browse.html">Browse all businesses</a>.</p>
    </div>`;
} else {
  render();
}

function render() {
  const r = REGIONS.find((x) => x.code === listing.region);
  const deal = store.getDeal(listing.id);
  const offer = deal?.offer || {};
  const ownerVerification = store.getVerification('owner');
  const buyerVerification = store.getVerification('buyer');
  const nda = deal?.nda || {};

  document.title = `Letter of intent — ${listing.name} — Exit-Ready`;

  const defaults = {
    buyer_name: nda.signer || buyerVerification?.full_name || '',
    buyer_email: buyerVerification?.email || '',
    seller_name: nda.signer ? '' : (listing.owner?.name || ownerVerification?.full_name || ''),
    price: listing.asking_price || '',
    deposit: offer.deposit || Math.round((listing.asking_price || 0) * 0.1),
    funding: offer.funding || (listing.financing_ready ? 'Bank loan (pre-qualified)' : ''),
    timeline: offer.timeline || '3–6 months',
    conditions: offer.conditions || 'Subject to financial verification, lease assignment and any required licence transfer.',
  };

  root.innerHTML = `
    <p style="font-family:var(--font-ui); font-size:var(--step--1); margin-bottom:var(--s-4)">
      <a href="browse.html">Browse</a> <span class="muted">/</span>
      <a href="listing.html?id=${encodeURIComponent(listing.id)}">${esc(listing.name)}</a>
      <span class="muted">/</span> <span class="muted">Letter of intent</span>
    </p>

    <div class="sec-head" style="display:flex; justify-content:space-between; align-items:flex-end; gap:var(--s-5); flex-wrap:wrap">
      <div>
        <h2>Letter of intent</h2>
        <p>Generated automatically from the listing, the offer and the handoff plan. Edit the terms and print it.</p>
      </div>
      <button class="btn btn--primary no-print" id="print-btn" type="button">Print or save as PDF</button>
    </div>

    <div class="detail">
      <div>
        <form id="loi-form" class="stack no-print">
          <fieldset>
            <legend>The parties</legend>
            <div class="form-grid form-grid--2">
              <div class="field">
                <label for="buyer_name">Buyer — printed name</label>
                <input type="text" id="buyer_name" value="${esc(defaults.buyer_name)}">
              </div>
              <div class="field">
                <label for="seller_name">Seller — printed name</label>
                <input type="text" id="seller_name" value="${esc(defaults.seller_name)}">
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>The terms</legend>
            <div class="form-grid form-grid--2">
              <div class="field">
                <label for="price">Purchase price (${r.symbol})</label>
                <input type="number" id="price" min="0" value="${defaults.price}">
              </div>
              <div class="field">
                <label for="deposit">Deposit into escrow (${r.symbol})</label>
                <input type="number" id="deposit" min="0" value="${defaults.deposit}">
              </div>
              <div class="field">
                <label for="funding">Financing</label>
                <input type="text" id="funding" value="${esc(defaults.funding)}" placeholder="Cash, bank loan, seller financing">
              </div>
              <div class="field">
                <label for="timeline">Completion</label>
                <input type="text" id="timeline" value="${esc(defaults.timeline)}" placeholder="3–6 months">
              </div>
              <div class="field span-2">
                <label for="conditions">Conditions</label>
                <textarea id="conditions">${esc(defaults.conditions)}</textarea>
              </div>
            </div>
          </fieldset>
        </form>
      </div>

      <aside class="detail__aside no-print" style="margin-top: var(--s-5)">
        <div class="panel">
          <h2>What happens when you print</h2>
          <p class="muted" style="font-family:var(--font-ui); font-size:var(--step--1)">
            The document to the left is the output. It carries the twelve handoff milestones so both
            sides agree to the same plan at the moment they agree the price.
          </p>
          <p style="margin:var(--s-4) 0 0">
            <a class="btn btn--ghost btn--block" href="offer.html?id=${encodeURIComponent(listing.id)}">Review the offer first</a>
          </p>
          <p style="margin:var(--s-3) 0 0">
            <a class="btn btn--ghost btn--block" href="deal.html?id=${encodeURIComponent(listing.id)}">Open the handoff tracker</a>
          </p>
        </div>
      </aside>
    </div>

    <article class="loi" style="margin-top: var(--s-6)" id="loi-doc">
      <h2>Letter of Intent</h2>
      <p><strong id="out-date"></strong></p>

      <p>This letter records the intent of the parties below regarding the purchase of the business
      described in this document. It is an expression of intent and is not a binding contract of
      sale. It does not transfer ownership, and it does not oblige either party to complete a sale.</p>

      <table>
        <tbody>
          <tr><th>Seller</th><td id="out-seller"></td></tr>
          <tr><th>Buyer</th><td id="out-buyer"></td></tr>
          <tr><th>Business</th><td>${esc(listing.name)}</td></tr>
          <tr><th>Location</th><td>${esc([listing.city, listing.area].filter(Boolean).join(', '))}, ${esc((REGIONS.find((x) => x.code === listing.region) || {}).label || listing.region)}</td></tr>
          <tr><th>Industry</th><td>${esc(listing.industry)}</td></tr>
          ${listing.established ? `<tr><th>Established</th><td>${esc(listing.established)}</td></tr>` : ''}
          <tr><th>Purchase price</th><td id="out-price" class="tnum"></td></tr>
          <tr><th>Deposit into escrow</th><td id="out-deposit" class="tnum"></td></tr>
          <tr><th>Financing</th><td id="out-funding"></td></tr>
          <tr><th>Completion timeline</th><td id="out-timeline"></td></tr>
        </tbody>
      </table>

      <h3 style="font-family:var(--font-ui); font-size:var(--step--1); margin-top:var(--s-5)">Conditions</h3>
      <p id="out-conditions"></p>

      <h3 style="font-family:var(--font-ui); font-size:var(--step--1); margin-top:var(--s-5)">Handoff plan</h3>
      <p>The parties agree to the twelve milestones below. Each is signed off by both sides before
      it is recorded as complete.</p>
      <ol>
        ${HANDOFF_TEMPLATE.map((m) => `<li>${esc(m.label)}</li>`).join('')}
      </ol>

      ${listing.seller_financing_offered || listing.earn_out_offered ? `
        <h3 style="font-family:var(--font-ui); font-size:var(--step--1); margin-top:var(--s-5)">Deal structure</h3>
        <p>
          ${listing.seller_financing_offered ? 'The seller will consider seller financing. ' : ''}
          ${listing.earn_out_offered ? 'The seller will consider an earn-out.' : ''}
        </p>` : ''}

      <p style="margin-top:var(--s-5)">This letter is generated by a marketplace tooling provider.
      It is not legal advice, not a valuation opinion, and not an accounting opinion. Both parties
      should obtain independent legal and financial advice before signing anything binding.</p>

      <div class="loi__sig">
        <div><line id="out-seller-sig">Seller</line></div>
        <div><line id="out-buyer-sig">Buyer</line></div>
      </div>
    </article>
  `;

  const form = document.getElementById('loi-form');
  const out = {
    date: document.getElementById('out-date'),
    seller: document.getElementById('out-seller'),
    buyer: document.getElementById('out-buyer'),
    price: document.getElementById('out-price'),
    deposit: document.getElementById('out-deposit'),
    funding: document.getElementById('out-funding'),
    timeline: document.getElementById('out-timeline'),
    conditions: document.getElementById('out-conditions'),
    sellerSig: document.getElementById('out-seller-sig'),
    buyerSig: document.getElementById('out-buyer-sig'),
  };

  const today = new Date();
  out.date.textContent = `${longDateLabel(today.toISOString().slice(0, 10))}`;

  function sync() {
    const v = {
      seller: form.querySelector('#seller_name').value.trim() || '____________________',
      buyer: form.querySelector('#buyer_name').value.trim() || '____________________',
      price: Number(form.querySelector('#price').value) || 0,
      deposit: Number(form.querySelector('#deposit').value) || 0,
      funding: form.querySelector('#funding').value.trim() || 'To be declared',
      timeline: form.querySelector('#timeline').value.trim() || 'To be agreed',
      conditions: form.querySelector('#conditions').value.trim() || 'To be agreed.',
    };
    out.seller.textContent = v.seller;
    out.buyer.textContent = v.buyer;
    out.price.textContent = fullMoney(v.price, r.symbol);
    out.deposit.textContent = fullMoney(v.deposit, r.symbol);
    out.funding.textContent = v.funding;
    out.timeline.textContent = v.timeline;
    out.conditions.textContent = v.conditions;
    out.sellerSig.textContent = `Seller — ${v.seller}`;
    out.buyerSig.textContent = `Buyer — ${v.buyer}`;
  }

  form.addEventListener('input', sync);
  sync();

  document.getElementById('print-btn').addEventListener('click', () => window.print());
}
