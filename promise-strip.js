/*
 * Promise strip for product pages (BigCommerce Stencil)
 *
 * A row of tiles near the price that answers the shopper's questions before they call:
 *   - Ships Today: live countdown to the same-day cutoff in Central time, skipping
 *     weekends and listed holidays ("Ships Tomorrow" / "Ships Monday" after cutoff).
 *     Shown only when the page says "In Stock".
 *   - Ships Direct: for dropship items, says who ships it instead of a countdown.
 *   - Specs & Fitment: opens the description tab and scrolls it into view.
 *   - Built In-House: only on SKUs with the shop's own prefix.
 *   - Bundle Deal: on listed SKUs, picks up the saving from bundle-deal-options.js
 *     and scrolls to that option.
 *
 * Install: Script Manager, Footer, Store pages. Paste inside <script> ... </script>.
 * Shop name, location, SKU prefix and SKUs below are placeholders.
 */
(function () {
  /* ===== SETTINGS ===== */
  var CFG = {
    cutoffHour: 14,                 // same-day ship cutoff, Central time (14 = 2 PM)
    cutoffLabel: '2 PM CT',
    holidays: ['2026-11-26', '2026-12-25', '2027-01-01'],  // no-ship days (YYYY-MM-DD)
    shipFrom: 'Anytown, USA',       // shown on the In Stock tile
    houseSkuPrefix: /^DEMO-/i,      // SKUs made in-house get the "Built In-House" tile
    houseLine: 'By the shop that builds race cars',
    directLine: 'Vetted by our build shop',
    bundleSkus: ['DEMO-1001'],      // products allowed to show the Bundle Deal tile
    specsTarget: '#tab-description, .productView-description, [id*="description"]', // where "Specs & Fitment" scrolls to
    hideOldBanner: false,           // true = hide the PRICE MATCH GUARANTEE image and put the strip in its place
    oldBannerMatch: /price[\s_%20-]*match/i  // how to find that image (file name / alt text)
  };

  if (window.__spStrip) return;
  window.__spStrip = true;

  var css = `
  .sp-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:14px 0 18px;
    padding:10px;background:#141414;border-radius:8px;border-top:3px solid #d9b44a;position:relative;overflow:hidden}
  .sp-strip::before{content:"";position:absolute;right:0;top:0;width:110px;height:100%;opacity:.13;pointer-events:none;
    background:repeating-conic-gradient(#fff 0 25%,transparent 0 50%) 0 0/16px 16px;
    -webkit-mask:linear-gradient(90deg,transparent,#000);mask:linear-gradient(90deg,transparent,#000)}
  .sp-tile{display:flex;flex-direction:column;gap:3px;padding:10px 12px;background:#1f1f1f;border-radius:6px;
    border-left:3px solid #d9b44a;color:#fff;text-decoration:none!important;position:relative;z-index:1;
    transition:transform .15s,background .15s}
  a.sp-tile:hover,.sp-tile-bundle:hover{transform:translateY(-2px);background:#272727;cursor:pointer}
  .sp-k{font:700 10px/1.2 Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#d9b44a;
    display:flex;align-items:center;gap:6px}
  .sp-h{font:800 18px/1.15 Arial,sans-serif;text-transform:uppercase;color:#fff;letter-spacing:.3px}
  .sp-s{font:400 13px/1.3 Arial,sans-serif;color:#cfcfcf}
  .sp-s b{color:#fff;font-variant-numeric:tabular-nums}
  .sp-gold{background:linear-gradient(90deg,#b8902e,#ffe08a,#b8902e) 0 0/200% 100%;
    -webkit-background-clip:text;background-clip:text;color:transparent;animation:spGold 3.5s linear infinite}
  .sp-tile-ship{border-left-color:#3ddc6f}
  .sp-tile-ship.sp-today .sp-h{color:#3ddc6f}
  .sp-live{width:8px;height:8px;border-radius:50%;background:#3ddc6f;animation:spLive 1.4s infinite}
  .sp-tile-direct{border-left-color:#2f80ed}
  .sp-tile-direct .sp-k{color:#7fb0ff}
  .sp-tile-specs:hover{transform:translateY(-2px);background:#272727;cursor:pointer}
  .sp-tile-bundle{border-left-color:#d71920}
  .sp-tile-bundle .sp-k{color:#ff5a5f}
  .sp-tile-bundle .sp-h{color:#fff}
  .sp-flash{animation:spFlash .7s 4!important}
  @keyframes spLive{0%{box-shadow:0 0 0 0 rgba(61,220,111,.8)}70%{box-shadow:0 0 0 7px rgba(61,220,111,0)}100%{box-shadow:0 0 0 0 rgba(61,220,111,0)}}
  @keyframes spGold{to{background-position:-200% 0}}
  @keyframes spFlash{50%{box-shadow:0 0 0 4px #ffde00}}
  @media (prefers-reduced-motion:reduce){.sp-live,.sp-gold{animation:none}}
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ----- Central-time helpers (the shopper's own time zone doesn't matter) ----- */
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  function ct(d){
    var o = {};
    fmt.formatToParts(d).forEach(function(x){ o[x.type] = x.value; });
    return { ymd: o.year + '-' + o.month + '-' + o.day, wl: o.weekday,
             h: (+o.hour) % 24, mi: +o.minute, s: +o.second };
  }
  function isBiz(p){ return p.wl !== 'Saturday' && p.wl !== 'Sunday' && CFG.holidays.indexOf(p.ymd) === -1; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }

  function shipInfo(){
    var now = new Date(), p = ct(now);
    var secs = CFG.cutoffHour * 3600 - (p.h * 3600 + p.mi * 60 + p.s);
    if (isBiz(p) && secs > 0) {
      var hh = Math.floor(secs / 3600), mm = Math.floor(secs % 3600 / 60), ss = secs % 60;
      return { today: true, h: 'Ships Today',
               s: 'Order within <b>' + (hh ? hh + 'h ' : '') + pad(mm) + 'm ' + pad(ss) + 's</b>' };
    }
    for (var i = 1; i < 15; i++) {
      var q = ct(new Date(now.getTime() + i * 86400000));
      if (isBiz(q)) return { today: false, h: 'Ships ' + (i === 1 ? 'Tomorrow' : q.wl),
                             s: 'Order now &middot; ' + CFG.cutoffLabel + ' same-day cutoff' };
    }
    return { today: false, h: 'Ships Fast', s: '' };
  }

  /* ----- Page reading ----- */
  function stockState(view){
    var txt = Array.prototype.map.call(view.querySelectorAll('.productView-info-value'),
                function(e){ return e.textContent; }).join(' ').toLowerCase();
    if (/ships direct/.test(txt)) return 'direct';
    if (/in stock/.test(txt)) return 'stock';
    return 'unknown';
  }
  function getSku(view){
    var el = view.querySelector('[data-product-sku]');
    if (el && el.textContent.trim()) return el.textContent.trim();
    var m = (view.textContent || '').match(/SKU:\s*([A-Z0-9-]+)/i);
    return m ? m[1] : '';
  }

  function place(strip, view){
    var img = Array.prototype.find.call(document.images, function(i){
      return CFG.oldBannerMatch.test((i.getAttribute('src') || '') + ' ' + (i.alt || '') + ' ' + (i.title || ''));
    });
    if (img && CFG.hideOldBanner) {
      var ref = img.closest('a') || img;
      ref.parentNode.insertBefore(strip, ref);
      ref.style.display = 'none';
      return;
    }
    var sku = view.querySelector('[data-product-sku]');
    var anchor = (sku && sku.closest('dl')) || view.querySelector('.productView-info') ||
                 view.querySelector('.productView-price');
    if (anchor) anchor.parentNode.insertBefore(strip, anchor);
    else view.insertBefore(strip, view.firstChild);
  }

  /* ----- Build ----- */
  var strip, pmTile, pageSku = '';
  function build(){
    var view = document.querySelector('.productView');
    if (!view) return false;
    if (strip) return true;

    strip = document.createElement('div');
    strip.className = 'sp-strip';
    var html = '';

    pageSku = getSku(view).toUpperCase();
    var stock = stockState(view);

    if (stock === 'stock') {
      html += '<div class="sp-tile sp-tile-ship"><span class="sp-k"><i class="sp-live"></i>In Stock &middot; ' + CFG.shipFrom + '</span>' +
              '<span class="sp-h" data-sp-ship-h></span><span class="sp-s" data-sp-ship-s></span></div>';
    } else if (stock === 'direct') {
      html += '<div class="sp-tile sp-tile-direct"><span class="sp-k">&#10003; Ships Direct from Manufacturer</span>' +
              '<span class="sp-h">Builder-Approved</span>' +
              '<span class="sp-s">' + CFG.directLine + '</span></div>';
    }

    html += '<div class="sp-tile sp-tile-specs" role="button" tabindex="0">' +
            '<span class="sp-k">Know Before You Order</span><span class="sp-h sp-gold">Specs &amp; Fitment</span>' +
            '<span class="sp-s">Full details &amp; dimensions below &darr;</span></div>';

    if (CFG.houseSkuPrefix.test(pageSku)) {
      html += '<div class="sp-tile"><span class="sp-k">Shop Original</span><span class="sp-h">Built In-House</span>' +
              '<span class="sp-s">' + CFG.houseLine + '</span></div>';
    }

    strip.innerHTML = html;
    pmTile = strip.querySelector('.sp-tile-specs');

    // Open the description tab, then center it under any sticky header and flash it
    function goSpecs(e){
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var tab = document.querySelector('a[href="#tab-description"], [data-tab="description"], .tab-title[href*="description"]');
      if (tab) tab.click();
      var target = document.querySelector(CFG.specsTarget) || tab;
      if (target) {
        setTimeout(function () {
          var hdr = 0, h = document.querySelector('header.header, .header');
          if (h) { var hs = getComputedStyle(h); if (hs.position === 'fixed' || hs.position === 'sticky') hdr = h.getBoundingClientRect().height; }
          var r = target.getBoundingClientRect(), room = window.innerHeight - hdr;
          var gap = r.height < room * 0.8 ? (room - r.height) / 2 : room * 0.12;
          window.scrollTo({ top: Math.max(0, window.pageYOffset + r.top - hdr - gap), behavior: 'smooth' });
          setTimeout(function () { target.classList.remove('sp-flash'); void target.offsetWidth; target.classList.add('sp-flash'); }, 650);
        }, 60);
      }
    }
    pmTile.addEventListener('click', goSpecs);
    pmTile.addEventListener('keydown', goSpecs);
    place(strip, view);
    tick();
    setInterval(tick, 1000);
    return true;
  }

  // Waits for bundle-deal-options.js to mark the option, then reads the saving off its ribbon
  function addBundleTile(){
    if (!strip || strip.querySelector('.sp-tile-bundle')) return;
    if (CFG.bundleSkus.map(function(s){ return s.toUpperCase(); }).indexOf(pageSku) === -1) return;
    var deal = document.querySelector('.sp-deal-tile');
    if (!deal) return;
    var ribbon = deal.querySelector('.sp-deal-ribbon');
    var amt = ribbon && (ribbon.textContent.match(/\$[\d.,]+/) || [])[0];
    var tile = document.createElement('div');
    tile.className = 'sp-tile sp-tile-bundle';
    tile.innerHTML = '<span class="sp-k">Bundle Deal</span><span class="sp-h">Save ' + (amt || 'Big') + '</span>' +
                     '<span class="sp-s">Add the matching part below &darr;</span>';
    tile.addEventListener('click', function(){
      deal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      deal.classList.remove('sp-flash'); void deal.offsetWidth; deal.classList.add('sp-flash');
    });
    strip.insertBefore(tile, pmTile);
  }

  function tick(){
    var h = strip && strip.querySelector('[data-sp-ship-h]');
    if (h) {
      var info = shipInfo();
      h.textContent = info.h;
      strip.querySelector('[data-sp-ship-s]').innerHTML = info.s;
      h.parentNode.classList.toggle('sp-today', info.today);
    }
    addBundleTile();
  }

  function start(){
    if (build()) return;
    var mo = new MutationObserver(function(){ if (build()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
