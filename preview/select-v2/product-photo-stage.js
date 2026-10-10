/* SELECT SHOP V2 preview — unified image treatment.
   Visual-only. Never changes catalog, carts, checkout, analytics or navigation.
   The source image is reused as a softly blurred backdrop to hide opaque
   white/beige JPG edges. New product and colour images are handled as they load.
*/
(() => {
  "use strict";
  if (!window.SELECT_SHOP_PREVIEW_ONLY ||
      !location.pathname.startsWith("/preview/select-v2/")) return;

  const PHOTO = "main img, dialog img";
  const STUDIO = /(?:\/|^)(?:wk[_-]|alex\d|eqwal\d)/i;
  const stages = ".cardMediaClick,.gatewayCard,.detailImage,.colorMini,.detailGallery button,.heroProductTile,.heroMini,.cartItem,.carSpotlightImage";
  const isSupported = img => img instanceof HTMLImageElement &&
    !img.classList.contains("ss-photo-backdrop") &&
    (img.matches(PHOTO) || img.hasAttribute("data-product-photo"));

  function setPhotoMode(img, stage) {
    const compact = stage.matches(".gatewayCard,.colorMini,.detailGallery button,.heroMini,.ss-cart-photo");
    const studio = STUDIO.test(img.getAttribute("src") || "");
    stage.classList.toggle("ss-photo-studio", studio && stage.matches(".cardMediaClick"));
    stage.classList.toggle("ss-photo-compact", compact);
    stage.classList.toggle("ss-photo-lifestyle", !studio && !compact);
  }

  function prepare(img) {
    if (!isSupported(img)) return;
    let stage = img.parentElement;
    if (!stage) return;

    // Cart images are direct CSS-grid children; wrap without changing grid slots.
    if (stage.classList.contains("cartItem") && img.parentElement === stage) {
      const holder = document.createElement("span");
      holder.className = "ss-cart-photo";
      stage.insertBefore(holder, img);
      holder.appendChild(img);
      stage = holder;
    }
    if (!img.closest(stages + ",.ss-cart-photo") && !img.hasAttribute("data-product-photo")) return;

    stage.classList.add("ss-photo-stage");
    img.classList.add("ss-photo-main");
    setPhotoMode(img, stage);

    let backdrop = [...stage.children].find(
      x => x instanceof HTMLImageElement && x.classList.contains("ss-photo-backdrop")
    );
    if (!backdrop) {
      backdrop = document.createElement("img");
      backdrop.className = "ss-photo-backdrop";
      backdrop.alt = "";
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.loading = "lazy";
      backdrop.decoding = "async";
      stage.insertBefore(backdrop, img);
    }
    const source = img.getAttribute("src");
    if (source && backdrop.getAttribute("src") !== source) backdrop.setAttribute("src", source);
  }

  const start = () => {
    document.querySelectorAll(PHOTO).forEach(prepare);
    const observer = new MutationObserver(changes => {
      for (const change of changes) {
        if (change.type === "attributes") {
          prepare(change.target);
        } else {
          for (const node of change.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.matches?.("img")) prepare(node);
            node.querySelectorAll?.(PHOTO).forEach(prepare);
          }
        }
      }
    });
    observer.observe(document.body, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["src"]
    });
    window.SELECT_SHOP_PHOTO_COVER = Object.freeze({
      previewOnly:true, version:3, handled: () => document.querySelectorAll(".ss-photo-stage").length
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
