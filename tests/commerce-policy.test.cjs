/* Run: node tests/commerce-policy.test.cjs */
const assert=require("node:assert/strict");
const {summarize}=require("../commerce-policy.js");
const cases=[
  ["single shoe",[{productId:"sk"}],680,0],
  ["two shoes",[{productId:"sk"},{productId:"wk",role:"purchase"}],1230,80],
  ["two trial sizes one kept",[{productId:"sk",role:"primary",sizes:[38,39]},{productId:"wk",role:"trial"}],680,0],
  ["shoe plus car",[{productId:"sk"},{productId:"carwash48"}],1679,0],
  ["two shoes plus car",[{productId:"sk"},{productId:"wk",role:"purchase"},{productId:"carwash48"}],2229,80],
  ["car only",[{productId:"carwash48"}],999,0],
  ["two car guns",[{productId:"carwash48",quantity:2}],1998,0],
  ["car before two shoes",[{productId:"carwash48"},{productId:"sk"},{productId:"alex"}],2139,80]
];
for(const [name,items,total,discount] of cases){const actual=summarize(items);assert.equal(actual.total,total,name);assert.equal(actual.discount,discount,name);console.log("PASS",name);}
assert.throws(()=>summarize([{productId:"carwash48",role:"trial"}]),/trial/);
assert.throws(()=>summarize([{productId:"unknown"}]),/Unknown product/);
assert.throws(()=>summarize([{productId:"sk",quantity:0}]),/Invalid quantity/);
console.log("PASS 11 commerce policy checks");
