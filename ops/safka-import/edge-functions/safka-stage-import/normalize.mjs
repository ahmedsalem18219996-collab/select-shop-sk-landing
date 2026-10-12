/* Safqa provider normalization for temporary SELECT SHOP only.
   Preserve source IDs; never invent categories, price, or stock quantities. */
const record=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const trim=(v,n=350)=>typeof v==="string"?v.trim().slice(0,n):"";
const num=v=>{
  const n=(typeof v==="number"||typeof v==="string"&&v.trim()!=="")?Number(v):NaN;
  return Number.isFinite(n)&&n>=0&&n<1e7?n:null;
};
export function findRecords(root,kind){
  const todo=[{v:root,d:0}];
  const keys=kind==="products"?
    ["data","products","items","result","results","docs","list"]:
    ["data","price_list","priceList","governorates","shipping","regions","items","result"];
  while(todo.length){
    const {v,d}=todo.shift();
    if(Array.isArray(v))return v;
    if(!record(v)||d>4)continue;
    for(const k of keys)if(Object.hasOwn(v,k))todo.push({v:v[k],d:d+1});
  }
  return null;
}
export function totalPages(root){
  const items=[root,root?.data,root?.pagination,root?.data?.pagination].filter(record);
  for(const x of items){
    for(const key of ["pages","totalPages","total_pages"]){
      const v=Number(x[key]);
      if(Number.isInteger(v)&&v>=1&&v<=100000)return v;
    }
  }
  return null;
}
function publicHttps(v){
  const candidate=typeof v==="string"?v:record(v)?
    (v.url||v.secure_url||v.src||v.image_url||v.video_url):null;
  if(typeof candidate!=="string"||candidate.length>1600)return null;
  let url;try{url=new URL(candidate)}catch{return null}
  const host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||
    host==="localhost"||host.endsWith(".local")||
    /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)||
    /(?:token|signature|secret|api.?key|credential|access_key|x-amz-|x-goog-)/i.test(url.search))return null;
  return url.href;
}
const distinct=array=>[...new Set(array)];
function publicMedia(value,kind){
 const parts=Array.isArray(value)?value:value?[value]:[];
 return distinct(parts.slice(0,40).map(publicHttps).filter(Boolean).filter(url=>
   kind==="video"?(/\.((mp4)|(webm))$/i.test(new URL(url).pathname)||/^(www\.)?(youtube\.com|youtu\.be)$/.test(new URL(url).hostname)):
   !/\.(mp4|webm|mov)$/i.test(new URL(url).pathname)
 )).slice(0,30);
}
export function categoryOf(p){
 // Public API may omit categories; mark this honestly rather than invent.
 const source=p.category??p.categories?.[0]??p.categoryName??p.category_name;
 if(!source)return {key:"uncategorized",name:"غير مصنف من صفقة",parent:null,confirmed:false};
 if(typeof source==="string"){
   const name=trim(source,230);
   if(!name)return {key:"uncategorized",name:"غير مصنف من صفقة",parent:null,confirmed:false};
   return {key:"name:"+name,name,parent:null,confirmed:true};
 }
 if(record(source)){
   const name=trim(source.name||source.title||source.categoryName||source.nameAr,230);
   const ident=trim(source._id||source.id||source.slug,230);
   const rawParent=source.parent||source.parentCategory||source.parent_id;
   const parent=typeof rawParent==="string"?trim(rawParent,220):record(rawParent)?trim(rawParent._id||rawParent.id,220):null;
   if(name)return {key:ident||"name:"+name,name,parent:parent||null,confirmed:true};
 }
 return {key:"uncategorized",name:"غير مصنف من صفقة",parent:null,confirmed:false};
}
function variantsOf(p){
 const list=Array.isArray(p.properties)?p.properties:Array.isArray(p.variants)?p.variants:[];
 return list.slice(0,200).filter(record).map(v=>({
   provider_id:trim(v._id||v.id,150),
   name:trim(v.key||v.name||v.title||v.value_name,240),
   supplier_value:num(v.value),suggested_price:num(v.sale_price),
   min:num(v.min),is_available:v.is_available===true
 })).filter(x=>x.provider_id);
}
export function normalizeProduct(p){
 if(!record(p))return null;
 const supplier_product_id=trim(p._id||p.id,80);
 if(!/^[0-9a-f]{24}$/i.test(supplier_product_id))return null;
 const name=trim(p.name||p.title,350);
 if(!name)return null;
 const cat=categoryOf(p);
 const pictureItems=p.images||p.pictures||p.image||[];
 const videoItems=p.videos||p.video||p.video_urls||p.video_url||[];
 return {
   supplier_product_id,barcode:trim(p.barcode,150),name,
   category_key:cat.key,category_name:cat.name,category_parent_key:cat.parent,
   source_category_confirmed:cat.confirmed,
   description:trim(p.description,12000),
   suggested_sale_price_egp:num(p.sale_price),
   variants:variantsOf(p),
   images:publicMedia(pictureItems,"image"),videos:publicMedia(videoItems,"video"),
   is_available:p.is_available!==false
 };
}
export function normalizeRegion(p){
 if(!record(p))return null;
 const governorate_id=trim(p._id||p.id,120);
 const name_ar=trim(p.governorateNameAr||p.governorateName||p.governorate||p.name,150);
 const cost=num(p.price??p.shipping_price??p.shippingPrice);
 if(!governorate_id||!name_ar||cost===null)return null;
 const cities=Array.isArray(p.cities)?p.cities.slice(0,150).map(c=>
   typeof c==="string"?{name:trim(c,120)}:record(c)?
    {id:trim(c._id||c.id,120),name:trim(c.city_name_ar||c.city_name_en||c.name_ar||c.name||c.city,120)}:null).filter(Boolean):[];
 return {governorate_id,name_ar,shipping_egp:cost,is_active:p.is_active!==false,cities};
}
