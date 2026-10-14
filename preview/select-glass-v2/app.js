/* SELECT SHOP / isolated UI UX Pro Max luxury glass preview V2.
 * Read-only public curated catalog. Zero checkout, zero supplier order creation.
 * Do not import live storefront JS/CSS or access authenticated customer data.
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const grid = $("productsGrid");
  const categoryRoot = $("categoryFilters");
  const status = $("catalogStatus");
  const search = $("productSearch");
  const loadMore = $("loadMore");
  const dialog = $("productDialog");
  const dialogContent = $("dialogContent");
  const safeText = (s) => String(s == null ? "" : s);
  const make = (tag, klass, text) => {
    const el = document.createElement(tag);
    if (klass) el.className = klass;
    if (text !== undefined) el.textContent = safeText(text);
    return el;
  };
  const catalogUrl = "https://zznqdwrohrycsjfpvkhc.supabase.co/rest/v1/rpc/ss_safka_curated_catalog_v1";
  // This is the public, publishable browser key used by the existing public catalog.
  // It is NOT a service-role, Safka, order, admin, or secret key.
  const publicKey = "sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa";
  const itemIdOk = (s) => /^[a-f0-9]{24}$/i.test(safeText(s));
  const safeImage = (p) => {
    const pictures = Array.isArray(p?.images) ? p.images : [];
    return pictures.find(src =>
      typeof src === "string" &&
      /^https:\/\/safka\.fra1\.cdn\.digitaloceanspaces\.com\/media\/products\/[a-z0-9_./%+()\-]+(?:\?[a-z0-9_=&%+.-]*)?$/i.test(src)
    ) || "";
  };
  const money = (n) => {
    const amount = Number(n);
    return Number.isSafeInteger(amount) && amount > 0
      ? amount.toLocaleString("ar-EG") + " ج.م"
      : "السعر تحت المراجعة";
  };
  const state = {items: [], categories: [], filter: "all", query: "", expanded: false, visible: [], ready: false};
  let toastTimer = null;
  function notify(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3700);
  }
  function toggleMobile(open) {
    const nav = $("mobileNav");
    const trigger = $("menuToggle");
    nav.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    trigger.setAttribute("aria-label", open ? "اقفل قائمة التنقل" : "افتح قائمة التنقل");
  }
  $("menuToggle").addEventListener("click", () => toggleMobile($("mobileNav").hidden));
  $("mobileNav").addEventListener("click", e => {if(e.target.closest("a")) toggleMobile(false);});
  document.addEventListener("keydown", e => {if(e.key === "Escape") toggleMobile(false);});
  $("previewCart").addEventListener("click", () => notify("دي نسخة تجربة للتصميم فقط؛ السلة والطلبات الحقيقية مش متوصلة هنا."));
  $("searchOpen").addEventListener("click", () => {
    $("products").scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
    window.setTimeout(() => search.focus({preventScroll:true}), 230);
  });
  const toggle = $("themeToggle");
  const name = $("themeName");
  toggle.addEventListener("click", () => {
    const light = document.body.classList.toggle("theme-light");
    document.body.classList.toggle("theme-dark", !light);
    toggle.setAttribute("aria-pressed", String(light));
    toggle.setAttribute("aria-label", light ? "بدّل إلى التصميم الداكن" : "بدّل إلى التصميم الفاتح");
    name.textContent = light ? "Dark" : "Light";
    document.querySelector(".theme-icon").textContent = light ? "☾" : "☼";
  });

  function categoryName(p) {
    const key = safeText(p.category_key);
    const cat = state.categories.find(c => safeText(c.key) === key);
    return safeText(p.category_name || cat?.name || "مختاراتنا");
  }
  function renderChips() {
    categoryRoot.replaceChildren();
    const all = make("button","pill"+(state.filter === "all" ? " is-selected" : ""),"كل المختارات");
    all.type = "button";
    all.dataset.category = "all";
    all.setAttribute("aria-pressed", String(state.filter === "all"));
    categoryRoot.append(all);
    for (const c of state.categories) {
      if (!c || typeof c.key !== "string" || typeof c.name !== "string") continue;
      const chip = make("button","pill"+(state.filter===c.key?" is-selected":""),c.name);
      chip.dataset.category = c.key;
      chip.type = "button";
      chip.setAttribute("aria-pressed", String(state.filter===c.key));
      categoryRoot.append(chip);
    }
  }
  categoryRoot.addEventListener("click", e => {
    const pressed = e.target.closest("button[data-category]");
    if(!pressed)return;
    state.filter = pressed.dataset.category;
    state.expanded = false;
    renderChips();
    renderProducts();
  });
  search.addEventListener("input", () => {
    state.query = search.value.trim().toLowerCase();
    state.expanded = false;
    renderProducts();
  });
  function productArt(p) {
    const art = make("div","product-art");
    const pic = safeImage(p);
    if (pic) {
      const img = make("img");
      img.src = pic;
      img.alt = "صورة " + safeText(p.name);
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error",() => {
        img.remove();
        art.append(make("span","art-fallback","◈"));
      },{once:true});
      art.append(img);
    } else art.append(make("span","art-fallback","◈"));
    art.append(make("span","product-tag","مختاراتنا"));
    return art;
  }
  function renderCard(p,index) {
    const card = make("article","product-card");
    card.append(productArt(p));
    const body = make("div","product-copy");
    body.append(make("div","cat-name",categoryName(p)));
    body.append(make("h3","",safeText(p.name)));
    const foot = make("div","product-bottom");
    const price = make("div","price-stack");
    price.append(make("strong","",money(p.display_price_egp)),make("small","","السعر شامل التوصيل"));
    const action = make("button","inspect-btn","←");
    action.type = "button";
    action.title = "استعرض تفاصيل المنتج في المعاينة";
    action.setAttribute("aria-label","تفاصيل "+safeText(p.name));
    action.dataset.openIndex = String(index);
    foot.append(price,action);
    body.append(foot);
    card.append(body);
    return card;
  }
  function renderProducts() {
    if (!state.ready) return;
    let chosen = state.items.filter(p => {
      const categoryMatch = state.filter === "all" || safeText(p.category_key) === state.filter;
      const textMatch = !state.query || (safeText(p.name)+" "+categoryName(p)).toLowerCase().includes(state.query);
      return categoryMatch && textMatch;
    });
    const collapsed = !state.expanded && state.filter === "all" && !state.query;
    state.visible = collapsed ? chosen.slice(0,8) : chosen;
    grid.replaceChildren();
    if (!chosen.length) {
      grid.append(make("div","empty-products","مفيش منتجات مطابقة للبحث ده في المختارات. جرّب كلمة تانية."));
      loadMore.hidden = true;
    } else {
      state.visible.forEach((p,index)=>grid.append(renderCard(p,index)));
      loadMore.hidden = !collapsed || chosen.length<=8;
    }
    status.textContent = chosen.length === state.items.length
      ? "عرض " + state.visible.length.toLocaleString("ar-EG") + " من " + chosen.length.toLocaleString("ar-EG") + " منتجًا مختارًا · معاينة فقط"
      : "نتائج التصفية: "+chosen.length.toLocaleString("ar-EG")+" من المختارات · معاينة فقط";
  }
  loadMore.addEventListener("click", () => {
    state.expanded = true;
    renderProducts();
    notify("بتشوف دلوقتي كل المنتجات المختارة في تصميم التجربة.");
  });
  function openPreview(item) {
    if (!item) return;
    dialogContent.replaceChildren();
    const layout = make("div","dialog-layout");
    const image = make("div","dialog-photo");
    const url = safeImage(item);
    if(url) {
      const pic = make("img");
      pic.src = url;
      pic.alt = item.name;
      pic.addEventListener("error",()=>{pic.remove();image.append(make("span","art-fallback","◈"));},{once:true});
      image.append(pic);
    } else image.append(make("span","art-fallback","◈"));
    const desc = make("div","dialog-copy");
    desc.append(make("span","section-overline","SELECT SHOP / CONCEPT PREVIEW"));
    const heading = make("h2","",item.name);
    heading.id = "dialogTitle";
    desc.append(heading,make("div","dialog-price",money(item.display_price_egp)));
    desc.append(make("p","","السعر المعروض شامل التوصيل. دي معاينة لتصميم تفاصيل المنتج فقط، وليست صفحة طلب حقيقية."));
    desc.append(make("div","dialog-notice","تم إيقاف الشراء وتسجيل البيانات في النسخة التجريبية؛ الموقع الحالي مستقل تمامًا."));
    const close = make("button","btn btn-primary","الرجوع للمختارات");
    close.type = "button";
    close.style.marginTop = "17px";
    close.addEventListener("click",()=>dialog.close());
    desc.append(close);
    layout.append(image,desc);
    dialogContent.append(layout);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else notify("المعاينة غير متاحة على المتصفح ده.");
  }
  grid.addEventListener("click",e=>{
    const button = e.target.closest("button[data-open-index]");
    if(!button)return;
    openPreview(state.visible[Number(button.dataset.openIndex)]);
  });
  $("closeDialog").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});

  async function loadPublicCatalog() {
    try {
      const aborter = new AbortController();
      const timeout = setTimeout(()=>aborter.abort(),14000);
      let res;
      try {
        res = await fetch(catalogUrl,{
          method:"POST",mode:"cors",cache:"no-store",
          headers:{"apikey":publicKey,"content-type":"application/json"},
          body:JSON.stringify({p_page:1,p_limit:24,p_category:null,p_search:""}),
          signal:aborter.signal
        });
      } finally {clearTimeout(timeout);}
      if(!res.ok)throw new Error("public_catalog_unavailable");
      const payload = await res.json();
      if(!Array.isArray(payload?.items))throw new Error("catalog_shape");
      state.items = payload.items.filter(p =>
        itemIdOk(p?.id) && typeof p?.name === "string" &&
        Number.isSafeInteger(Number(p.display_price_egp)) &&
        Number(p.display_price_egp)>0 && p.price_status!=="needs_review" &&
        Array.isArray(p.variants) && p.variants.some(v=>v.available===true));
      state.categories = (Array.isArray(payload.categories)?payload.categories:[])
        .filter(c=>typeof c?.name==="string"&&typeof c?.key==="string"&&
          state.items.some(p=>safeText(p.category_key)===c.key));
      state.ready = true;
      renderChips();
      renderProducts();
      if(state.items.length===0) status.textContent="الكتالوج المختار غير متاح للعرض الآن؛ دي نسخة التصميم فقط.";
    } catch(err) {
      state.ready = true;
      state.items = [];
      renderProducts();
      status.textContent = "تعذّر تحميل صور وأسعار المختارات من الكتالوج العام. تصميم التجربة ظاهر، ومفيش أي طلبات اتسجلت.";
    }
  }

  // UX Pro Max preview enhancement: form validation is functional, but no email
  // is submitted, saved, persisted, or sent to any external destination.
  const membershipForm = document.getElementById("membershipForm");
  if (membershipForm) {
    membershipForm.addEventListener("submit",(event)=>{
      event.preventDefault();
      const field = document.getElementById("memberEmail");
      const feedback = document.getElementById("memberFeedback");
      if (!field.checkValidity()) {
        field.reportValidity();
        return;
      }
      field.value = "";
      feedback.textContent = "تم اختبار الزر بنجاح في المعاينة. العضوية غير مفعّلة، ولم نحفظ أو نرسل أي بريد إلكتروني.";
      feedback.classList.add("is-info");
      notify("هذه نسخة تصميم فقط — لم يتم تسجيل عضوية أو إرسال بيانات.");
    });
  }
  // Uses a separate route and public catalog read-only; no writes anywhere.

  loadPublicCatalog();
})();
