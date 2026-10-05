// SELECT SHOP V9 enhancements — additive layer over the existing V8 landing page.
(() => {
  const V9_CATALOG = {
    'SK-1': { slug:'sk-1', name:'أبيض × وردي', image:'assets/sk-1.jpg', sizes:['37','38','39','40','41'] },
    'SK-2': { slug:'sk-2', name:'أسود × أزرق', image:'assets/sk-2.jpg', sizes:['37','38','39','40','41'] },
  };
  const keys = Object.keys(V9_CATALOG);

  document.body.classList.add('v9-enhanced');
  if (!document.querySelector('link[data-v9-enhancements]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'enhancements.css?v=9';
    css.dataset.v9Enhancements = '';
    document.head.appendChild(css);
  }

  const bySlug = raw => {
    const value = String(raw || '').trim().toLowerCase();
    return keys.find(code => code.toLowerCase() === value || V9_CATALOG[code].slug === value) || '';
  };
  const requested = () => {
    const q = new URLSearchParams(location.search);
    return bySlug(q.get('product') || q.get('p'));
  };
  const stableUrl = code => {
    const u = new URL(location.href);
    u.search = '';
    u.searchParams.set('product', V9_CATALOG[code].slug);
    u.hash = '';
    return u.href;
  };
  const replaceUrl = code => {
    const u = new URL(location.href);
    u.searchParams.set('product', V9_CATALOG[code].slug);
    u.searchParams.delete('p');
    history.replaceState({product:code}, '', u);
  };
  const other = code => keys.find(k => k !== code) || keys[0];

  function ensureMeta(selector, attr, value) {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, value);
      document.head.appendChild(el);
    }
    return el;
  }

  function updateSeo(code) {
    const p = V9_CATALOG[code];
    if (!p) return;
    const title = `SELECT SHOP | ${code} – ${p.name}`;
    const desc = `${code} ${p.name} — سنيكر SK بخامة Mesh ونعل EVA. 680 جنيه شامل الشحن، معاينة ودفع عند الاستلام. المقاسات ${p.sizes.join('، ')}.`;
    document.title = title;
    ensureMeta('meta[name="description"]','name','description').content = desc;
    ensureMeta('meta[property="og:title"]','property','og:title').content = title;
    ensureMeta('meta[property="og:description"]','property','og:description').content = desc;
    ensureMeta('meta[property="og:image"]','property','og:image').content = new URL(p.image, location.href).href;
    ensureMeta('meta[property="og:url"]','property','og:url').content = stableUrl(code);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = stableUrl(code);
  }

  function selectModel(code, scrollTop=false) {
    if (!V9_CATALOG[code] || !PRODUCTS?.[code]) return;
    state.bundle = false;
    state.dualSize = false;
    state.singleSizes = [];
    state.pairs[0] = {...PRODUCTS[code], size:''};
    const alt = other(code);
    if (state.pairs[1]?.product === code && PRODUCTS?.[alt]) state.pairs[1] = {...PRODUCTS[alt], size:''};
    sync();
    replaceUrl(code);
    refresh();
    if (scrollTop) document.querySelector('#top')?.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'});
  }

  function renderDeck() {
    if (document.querySelector('#modelDeck')) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const section = document.createElement('section');
    section.id = 'modelDeck';
    section.className = 'model-deck shell';
    section.setAttribute('aria-label','اختيار الموديل');
    section.innerHTML = `
      <div class="model-deck-head">
        <div><span>الموديلات</span><h2>شوفي كل موديل بوضوح</h2></div>
        <small>كل موديل له رابط مباشر مستقل للإعلانات</small>
      </div>
      <div class="model-deck-rail">
        ${keys.map(code => {
          const p = V9_CATALOG[code];
          return `<a class="model-link" data-model-link="${code}" href="?product=${p.slug}">
            <span class="model-visual"><img src="${p.image}" alt="${code} ${p.name}"><i>المعروض الآن</i></span>
            <span class="model-copy"><small>${code}</small><b>${p.name}</b><em>${p.sizes.join(' • ')}</em></span>
            <span class="model-arrow" aria-hidden="true">←</span>
          </a>`;
        }).join('')}
      </div>`;
    hero.after(section);
    section.querySelectorAll('[data-model-link]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      selectModel(a.dataset.modelLink, true);
    }));
  }

  function applySizes(code) {
    const allowed = V9_CATALOG[code]?.sizes || [];
    document.querySelectorAll('[data-size]:not([data-pair-size])').forEach(btn => {
      const ok = allowed.includes(btn.dataset.size);
      btn.hidden = !ok;
      btn.disabled = !ok;
      btn.setAttribute('aria-hidden', String(!ok));
    });
    const hint = document.querySelector('.size-copy small');
    if (hint) hint.textContent = `المتاح: ${allowed.join(' • ')}`;
  }

  function refresh() {
    const code = state?.pairs?.[0]?.product;
    if (!V9_CATALOG[code]) return;
    applySizes(code);
    updateSeo(code);
    document.querySelectorAll('[data-model-link]').forEach(a => {
      const active = a.dataset.modelLink === code;
      a.classList.toggle('active', active);
      a.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  renderDeck();
  const initial = requested();
  if (initial && initial !== state?.pairs?.[0]?.product) selectModel(initial);
  else {
    const current = state?.pairs?.[0]?.product || keys[0];
    replaceUrl(current);
    refresh();
  }

  // Existing V8 listeners run on the target first; this document-level listener refreshes V9 state after them.
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-product],[data-pair-product],[data-mode],[data-size],[data-pair-size]');
    if (!target) return;
    queueMicrotask(() => {
      const code = state?.pairs?.[0]?.product;
      if (V9_CATALOG[code]) replaceUrl(code);
      refresh();
    });
  });

  addEventListener('popstate', () => {
    const code = requested();
    if (code && code !== state?.pairs?.[0]?.product) selectModel(code);
  });
})();
