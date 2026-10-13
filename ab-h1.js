(function () {
  if (!window.VPNP_AB) return;
  var variant = window.VPNP_AB.variant('h1-headline', [
    { key: 'a', weight: 0.5 },
    { key: 'b', weight: 0.5 }
  ]);
  try { sessionStorage.setItem('vpnp_h1_variant', variant); } catch (e) {}
  if (variant !== 'b') return;
  var el = document.getElementById('h1-headline');
  if (el) el.textContent = 'Три дня без карты. Дальше реши сам.';
})();
