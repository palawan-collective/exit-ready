
import { HANDOFF_TEMPLATE } from 'file:///C:/dev/exit-ready/site/data/listings.js';
import { esc } from 'file:///C:/dev/exit-ready/site/data/format.js';

const SAMPLE = {
  loi: 'done', nda: 'done', verification: 'done', offer: 'done',
  deposit: 'in_progress', consent: 'pending', licence: 'pending'
};

const STATE_LABEL = { done: 'done', in_progress: 'in progress', blocked: 'blocked', pending: 'pending' };

function track(states) {
  return HANDOFF_TEMPLATE.map(m => {
    const s = states[m.id] || 'pending';
    return `<li data-state="${s}">
      <span class="track__label">${esc(m.label)}</span>
      <span class="track__state">${STATE_LABEL[s]}</span>
    </li>`;
  }).join('');
}

document.getElementById('standard-track').innerHTML = track({});
document.getElementById('example-track').innerHTML = track(SAMPLE);
