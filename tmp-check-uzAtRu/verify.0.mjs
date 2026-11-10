
import {
  ID_TYPES, FUNDING_PATHS, TIMELINES, depositBands, budgetBands, INDUSTRIES,
  READINESS_WEIGHTS, MAX_SCORE, readinessBreakdown, readinessScore, readinessBand,
  validateBuyer, validateOwner, buyerFromForm, ownerFromForm,
} from 'file:///C:/dev/exit-ready/site/data/verification.js';
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';
import { esc } from 'file:///C:/dev/exit-ready/site/data/format.js';

const buyerForm = document.getElementById('buyer-form');
const ownerForm = document.getElementById('owner-form');
const roleBuyer = document.getElementById('role-buyer');
const roleOwner = document.getElementById('role-owner');
const buyerStatus = document.getElementById('buyer-status');
const ownerStatus = document.getElementById('owner-status');

/* ---------- populate selects ---------- */
function fill(select, options, keepFirst = true) {
  const first = keepFirst ? select.options[0] : null;
  select.innerHTML = '';
  if (first) select.appendChild(first);
  for (const o of options) {
    const el = document.createElement('option');
    el.value = o;
    el.textContent = o;
    select.appendChild(el);
  }
}

fill(document.getElementById('b-id_type'), ID_TYPES);
fill(document.getElementById('o-id_type'), ID_TYPES);
fill(document.getElementById('b-funding_path'), FUNDING_PATHS);
fill(document.getElementById('b-timeline'), TIMELINES);
fill(document.getElementById('b-industry'), INDUSTRIES);

function syncRegion() {
  const country = document.getElementById('b-country').value;
  const deposit = document.getElementById('b-deposit_band').value;
  fill(document.getElementById('b-deposit_band'), depositBands(country));
  if (depositBands(country).includes(deposit)) document.getElementById('b-deposit_band').value = deposit;
  const budget = document.getElementById('b-budget').value;
  fill(document.getElementById('b-budget'), budgetBands(country));
  if (budgetBands(country).includes(budget)) document.getElementById('b-budget').value = budget;
}
document.getElementById('b-country').addEventListener('change', syncRegion);
syncRegion();

/* ---------- role toggle ---------- */
function showRole(role) {
  const isBuyer = role === 'buyer';
  buyerForm.hidden = !isBuyer;
  ownerForm.hidden = isBuyer;
  roleBuyer.setAttribute('aria-selected', String(isBuyer));
  roleOwner.setAttribute('aria-selected', String(!isBuyer));
  roleBuyer.className = isBuyer ? 'btn btn--primary' : 'btn btn--ghost';
  roleOwner.className = isBuyer ? 'btn btn--ghost' : 'btn btn--primary';
}
roleBuyer.addEventListener('click', () => showRole('buyer'));
roleOwner.addEventListener('click', () => showRole('owner'));

/* ---------- validation helpers ---------- */
function showErrors(form, errors) {
  form.querySelectorAll('.field__error').forEach(el => { el.hidden = true; });
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  for (const [name, message] of Object.entries(errors)) {
    const err = form.querySelector(`.field__error[data-for="${name}"]`);
    if (err) { err.textContent = message; err.hidden = false; }
    const field = form.elements[name];
    if (field) field.setAttribute('aria-invalid', 'true');
  }
}

function readForm(form) {
  const v = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') v[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; }
    else v[el.name] = el.value;
  }
  return v;
}

/* ---------- buyer submit ---------- */
buyerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = readForm(buyerForm);
  const { ok, errors } = validateBuyer(v);
  if (!ok) {
    showErrors(buyerForm, errors);
    buyerStatus.hidden = false;
    buyerStatus.className = 'notice notice--warn';
    buyerStatus.innerHTML = '<h3>Not ready yet</h3><p>Check the fields marked above.</p>';
    return;
  }
  showErrors(buyerForm, {});
  const buyer = buyerFromForm(v);
  const score = readinessScore(buyer);
  const band = readinessBand(score);
  const rows = readinessBreakdown(buyer).map(row => `
    <tr><th scope="row">${esc(row.label)}</th>
    <td>${row.earned} of ${row.points}</td></tr>`).join('');

  buyerStatus.hidden = false;
  buyerStatus.className = 'notice notice--info';
  buyerStatus.innerHTML = `
    <h3>Your readiness score: ${score} / ${MAX_SCORE} — ${esc(band.label)}</h3>
    <table class="deftable"><tbody>${rows}</tbody></table>
    <p class="muted" style="font-size: 0.75rem; margin-top: var(--s-3)">
      Stored in this browser only. A seller sees the number and the breakdown before releasing
      any financial detail. It is not a guarantee of completion.
    </p>`;
  buyerStatus.scrollIntoView({ block: 'center', behavior: 'smooth' });

  const record = { ...buyer, score, band: band.label, at: new Date().toISOString() };
  store.setVerification('buyer', record);
  if (store.getUser()?.role !== 'buyer') {
    store.setUser({ role: 'buyer', name: buyer.full_name || 'Buyer', email: buyer.email || '' });
  }
  localStorage.setItem('exit-ready:verification:buyer', JSON.stringify(record));
});

/* ---------- owner submit ---------- */
ownerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = readForm(ownerForm);
  const { ok, errors } = validateOwner(v);
  if (!ok) {
    showErrors(ownerForm, errors);
    ownerStatus.hidden = false;
    ownerStatus.className = 'notice notice--warn';
    ownerStatus.innerHTML = '<h3>Not ready yet</h3><p>Check the fields marked above.</p>';
    return;
  }
  showErrors(ownerForm, {});
  const owner = ownerFromForm(v);
  const ref = 'ER-OWN-' + Date.now().toString(36).toUpperCase();
  ownerStatus.hidden = false;
  ownerStatus.className = 'notice notice--info';
  ownerStatus.innerHTML = `
    <h3>Submitted for review</h3>
    <p>Reference <strong>${esc(ref)}</strong>. On the live product a person reviews your
    identity and business records before your listing goes live.</p>
    <p class="muted" style="font-size: 0.75rem">
      Stored in this browser only. Nothing was sent anywhere.
    </p>`;
  ownerStatus.scrollIntoView({ block: 'center', behavior: 'smooth' });

  const record = { ...owner, reference: ref, at: new Date().toISOString() };
  store.setVerification('owner', record);
  if (store.getUser()?.role !== 'owner') {
    store.setUser({ role: 'owner', name: owner.full_name || 'Owner', email: owner.email || '' });
  }
  localStorage.setItem('exit-ready:verification:owner', JSON.stringify(record));
});

/* ---------- restore saved submissions ---------- */
for (const [role, form, status] of [['buyer', buyerForm, buyerStatus], ['owner', ownerForm, ownerStatus]]) {
  const saved = store.getVerification(role);
  if (!saved) continue;
  for (const [name, value] of Object.entries(saved)) {
    const el = form.elements[name];
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(value);
    else if (el.type === 'radio') {
      const radio = form.querySelector(`input[name="${name}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else if (el.type !== 'button') el.value = value ?? '';
  }
  status.hidden = false;
  status.className = 'notice notice--info';
  status.innerHTML = `<h3>Saved submission restored</h3><p>From this browser, stored ${esc(saved.at || '')}.</p>`;
}

showRole('buyer');
