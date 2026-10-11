// Pure Safqa cost+delivery previews. No network and no published prices.
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const money=(v,key)=>{
  if(typeof v!=="number"||!Number.isFinite(v)||v<0||v>1000000)
    throw new TypeError("invalid_"+key);
  return v;
};
export function calculateAllInPrice({
  supplierCost,shippingCost,desiredNetProfit,otherCosts=0,roundUpTo=1
}){
  money(supplierCost,"supplier_cost");
  money(shippingCost,"shipping_cost");
  money(desiredNetProfit,"desired_profit");
  money(otherCosts,"other_costs");
  if(!Number.isInteger(roundUpTo)||roundUpTo<1||roundUpTo>100)
    throw new TypeError("invalid_rounding");
  const totalCost=round(supplierCost+shippingCost+otherCosts);
  const minimum=round(totalCost+desiredNetProfit);
  const finalPrice=Math.ceil((minimum-1e-9)/roundUpTo)*roundUpTo;
  return {
    finalPrice:round(finalPrice),totalCost,
    estimatedProfit:round(finalPrice-totalCost),
    shippingIncluded:true,
    currency:"EGP",status:"DRAFT_NOT_PUBLISHED"
  };
}
/** Refuses incomplete, inconsistent provider shipping coverage. */
export function calculateNationwidePrice({
  supplierCost,activeRegions,expectedActiveRegions,
  desiredNetProfit,otherCosts=0,roundUpTo=1
}){
  if(!Number.isInteger(expectedActiveRegions)||expectedActiveRegions<1)
    throw new TypeError("missing_verified_governorate_count");
  if(!Array.isArray(activeRegions)||activeRegions.length!==expectedActiveRegions)
    throw new TypeError("incomplete_governorate_coverage");
  const ids=new Set(),normalized=[];
  for(const region of activeRegions){
    if(!region||region.is_active!==true||typeof region._id!=="string"||!region._id.trim()||ids.has(region._id))
      throw new TypeError("invalid_governorate_record");
    ids.add(region._id);
    normalized.push({id:region._id,price:money(region.price,"shipping_cost")});
  }
  const highestShipping=Math.max(...normalized.map(x=>x.price));
  const proposal=calculateAllInPrice({
    supplierCost,shippingCost:highestShipping,
    desiredNetProfit,otherCosts,roundUpTo
  });
  return {
    ...proposal,pricingScope:"all_active_governorates",
    verifiedRegionCount:normalized.length,
    maxShippingIncluded:highestShipping,
    minEstimatedProfitInRegions:proposal.estimatedProfit,
    note:"For review only; validate supplier cost, shipping, COD/return provisions before publication."
  };
}
export function summarizeSafqaProductDetail(response){
  // Safqa may wrap a product in {data:{product:{...}}} or {data:{...}}.
  // Never echo unknown keys, customer data or provider authentication fields.
  const isRecord=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
  let record=response;
  for(let i=0;i<3;i++){
    if(!isRecord(record))break;
    if(isRecord(record.product))record=record.product;
    else if(isRecord(record.data))record=record.data;
    else if(isRecord(record.result))record=record.result;
    else break;
  }
  if(!isRecord(record))throw new TypeError("unknown_product_details_shape");
  const take=(obj,fields)=>fields.reduce((out,key)=>{
    if(Object.prototype.hasOwnProperty.call(obj,key)){
      const value=obj[key];
      if(typeof value==="string")out[key]=value.slice(0,400);
      if(typeof value==="boolean")out[key]=value;
      if(typeof value==="number"&&Number.isFinite(value))out[key]=value;
    }
    return out;
  },{});
  if(typeof record._id!=="string"||record._id.length>64)
    throw new TypeError("missing_product_id");
  const properties=Array.isArray(record.properties)?record.properties:[];
  return {
    ...take(record,["_id","name","title","barcode","sale_price","description"]),
    propertyCount:properties.length,
    variants:properties.slice(0,80).filter(isRecord).map(v=>
      take(v,["_id","key","name","value","min","sale_price","is_available"])
    ),
    imageCount:Array.isArray(record.images)?record.images.length:0,
    costFieldUnverified:true,
    note:"Do not assume properties.value is a confirmed wholesale cost without matching Safqa contract."
  };
}
