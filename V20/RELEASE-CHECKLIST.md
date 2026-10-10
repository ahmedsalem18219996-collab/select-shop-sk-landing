# V20 QA & Release Checklist
Branch-only until authorized; \`main\` is production.

## Design
- [ ] Compare target reference and V20 screenshots at 390px, 1440px without imitating protected logos
- [ ] Black/lime tokens consistent in header, hero, cards, product routes and footer
- [ ] Hero real product recognizable; no clipped shoe/fake transparent mask edges
- [ ] Uncluttered main CTA; sticky dock unobstructed on mobile
- [ ] All images no visible hard crop, edge halos, or watermark/code artifacts
- [ ] Reduced-motion behavior works

## Catalog and route
- [ ] 19 sneaker variants and 23 direct stable URLs present
- [ ] Carwash product route and category preserved
- [ ] Selecting variant swaps image, variant label and valid sizes instantly
- [ ] Every SKU image/price/address displayed accurately
- [ ] All other-products links point to working canonical routes

## Cart and checkout
- [ ] Cart addition, removal and persistence
- [ ] Two sizes for try-on do not count as two purchased pairs
- [ ] Same shipment, real supplier-based discount (no fake percentage)
- [ ] WhatsApp payload includes correct items, address and exact totals
- [ ] Disabled guest checkout remains disabled until back-end gate
- [ ] No customer message submitted from a QA preview

## Analytics
- [ ] Owner QA mode sends no Pixel or GA4 events
- [ ] PageView, ViewContent, AddToCart and InitiateCheckout fire when intended
- [ ] WhatsApp inquiry click vs prepared lead vs verified purchase are distinct
- [ ] No double-counting on SPA variant switches

## Security/SEO/quality
- [ ] Preview noindex; production canonical and OG metadata correct
- [ ] iPhone Safari safe area, Android Chrome and desktop keyboard tested
- [ ] CLS/LCP/INP baseline and after, documented with tools and devices
- [ ] 320/360/375/390/414/768/1024/1440px no overflow
- [ ] Privacy/shipping/returns/contact claims validated
- [ ] Browser QA report with screenshots and explicit PASS/FAIL
- [ ] Human approval before touching main or paid campaign URLs

Current status: NOT READY TO SHIP. Branch preparation only.
