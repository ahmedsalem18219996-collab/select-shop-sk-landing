/* SELECT SHOP temporary storefront — MANUAL affiliate handoff only.
   Every item is grouped using the private, admin-readable DB catalog routing.
   No calls to Safqa or Prof and no customer data transmitted by this module. */
(()=>{
"use strict";
const allowed=new Set(["prof","safqa"]);
const names=Object.freeze({prof:"بروف (Prof)",safqa:"صفقة (Safqa)"});
const statuses=Object.freeze({
 pending:"لم يُسجّل عند المورد",
 submitted:"تم التسجيل يدويًا",
 accepted:"المورد أكد الطلب",
 shipped:"تم الشحن من المورد",
 delivered:"تم التسليم حسب المورد",
 returned:"مرتجع عند المورد",
 cancelled:"ملغي عند المورد"
});
function group(order,catalog){
 const grouped=new Map(),unknown=[];
 const items=Array.isArray(order?.items)?order.items:[];
 items.forEach((item,index)=>{
  const entry=catalog?.[String(item?.productId||"")];
  const platform=entry?.fulfillment_group;
  if(!allowed.has(platform)){unknown.push({index,productId:String(item?.productId||"")});return}
  if(!grouped.has(platform))grouped.set(platform,[]);
  grouped.get(platform).push(item);
 });
 return {groups:Array.from(grouped,([platform,items])=>({platform,items})),unknown};
}
const itemLine=(item,index)=>{
 const name=String(item.productName||item.productId||"منتج");
 const variant=String(item.variantId||"");
 const sizes=Array.isArray(item.sizes)?item.sizes:[];
 const sizeText=sizes.length===0||sizes[0]===0?"بدون مقاس":sizes.join(" / ")+(sizes.length===2?" (مقاسين لتجربة الأنسب)":"");
 const role=item.role==="trial"?"للتجربة فقط، راجع شروط المورد":"مطلوب";
 return (index+1)+". "+name+" | "+variant+" | "+sizeText+" | "+role;
};
function copyText(order,group){
 if(!order || !allowed.has(group?.platform) || !Array.isArray(group.items)||!group.items.length)throw Error("invalid_supplier_group");
 const parts=[
 "طلب من SELECT SHOP — نقل يدوي لمنصة "+names[group.platform],
 "رقم أوردر الموقع: "+String(order.order_code||""),
 "",
 "الاسم: "+String(order.customer_name||""),
 "الموبايل: "+String(order.phone||""),
 "المحافظة: "+String(order.governorate||""),
 "المنطقة: "+String(order.area||""),
 "العنوان: "+String(order.address||""),
 "ملاحظات التوصيل: "+String(order.notes||"لا توجد"),
 "",
 "منتجات "+names[group.platform]+":",
 ...group.items.map(itemLine),
 "",
 "مهم: راجع المتاح والسعر وشروط الشحن في منصة المورد قبل تسجيل الطلب."
 ];
 return parts.join("\n");
}
window.SELECT_SHOP_AFFILIATE=Object.freeze({names,statuses,group,copyText});
})();