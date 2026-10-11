import test from "node:test";
import assert from "node:assert/strict";
import {describe,pickRecords,summarizeProduct,summarizeRegion,summarizeProviderResponse} from "./response-projection.mjs";

const sampleProduct={
 _id:"remote-p-1",name:"TEST PRODUCT",barcode:"012345",sale_price:740,
 customer_phone:"01000000000",api_key:"DO_NOT_LEAK",
 properties:[{_id:"remote-prop-1",key:"42",value:590,sale_price:750,
   is_available:true,secret:"DO_NOT_LEAK"}],
 images:["https://fake.example/image.jpg"]
};
test("products list response: reveals explicit safe metadata and first variants",()=>{
 const info=summarizeProviderResponse("products",{success:true,data:{products:[sampleProduct]}});
 assert.equal(info.samples[0]._id,"remote-p-1");
 assert.equal(info.samples[0].propertyCount,1);
 assert.equal(info.samples[0].properties[0]._id,"remote-prop-1");
 assert.equal(info.samples[0].properties[0].is_available,true);
 assert.equal(JSON.stringify(info).includes("DO_NOT_LEAK"),false);
 assert.equal(JSON.stringify(info).includes("01000000000"),false);
});
test("supports array or nested response envelopes",()=>{
 assert.equal(pickRecords([sampleProduct]).length,1);
 assert.equal(pickRecords({data:{docs:[sampleProduct]}}).length,1);
 assert.equal(pickRecords({result:{items:[sampleProduct]}}).length,1);
});
test("unknown wrapper does not leak arbitrary data",()=>{
 const info=summarizeProviderResponse("products",{random:[sampleProduct],access_token:"private"});
 assert.equal(info.samples.length,0);
 assert.equal(JSON.stringify(info).includes("private"),false);
});
test("price list exposes governorate ID and shipping numbers",()=>{
 const info=summarizeProviderResponse("price-list",{result:{price_list:[
   {_id:"gov-cairo",name:"القاهرة",shipping_price:85,cities:[{_id:"c1",name:"القاهرة الجديدة"}],token:"NO"}
 ]}});
 assert.equal(info.samples[0]._id,"gov-cairo");
 assert.equal(info.samples[0].shipping_price,85);
 assert.equal(info.samples[0].cityCount,1);
 assert.equal(JSON.stringify(info).includes('"token"'),false);
});
test("item lists are capped",()=>{
 const info=summarizeProviderResponse("products",Array.from({length:80},(_,i)=>({...sampleProduct,_id:"p"+i})),30);
 assert.equal(info.samples.length,30);
});
test("never propagates PII or raw provider JSON",()=>{
 const input={...sampleProduct,client_address:"TEST-ADDRESS",notes:"SECRET",items:[{customer_name:"FAKE PERSON"}]};
 const v=summarizeProduct(input);
 const s=JSON.stringify(v);
 for(const forbidden of ["TEST-ADDRESS","SECRET","FAKE PERSON"]) assert.equal(s.includes(forbidden),false);
});
test("scalar responses are reported as shape only",()=>{
 const info=summarizeProviderResponse("price-list","not-json-object");
 assert.equal(info.samples.length,0);
 assert.equal(info.outer.type,"string");
});
test("rejects unknown modes",()=>{
 assert.throws(()=>summarizeProviderResponse("orders",{}),/invalid_mode/);
});
test("string field lengths are bounded",()=>{
 const product=summarizeProduct({_id:"ID",name:"A".repeat(2000),properties:[]});
 assert.equal(product.name.length,320);
});
test("does not return unrecognized region columns",()=>{
 const r=summarizeRegion({_id:"X",shipping_price:70,customer_name:"Hidden",access_token:"token"});
 assert.deepEqual(Object.keys(r).sort(),["_id","shipping_price"].sort());
});
