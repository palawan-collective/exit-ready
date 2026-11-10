/* Exit-Ready — mock role switch.
 *
 * There is no sign-in. The site has two operating modes, buyer and seller, and
 * this is the only thing that selects between them. The choice lives in
 * localStorage so it survives navigation.
 */
(function () {
  var KEY = 'exit-ready:role';
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
