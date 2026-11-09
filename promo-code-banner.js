/*
 * Promo Code Banner (one-click copy)
 * ----------------------------------
 * Shows an animated promo banner above the Add to Cart button on product pages
 * and next to the coupon field at checkout. One tap copies the code to the
 * clipboard; at checkout it also opens the coupon field and fills the code in.
 *
 * Install: BigCommerce > Storefront > Script Manager
 *   Location: Footer | Pages: Store pages + Checkout | Category: Essential
 *   Wrap this file in <script> ... </script> when pasting it in.
 */
(function () {
  // ---- Settings -----------------------------------------------------------
  var PROMO = {
    code: 'SAVE10',                              // the coupon code customers copy
    title: 'HOLIDAY SALE',                       // headline on the banner
    subtitle: 'Tap to copy & save at checkout:', // line under the headline
    accent: '#f5b915',                           // border and code color
    resetAfterMs: 3500                           // how long "Copied!" shows
  };
  // -------------------------------------------------------------------------

  // 1. Styles and animations
  var style = document.createElement('style');
  style.textContent = [
    '@keyframes promoShine { 0% { left: -100%; } 20% { left: 100%; } 100% { left: 100%; } }',
    '@keyframes promoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }',
    '.promo-banner { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between;',
    '  gap: 12px; max-width: 100%; box-sizing: border-box; margin-bottom: 14px; padding: 10px 14px; cursor: pointer;',
    '  user-select: none; color: #fff; font-family: inherit; border-radius: 6px; border: 1.5px solid ' + PROMO.accent + ';',
    '  background: linear-gradient(135deg, #111 0%, #262626 100%); animation: promoPulse 3s infinite ease-in-out;',
    '  transition: transform 0.15s ease; }',
    '.promo-banner:hover { transform: translateY(-2px); }',
    '.promo-banner::after { content: ""; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;',
    '  background: linear-gradient(to right, rgba(255,255,255,0), rgba(255,215,0,0.18), rgba(255,255,255,0));',
    '  transform: skewX(-25deg); animation: promoShine 4.5s infinite; pointer-events: none; }',
    '.promo-left { display: flex; flex-direction: column; text-align: left; line-height: 1.25; }',
    '.promo-title { display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 13px; letter-spacing: 0.8px; color: ' + PROMO.accent + '; }',
    '.promo-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff3b30; box-shadow: 0 0 6px #ff3b30; }',
    '.promo-sub { margin-top: 2px; font-size: 12px; color: #d9d9d9; }',
    '.promo-code { padding: 6px 12px; border-radius: 4px; white-space: nowrap; font-weight: 800; font-size: 14px; letter-spacing: 1.5px;',
    '  color: ' + PROMO.accent + '; background: rgba(245,185,21,0.15); border: 1.5px dashed ' + PROMO.accent + '; transition: all 0.2s ease; }',
    '.promo-banner.copied .promo-code { color: #fff; background: #28a745; border: 1.5px solid #28a745; }'
  ].join('\n');
  document.head.appendChild(style);

  // 2. Copy helper (falls back when the Clipboard API is unavailable)
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    }
    legacyCopy(text);
    return Promise.resolve();
  }
  function legacyCopy(text) {
    var temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(temp);
  }

  // 3. If the checkout coupon field is on the page, open it and fill the code
  function fillCheckoutCoupon() {
    var toggle = document.querySelector('[data-test="redeemable-label"]');
    if (!toggle) return;
    if (!document.querySelector('input[name="redeemableCode"]')) toggle.click();
    setTimeout(function () {
      var input = document.querySelector('input[name="redeemableCode"]');
      if (!input) return;
      input.focus();
      input.value = PROMO.code;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 150);
  }

  // 4. Build the banner
  function createBanner() {
    var banner = document.createElement('div');
    banner.className = 'promo-banner';
    banner.setAttribute('role', 'button');
    banner.setAttribute('aria-label', 'Copy promo code ' + PROMO.code);

    var left = document.createElement('div');
    left.className = 'promo-left';
    var title = document.createElement('span');
    title.className = 'promo-title';
    var dot = document.createElement('span');
    dot.className = 'promo-dot';
    title.appendChild(dot);
    title.appendChild(document.createTextNode(' ' + PROMO.title));
    var sub = document.createElement('span');
    sub.className = 'promo-sub';
    sub.textContent = PROMO.subtitle;
    left.appendChild(title);
    left.appendChild(sub);

    var code = document.createElement('div');
    code.className = 'promo-code';
    code.textContent = PROMO.code;

    banner.appendChild(left);
    banner.appendChild(code);

    banner.addEventListener('click', function () {
      copyText(PROMO.code);
      banner.classList.add('copied');
      code.textContent = '✓ COPIED!';
      fillCheckoutCoupon();
      setTimeout(function () {
        banner.classList.remove('copied');
        code.textContent = PROMO.code;
      }, PROMO.resetAfterMs);
    });
    return banner;
  }

  // 5. Place it on the product page or at checkout (once)
  function injectBanner() {
    if (document.querySelector('.promo-banner')) return;

    var addToCart = document.querySelector('#form-action-addToCart, .form-action--addToCart');
    if (addToCart && addToCart.parentNode) {
      addToCart.parentNode.insertBefore(createBanner(), addToCart);
      return;
    }
    var coupon = document.querySelector('[data-test="redeemable-label"], .redeemable-label, .cart-priceItem--total');
    if (coupon && coupon.parentNode) {
      coupon.parentNode.insertBefore(createBanner(), coupon);
    }
  }

  // Checkout renders after page load, so watch for it
  injectBanner();
  new MutationObserver(injectBanner).observe(document.body, { childList: true, subtree: true });
})();
