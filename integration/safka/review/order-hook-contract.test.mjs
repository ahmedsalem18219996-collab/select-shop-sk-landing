import test from "node:test";
import assert from "node:assert/strict";
import {parseOrderHook,canonicalReplayMaterial,providerStateToHandoff,KNOWN_SAFQA_STATES} from "./order-hook-contract.mjs";

const synthetic=(status="shipped",time="2026-10-11T12:00:00Z")=>({
  event:"order.status.updated",
  data:{order_id:"synthetic-safqa-order-01",status,updated_at:time}
});
test("accepts provisional synthetic status shape",()=>{
  const x=parseOrderHook(synthetic());
  assert.equal(x.kind,"status");
  assert.equal(x.orderRef,"synthetic-safqa-order-01");
  assert.equal(x.status,"shipped");
  assert.equal(x.occurredAt,"2026-10-11T12:00:00.000Z");
});
test("non-object rejected",()=>assert.equal(parseOrderHook(null).kind,"invalid"));
test("wrong event safely ignored",()=>assert.equal(parseOrderHook({event:"product.updated"}).kind,"ignored"));
test("missing remote reference rejected",()=>{
  assert.equal(parseOrderHook({event:"order.status.updated",data:{status:"shipped"}}).reason,"missing_supplier_order_ref");
});
test("remote path injection rejected",()=>{
  assert.equal(parseOrderHook({event:"order.status.updated",data:{order_id:"../../secret",status:"shipped"}}).kind,"invalid");
});
test("unapproved supplier status rejected",()=>{
  assert.equal(parseOrderHook(synthetic("unknown_status")).kind,"invalid");
});
test("all known Safqa statuses parsed",()=>{
  for(const state of KNOWN_SAFQA_STATES)assert.equal(parseOrderHook(synthetic(state)).kind,"status");
});
test("invalid timestamp rejected",()=>{
  assert.equal(parseOrderHook(synthetic("shipped","nonsense")).reason,"invalid_event_timestamp");
});
test("stable replay key on duplicate",()=>{
  assert.equal(canonicalReplayMaterial(parseOrderHook(synthetic())),
    canonicalReplayMaterial(parseOrderHook(synthetic())));
});
test("different status update distinct from prior",()=>{
  assert.notEqual(canonicalReplayMaterial(parseOrderHook(synthetic("shipped"))),
    canonicalReplayMaterial(parseOrderHook(synthetic("available"))));
});
test("same status at later event time distinct",()=>{
  assert.notEqual(canonicalReplayMaterial(parseOrderHook(synthetic("shipped"))),
    canonicalReplayMaterial(parseOrderHook(synthetic("shipped","2026-10-11T15:00:00Z"))));
});
test("PII fields never copied into normalized event",()=>{
  const body=synthetic();body.data.customer_name="FAKE CUSTOMER";
  body.data.phone="01000000000";body.data.address="FAKE ADDRESS";
  const result=JSON.stringify(parseOrderHook(body));
  for(const value of ["FAKE CUSTOMER","01000000000","FAKE ADDRESS"])
    assert.equal(result.includes(value),false);
});
test("order status conversion is only informational",()=>{
  assert.equal(providerStateToHandoff("pending"),null);
  assert.equal(providerStateToHandoff("shipped"),"shipped");
  assert.equal(providerStateToHandoff("available"),"delivered");
  assert.equal(providerStateToHandoff("collected"),"delivered");
  assert.equal(providerStateToHandoff("returned1"),"returned");
  assert.equal(providerStateToHandoff("declined2"),"cancelled");
});
