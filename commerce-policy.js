/* SELECT SHOP commerce policy — independent, deterministic, side-effect-free.
 * Intentionally does not mutate the production v17 cart or landing pages.
 * Use this policy as the source of truth for the mixed-category checkout migration.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SelectShopCommercePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";
  const CATEGORY = Object.freeze({ SNEAKERS:"sneakers", CAR_CARE:"car-care" });
  const ITEMS = Object.freeze({
    sk:{ category:CATEGORY.SNEAKERS, price:680 },
    alex:{ category:CATEGORY.SNEAKERS, price:540 },
    eqwal:{ category:CATEGORY.SNEAKERS, price:580 },
    wk:{ category:CATEGORY.SNEAKERS, price:630 },
    carwash48:{ category:CATEGORY.CAR_CARE, price:999 }
  });
  const SHOE_SECOND_PAIR_DISCOUNT = 80;
  function validProduct(id, catalog) { return Object.prototype.hasOwnProperty.call(catalog,id); }
  function summarize(items, options) {
    const opts=options||{};
    const catalog=opts.catalog||ITEMS;
    const shoeDiscount=Number.isFinite(opts.shoeDiscount)?opts.shoeDiscount:SHOE_SECOND_PAIR_DISCOUNT;
    let shoePaid=0, subtotal=0, discount=0;
    const lines=[];
    for (const item of items||[]) {
      if (!item||!validProduct(item.productId,catalog)) throw new Error("Unknown product");
      const product=catalog[item.productId];
      const qty=Number(item.quantity===undefined?1:item.quantity);
      if (!Number.isInteger(qty)||qty<1||qty>10) throw new Error("Invalid quantity");
      const isTrial=item.role==="trial";
      if (product.category!==CATEGORY.SNEAKERS&&isTrial) throw new Error("Car care items cannot be trial selections");
      for(let n=0;n<qty;n++){
        const base=Number(product.price);
        if(!Number.isFinite(base)||base<0)throw new Error("Invalid product price");
        const allowed=product.category===CATEGORY.SNEAKERS&&!isTrial&&shoePaid>0;
        const saving=allowed?Math.min(base,Math.max(0,shoeDiscount)):0;
        if(product.category===CATEGORY.SNEAKERS&&!isTrial)shoePaid++;
        if(!isTrial){subtotal+=base;discount+=saving;}
        lines.push({productId:item.productId,category:product.category,role:item.role||"primary",price:base,discount:saving,payable:isTrial?0:base-saving,trial:isTrial});
      }
    }
    return {lines,subtotal,discount,total:subtotal-discount,shoePairs:shoePaid,trialCount:lines.filter(x=>x.trial).length,shippingStatus:opts.shippingStatus||"verify-destination"};
  }
  return Object.freeze({CATEGORY,ITEMS,SHOE_SECOND_PAIR_DISCOUNT,summarize});
});
