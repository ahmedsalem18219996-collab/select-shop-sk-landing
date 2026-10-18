// Preview backend that runs in the browser with SAMPLE data. It mirrors the database operation map and its
// permission rules (women_admin_operation) and returns the same shapes, so the design can be reviewed and tested
// before the women-admin Edge Function is deployed. Nothing here is real store data.

const OPS = {
  'session.get': [null, 0, 0], 'dashboard.summary': ['dashboard.view', 0, 0], 'categories.list': [null, 0, 0],
  'products.list': ['products.view', 0, 0], 'products.get': ['products.view', 0, 0], 'products.create': ['products.edit', 1, 0],
  'products.update_text': ['products.edit', 1, 0], 'products.structure': ['products.edit', 1, 0], 'products.set_display': ['products.edit', 1, 0],
  'products.set_price': ['products.price', 1, 0], 'products.set_variant_price': ['products.price', 1, 0],
  'products.set_availability': ['inventory.manage', 1, 0], 'products.set_stock': ['inventory.manage', 1, 0],
  'products.publish': ['products.publish', 1, 0], 'products.hide': ['products.publish', 1, 0], 'products.set_shipping_profile': ['shipping.manage', 1, 0],
  'media.authorize': ['media.manage', 0, 0], 'media.attach': ['media.manage', 1, 0], 'media.reorder': ['media.manage', 1, 0],
  'media.set_primary': ['media.manage', 1, 0], 'media.set_hidden': ['media.manage', 1, 0], 'media.prepare_delete': ['media.manage', 0, 0], 'media.delete': ['media.manage', 1, 0],
  'categories.save': ['categories.manage', 1, 0], 'categories.reorder': ['categories.manage', 1, 0], 'categories.delete': ['categories.manage', 1, 0],
  'orders.list': ['orders.view', 0, 0], 'orders.get': ['orders.view', 0, 0], 'orders.transition': ['orders.manage', 1, 0], 'orders.set_fulfillment': ['orders.manage', 1, 0],
  'customers.list': ['customers.view', 0, 0], 'customers.get': ['customers.view', 0, 0],
  'shipping.get': ['shipping.view', 0, 0], 'shipping.set_region': ['shipping.manage', 1, 0], 'shipping.set_profile': ['shipping.manage', 1, 0], 'shipping.set_rate': ['shipping.manage', 1, 0],
  'settings.get': ['settings.view', 0, 0], 'settings.update_contact': ['settings.manage', 1, 0], 'settings.update_brand': [null, 1, 1],
  'settings.authorize_asset': [null, 0, 1], 'settings.set_asset': [null, 1, 1],
  'storefront.get': ['storefront.manage', 0, 0], 'storefront.authorize_upload': ['storefront.manage', 0, 0], 'storefront.update_content': ['storefront.manage', 1, 0],
  'storefront.set_sections': ['storefront.manage', 1, 0], 'storefront.save_banner': ['storefront.manage', 1, 0], 'storefront.delete_banner': ['storefront.manage', 1, 0],
  'storefront.save_story': ['storefront.manage', 1, 0], 'storefront.delete_story': ['storefront.manage', 1, 0], 'storefront.save_look': ['storefront.manage', 1, 0],
  'storefront.delete_look': ['storefront.manage', 1, 0], 'storefront.reorder': ['storefront.manage', 1, 0],
  'audit.list': ['audit.view', 0, 0], 'users.list': [null, 0, 1], 'users.authorize_invite': [null, 0, 1], 'users.set_access': [null, 1, 1],
};
const GRANTABLE = ['audit.view', 'categories.manage', 'customers.view', 'dashboard.view', 'inventory.manage', 'media.manage', 'orders.manage', 'orders.view', 'products.edit', 'products.price', 'products.publish', 'products.view', 'reports.view', 'settings.manage', 'settings.view', 'shipping.manage', 'shipping.view', 'storefront.manage'];
const OWNER = '00000000-0000-4000-8000-00000000d0e1', STAFF = '00000000-0000-4000-8000-00000000d0e2', STAFF2 = '00000000-0000-4000-8000-00000000d0e3';
const uid = () => crypto.randomUUID();
const hex = () => crypto.randomUUID().replaceAll('-', '');
const now = () => new Date().toISOString();
const daysAgo = (d, h = 10) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, 15, 0, 0); return x.toISOString(); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Sample swatch images as small SVG data URIs (no network).
const swatch = (c, label) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".85"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><path d="M110 70 150 95 190 70 230 110 205 140 205 340 95 340 95 140 70 110z" fill="#fff" fill-opacity=".14"/><text x="150" y="380" font-family="sans-serif" font-size="16" fill="#fff" fill-opacity=".7" text-anchor="middle">${label}</text></svg>`);

function seed() {
  const cats = [['فساتين', 'Dresses'], ['أطقم', 'Sets'], ['عبايات', 'Abayas'], ['بلوزات', 'Tops'], ['جيبات وبناطيل', 'Skirts & trousers'], ['إكسسوارات', 'Accessories'], ['أخرى', 'Other']]
    .map(([name, name_en], i) => ({ id: uid(), name, name_en, position: (i + 1) * 10, visible: true }));
  const P = [];
  const mk = (n, title, cat, price, sizes, status, color, opts = {}) => {
    const sv = 3 + sizes.length;
    const optId = uid();
    const values = sizes.map((v, i) => ({ value_id: uid(), value: v, position: i, active: true }));
    const variants = sizes.length ? values.map((v, i) => ({ variant_id: uid(), position: i, active: true, availability: 'available', amount_minor: null, selections: [{ option_id: optId, value_id: v.value_id }] }))
      : [{ variant_id: uid(), position: 0, active: true, availability: 'available', amount_minor: null, selections: [] }];
    const stock = {};
    variants.forEach((v, i) => { stock[i] = { quantity: opts.stock?.[i] ?? 6, low_stock_at: 2 }; if (stock[i].quantity === 0) v.availability = 'unavailable'; });
    const media = opts.noImage ? [] : [{ media_id: uid(), storage_path: swatch(color, 'SAMPLE'), alt_text: title, position: 0, hidden: false, origin: 'owner_upload', scope: 'product' }];
    P.push({ public_code: `SS-${1000 + n}`, title, description: opts.desc || '', status, category: cat, is_new: !!opts.isNew,
      created_at: daysAgo(n + 2), updated_at: daysAgo(n), structure_version: sv, base_price: price, options: sizes.length ? [{ option_id: optId, name: 'المقاس', position: 0, values }] : [],
      variants, stock, media, shipping_profile: opts.noShip ? null : { key: 'standard', name: 'شحن عادي', active: true }, views: opts.views ?? 20 + n * 7 });
  };
  mk(1, 'فستان ميدي كتان', 'فساتين', 145000, ['S', 'M', 'L', 'XL'], 'public', '#C9B79C', { isNew: true, stock: [0, 4, 7, 1], views: 212 });
  mk(2, 'فستان سهرة مخمل', 'فساتين', 275000, ['S', 'M', 'L'], 'public', '#4A1C26', { stock: [2, 3, 0], views: 188 });
  mk(3, 'طقم بليزر وبنطلون', 'أطقم', 230000, ['S', 'M', 'L', 'XL'], 'public', '#2F3B57', { isNew: true, views: 140 });
  mk(4, 'عباية كريب مطرزة', 'عبايات', 190000, [], 'public', '#24262C', { views: 96 });
  mk(5, 'بلوزة ساتان بكسرات', 'بلوزات', 78000, ['S', 'M', 'L'], 'draft', '#D8BFB8', { isNew: true, noShip: true });
  mk(6, 'جيبة بليسيه طويلة', 'جيبات وبناطيل', 95000, ['S', 'M', 'L'], 'hidden', '#7C8A63', { views: 31 });
  mk(7, 'شنطة كلاتش ساتان', 'إكسسوارات', 52000, [], 'draft', '#1E2130', { noImage: true, noShip: true, views: 0 });
  mk(8, 'كارديجان تريكو', 'بلوزات', 84000, ['M', 'L'], 'public', '#A68A66', { stock: [1, 0], views: 57 });

  const names = [['منى علي', '01012345678'], ['سارة محمود', '01123456789'], ['ياسمين خالد', '01234567890'], ['نورهان سمير', '01098765432'], ['منى علي', '01012345678'], ['هبة فتحي', '01555555555']];
  const regions = [['cairo', 'القاهرة'], ['giza', 'الجيزة'], ['alex', 'الإسكندرية'], ['delta', 'محافظات الدلتا'], ['upper', 'الصعيد']];
  const rates = { cairo: 6000, giza: 6000, alex: 7000, delta: 8000, upper: 10000 };
  const O = names.map(([name, phone], i) => {
    const p = P[i % 4], q = 1 + (i % 2), sub = p.base_price * q, reg = regions[i % regions.length], ship = rates[reg[0]];
    const status = ['pending', 'confirmed', 'confirmed', 'cancelled', 'confirmed', 'pending'][i];
    const stage = { 1: 'shipped', 2: 'preparing', 4: 'delivered' }[i] || null;
    return { public_order_code: `ORD-${['K7M2Q9XA', 'P3RT8VWN', 'H4JD6YCM', 'B9ZQ2KTF', 'W5NX7RHP', 'D2CV8MJQ'][i]}`, created_at: daysAgo(i, 9 + i), status,
      status_version: status === 'pending' ? 1 : 2, payment_method: 'cod', buyer_name: name, buyer_phone: phone, delivery_region_key: reg[0], delivery_region_label: reg[1],
      delivery_address: 'المعادي، شارع 9، عمارة 12' + '\n' + 'الدور الثالث', delivery_notes: i === 0 ? 'كلمي قبل ما توصلي' : null, currency: 'EGP',
      merchandise_subtotal_minor: sub, shipping_total_minor: ship, grand_total_minor: sub + ship, line_count: 1, item_quantity: q,
      items: [{ position: 0, product_public_code: p.public_code, product_title: p.title, option_selections: p.options.length ? [{ name: 'المقاس', value: 'M' }] : [], quantity: q, unit_price_minor: p.base_price, line_total_minor: sub }],
      history: [{ from_status: null, to_status: 'pending', changed_at: daysAgo(i, 9 + i) }].concat(status !== 'pending' ? [{ from_status: 'pending', to_status: status, changed_at: daysAgo(i, 11 + i) }] : []),
      fulfillment: stage ? { stage, version: { preparing: 1, shipped: 2, delivered: 3 }[stage], carrier: stage !== 'preparing' ? 'بوسطة' : null, tracking_code: stage !== 'preparing' ? 'BST-48213' : null, note: null, updated_at: daysAgo(i, 14) } : null,
      events: stage ? [{ from: null, to: 'preparing', at: daysAgo(i, 12), actor: OWNER }].concat(stage !== 'preparing' ? [{ from: 'preparing', to: 'shipped', at: daysAgo(i, 15), actor: STAFF2 }] : []).concat(stage === 'delivered' ? [{ from: 'shipped', to: 'delivered', at: daysAgo(i - 1 < 0 ? 0 : i - 1, 12), actor: STAFF2 }] : []) : [] };
  });
  const shipping = {
    profiles: [{ key: 'standard', name: 'شحن عادي', active: true, products: 6 }, { key: 'express', name: 'شحن سريع (القاهرة والجيزة)', active: true, products: 0 }],
    regions: regions.map(([key, label]) => ({ key, label, active: true })),
    rates: regions.map(([k]) => ({ profile_key: 'standard', region_key: k, amount_minor: rates[k], active: true })).concat([{ profile_key: 'express', region_key: 'cairo', amount_minor: 9000, active: true }, { profile_key: 'express', region_key: 'giza', amount_minor: 9000, active: true }]),
  };
  const settings = { version: 4, store_name: 'SELECT SHOP WOMEN', tagline: 'قطع جديدة كل خميس', primary_color: '#16192B', default_locale: 'ar',
    whatsapp_e164: '+201000000000', phone: null, contact_email: 'hello@example.com', instagram_url: 'https://instagram.com/example', facebook_url: null, tiktok_url: null, logo_path: null, favicon_path: null, configured_at: daysAgo(30) };
  const storefront = {
    content: { version: 3, hero_title: 'لوكات الأسبوع', hero_highlight: 'جاهزة', hero_description: '3 لوكات متنسقة من القطع اللي وصلت الخميس.', announcement: 'شحن مجاني فوق 1,500 جنيه', payment_note: 'الدفع عند الاستلام', shipping_note: 'القاهرة والجيزة في يومين', returns_note: 'استبدال خلال 14 يوم' },
    sections: ['banners', 'stories', 'looks', 'categories', 'products', 'promises'].map((key) => ({ key, visible: true })),
    banners: [{ id: uid(), title: 'وصل الخميس', subtitle: 'فساتين كتان للصيف', image: swatch('#C9B79C', 'BANNER'), image_path: null, link_url: '#new', active: true }],
    stories: [{ id: uid(), title: 'الجديد', active: true, slides: [{ headline: 'وصل الخميس', product_code: 'SS-1001', image: null, image_path: null }, { headline: 'بليزر بقصة جديدة', product_code: 'SS-1003', image: null, image_path: null }] },
      { id: uid(), title: 'سهرة', active: true, slides: [{ headline: 'مخمل نبيتي', product_code: 'SS-1002', image: null, image_path: null }] }],
    looks: [{ id: uid(), name: 'لوك الشغل', note: 'من الاجتماع للعشا', active: true, items: ['SS-1003', 'SS-1005'] }, { id: uid(), name: 'خروجة بالليل', note: 'مخمل وساتان', active: true, items: ['SS-1002', 'SS-1007'] }],
  };
  const users = [
    { id: OWNER, role: 'owner', active: true, email: 'owner@select-women.example', created_at: daysAgo(40), last_sign_in_at: daysAgo(0, 8) },
    { id: STAFF, role: 'staff', active: true, email: 'catalog@select-women.example', created_at: daysAgo(12), last_sign_in_at: daysAgo(1, 13), permissions: ['categories.manage', 'dashboard.view', 'inventory.manage', 'media.manage', 'orders.view', 'products.edit', 'products.price', 'products.view'] },
    { id: STAFF2, role: 'staff', active: false, email: 'orders@select-women.example', created_at: daysAgo(9), last_sign_in_at: daysAgo(5, 11), permissions: ['customers.view', 'orders.manage', 'orders.view'] },
  ];
  const audit = [
    ['products.set_price', 'product', 'SS-1002', { price_before_minor: 260000, price_minor: 275000 }, STAFF, 2],
    ['products.publish', 'product', 'SS-1003', { status_before: 'draft', status: 'public' }, OWNER, 1],
    ['orders.set_fulfillment', 'order', O[1].public_order_code, { stage_before: 'preparing', stage: 'shipped' }, STAFF2, 1],
    ['products.set_stock', 'product', 'SS-1001', { variant_position: 0, quantity_before: 2, quantity: 0 }, STAFF, 0],
    ['users.set_access', 'user', STAFF2, { email: 'orders@select-women.example', active: false }, OWNER, 0],
  ].map(([operation, entity_type, entity_ref, summary, actor, d], i) => ({ id: uid(), at: daysAgo(d, 9 + i), actor, actor_role: actor === OWNER ? 'owner' : 'staff', operation, entity_type, entity_ref, summary }));
  return { cats, P, O, shipping, settings, storefront, users, audit };
}

export function createMock() {
  let db = seed();
  let actor = OWNER;
  const principal = () => {
    const u = db.users.find((x) => x.id === actor);
    if (!u || !u.active) return null;
    const base = u.role === 'owner' ? GRANTABLE : (u.permissions || []);
    const perms = new Set(base);
    if (perms.has('shipping.manage')) perms.add('shipping.view');
    if (perms.has('settings.manage')) perms.add('settings.view');
    if (perms.has('orders.manage')) perms.add('orders.view');
    if (['products.edit', 'products.price', 'products.publish', 'media.manage', 'inventory.manage'].some((p) => perms.has(p))) perms.add('products.view');
    return { role: u.role, email: u.email, permissions: [...perms].sort() };
  };
  const has = (pr, p) => pr.role === 'owner' || !p || pr.permissions.includes(p);
  const prod = (code) => db.P.find((p) => p.public_code === code);
  const emailOf = (id) => db.users.find((u) => u.id === id)?.email || null;
  const audit = (pr, op, entity_type, entity_ref, summary = {}) => db.audit.unshift({ id: uid(), at: now(), actor, actor_role: pr.role, actor_email: pr.email, operation: op, entity_type, entity_ref, summary });

  const variantPrice = (p, v) => v.amount_minor ?? p.base_price ?? null;
  const blockersOf = (p) => {
    const b = [];
    if (p.status === 'archived') b.push('archived');
    if (!p.title) b.push('title_missing');
    const act = p.variants.filter((v) => v.active);
    if (!act.length) b.push('no_active_variant');
    else if (!act.some((v) => v.availability === 'available' && variantPrice(p, v) !== null)) b.push('no_publish_ready_variant');
    return b;
  };
  const card = (p) => ({
    category: p.category, is_new: p.is_new, image: p.media.find((m) => !m.hidden)?.storage_path || null,
    stock_total: Object.values(p.stock).reduce((a, s) => a + s.quantity, 0) || null,
    stock_low: Object.entries(p.stock).some(([pos, s]) => p.variants[pos]?.active && s.quantity <= s.low_stock_at), views_30d: p.views,
  });
  const listItem = (p) => {
    const prices = p.variants.filter((v) => v.active).map((v) => variantPrice(p, v)).filter((x) => x !== null);
    return { public_code: p.public_code, title: p.title, status: p.status, created_at: p.created_at, updated_at: p.updated_at,
      variant_count: p.variants.length, active_variant_count: p.variants.filter((v) => v.active).length, currency: 'EGP',
      price_min_minor: prices.length ? Math.min(...prices) : null, price_max_minor: prices.length ? Math.max(...prices) : null,
      unpriced_active_variant_count: p.variants.filter((v) => v.active && variantPrice(p, v) === null).length, publish_blockers: blockersOf(p), ...card(p) };
  };
  const detail = (p) => ({
    product_id: p.public_code, public_code: p.public_code, title: p.title, description: p.description, status: p.status, updated_at: p.updated_at, created_at: p.created_at,
    structure_version: p.structure_version, base_price: p.base_price === null ? null : { currency: 'EGP', amount_minor: p.base_price },
    options: p.options, shipping_profile: p.shipping_profile, publish_blockers: blockersOf(p),
    variants: p.variants.map((v) => ({ ...v, currency: 'EGP', amount_minor: variantPrice(p, v), price_source: v.amount_minor !== null ? 'variant_override' : 'product_base',
      sellable: v.active && v.availability === 'available' && variantPrice(p, v) !== null && p.status === 'public',
      blockers: [!v.active && 'variant_inactive', v.availability !== 'available' && 'owner_unavailable', variantPrice(p, v) === null && 'price_unresolved', p.status !== 'public' && 'product_not_public'].filter(Boolean) })),
  });
  const bumpV = (p) => { p.structure_version += 1; };
  const touch = (p) => { p.updated_at = now(); };

  const exec = (pr, op, a) => {
    switch (op) {
      case 'session.get': return { outcome: 'ok', data: { user_id: actor, role: pr.role, email: pr.email, permissions: pr.role === 'owner' ? [...GRANTABLE, 'users.manage', 'brand.manage'] : pr.permissions, grantable: GRANTABLE } };
      case 'dashboard.summary': {
        const d = { products: { total: db.P.filter((p) => p.status !== 'archived').length, public: db.P.filter((p) => p.status === 'public').length, draft: db.P.filter((p) => p.status === 'draft').length, hidden: db.P.filter((p) => p.status === 'hidden').length },
          views: { today: 37, days_7: 486, days_30: db.P.reduce((a, p) => a + p.views, 0) },
          low_stock: db.P.flatMap((p) => Object.entries(p.stock).filter(([pos, s]) => p.variants[pos]?.active && s.quantity <= s.low_stock_at).map(([pos, s]) => ({ code: p.public_code, title: p.title, quantity: s.quantity, variant_position: Number(pos), label: p.options[0]?.values[pos]?.value }))).sort((x, y) => x.quantity - y.quantity).slice(0, 8),
          top_viewed: [...db.P].sort((x, y) => y.views - x.views).slice(0, 5).map((p) => ({ code: p.public_code, title: p.title, views: p.views })) };
        if (has(pr, 'orders.view')) {
          const conf = db.O.filter((o) => o.status === 'confirmed');
          d.orders = { pending: db.O.filter((o) => o.status === 'pending').length, confirmed: conf.length, cancelled: db.O.filter((o) => o.status === 'cancelled').length,
            today: db.O.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length,
            revenue_today_minor: 0, revenue_7d_minor: conf.reduce((a, o) => a + o.grand_total_minor, 0), revenue_30d_minor: conf.reduce((a, o) => a + o.grand_total_minor, 0) + 1840000,
            to_ship: conf.filter((o) => !o.fulfillment || o.fulfillment.stage === 'preparing').length };
          d.recent_orders = db.O.slice(0, 6).map((o) => ({ code: o.public_order_code, status: o.status, buyer_name: o.buyer_name, total_minor: o.grand_total_minor, created_at: o.created_at }));
          d.revenue_by_day = Array.from({ length: 14 }, (_, i) => { const day = new Date(); day.setDate(day.getDate() - (13 - i)); const m = [120000, 0, 285000, 151000, 0, 410000, 96000, 230000, 0, 175000, 520000, 145000, 301000, 0][i]; return { day: day.toISOString().slice(0, 10), minor: m, orders: m ? Math.max(1, Math.round(m / 150000)) : 0 }; });
        }
        if (has(pr, 'audit.view')) d.activity = db.audit.slice(0, 8).map((x) => ({ ...x, actor_email: emailOf(x.actor) }));
        return { outcome: 'ok', data: d };
      }
      case 'categories.list': return { outcome: 'ok', data: [...db.cats].sort((x, y) => x.position - y.position).map((c) => ({ ...c, product_count: db.P.filter((p) => p.category === c.name).length })) };
      case 'categories.save': {
        const name = String(a.name || '').trim(); if (!name) return { outcome: 'invalid', field: 'name' };
        if (a.id) { const c = db.cats.find((x) => x.id === a.id); if (!c) return { outcome: 'not_found' }; db.P.filter((p) => p.category === c.name).forEach((p) => { p.category = name; }); Object.assign(c, { name, name_en: a.name_en || null, visible: a.visible !== false }); audit(pr, op, 'category', name, { name }); return { outcome: 'saved', id: c.id }; }
        if (db.cats.some((c) => c.name === name)) return { outcome: 'duplicate' };
        const c = { id: uid(), name, name_en: a.name_en || null, visible: a.visible !== false, position: Math.max(0, ...db.cats.map((x) => x.position)) + 10 }; db.cats.push(c); audit(pr, op, 'category', name, { name }); return { outcome: 'saved', id: c.id };
      }
      case 'categories.reorder': (a.ids || []).forEach((id, i) => { const c = db.cats.find((x) => x.id === id); if (c) c.position = (i + 1) * 10; }); audit(pr, op, 'category', null, {}); return { outcome: 'saved' };
      case 'categories.delete': { const c = db.cats.find((x) => x.id === a.id); if (!c) return { outcome: 'not_found' }; if (db.P.some((p) => p.category === c.name)) return { outcome: 'in_use' }; db.cats = db.cats.filter((x) => x !== c); audit(pr, op, 'category', c.name); return { outcome: 'deleted' }; }

      case 'products.list': {
        const q = String(a.q || '').trim().toLowerCase();
        return { outcome: 'ok', data: db.P.filter((p) => (!a.status || p.status === a.status) && (!a.category || p.category === a.category) && (!q || p.title.toLowerCase().includes(q) || p.public_code.toLowerCase().includes(q)))
          .sort((x, y) => y.created_at.localeCompare(x.created_at)).map(listItem) };
      }
      case 'products.get': { const p = prod(a.code); if (!p) return { outcome: 'not_found' };
        return { outcome: 'ok', data: { product: detail(p), card: card(p), media: { media: p.media.map((m) => ({ ...m })), structure_version: p.structure_version }, stock: clone(p.stock),
          views: { today: Math.round(p.views / 30), last_7_days: Math.round(p.views / 4), last_30_days: p.views, total: p.views * 2 },
          shipping_profiles: db.shipping.profiles.map((s) => ({ key: s.key, name: s.name, active_region_count: db.shipping.rates.filter((r) => r.profile_key === s.key).length })),
          activity: has(pr, 'audit.view') ? db.audit.filter((x) => x.entity_type === 'product' && x.entity_ref === p.public_code).slice(0, 15) : null } }; }
      case 'products.create': {
        const title = String(a.title || '').trim(); if (!title) return { outcome: 'invalid', field: 'title' };
        const n = Math.max(...db.P.map((p) => Number(p.public_code.slice(3)))) + 1;
        const p = { public_code: `SS-${n}`, title, description: a.description || '', status: 'draft', category: a.category || 'أخرى', is_new: a.is_new !== false, created_at: now(), updated_at: now(), structure_version: 1, base_price: null, options: [], variants: [], stock: {}, media: [], shipping_profile: null, views: 0 };
        db.P.unshift(p); audit(pr, op, 'product', p.public_code, { created: true, title }); return { outcome: 'created', code: p.public_code, public_code: p.public_code, structure_version: 1, updated_at: p.updated_at, status: 'draft', title };
      }
      case 'products.update_text': { const p = prod(a.code); if (!p) return { outcome: 'not_found' }; if (a.updated_at !== p.updated_at) return { outcome: 'conflict', updated_at: p.updated_at }; const before = p.title; p.title = a.title; p.description = a.description || ''; touch(p); audit(pr, op, 'product', p.public_code, { title_before: before, title: p.title }); return { outcome: 'updated', updated_at: p.updated_at }; }
      case 'products.structure': {
        const p = prod(a.code); if (!p) return { outcome: 'not_found' };
        if (a.version !== p.structure_version) return { outcome: 'conflict', structure_version: p.structure_version };
        const c = a.change || {};
        if (c.op === 'add_option') { if (p.status !== 'draft') return { outcome: 'rejected', code: 'PS008', message: 'option dimensions can only change while draft' }; if (p.variants.length) return { outcome: 'rejected', code: 'PS009', message: 'option dimensions cannot change while variants exist' }; p.options.push({ option_id: uid(), name: c.name, position: p.options.length, values: (c.values || []).map((v, i) => ({ value_id: uid(), value: v, position: i, active: true })) }); }
        else if (c.op === 'add_value') { const o = p.options[c.option]; if (!o) return { outcome: 'rejected', code: 'PS004' }; o.values.push({ value_id: uid(), value: c.value, position: o.values.length, active: true }); }
        else if (c.op === 'create_variants') { (c.selections || []).forEach((sel) => { p.variants.push({ variant_id: uid(), position: p.variants.length, active: true, availability: 'unset', amount_minor: null, selections: sel.map((vp, oi) => ({ option_id: p.options[oi].option_id, value_id: p.options[oi].values[vp].value_id })) }); }); }
        else if (c.op === 'set_variant_active') { const v = p.variants[c.variant]; if (!v) return { outcome: 'rejected', code: 'PS006' }; v.active = !!c.active; }
        else return { outcome: 'rejected', code: 'PS003', message: 'unknown structure change' };
        bumpV(p); audit(pr, op, 'product', p.public_code, { change: c }); return { outcome: 'applied', structure_version: p.structure_version };
      }
      case 'products.set_display': { const p = prod(a.code); if (!p) return { outcome: 'not_found' }; if (!db.cats.some((c) => c.name === a.category)) return { outcome: 'invalid', field: 'category' }; const b = p.category; p.category = a.category; p.is_new = !!a.is_new; audit(pr, op, 'product', p.public_code, { category_before: b, category: a.category, is_new: !!a.is_new }); return { outcome: 'saved' }; }
      case 'products.set_price': { const p = prod(a.code); if (!p) return { outcome: 'not_found' }; if (!Number.isInteger(a.amount_minor) || a.amount_minor < 100) return { outcome: 'invalid', field: 'amount_minor' }; const b = p.base_price; p.base_price = a.amount_minor; audit(pr, op, 'product', p.public_code, { price_before_minor: b, price_minor: a.amount_minor }); return { outcome: 'saved' }; }
      case 'products.set_variant_price': { const p = prod(a.code); const v = p?.variants[a.position]; if (!v) return { outcome: 'not_found' }; if (a.version !== p.structure_version) return { outcome: 'rejected', code: 'PS002', message: 'the product structure has changed' }; v.amount_minor = a.amount_minor ?? null; audit(pr, op, 'product', p.public_code, { variant_position: a.position, price_minor: a.amount_minor ?? null }); return { outcome: 'saved' }; }
      case 'products.set_availability': { const p = prod(a.code); const v = p?.variants[a.position]; if (!v) return { outcome: 'not_found' }; v.availability = a.available ? 'available' : 'unavailable'; audit(pr, op, 'product', p.public_code, { variant_position: a.position, available: a.available }); return { outcome: 'saved' }; }
      case 'products.set_stock': { const p = prod(a.code); const v = p?.variants[a.position]; if (!v) return { outcome: 'not_found' }; if (a.version !== p.structure_version) return { outcome: 'rejected', code: 'PS002', message: 'the product structure has changed' }; const b = p.stock[a.position]?.quantity ?? null; p.stock[a.position] = { quantity: a.quantity, low_stock_at: a.low_stock_at ?? p.stock[a.position]?.low_stock_at ?? 2 }; v.availability = a.quantity > 0 ? 'available' : 'unavailable'; audit(pr, op, 'product', p.public_code, { variant_position: a.position, quantity_before: b, quantity: a.quantity }); return { outcome: 'saved', available: a.quantity > 0 }; }
      case 'products.publish': case 'products.hide': {
        const p = prod(a.code); if (!p) return { outcome: 'not_found' };
        if (op === 'products.publish') { const b = blockersOf(p); if (b.length) return { outcome: 'rejected', blockers: b, public_code: p.public_code }; if (p.status === 'public') return { outcome: 'already_public' }; }
        const before = p.status; p.status = op === 'products.publish' ? 'public' : 'hidden'; touch(p); audit(pr, op, 'product', p.public_code, { status_before: before, status: p.status }); return { outcome: op === 'products.publish' ? 'published' : 'hidden', status: p.status };
      }
      case 'products.set_shipping_profile': { const p = prod(a.code); const s = db.shipping.profiles.find((x) => x.key === a.profile_key); if (!p || !s) return { outcome: 'not_found' }; p.shipping_profile = { key: s.key, name: s.name, active: true }; audit(pr, op, 'product', p.public_code, { shipping_profile: s.key }); return { outcome: 'saved' }; }
      case 'media.reorder': { const p = prod(a.code); p.media = (a.media_ids || []).map((id) => p.media.find((m) => m.media_id === id)).filter(Boolean).map((m, i) => ({ ...m, position: i })); audit(pr, op, 'product', p.public_code, {}); return { outcome: 'saved' }; }
      case 'media.set_primary': { const p = prod(a.code); const m = p?.media.find((x) => x.media_id === a.media_id); if (!m) return { outcome: 'not_found' }; p.media = [m, ...p.media.filter((x) => x !== m)].map((x, i) => ({ ...x, position: i })); audit(pr, op, 'product', p.public_code, {}); return { outcome: 'saved' }; }
      case 'media.set_hidden': { const p = prod(a.code); const m = p?.media.find((x) => x.media_id === a.media_id); if (!m) return { outcome: 'not_found' }; m.hidden = !!a.hidden; audit(pr, op, 'product', p.public_code, { hidden: m.hidden }); return { outcome: 'saved' }; }

      case 'orders.list': {
        const q = String(a.q || '').trim().toLowerCase();
        return { outcome: 'ok', data: db.O.filter((o) => (!a.status || o.status === a.status) && (!a.stage || (o.fulfillment?.stage || 'none') === a.stage)
          && (!q || o.public_order_code.toLowerCase() === q || o.buyer_phone === q || o.buyer_name.toLowerCase().includes(q)))
          .map((o) => ({ ...clone(o), stage: o.fulfillment?.stage || null, items: undefined, history: undefined, events: undefined, fulfillment: undefined })) };
      }
      case 'orders.get': { const o = db.O.find((x) => x.public_order_code === String(a.code || '').toUpperCase()); if (!o) return { outcome: 'not_found' };
        return { outcome: 'ok', data: { order: { ...clone(o), allowed_transitions: o.status === 'pending' ? ['confirmed', 'cancelled'] : o.status === 'confirmed' ? ['cancelled'] : [], groups: [{ shipping_profile_key: 'standard', shipping_profile_name: 'شحن عادي', shipping_amount_minor: o.shipping_total_minor }] },
          fulfillment: o.fulfillment, fulfillment_events: o.events, activity: has(pr, 'audit.view') ? db.audit.filter((x) => x.entity_type === 'order' && x.entity_ref === o.public_order_code) : null } }; }
      case 'orders.transition': {
        const o = db.O.find((x) => x.public_order_code === a.code); if (!o) return { outcome: 'not_found' };
        if (a.target === 'cancelled' && o.fulfillment && o.fulfillment.stage !== 'preparing') return { outcome: 'already_shipped', stage: o.fulfillment.stage };
        if (a.version !== o.status_version) return { outcome: 'conflict', status: o.status, status_version: o.status_version };
        const ok = (o.status === 'pending' && ['confirmed', 'cancelled'].includes(a.target)) || (o.status === 'confirmed' && a.target === 'cancelled');
        if (!ok) return { outcome: 'invalid_transition', status: o.status };
        o.history.push({ from_status: o.status, to_status: a.target, changed_at: now() }); const before = o.status; o.status = a.target; o.status_version += 1;
        if (a.target === 'confirmed') { o.fulfillment = { stage: 'preparing', version: 1, carrier: null, tracking_code: null, note: null, updated_at: now() }; o.events.push({ from: null, to: 'preparing', at: now(), actor }); }
        audit(pr, op, 'order', o.public_order_code, { status_before: before, status: a.target }); return { outcome: 'changed', status: o.status, status_version: o.status_version };
      }
      case 'orders.set_fulfillment': {
        const o = db.O.find((x) => x.public_order_code === a.code); if (!o) return { outcome: 'not_found' };
        if (o.status !== 'confirmed') return { outcome: 'order_not_confirmed', status: o.status };
        const cur = o.fulfillment?.stage || null, ver = o.fulfillment?.version || 0;
        if ((a.version || 0) !== ver) return { outcome: 'conflict', stage: cur, version: ver };
        const allowed = { null: ['preparing'], preparing: ['shipped'], shipped: ['delivered', 'returned'], delivered: ['return_requested'], return_requested: ['returned', 'delivered'] }[cur] || [];
        if (!allowed.includes(a.stage)) return { outcome: 'invalid_transition', stage: cur };
        o.fulfillment = { stage: a.stage, version: ver + 1, carrier: a.carrier || o.fulfillment?.carrier || null, tracking_code: a.tracking_code || o.fulfillment?.tracking_code || null, note: a.note || null, updated_at: now() };
        o.events.push({ from: cur, to: a.stage, note: a.note || null, at: now(), actor }); audit(pr, op, 'order', o.public_order_code, { stage_before: cur, stage: a.stage }); return { outcome: 'saved', stage: a.stage, version: ver + 1 };
      }
      case 'customers.list': case 'customers.get': {
        const by = new Map();
        db.O.forEach((o) => { const c = by.get(o.buyer_phone) || { customer_reference: o.public_order_code, phone: o.buyer_phone, latest_name: o.buyer_name, latest_region_label: o.delivery_region_label, order_count: 0, pending_count: 0, confirmed_count: 0, cancelled_count: 0, active_count: 0, first_order_at: o.created_at, last_order_at: o.created_at, codes: [] };
          c.order_count += 1; c[`${o.status}_count`] += 1; if (o.status !== 'cancelled') c.active_count += 1; c.codes.push(o.public_order_code);
          if (o.created_at < c.first_order_at) c.first_order_at = o.created_at; if (o.created_at > c.last_order_at) c.last_order_at = o.created_at; by.set(o.buyer_phone, c); });
        const all = [...by.values()];
        if (op === 'customers.list') { const q = String(a.q || '').trim().toLowerCase(); return { outcome: 'ok', data: all.filter((c) => !q || c.phone === q || c.latest_name.toLowerCase().includes(q)).map((c) => ({ ...c, codes: undefined })) }; }
        const c = all.find((x) => x.codes.includes(String(a.code || '').toUpperCase())); if (!c) return { outcome: 'not_found' };
        const last = db.O.find((o) => o.public_order_code === c.codes[0]);
        return { outcome: 'ok', data: { customer: { ...c, codes: undefined, latest_address: last.delivery_address, other_names: [] },
          orders: has(pr, 'orders.view') ? db.O.filter((o) => c.codes.includes(o.public_order_code)).map((o) => ({ public_order_code: o.public_order_code, status: o.status, created_at: o.created_at, grand_total_minor: o.grand_total_minor })) : null } };
      }

      case 'shipping.get': return { outcome: 'ok', data: clone(db.shipping) };
      case 'shipping.set_region': { if (!/^[a-z0-9]+([_-][a-z0-9]+)*$/.test(a.key || '')) return { outcome: 'invalid', field: 'key' }; const r = db.shipping.regions.find((x) => x.key === a.key); if (r) Object.assign(r, { label: a.label, active: a.active !== false }); else db.shipping.regions.push({ key: a.key, label: a.label, active: a.active !== false }); audit(pr, op, 'shipping_region', a.key, { label: a.label }); return { outcome: 'saved' }; }
      case 'shipping.set_profile': { if (!/^[a-z0-9]+([_-][a-z0-9]+)*$/.test(a.key || '')) return { outcome: 'invalid', field: 'key' }; const r = db.shipping.profiles.find((x) => x.key === a.key); if (r) Object.assign(r, { name: a.name, active: a.active !== false }); else db.shipping.profiles.push({ key: a.key, name: a.name, active: a.active !== false, products: 0 }); audit(pr, op, 'shipping_profile', a.key, { name: a.name }); return { outcome: 'saved' }; }
      case 'shipping.set_rate': { const r = db.shipping.rates.find((x) => x.profile_key === a.profile_key && x.region_key === a.region_key); if (r) Object.assign(r, { amount_minor: a.amount_minor, active: a.active !== false }); else db.shipping.rates.push({ profile_key: a.profile_key, region_key: a.region_key, amount_minor: a.amount_minor, active: a.active !== false }); audit(pr, op, 'shipping_rate', `${a.profile_key}:${a.region_key}`, { amount_minor: a.amount_minor }); return { outcome: 'saved' }; }
      case 'settings.get': return { outcome: 'ok', data: clone(db.settings) };
      case 'settings.update_contact': case 'settings.update_brand': {
        if (a.version !== db.settings.version) return { outcome: 'conflict', version: db.settings.version };
        const keys = op === 'settings.update_brand' ? ['store_name', 'tagline', 'primary_color'] : ['whatsapp_e164', 'phone', 'contact_email', 'instagram_url', 'facebook_url', 'tiktok_url', 'default_locale'];
        const changed = keys.filter((k) => (a[k] || null) !== (db.settings[k] || null)); if (!changed.length) return { outcome: 'unchanged', version: db.settings.version };
        keys.forEach((k) => { if (k in a) db.settings[k] = a[k] || null; }); db.settings.version += 1; audit(pr, op, 'settings', op.endsWith('brand') ? 'brand' : 'contact', { fields: changed }); return { outcome: 'changed', version: db.settings.version };
      }
      case 'storefront.get': return { outcome: 'ok', data: clone(db.storefront) };
      case 'storefront.update_content': { if (a.version !== db.storefront.content.version) return { outcome: 'conflict', version: db.storefront.content.version }; Object.assign(db.storefront.content, a, { version: a.version + 1 }); audit(pr, op, 'storefront', 'content', { hero_title: a.hero_title }); return { outcome: 'changed', version: a.version + 1 }; }
      case 'storefront.set_sections': db.storefront.sections = clone(a.sections); audit(pr, op, 'storefront', 'sections', {}); return { outcome: 'saved' };
      case 'storefront.save_banner': case 'storefront.save_story': case 'storefront.save_look': {
        const kind = op.split('_')[1] + 's'; const list = db.storefront[kind];
        if (kind === 'looks' && (a.items || []).some((c) => !prod(c))) return { outcome: 'invalid', field: 'items' };
        if (kind === 'stories' && (a.slides || []).some((s) => s.product_code && !prod(s.product_code))) return { outcome: 'invalid', field: 'product_code' };
        const obj = { ...a, image: a.image_path ? (a.image_preview || a.image) : (a.image_preview || null) };
        if (kind === 'stories') obj.slides = (a.slides || []).map((s) => ({ ...s, image: s.image_preview || null }));
        if (a.id) { const i = list.findIndex((x) => x.id === a.id); if (i < 0) return { outcome: 'not_found' }; list[i] = { ...list[i], ...obj }; } else { obj.id = uid(); list.push(obj); }
        audit(pr, op, kind.slice(0, -1), obj.id || a.id, { title: a.title || a.name }); return { outcome: 'saved', id: obj.id || a.id };
      }
      case 'storefront.delete_banner': case 'storefront.delete_story': case 'storefront.delete_look': { const kind = op.split('_')[1] + 's'; const n = db.storefront[kind].length; db.storefront[kind] = db.storefront[kind].filter((x) => x.id !== a.id); if (n === db.storefront[kind].length) return { outcome: 'not_found' }; audit(pr, op, kind.slice(0, -1), a.id); return { outcome: 'deleted' }; }
      case 'storefront.reorder': { const list = db.storefront[a.kind]; if (!list) return { outcome: 'invalid', field: 'kind' }; db.storefront[a.kind] = (a.ids || []).map((id) => list.find((x) => x.id === id)).filter(Boolean); audit(pr, op, 'storefront', a.kind); return { outcome: 'saved' }; }
      case 'audit.list': {
        let rows = db.audit.map((x) => ({ ...x, actor_email: emailOf(x.actor) }));
        if (a.entity_type) rows = rows.filter((x) => x.entity_type === a.entity_type);
        if (a.actor) rows = rows.filter((x) => x.actor === a.actor);
        if (a.before_at) rows = rows.filter((x) => x.at < a.before_at);
        return { outcome: 'ok', data: rows.slice(0, a.limit || 50) };
      }
      case 'users.list': return { outcome: 'ok', data: { grantable: GRANTABLE, users: db.users.map((u) => ({ ...u, permissions: u.role === 'owner' ? GRANTABLE : u.permissions, last_activity_at: db.audit.find((x) => x.actor === u.id)?.at || null })) } };
      case 'users.set_access': {
        const u = db.users.find((x) => x.id === a.user_id); if (!u) return { outcome: 'not_found' }; if (u.role === 'owner') return { outcome: 'owner_protected' };
        if ((a.permissions || []).some((p) => !GRANTABLE.includes(p))) return { outcome: 'invalid_permissions' };
        const before = { active: u.active, permissions: u.permissions }; u.active = !!a.active; u.permissions = [...new Set(a.permissions)].sort();
        audit(pr, op, 'user', u.id, { email: u.email, before, active: u.active, permissions: u.permissions }); return { outcome: 'saved', active: u.active, permissions: u.permissions };
      }
      default: return { outcome: 'ok' };
    }
  };

  const callOp = (op, args = {}) => {
    const pr = principal(); if (!pr) return { outcome: 'unauthorized' };
    const req = OPS[op]; if (!req) return { outcome: 'unknown_operation' };
    if (req[2] && pr.role !== 'owner') return { outcome: 'forbidden', permission: 'owner' };
    if (!has(pr, req[0])) return { outcome: 'forbidden', permission: req[0] };
    return exec(pr, op, args);
  };

  return {
    setRole(role) { actor = role === 'staff' ? STAFF : OWNER; },
    async route(path, body) {
      await wait(180 + Math.random() * 220); // realistic latency so loading states are visible
      if (path === '/call') return clone(callOp(body.op, body.args || {}));
      if (path === '/media/upload') {
        const code = body.get('code'); const auth = callOp('media.authorize', { code }); if (auth.outcome !== 'ok' && auth.outcome) return auth;
        const file = body.get('image'); if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) return { outcome: 'invalid', field: 'image' };
        const p = prod(code); p.media.push({ media_id: uid(), storage_path: URL.createObjectURL(file), alt_text: p.title, position: p.media.length, hidden: false, origin: 'owner_upload', scope: 'product' });
        audit(principal(), 'media.attach', 'product', code, {}); return { outcome: 'saved' };
      }
      if (path === '/media/delete') { const pr = principal(); if (!has(pr, 'media.manage')) return { outcome: 'forbidden', permission: 'media.manage' }; const p = prod(body.code); p.media = p.media.filter((m) => m.media_id !== body.media_id); audit(pr, 'media.delete', 'product', body.code); return { outcome: 'deleted' }; }
      if (path === '/storefront/upload') { const pr = principal(); if (!has(pr, 'storefront.manage')) return { outcome: 'forbidden', permission: 'storefront.manage' }; const f = body.get('image'); return { outcome: 'saved', path: `storefront/${hex()}.jpg`, url: URL.createObjectURL(f) }; }
      if (path === '/settings/asset') { const pr = principal(); if (pr.role !== 'owner') return { outcome: 'forbidden', permission: 'owner' }; db.settings.logo_path = URL.createObjectURL(body.get('image')); db.settings.version += 1; audit(pr, 'settings.set_asset', 'settings', body.get('kind')); return { outcome: 'changed', version: db.settings.version }; }
      if (path === '/users/invite') {
        const pr = principal(); if (pr?.role !== 'owner') return { outcome: 'forbidden', permission: 'owner' };
        if (db.users.some((u) => u.email === body.email)) return { outcome: 'invite_failed', reason: 'already_registered' };
        const u = { id: uid(), role: 'staff', active: true, email: body.email, created_at: now(), last_sign_in_at: null, permissions: [...body.permissions].sort() };
        db.users.push(u); audit(pr, 'users.set_access', 'user', u.id, { email: u.email, invited: true, permissions: u.permissions }); return { outcome: 'saved', user_id: u.id };
      }
      return { outcome: 'not_found' };
    },
    reset() { db = seed(); },
  };
}
