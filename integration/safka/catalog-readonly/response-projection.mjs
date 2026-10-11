// Safqa public GET-only response projection. Does not assume undocumented wrappers.
// These projections intentionally do not return arbitrary provider fields or secrets.
export function describe(value){
  if(Array.isArray(value)) return {type:"array",length:value.length};
  if(value!==null&&typeof value==="object")return {
    type:"object",keys:Object.keys(value).slice(0,25)
      .filter(k=>!/secret|token|pass|auth|private|api.?key/i.test(k))
  };
  return {type:typeof value};
}
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const wrappers=["data","result","results","products","items","docs","list","price_list","priceList","governorates","shipping","regions"];
export function pickRecords(root){
  const todo=[{value:root,depth:0}];
  while(todo.length){
    const item=todo.shift();
    if(Array.isArray(item.value))return item.value;
    if(!object(item.value)||item.depth>3)continue;
    for(const key of wrappers)if(Object.hasOwn(item.value,key))
      todo.push({value:item.value[key],depth:item.depth+1});
  }
  return [];
}
const plain=v=>{
  if(typeof v==="string")return v.slice(0,320);
  if(typeof v==="number"&&Number.isFinite(v))return v;
  if(typeof v==="boolean")return v;
  return undefined;
};
function take(source,allowed){
  if(!object(source))return null;
  const target={};
  for(const key of allowed){
    if(!Object.hasOwn(source,key))continue;
    const value=plain(source[key]);
    if(value!==undefined)target[key]=value;
  }
  return target;
}
const PRODUCT_KEYS=[
  "_id","id","name","title","barcode","sale_price","description",
  "is_available","category","category_name"
];
const VARIANT_KEYS=[
  "_id","id","key","name","value","min","sale_price","is_available"
];
const REGION_KEYS=[
  "_id","id","name","governorate","governorate_name","shipping_price",
  "shippingPrice","price","delivery_price","deliveryPrice","shipping",
  "return_price","returnPrice","extra_shipping","cities"
];
export function summarizeProduct(item){
  const p=take(item,PRODUCT_KEYS);
  if(!p)return null;
  const variants=Array.isArray(item.properties)?item.properties:[];
  p.properties=variants.slice(0,40).map(v=>take(v,VARIANT_KEYS)).filter(Boolean);
  p.propertyCount=variants.length;
  p.imageCount=Array.isArray(item.images)?item.images.length:0;
  // Returning titles/prices/variant IDs only. Image downloading is a later step.
  return p;
}
export function summarizeRegion(item){
  const p=take(item,REGION_KEYS);
  if(!p)return null;
  if(Array.isArray(item.cities)){
    p.cityCount=item.cities.length;
    p.cities=item.cities.slice(0,6).map(v=>
      typeof v==="string"?v.slice(0,100):take(v,["_id","id","name","city"])).filter(Boolean);
  }
  return p;
}
export function summarizeProviderResponse(kind,raw,maxItems=30){
  if(!["products","price-list"].includes(kind))throw Error("invalid_mode");
  const list=pickRecords(raw);
  const summary={
    kind,outer:describe(raw),
    collectionLength:list.length,
    collectionFound:Array.isArray(raw)||list.length>0,
    recordShape:list.length?describe(list[0]):null,
    samples:list.slice(0,Math.min(maxItems,kind==="products"?30:60))
      .map(kind==="products"?summarizeProduct:summarizeRegion).filter(Boolean)
  };
  return summary;
}
