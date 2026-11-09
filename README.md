# BigCommerce Storefront Scripts

Three drop-in scripts I wrote for a BigCommerce store that sells race car parts. They tell customers when an item will actually ship, show brand logos in place of plain brand names, and let customers copy a promo code with one tap.

![Demo: product page with brand logo, ships-direct badge and promo banner; cart with in-stock countdown, ships-direct and built-to-order badges](docs/demo.png)

*Screenshot from the included demo page. All brands, products and logos are placeholders.*

## The problems

- **Customers didn't know when orders would arrive.** The store sells parts from its own shelves, parts that ship directly from the manufacturer, and parts that are built to order. Before checkout, all three looked the same.
- **Plain-text brand names looked unfinished** next to the product photos.
- **Promo codes got mistyped or forgotten** at checkout during sales.

## The scripts

| Script | What it does |
| --- | --- |
| [`cart-checkout-shipping-badges.js`](scripts/cart-checkout-shipping-badges.js) | Adds a badge under every cart and checkout item: **In Stock – Ships Today** with a live countdown to the same-day cutoff, **Ships Direct from &lt;Brand&gt;** with the expected timing, or **Built to Order** with the lead time. Uses the shop's time zone, skips weekends and holidays, and refreshes every 20 seconds. |
| [`product-page-brand-logos-and-stock-badges.js`](scripts/product-page-brand-logos-and-stock-badges.js) | Replaces the brand name with the brand's logo and turns the Availability text into a colored badge (In Stock, Limited Stock, Out of Stock, Ships Direct). Limited stock hides the exact count. |
| [`promo-code-banner.js`](scripts/promo-code-banner.js) | Animated promo banner above Add to Cart and at checkout. One tap copies the code; at checkout it also opens the coupon field and fills it in. |

## How the shipping badges work

1. Read the cart from BigCommerce's Storefront Cart API (`/api/storefront/carts`).
2. Fetch each item's product page in the background and read its **Availability** text, so the store manages everything from the normal product editor.
3. Classify each item: `in stock`, `ships direct`, or `built to order` (or a lead time in weeks).
4. For in-stock items, work out the shop's local time with `Intl.DateTimeFormat`. Show the time left before the cutoff, or the next ship day after weekends and closed dates.
5. Watch the page with a `MutationObserver`, because BigCommerce's checkout re-renders as the customer moves through it.

## Setup

1. In BigCommerce go to **Storefront → Script Manager → Create a Script**.
2. Location **Footer**. Pages: **Store pages** (add **Checkout** for the shipping badges and promo banner). Category **Essential**. Type **Script**.
3. Paste the file's contents between `<script>` and `</script>`.
4. Edit the settings block at the top of each file: promo code, brand logo URLs, cutoff hour, time zone, closed dates.
5. Set each product's **Availability** text in the product editor, for example `In Stock`, `Ships Direct - usually 3-5 business days`, or `Ships Direct - built to order, 3-4 weeks`.

Tested on a Stencil theme with BigCommerce's Optimized One-Page Checkout. Other themes may use different class names for the product title and availability fields; adjust the selectors near the top of each function.

## Try the demo

Open [`demo/index.html`](demo/index.html) through any local web server (for example `python3 -m http.server`, then visit `http://localhost:8000/demo/`). The demo mocks the cart API and product pages so the scripts run without a store.

## Built with

JavaScript (no libraries), BigCommerce Script Manager and the Storefront Cart API. Built with AI assistance: I defined the requirements and edge cases, tested on the live store, and maintain the scripts.

## License

MIT
