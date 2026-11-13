/*
 * Bundle-deal highlight for product option choices (BigCommerce Stencil)
 *
 * When a product has an add-on option set (e.g. "Add matching rod end"), every choice
 * in that set except "None" gets a pulsing red outline, a "Bundle Deal · Save $X" ribbon
 * and a was/now price. Once the shopper picks it, the tile turns green and shows
 * "savings applied".
 *
 * The real discount is set in BigCommerce (option price adjustment or a cart rule);
 * this script only makes it visible. Keep `was` / `now` in sync with that setting.
 *
 * Pairs with promise-strip.js, which adds a "Bundle Deal" tile at the top of the page
 * that scrolls to the highlighted option.
 *
 * Install: Script Manager, Footer, Store pages. Paste inside <script> ... </script>.
 * The SKU, prices and note below are placeholders.
 */
(function () {
  /* ===== DEALS: one line per bundle option set =====
     match = text in the option set's title (e.g. "DEMO-ROD-END:")
     Every option in that set except "None" gets the deal treatment. */
  var DEALS = [
    { match: 'DEMO-ROD-END', was: 40.00, now: 35.00, note: 'with clevis kit' }
  ];

  var css = `
  .sp-deal-tile{position:relative;outline:2px solid #d71920;outline-offset:-2px;
    background:linear-gradient(90deg,rgba(215,25,32,.06),rgba(215,25,32,0) 70%);
    animation:spGlow 2.4s ease-in-out infinite;transition:outline-color .2s,background .2s}
  .sp-deal-tile.sp-deal-on{outline:3px solid #1e8e3e;outline-offset:-3px;animation:none;
    background:linear-gradient(90deg,rgba(30,142,62,.08),rgba(30,142,62,0) 70%)}
  .sp-deal-ribbon{position:absolute;top:0;right:0;background:#d71920;color:#fff;
    font:700 11px/1 Arial,sans-serif;letter-spacing:.5px;text-transform:uppercase;
    padding:6px 10px;border-bottom-left-radius:6px;display:flex;align-items:center;gap:6px;
    overflow:hidden;z-index:2;white-space:nowrap}
  .sp-deal-ribbon::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
    transform:skewX(-20deg);animation:spShine 2.8s ease-in-out infinite}
  .sp-deal-tile.sp-deal-on .sp-deal-ribbon{background:#1e8e3e}
  .sp-deal-dot{width:8px;height:8px;border-radius:50%;background:#ffde00;animation:spPulse 1.4s infinite}
  .sp-deal-price{display:block;margin-top:6px;font:600 15px/1.3 Arial,sans-serif;color:#222}
  .sp-deal-price s{color:#888;font-weight:400;margin-right:6px}
  .sp-deal-price b{color:#d71920;margin-right:4px}
  .sp-deal-applied{display:none;margin-top:4px;font:700 13px/1.3 Arial,sans-serif;color:#1e8e3e}
  .sp-deal-tile.sp-deal-on .sp-deal-applied{display:block}
  @keyframes spPulse{0%{box-shadow:0 0 0 0 rgba(255,222,0,.8)}70%{box-shadow:0 0 0 7px rgba(255,222,0,0)}100%{box-shadow:0 0 0 0 rgba(255,222,0,0)}}
  @keyframes spShine{0%{left:-60%}55%,100%{left:130%}}
  @keyframes spGlow{0%,100%{box-shadow:0 0 0 0 rgba(215,25,32,0)}50%{box-shadow:0 0 14px 2px rgba(215,25,32,.35)}}
  @media (prefers-reduced-motion:reduce){.sp-deal-dot,.sp-deal-ribbon::after,.sp-deal-tile{animation:none}}
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function money(n){ return '$' + n.toFixed(2); }

  // Climb from the radio up to the element that holds just this one option (image + text)
  function tileFor(input, field){
    var el = input;
    while (el.parentElement && el.parentElement !== field &&
           el.parentElement.querySelectorAll('input[type=radio],input[type=checkbox]').length === 1) {
      el = el.parentElement;
    }
    return el;
  }

  function labelFor(input, tile){
    return (input.id && document.querySelector('label[for="' + input.id + '"]')) ||
           input.closest('label') || tile;
  }

  function refreshChecked(){
    document.querySelectorAll('.sp-deal-tile').forEach(function(tile){
      var input = tile.querySelector('input[type=radio],input[type=checkbox]');
      tile.classList.toggle('sp-deal-on', !!(input && input.checked));
    });
  }

  function apply(){
    document.querySelectorAll('.form-field, [data-product-attribute]').forEach(function(field){
      if (field.dataset.spDeal) return;
      var title = field.querySelector('label, .form-label');
      if (!title) return;
      var titleText = title.textContent || '';
      DEALS.forEach(function(d){
        if (titleText.indexOf(d.match) === -1) return;
        var inputs = field.querySelectorAll('input[type=radio],input[type=checkbox]');
        if (!inputs.length) return;
        field.dataset.spDeal = '1';
        var save = d.was - d.now;
        inputs.forEach(function(input){
          var tile = tileFor(input, field);
          if (input.value === '' || /^\s*none\s*$/i.test(tile.textContent)) return;
          if (tile.classList.contains('sp-deal-tile')) return;
          tile.classList.add('sp-deal-tile');
          if (getComputedStyle(tile).position === 'static') tile.style.position = 'relative';

          var ribbon = document.createElement('span');
          ribbon.className = 'sp-deal-ribbon';
          ribbon.innerHTML = '<span class="sp-deal-dot"></span>Bundle Deal &middot; Save ' + money(save);
          tile.appendChild(ribbon);

          var info = document.createElement('span');
          info.innerHTML =
            '<span class="sp-deal-price"><s>' + money(d.was) + '</s><b>' + money(d.now) + '</b>' + (d.note || '') + '</span>' +
            '<span class="sp-deal-applied">&#10003; ' + money(save) + ' bundle savings applied</span>';
          labelFor(input, tile).appendChild(info);
        });
      });
    });
    refreshChecked();
  }

  document.addEventListener('change', function(e){
    if (e.target && e.target.matches('input[type=radio],input[type=checkbox]')) refreshChecked();
  });

  // Option sets can render late or re-render when another option changes, so keep watching
  function start(){
    apply();
    new MutationObserver(function(){ apply(); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
