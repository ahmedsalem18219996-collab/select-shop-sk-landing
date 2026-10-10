// SELECT SHOP temporary storefront — direct orders safety gates.
// Run: node --test orders-system/tests/direct-checkout-safety.test.cjs
// Tests are local/readonly. They never contact Supabase or submit a real order.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const content = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const configSource = content('preview/select-unified-v1/orders-config.js');
const checkoutSource = content('preview/select-unified-v1/orders-checkout.js');
const pageSource = content('preview/select-unified-v1/index.html');
const serverSource = content('orders-system/supabase/functions/submit-order/index.ts');
const adminConfig = content('preview/select-unified-v1/orders-admin/config.js');

function sandbox(options = {}) {
  const context = {
    window: {},
    document: { querySelector: () => null },
    fetch: () => { throw Error('UNEXPECTED_NETWORK_REQUEST'); },
    console: { error: () => {}, warn: () => {} },
    TextEncoder,
    crypto: globalThis.crypto,
  };
  vm.runInNewContext(configSource, context, { filename: 'orders-config.js', timeout: 2000 });
  // The adapter captures its configuration at initialization, so override before loading it.
  if (options.directOrdersEnabled === true) {
    context.window.SELECT_SHOP_GUEST_ORDERS = {
      ...context.window.SELECT_SHOP_GUEST_ORDERS,
      enabled: true,
      turnstileSiteKey: '',
    };
  }
  vm.runInNewContext(checkoutSource, context, { filename: 'orders-checkout.js', timeout: 2000 });
  return context;
}

test('real site checkout remains disabled until prerequisites are completed', () => {
  const ctx = sandbox();
  assert.equal(ctx.window.SELECT_SHOP_GUEST_ORDERS.enabled, false);
  assert.equal(ctx.window.SELECT_SHOP_GUEST_CHECKOUT.isEnabled(), false);
  assert.equal(ctx.window.SELECT_SHOP_GUEST_ORDERS.turnstileSiteKey, '');
});

test('disabled direct checkout cannot send a real order', async () => {
  const ctx = sandbox();
  await assert.rejects(
    () => ctx.window.SELECT_SHOP_GUEST_CHECKOUT.submit({ name: 'Demo User' }, []),
    /orders_disabled/,
  );
});

test('enabling the flag without CAPTCHA fails closed, before any network request', async () => {
  const ctx = sandbox({ directOrdersEnabled: true });
  assert.equal(ctx.window.SELECT_SHOP_GUEST_CHECKOUT.isEnabled(), true);
  await assert.rejects(
    () => ctx.window.SELECT_SHOP_GUEST_CHECKOUT.submit({ name: 'Demo User' }, []),
    /orders_not_configured/,
  );
});

test('guest order request is guarded by CAPTCHA and an idempotency key', () => {
  assert.match(checkoutSource, /if\s*\(!captchaToken\)/);
  assert.match(checkoutSource, /idempotencyKey:\s*key/);
  assert.match(checkoutSource, /\/functions\/v1\/submit-order/);
  assert.match(checkoutSource, /result\.ok\s*!==\s*true/);
});

test('backend verifies Turnstile, origin, prices and persistence', () => {
  assert.match(serverSource, /allowedOrigins\.has\(origin\)/);
  assert.match(serverSource, /TURNSTILE_SECRET_KEY/);
  assert.match(serverSource, /ORDER_HASH_SECRET/);
  assert.match(serverSource, /siteverify/);
  assert.match(serverSource, /ss_order_catalog/);
  assert.match(serverSource, /ss_orders/);
  assert.match(serverSource, /idempotency_key/);
});

test('temporary frontend and admin use same isolated orders project', () => {
  const cfg = sandbox().window.SELECT_SHOP_GUEST_ORDERS;
  const project = 'zznqdwrohrycsjfpvkhc';
  assert.ok(cfg.supabaseUrl.includes(project));
  assert.ok(adminConfig.includes(project));
  assert.ok(!cfg.supabaseUrl.includes('vzhknoayzgzyqwzsnzmj'));
});

test('customer browser bundle cannot contain private Supabase role secrets', () => {
  for (const [fileName, text] of [
    ['orders-config.js', configSource],
    ['orders-checkout.js', checkoutSource],
    ['orders-admin/config.js', adminConfig],
  ]) {
    assert.doesNotMatch(text, /sb_secret_[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]+/i, fileName);
  }
});

test('page loads protected checkout adapter before storefront core', () => {
  const configAt = pageSource.indexOf('orders-config.js');
  const checkoutAt = pageSource.indexOf('orders-checkout.js');
  const coreAt = pageSource.indexOf('core.js');
  assert.ok(configAt >= 0 && checkoutAt > configAt && coreAt > checkoutAt);
});
