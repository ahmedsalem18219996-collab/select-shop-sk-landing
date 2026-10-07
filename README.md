# SELECT SHOP — V15 Guided Motion

Static, mobile-first SELECT SHOP storefront for GitHub Pages. V15 uses the V14 clean-slate architecture with a guided purchase flow and purpose-built motion system.

See `V15-DESIGN-PLAN.md` and `V15-QA.md`.

## Product-view analytics

The live storefront sends GA4 `view_item` ecommerce events to measurement ID
`G-NB8PZCX35Z`. Each model is counted at most once per browser session, while
the durable cross-device totals remain in Google Analytics rather than browser
storage.

To review model performance in GA4, use **Explore → Free form**, set **Item name**
as the row dimension, and add **Items viewed** plus **Total users** as metrics.
Realtime events normally appear within minutes; standard item reports can take
up to 24 hours to populate.
