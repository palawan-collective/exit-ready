/* Footer: back to top — registered first so later errors cannot block it. */
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('.footer__top');
  if (!btn) return;
  e.preventDefault();
  window.scrollTo(0, 0);
});

/* Exit-Ready — mock role switch.
 *
 * There is no sign-in. The site has two operating modes, buyer and seller, and
 * this is the only thing that selects between them. The choice lives in
 * localStorage so it survives navigation.
 */
(function () {
  var KEY = 'exit-ready:role';

  /* Mobile navigation: a compact fixed tab bar on small screens. */
  (function () {
    if (document.querySelector('.mobile-nav')) return;
    var here = location.pathname.split('/').pop() || 'index.html';
    var tabs = [
      ['index.html', 'Home'],
      ['browse.html', 'Browse'],
      ['sell.html', 'Sell'],
      ['dashboard.html', 'Dashboard']
    ];
    var nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');
    nav.innerHTML = tabs.map(function (t) {
      var active = here === t[0] || (here === '' && t[0] === 'index.html');
      return '<a href="' + t[0] + '"' + (active ? ' aria-current="page"' : '') + '>' + t[1] + '</a>';
    }).join('');
    document.body.appendChild(nav);
  })();

  var bar = document.querySelector('[data-role-switch]');
  if (!bar) return;

  function current() {
    try { return localStorage.getItem(KEY) || 'buyer'; } catch (e) { return 'buyer'; }
  }

  function paint() {
    var role = current();
    bar.querySelectorAll('[data-role]').forEach(function (b) {
      var on = b.getAttribute('data-role') === role;
      b.setAttribute('aria-pressed', String(on));
      b.className = on ? 'btn btn--primary' : 'btn btn--ghost';
    });
    bar.querySelectorAll('[data-role-label]').forEach(function (el) {
      el.textContent = role === 'owner' ? 'Seller' : 'Buyer';
    });
    document.documentElement.setAttribute('data-role', role);
  }

  bar.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-role]');
    if (!btn) return;
    try { localStorage.setItem(KEY, btn.getAttribute('data-role')); } catch (err) { /* ignore */ }
    paint();
    if (typeof window.onRoleChange === 'function') window.onRoleChange(btn.getAttribute('data-role'));
  });

  paint();
})();
