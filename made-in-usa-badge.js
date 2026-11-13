/*
 * Made-in-USA badge for selected product pages (BigCommerce Stencil, Papathemes "Modez" theme)
 *
 * Puts a branded "American Made" image in the banner slot under the product rating,
 * only on the products you list, and hides the theme's default banner there.
 *
 * Matching is by URL path first (works before the page finishes rendering),
 * then by product ID or SKU as a fallback.
 *
 * Install: BigCommerce > Storefront > Script Manager > Create a Script
 *   Location: Footer · Pages: Store pages · Type: Script
 *   Paste this file inside <script> ... </script>.
 *
 * All IDs, SKUs, paths and the image URL below are placeholders.
 */
(function () {
  /* ===== SETTINGS ===== */
  var PIDS = ['101', '102', '103'];                       // BigCommerce product IDs
  var SKUS = ['DEMO-1001', 'DEMO-1002', 'DEMO-1003'];     // SKUs (upper case)
  var PATHS = [                                           // product URL paths, lower case, with trailing slash
    '/demo-titanium-clevis-3-4-in/',
    '/demo-titanium-clevis-1-2-in/',
    '/demo-titanium-clevis-3-8-in/'
  ];
  // Placeholder badge drawn inline; on a live store use your image-manager URL instead
  var IMG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 538">' +
    '<rect width="640" height="538" fill="#141414"/>' +
    '<rect x="40" y="40" width="560" height="458" rx="24" fill="none" stroke="#D9B44A" stroke-width="10"/>' +
    '<text x="320" y="250" fill="#D9B44A" font-family="Arial" font-weight="800" font-size="78" text-anchor="middle">AMERICAN</text>' +
    '<text x="320" y="350" fill="#fff" font-family="Arial" font-weight="800" font-size="78" text-anchor="middle">MADE</text>' +
    '</svg>');
  var ALT = 'American Made - Demo Racing Co.';
  var SLOT_ID = 'emthemesModezBannersBlockAfterRating';   // theme's banner block under the rating

  var path = location.pathname.toLowerCase();
  if (path.charAt(path.length - 1) !== '/') path += '/';
  var pathHit = PATHS.indexOf(path) > -1;

  // On a known path, hide the default banner right away so it never flashes
  if (pathHit) {
    var st = document.createElement('style');
    st.textContent = '#' + SLOT_ID + ' .emthemesModez-banner-container{display:none !important}';
    document.head.appendChild(st);
  }

  var CSS =
    '.sp-usa{display:flex;justify-content:center;align-items:center;background:#141414;border-top:3px solid #D9B44A;' +
      'border-radius:8px;padding:14px 12px;margin:14px 0 16px;box-sizing:border-box;line-height:0}' +
    '.sp-usa img{display:block;width:100%;max-width:300px;height:auto}' +
    '@media (max-width:480px){.sp-usa{padding:12px 10px}.sp-usa img{max-width:240px}}';

  var HTML = '<div class="sp-usa"><img src="' + IMG + '" width="640" height="538" ' +
    'alt="' + ALT + '" title="Proudly Made in America" loading="eager"></div>';

  function match() {
    if (pathHit) return true;
    var pidEl = document.querySelector('input[name="product_id"]');
    var skuEl = document.querySelector('[data-product-sku]');
    var pid = pidEl ? pidEl.value : '';
    var sku = skuEl ? skuEl.textContent.trim().toUpperCase() : '';
    return PIDS.indexOf(pid) > -1 || SKUS.indexOf(sku) > -1;
  }

  // Idempotent: safe to call many times while the theme renders
  function ensure() {
    var block = document.getElementById(SLOT_ID);
    if (!block || !match()) return false;
    if (!document.getElementById('sp-usa-css')) {
      var s = document.createElement('style'); s.id = 'sp-usa-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    if (!block.querySelector('.sp-usa')) {
      var old = block.querySelectorAll('.emthemesModez-banner-container');
      for (var i = 0; i < old.length; i++) old[i].style.display = 'none';
      var wrap = document.createElement('div');
      wrap.innerHTML = HTML;
      block.insertBefore(wrap.firstChild, block.firstChild);
    }
    return true;
  }

  // The theme can re-render the block after load, so retry for ~10 s and watch the DOM for ~15 s
  var tries = 0;
  var timer = setInterval(function () { ensure(); if (++tries > 40) clearInterval(timer); }, 250);
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () { ensure(); });
    var startObs = function () {
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 15000);
    };
    if (document.body) startObs(); else document.addEventListener('DOMContentLoaded', startObs);
  }
  document.addEventListener('DOMContentLoaded', ensure);
  window.addEventListener('load', ensure);
  ensure();
})();
