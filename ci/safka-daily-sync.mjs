// SELECT SHOP temporary: GitHub Actions OIDC-authenticated upstream Safqa sync.
// Provider credentials never enter GitHub; only Supabase Edge reads them.
// Refresh request: reconcile the expanded ~490-item upstream catalog against live staging.
const env=process.env;
if(!env.ACTIONS_ID_TOKEN_REQUEST_URL||!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
 throw Error("GitHub Actions OIDC is not available. This job cannot use any fallback credentials.");
const identityUrl=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
identityUrl.searchParams.set("audience","select-shop-safka-sync");
const auth=await fetch(identityUrl,{headers:{
  authorization:"Bearer "+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},
  signal:AbortSignal.timeout(14000)});
if(!auth.ok)throw Error("GitHub OIDC issuance rejected with HTTP "+auth.status);
const token=(await auth.json()).value;
if(typeof token!=="string"||token.length<100)throw Error("Invalid OIDC token from GitHub");
const url="https://zznqdwrohrycsjfpvkhc.supabase.co/functions/v1/safka-github-sync";
async function stage(mode,page){
 const response=await fetch(url,{
  method:"POST",headers:{"origin":"https://selectshopeg.com",
   "apikey":"sb_publishable_l0ii5-zDTo3tl1wVujmD1A_kR0njRNa",
   "content-type":"application/json","x-select-shop-oidc":token},
  body:JSON.stringify(mode==="products"||mode==="audit"?{mode,page}:{mode}),
  signal:AbortSignal.timeout(32000)
 });
 const body=await response.json().catch(()=>({error:"unexpected_response"}));
 if(!response.ok||!body.ok)
  throw Error("Sync "+mode+" page "+page+" failed: HTTP "+response.status+
    " "+String(body.error||"unavailable").slice(0,130));
 return body;
}
// GitHub push to this script performs a read-only independent source audit.
// Scheduled and owner-triggered runs retain the daily catalog synchronization.
if(env.GITHUB_EVENT_NAME==="push"){
 const totals={count:0,categoryPresent:0,missingCategory:0,withNote:0,
  noteSuggestedParsed:0,suggestedAboveSale:0,suggestedEqualsSale:0,suggestedBelowSale:0};
 const samples=[];
 let checked=0,totalPages=null;
 for(let page=1;page<=50;page+=3){
  const batch=await Promise.all(Array.from({length:Math.min(3,(totalPages||50)-page+1)},
    (_,i)=>stage("audit",page+i)));
  for(const response of batch){
   checked+=1;totalPages=response.sourceTotalPages??totalPages;
   for(const key of Object.keys(totals))totals[key]+=Number(response[key]||0);
   samples.push(...(response.sampleDifferences||[]).slice(0,3));
  }
  if(totalPages!==null&&checked>=totalPages)break;
  if(!totalPages&&batch.some(x=>x.received<30))break;
 }
 if(totalPages!==null&&checked<totalPages)throw Error("Audit not exhaustive");
 console.log("SAFKA_READ_ONLY_SOURCE_AUDIT_RESULT="+JSON.stringify({
  checkedAt:new Date().toISOString(),pages:checked,reportedPages:totalPages,
  ...totals,sampleSuggestedPriceDifferences:samples.slice(0,16),
  savedChanges:0,ordersSent:0
 }));
 // Continue into the normal sync: the audit and price correction use the same signed source.
}
if(env.GITHUB_EVENT_NAME==="push"){
 const probe=await stage("probe_category_details");
 console.log("SAFKA_CATEGORY_DETAIL_SOURCE_PROBE="+JSON.stringify(probe));
}
const shipped=await stage("shipping");
console.log("Shipping regions synced:",shipped.saved);
let completed=false,sourceRows=0,productsSaved=0,pageCount=0,confirmedPages=null,verified=0,manual=0,variantReview=0;
for(let page=1;page<=50;page++){
 const result=await stage("products",page);
 pageCount++;sourceRows+=result.received;productsSaved+=result.saved;
 verified+=Number(result.verifiedSuggestedRetailCount||0);
 manual+=Number(result.manualPriceReviewCount||0);
 variantReview+=Number(result.variantPriceReviewCount||0);
 confirmedPages=result.sourceTotalPages??confirmedPages;
 console.log("Supplier page "+page+": "+result.received+" read, "+result.saved+" saved, total pages "+confirmedPages);
 if(!result.hasMore){completed=true;break}
}
if(!completed)throw Error("Supplier pages exceeded safe limit of 50. Snapshot incomplete.");
console.log("SELECT SHOP temporary Safqa sync complete:",
 JSON.stringify({sourceRows,productsSaved,pageCount,confirmedPages,shippingRegions:shipped.saved,
  storedAs:"private_temp_catalog",verifiedRetailNote:verified,manualPriceReview:manual,variantPriceReview:variantReview,supplierOrdersSent:0}));

if(verified+manual+variantReview!==productsSaved)throw Error("Pricing classification incomplete");
