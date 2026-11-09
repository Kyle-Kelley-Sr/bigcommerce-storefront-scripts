/*
 * Cart & Checkout Shipping Badges
 * -------------------------------
 * Adds a badge under each item in the cart and checkout so customers know
 * when to expect it before they pay:
 *
 *   In stock       -> green:  "In Stock – Ships Today / Order within 1 hr 20 min (cutoff 2:00 PM CT)"
 *                             or "In Stock – Ships Monday / We ship Monday–Friday"
 *   Ships direct   -> red:    "Ships Direct from <Brand> / usually 1-2 business days"
 *   Built to order -> orange: "Ships Direct from <Brand> / built to order, 3-4 weeks"
 *
 * How it works:
 *   - Reads the cart from the Storefront Cart API (/api/storefront/carts).
 *   - Loads each product page in the background and reads its Availability text.
 *   - Uses the shop's own time zone, so the countdown is right wherever the customer is.
 *   - Skips weekends and the closed dates listed below, and refreshes the countdown every 20 seconds.
 *
 * Install: BigCommerce > Storefront > Script Manager
 *   Location: Footer | Pages: Store pages + Checkout | Category: Essential
 *   Wrap this file in <script> ... </script> when pasting it in.
 */
var SHIP_SETTINGS = {
  cutoffHour: 14,                 // same-day cutoff, 24-hour shop time (14 = 2:00 PM)
  cutoffLabel: '2:00 PM CT',      // how the cutoff is written in the badge
  timeZone: 'America/Chicago',    // shop time zone
  shipDays: [1, 2, 3, 4, 5],      // Mon–Fri (0 = Sunday, 6 = Saturday)
  closedDates: [                  // YYYY-MM-DD days the shop doesn't ship
    '2026-11-26',
    '2026-12-25',
    '2027-01-01'
  ],
  inStockPhrase: 'in stock',      // Availability text meaning "on our shelf"
  dropshipPhrase: 'ships direct', // Availability text meaning "ships from the manufacturer"
  builtToOrderPhrase: 'built to order'
};

(function () {
  var C = SHIP_SETTINGS;

  var style = document.createElement('style');
  style.textContent = [
    '.ship-badge { display: flex; align-items: flex-start; gap: 7px; margin-top: 7px; padding: 6px 9px; font-size: 11.5px;',
    '  line-height: 1.35; color: #222; background: #fff8f6; border: 1px solid #f5c6cb; border-left: 3.5px solid #d9534f;',
    '  border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }',
    '.ship-badge.bto { background: #fff9eb; border-color: #ffe08a; border-left-color: #e67e22; }',
    '.ship-badge.stock { background: #f3fbf4; border-color: #b7e1bd; border-left-color: #2e9e44; }',
    '.ship-badge-icon { flex-shrink: 0; margin-top: 1px; font-size: 14px; line-height: 1; }',
    '.ship-badge-text { display: flex; flex-direction: column; }',
    '.ship-badge-title { font-weight: 800; color: #111; }',
    '.ship-badge-sub { margin-top: 2px; font-size: 10.5px; font-weight: 600; color: #555; }',
    '.ship-badge.bto .ship-badge-sub { color: #b85d00; font-weight: 700; }',
    '.ship-badge.stock .ship-badge-sub { color: #1e7a32; font-weight: 700; }'
  ].join('\n');
  document.head.appendChild(style);

  var cartItems = {}; // product name -> { type: 'stock' | 'dropship' | 'bto', brand, subText }
  var dataLoaded = false;

  /* ---------- Shop clock ---------- */
  function shopNow() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: C.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short'
    }).formatToParts(new Date());
    var p = {};
    parts.forEach(function (x) { p[x.type] = x.value; });
    return {
      y: +p.year, m: +p.month, d: +p.day,
      hour: parseInt(p.hour, 10) % 24, min: +p.minute, sec: +p.second,
      dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
    };
  }
  function ymd(y, m, d) {
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  function isShipDay(y, m, d, dow) {
    return C.shipDays.indexOf(dow) !== -1 && C.closedDates.indexOf(ymd(y, m, d)) === -1;
  }

  // { today: true, minsLeft } or { today: false, label, why }
  function shipMessage() {
    var n = shopNow();
    var minsNow = n.hour * 60 + n.min;
    var cutoff = C.cutoffHour * 60;
    if (isShipDay(n.y, n.m, n.d, n.dow) && minsNow < cutoff) {
      var secsLeft = cutoff * 60 - (minsNow * 60 + n.sec);
      return { today: true, minsLeft: Math.ceil(secsLeft / 60) };
    }
    // Walk forward to the next ship day (date math in UTC avoids daylight-saving issues)
    var base = Date.UTC(n.y, n.m - 1, n.d);
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var i = 1; i <= 14; i++) {
      var dt = new Date(base + i * 86400000);
      var y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate(), dow = dt.getUTCDay();
      if (isShipDay(y, m, d, dow)) {
        var label = i === 1 ? 'Tomorrow'
                  : i <= 6 ? days[dow]
                  : days[dow].slice(0, 3) + ', ' + months[m - 1] + ' ' + d;
        var why = isShipDay(n.y, n.m, n.d, n.dow) ? 'Today’s ' + C.cutoffLabel + ' cutoff has passed'
                : C.closedDates.indexOf(ymd(n.y, n.m, n.d)) !== -1 ? 'Closed today for the holiday'
                : 'We ship Monday–Friday';
        return { today: false, label: label, why: why };
      }
    }
    return { today: false, label: 'next business day', why: '' };
  }

  function stockText() {
    var s = shipMessage();
    if (s.today) {
      var h = Math.floor(s.minsLeft / 60), mm = s.minsLeft % 60;
      var left = h ? h + ' hr' + (mm ? ' ' + mm + ' min' : '') : mm + ' min';
      return { title: 'In Stock – Ships Today', sub: 'Order within ' + left + ' (cutoff ' + C.cutoffLabel + ')' };
    }
    return { title: 'In Stock – Ships ' + s.label, sub: s.why };
  }

  /* ---------- Read the Availability field from a product page ---------- */
  function readAvailability(doc) {
    // doc is a parsed copy of the product page, never the live page
    doc.querySelectorAll('script, style').forEach(function (el) { el.remove(); });
    var direct = doc.querySelector('[data-product-availability], dd.productView-info-value--availability, .availability-value');
    if (direct) return direct.textContent.trim();
    var found = '';
    doc.querySelectorAll('.productView-info-name, dt, .product-info-label').forEach(function (label) {
      if (!found && label.textContent.toLowerCase().indexOf('availability') !== -1 && label.nextElementSibling) {
        found = label.nextElementSibling.textContent.trim();
      }
    });
    return found;
  }

  function buildSubText(raw) {
    var lower = raw.toLowerCase().replace(/\.$/, '');
    if (lower === C.dropshipPhrase) return 'Usually ships in 1-2 business days';
    if (raw.indexOf(' - ') !== -1) return raw.split(' - ').slice(1).join(' - ').trim();
    return raw;
  }

  async function loadCartItems() {
    try {
      var carts = await (await fetch('/api/storefront/carts', { credentials: 'same-origin' })).json();
      if (!carts || !carts.length) return;
      var items = carts[0].lineItems.physicalItems || [];
      var parser = new DOMParser();

      await Promise.all(items.map(async function (item) {
        try {
          var html = await (await fetch(item.url, { credentials: 'same-origin' })).text();
          var raw = readAvailability(parser.parseFromString(html, 'text/html'));
          var lower = raw.toLowerCase();
          var brand = item.brand && item.brand.trim() ? item.brand.trim() : 'the Manufacturer';

          if (lower.indexOf(C.dropshipPhrase) !== -1 || lower.indexOf(C.builtToOrderPhrase) !== -1) {
            var isBTO = lower.indexOf(C.builtToOrderPhrase) !== -1 || lower.indexOf('week') !== -1;
            cartItems[item.name.trim()] = { type: isBTO ? 'bto' : 'dropship', brand: brand, subText: buildSubText(raw) };
          } else if (lower.indexOf(C.inStockPhrase) !== -1) {
            cartItems[item.name.trim()] = { type: 'stock' };
          }
        } catch (e) {
          console.warn('Shipping badge: could not check', item.url);
        }
      }));
      dataLoaded = true;
      renderBadges();
    } catch (err) {
      console.warn('Shipping badge: cart lookup failed', err);
    }
  }

  function makeBadge(cls, icon, title, sub) {
    var badge = document.createElement('div');
    badge.className = 'ship-badge' + (cls ? ' ' + cls : '');
    var iconEl = document.createElement('span');
    iconEl.className = 'ship-badge-icon';
    iconEl.textContent = icon;
    var wrap = document.createElement('div');
    wrap.className = 'ship-badge-text';
    var t = document.createElement('span');
    t.className = 'ship-badge-title';
    t.textContent = title;
    var s = document.createElement('span');
    s.className = 'ship-badge-sub';
    s.textContent = sub;
    wrap.appendChild(t);
    wrap.appendChild(s);
    badge.appendChild(iconEl);
    badge.appendChild(wrap);
    return badge;
  }

  var rendering = false;
  function renderBadges() {
    if (!dataLoaded || rendering) return;
    rendering = true;
    document.querySelectorAll('.product-title[data-test="cart-item-product-title"], .product-title').forEach(function (titleEl) {
      if (titleEl.parentNode.querySelector('.ship-badge')) return;
      var name = titleEl.textContent.replace(/^\d+\s*x\s*/i, '').trim(); // checkout shows "2 x Name"
      var data = cartItems[name];
      if (!data) return;
      var badge;
      if (data.type === 'stock') {
        var st = stockText();
        badge = makeBadge('stock', '✅', st.title, st.sub);
      } else if (data.type === 'bto') {
        badge = makeBadge('bto', '⏳', 'Ships Direct from ' + data.brand, data.subText);
      } else {
        badge = makeBadge('', '🚚', 'Ships Direct from ' + data.brand, data.subText);
      }
      titleEl.parentNode.appendChild(badge);
    });
    rendering = false;
  }

  // Keep the in-stock countdown current
  setInterval(function () {
    var st = stockText();
    document.querySelectorAll('.ship-badge.stock').forEach(function (b) {
      var t = b.querySelector('.ship-badge-title'), s = b.querySelector('.ship-badge-sub');
      if (t.textContent !== st.title) t.textContent = st.title;
      if (s.textContent !== st.sub) s.textContent = st.sub;
    });
  }, 20000);

  loadCartItems();
  // Checkout re-renders often, so re-apply badges when the page changes
  new MutationObserver(renderBadges).observe(document.body, { childList: true, subtree: true });
})();
