import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAllInPrice,calculateNationwidePrice,
  summarizeSafqaProductDetail
} from "./pricing-preview.mjs";
test("example all-in price includes cost, shipping and owner profit, no separate fee",()=>{
  const p=calculateAllInPrice({supplierCost:220,shippingCost:95,otherCosts:15,desiredNetProfit:150});
  assert.equal(p.finalPrice,480);
  assert.equal(p.estimatedProfit,150);
  assert.equal(p.shippingIncluded,true);
});
test("rounding never reduces owner margin",()=>{
  const p=calculateAllInPrice({supplierCost:220,shippingCost:95,desiredNetProfit:150,roundUpTo:10});
  assert.equal(p.finalPrice,470);
  assert.equal(p.estimatedProfit,155);
});
test("full active coverage required for single nationwide price",()=>{
  const params={
    supplierCost:220,desiredNetProfit:150,otherCosts:15,roundUpTo:10,
    expectedActiveRegions:3,
    activeRegions:[
      {_id:"cairo",price:85,is_active:true},
      {_id:"giza",price:85,is_active:true},
      {_id:"sohag",price:95,is_active:true}
    ]
  };
  const result=calculateNationwidePrice(params);
  assert.equal(result.finalPrice,480);
  assert.equal(result.maxShippingIncluded,95);
  assert.equal(result.verifiedRegionCount,3);
  assert.throws(()=>calculateNationwidePrice({...params,expectedActiveRegions:27}),/incomplete_governorate_coverage/);
  assert.throws(()=>calculateNationwidePrice({...params,activeRegions:[
    ...params.activeRegions.slice(0,2),{_id:"sohag",price:95,is_active:false}
  ]}),/invalid_governorate_record/);
});
test("duplicate governorate is refused",()=>{
  assert.throws(()=>calculateNationwidePrice({
    supplierCost:220,desiredNetProfit:100,expectedActiveRegions:2,
    activeRegions:[{_id:"a",price:85,is_active:true},{_id:"a",price:95,is_active:true}]
  }),/invalid_governorate_record/);
});
test("invalid costs never generate a sell price",()=>{
  assert.throws(()=>calculateAllInPrice({supplierCost:-5,shippingCost:95,desiredNetProfit:150}),/invalid_supplier_cost/);
  assert.throws(()=>calculateAllInPrice({supplierCost:220,shippingCost:NaN,desiredNetProfit:150}),/invalid_shipping_cost/);
});
test("strip arbitrary secrets/customer fields from product details",()=>{
  const result=summarizeSafqaProductDetail({data:{product:{
    _id:"6a9c3d2bc9d99a6b86da4ff6",name:"SAMPLE",
    sale_price:490,api_safka_key:"FAKE_TOKEN",
    properties:[{_id:"opt-id",key:"Option",value:245,is_available:true,private_note:"HIDDEN"}],
    images:["p1.jpg"],customer_phone:"01099999999"
  }}});
  assert.equal(result.variants[0].value,245);
  assert.equal(result.propertyCount,1);
  assert.equal(result.costFieldUnverified,true);
  assert.equal(result.imageCount,1);
  assert.equal(JSON.stringify(result).includes("FAKE_TOKEN"),false);
  assert.equal(JSON.stringify(result).includes("HIDDEN"),false);
  assert.equal(JSON.stringify(result).includes("01099999999"),false);
});
