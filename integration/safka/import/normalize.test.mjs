import test from "node:test";
import assert from "node:assert/strict";
import {findRecords,totalPages,categoryOf,normalizeProduct,normalizeRegion} from "./normalize.mjs";
const fixture={
  _id:"6aa81321ca38d5013caa41fc",
  name:"مجفف الأحذية",barcode:"DRY-001",sale_price:270,
  category:{_id:"c1",name:"العناية بالأحذية",parent:{_id:"root"}},
  properties:[{_id:"v1",key:"أبيض",value:180,sale_price:270,is_available:true,min:1}],
  images:["https://images.example.com/1.jpg","http://not-secure/a.jpg",
    "https://images.example.com/x.jpg?token=secret"],
  videos:["https://media.example.com/demo.mp4"],unknown_customer_field:"NO_LEAK"
};
test("GET products array with nested data and page count",()=>{
 const root={data:{products:[fixture]},pages:7};
 assert.equal(findRecords(root,"products").length,1);
 assert.equal(totalPages(root),7);
});
test("safqa codes/barcode/category hierarchy stay matched",()=>{
 const p=normalizeProduct(fixture);
 assert.equal(p.supplier_product_id,fixture._id);
 assert.equal(p.barcode,"DRY-001");
 assert.equal(p.category_key,"c1");
 assert.equal(p.category_parent_key,"root");
 assert.equal(p.category_name,"العناية بالأحذية");
 assert.equal(p.source_category_confirmed,true);
 assert.equal(p.variants[0].provider_id,"v1");
 assert.equal(p.variants[0].supplier_value,180);
 assert.equal(p.variants[0].is_available,true);
});
test("source category absence is clearly flagged",()=>{
 const p=normalizeProduct({...fixture,category:null});
 assert.equal(p.category_key,"uncategorized");
 assert.equal(p.source_category_confirmed,false);
});
test("source images/video whitelist blocks tokens and plain HTTP",()=>{
 const p=normalizeProduct(fixture);
 assert.deepEqual(p.images,["https://images.example.com/1.jpg"]);
 assert.deepEqual(p.videos,["https://media.example.com/demo.mp4"]);
 assert.equal(JSON.stringify(p).includes("NO_LEAK"),false);
});
test("invalid supplier IDs and names excluded",()=>{
 assert.equal(normalizeProduct({...fixture,_id:"fake-product"}),null);
 assert.equal(normalizeProduct({...fixture,name:""}),null);
});
test("governorate prices use real identifiers and full source coverage",()=>{
 const rec=normalizeRegion({_id:"governorate123",governorateNameAr:"القاهرة",
  price:85,is_active:true,cities:[{_id:"c1",name:"مدينة نصر"}]});
 assert.equal(rec.governorate_id,"governorate123");
 assert.equal(rec.name_ar,"القاهرة");
 assert.equal(rec.shipping_egp,85);
 assert.equal(rec.cities.length,1);
});
test("missing shipping prices refused",()=>{
 assert.equal(normalizeRegion({_id:"x",governorateNameAr:"أسوان"}),null);
});
test("no pagination guessed when absent",()=>assert.equal(totalPages({data:[]}),null));
