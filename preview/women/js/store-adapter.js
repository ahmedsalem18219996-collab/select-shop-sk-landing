/* SELECT SHOP WOMEN · Claude design v2 · store adapter
   The ONLY file that should talk to a backend. The UI (js/app.js) calls these four functions and
   never touches products, cart or wishlist storage directly.

   Current implementation = DEMO: catalog from js/data.js, bag and wishlist kept in memory only
   (nothing persists, nothing is ordered). Replace each function with the real WOMEN public API
   (for example a Supabase Edge Function using the public anon key + RLS). Never put a service-role
   key or any secret in this file: it is public JavaScript on GitHub Pages. */
window.SelectStore = (() => {
  let bagCount = 0;
  const saved = new Set();

  return {
    /* Must resolve to the same shape as window.SELECT_DEMO_DATA (see js/data.js). */
    async loadCatalog() {
      return window.SELECT_DEMO_DATA;
    },

    /* lines: [{ productId, size }] — size is 'S'…'XXL' or 'ONE' for one-size items.
       Must resolve to { ok: true, count } with the new bag item count, or { ok: false, message }. */
    async addToBag(lines) {
      bagCount += lines.length;
      return { ok: true, count: bagCount };
    },

    /* Must resolve to { saved: boolean, count } for the wishlist badge. */
    async toggleSaved(productId) {
      saved.has(productId) ? saved.delete(productId) : saved.add(productId);
      return { saved: saved.has(productId), count: saved.size };
    },

    isSaved(productId) {
      return saved.has(productId);
    }
  };
})();
