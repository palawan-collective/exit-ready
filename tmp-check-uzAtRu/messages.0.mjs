
import * as store from 'file:///C:/dev/exit-ready/site/data/store.js';
import { esc } from 'file:///C:/dev/exit-ready/site/data/format.js';

const id = new URLSearchParams(location.search).get('id');
const listing = store.findListing(id);
const root = document.getElementById('root');

if (!listing) {
  root.innerHTML = `<div class="notice notice--warn"><h3>Listing not found</h3>
    <p><a href="browse.html">Browse all businesses</a>.</p></div>`;
} else {
  render();
}

function render() {
  const user = store.getUser();
  const isOwnerUser = user?.role === 'owner' && store.isUserListing(listing.id);
  const me = isOwnerUser ? 'owner' : 'buyer';
  const meName = isOwnerUser
    ? (listing.owner?.name || store.getVerification('owner')?.full_name || 'Owner')
    : (store.getVerification('buyer')?.full_name || 'Buyer');

  document.title = `Messages — ${listing.name} — Exit-Ready`;

  if (!user) {
    root.innerHTML = `
      <div class="notice notice--warn">
        <h3>Choose a role to send a message</h3>
        <p>You can read the conversation either way, but you need to be acting as a buyer or an owner to reply.</p>
        <p style="margin:var(--s-3) 0 0"><a class="btn btn--primary" href="dashboard.html">Go to your dashboard</a></p>
      </div>
      ${threadBlock(listing.id, me)}`;
    return;
  }

  root.innerHTML = `
    <p style="font-family:var(--font-ui); font-size:var(--step--1); margin-bottom:var(--s-4)">
      <a href="browse.html">Browse</a> <span class="muted">/</span>
      <a href="listing.html?id=${encodeURIComponent(listing.id)}">${esc(listing.name)}</a>
      <span class="muted">/</span> <span class="muted">Messages</span>
    </p>

    <div class="sec-head" style="display:flex; justify-content:space-between; align-items:flex-end; gap:var(--s-5); flex-wrap:wrap">
      <div>
        <h2>Messages</h2>
        <p>${esc(listing.name)} · you are acting as ${isOwnerUser ? 'the owner' : 'a buyer'}.</p>
      </div>
      <div style="display:flex; gap:var(--s-2); flex-wrap:wrap">
        ${!isOwnerUser ? `<a class="btn btn--ghost" href="offer.html?id=${encodeURIComponent(listing.id)}">Make an offer</a>` : ''}
        <a class="btn btn--ghost" href="deal.html?id=${encodeURIComponent(listing.id)}">Handoff tracker</a>
      </div>
    </div>

    <div class="panel" style="margin-top:var(--s-5)">
      <h2 id="thread-heading">Conversation</h2>
      <ul class="thread" id="thread" aria-labelledby="thread-heading"></ul>
      <form class="composer" id="composer" style="margin-top:var(--s-5)">
        <div class="field">
          <label for="body">Your message</label>
          <textarea id="body" name="body" rows="3"
            placeholder="${isOwnerUser ? 'Answer the buyer...' : 'Ask the owner a question...'}"></textarea>
        </div>
        <div class="hero__actions">
          <button class="btn btn--primary" type="submit">Send</button>
        </div>
      </form>
    </div>
  `;

  const list = document.getElementById('thread');
  const body = document.getElementById('body');

  function paint() {
    const thread = store.threadFor(listing.id);
    if (!thread.length) {
      list.innerHTML = `<li><p class="muted" style="font-family:var(--font-ui); font-size:var(--step--1); margin:0">No messages yet. Ask the first question.</p></li>`;
      return;
    }
    list.innerHTML = thread.map((m) => `
      <li class="msg ${m.from === me ? 'msg--own' : ''}">
        <div class="msg__meta">${esc(m.name)} · ${esc((m.at || '').replace('T', ' ').slice(0, 16))}</div>
        <p>${esc(m.text).replace(/\n/g, '<br>')}</p>
      </li>`).join('');
  }

  document.getElementById('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = body.value.trim();
    if (!text) return;
    store.appendMessage(listing.id, { from: me, name: meName, text });
    body.value = '';
    paint();
  });

  paint();
}

function threadBlock(listingId) {
  const thread = store.threadFor(listingId);
  if (!thread.length) return '';
  return `
    <div class="panel" style="margin-top:var(--s-5)">
      <h2>Conversation</h2>
      <ul class="thread">
        ${thread.map((m) => `
          <li class="msg">
            <div class="msg__meta">${esc(m.name)} · ${esc((m.at || '').replace('T', ' ').slice(0, 16))}</div>
            <p>${esc(m.text).replace(/\n/g, '<br>')}</p>
          </li>`).join('')}
      </ul>
    </div>`;
}
