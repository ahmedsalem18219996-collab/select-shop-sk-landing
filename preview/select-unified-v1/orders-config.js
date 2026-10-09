// Customer checkout configuration for the TEMPORARY SELECT SHOP storefront only.
// Keeping disabled until the new independent Supabase project is verified.
window.SELECT_SHOP_GUEST_ORDERS = Object.freeze({
  enabled: false,
  supabaseUrl: "",
  publishableKey: "",
  turnstileSiteKey: "",
});
// All exposed values must be PUBLIC. NEVER put service_role or Turnstile secret here.
