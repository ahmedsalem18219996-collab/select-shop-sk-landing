// Safqa order-hook parsing adapter, review draft only.
// The event and data property names below are PROVISIONAL until a redacted
// payload from the owner's Safqa dashboard confirms the actual JSON contract.
// No shopper PII, secret or raw webhook body should be persisted.
export const KNOWN_SAFQA_STATES = Object.freeze([
  "pending","preparing","printing","shipped","available","collected",
  "skip","holding","returned1","returned2","declined1","declined2"
]);

const own=(v,key)=>Object.prototype.hasOwnProperty.call(v,key);
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const normalizeRef=v=>{
  if(typeof v!=="string"&&typeof v!=="number")return null;
  const ref=String(v).trim();
  return /^[A-Za-z0-9_\-]{1,160}$/.test(ref)?ref:null;
};
/** Parse a Safqa event without accepting guessed aliases or customer data. */
export function parseOrderHook(body){
  if(!object(body))return {kind:"invalid",reason:"not_an_object"};
  if(body.event!=="order.status.updated")return {kind:"ignored",reason:"unknown_event"};
  if(!object(body.data))return {kind:"invalid",reason:"missing_data"};
  // PROVISIONAL shape; don't enable webhook writes until real payload is confirmed.
  const orderRef=normalizeRef(body.data.order_id);
  const status=body.data.status;
  if(!orderRef)return {kind:"invalid",reason:"missing_supplier_order_ref"};
  if(typeof status!=="string"||!KNOWN_SAFQA_STATES.includes(status))
    return {kind:"invalid",reason:"unrecognized_supplier_status"};
  let occurredAt=null;
  if(own(body.data,"updated_at")){
    const iso=body.data.updated_at;
    if(typeof iso!=="string"||iso.length>40||Number.isNaN(Date.parse(iso)))
      return {kind:"invalid",reason:"invalid_event_timestamp"};
    occurredAt=new Date(iso).toISOString();
  }
  return {kind:"status",event:"order.status.updated",orderRef,status,occurredAt};
}
/** Provider-independent idempotency for identical event snapshots.
 * Same state on a later different time is a separate event.
 * No timestamp = repeats of same state collapse by reference. */
export function canonicalReplayMaterial(parsed){
  if(!parsed||parsed.kind!=="status")throw Error("expected_valid_status");
  return JSON.stringify([parsed.event,parsed.orderRef,parsed.status,parsed.occurredAt||""]);
}
export function providerStateToHandoff(status){
  // An informational mapping, not a customer order status mutation.
  if(status==="shipped")return "shipped";
  if(status==="available"||status==="collected")return "delivered";
  if(status==="returned1"||status==="returned2")return "returned";
  if(status==="declined1"||status==="declined2")return "cancelled";
  return null;
}
