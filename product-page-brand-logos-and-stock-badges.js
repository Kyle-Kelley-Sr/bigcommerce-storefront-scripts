/*
 * Product Page: Brand Logos + Availability Badges
 * -----------------------------------------------
 * 1. Replaces the plain-text brand name on product pages with the brand's logo.
 * 2. Turns the Availability text into a colored badge customers can read at a glance:
 *      "In Stock"                       -> green  "IN STOCK"
 *      "Limited Stock" / "N left in stock" -> orange "LIMITED STOCK" (no count shown)
 *      "Currently Out of Stock"         -> gray   "CURRENTLY OUT OF STOCK"
 *      "Ships Direct ..."               -> blue   "SHIPS DIRECT FROM <BRAND> · <TIMING>"
 *                                          with a small brand logo chip
 *
 * Availability text is set per product in BigCommerce (Product > Availability),
 * e.g. "Ships Direct - usually 3-5 business days".
 *
 * Install: BigCommerce > Storefront > Script Manager
 *   Location: Footer | Pages: Store pages | Category: Essential
 *   Wrap this file in <script> ... </script> when pasting it in.
 */
document.addEventListener('DOMContentLoaded', function () {
  // ---- Settings -----------------------------------------------------------
  // Brand name exactly as it appears in BigCommerce (capitalization doesn't matter)
  // mapped to the logo image URL (upload logos in Storefront > Image Manager).
  var brandLogos = {
    'Example Brand A': 'https://example.com/images/brand-a-logo.png',
    'Example Brand B': 'https://example.com/images/brand-b-logo.png',
    'Example Brand C': 'https://example.com/images/brand-c-logo.jpg'
  };
  var DEFAULT_DROPSHIP_TIMING = 'usually 1-2 business days';
  var THEME_DELAY_MS = 500; // let the theme finish rendering before restyling
  // -------------------------------------------------------------------------

  var logosByName = {};
  Object.keys(brandLogos).forEach(function (name) {
    logosByName[name.toLowerCase()] = brandLogos[name];
  });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 1. Read the brand name first, then swap in the logo
  var brandName = '';
  var brandLogo = '';
  document.querySelectorAll('.productView-brand a').forEach(function (link) {
    var text = link.textContent.trim();
    var logo = logosByName[text.toLowerCase()];
    if (!brandName) { brandName = text; brandLogo = logo || ''; }
    if (logo) {
      link.innerHTML = '<img src="' + esc(logo) + '" alt="' + esc(text) + '" ' +
        'style="height: 80px; max-height: 80px; width: auto; max-width: 250px; object-fit: contain;">';
    }
  });

  // 2. Availability badges
  setTimeout(function () {
    var base = 'color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 14px; font-weight: bold; ' +
               'letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
    function badge(bg, label) {
      return '<span style="background-color: ' + bg + '; ' + base + '">' + label + '</span>';
    }

    document.querySelectorAll('.productView-info-value').forEach(function (el) {
      var text = el.innerText.trim();
      var lower = text.toLowerCase();

      if (lower === 'in stock') {
        el.innerHTML = badge('#28a745', '✓ IN STOCK');
      } else if (lower === 'limited stock' || lower.indexOf('left in stock') !== -1) {
        el.innerHTML = badge('#ff9900', '⏳ LIMITED STOCK');
      } else if (lower === 'currently out of stock') {
        el.innerHTML = badge('#5f6368', 'CURRENTLY OUT OF STOCK');
      } else if (lower.indexOf('ships direct') !== -1) {
        // Timing = whatever follows "Ships Direct" in the availability text
        var timing = text.slice(lower.indexOf('ships direct') + 'ships direct'.length)
                         .replace(/^[\s,.:;·\-–—]+/, '').trim();
        if (/^from\b/i.test(timing)) {
          timing = timing.replace(/^from[^·,\-–—]*[·,\-–—]?/i, '').trim();
        }
        if (!timing) timing = DEFAULT_DROPSHIP_TIMING;

        var who = brandName ? esc(brandName.toUpperCase()) : 'THE MANUFACTURER';
        var chip = brandLogo
          ? '<img src="' + esc(brandLogo) + '" alt="" style="height: 22px; width: auto; max-width: 90px; ' +
            'background: #fff; border-radius: 3px; padding: 2px 4px; object-fit: contain;">'
          : '';
        el.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; ' +
          'background-color: #007bff; ' + base + (brandLogo ? ' padding-left: 4px;' : '') + '">' +
          chip + 'SHIPS DIRECT FROM ' + who + ' · ' + esc(timing.toUpperCase()) + '</span>';
      }
    });
  }, THEME_DELAY_MS);
});
