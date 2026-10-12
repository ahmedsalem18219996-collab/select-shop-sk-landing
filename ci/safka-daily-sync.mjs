// SELECT SHOP temporary: GitHub Actions OIDC-authenticated upstream Safqa sync.
// Provider credentials never enter GitHub; only Supabase Edge reads them.
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
  body:JSON.stringify(mode==="products"?{mode,page}:{mode}),
  signal:AbortSignal.timeout(32000)
 });
 const body=await response.json().catch(()=>({error:"unexpected_response"}));
 if(!response.ok||!body.ok)
  throw Error("Sync "+mode+" page "+page+" failed: HTTP "+response.status+
    " "+String(body.error||"unavailable").slice(0,130));
 return body;
}
const shipped=await stage("shipping");
console.log("Shipping regions synced:",shipped.saved);
let completed=false,sourceRows=0,productsSaved=0,pageCount=0,confirmedPages=null;
for(let page=1;page<=50;page++){
 const result=await stage("products",page);
 pageCount++;sourceRows+=result.received;productsSaved+=result.saved;
 confirmedPages=result.sourceTotalPages??confirmedPages;
 console.log("Supplier page "+page+": "+result.received+" read, "+result.saved+" saved, total pages "+confirmedPages);
 if(!result.hasMore){completed=true;break}
}
if(!completed)throw Error("Supplier pages exceeded safe limit of 50. Snapshot incomplete.");
console.log("SELECT SHOP temporary Safqa sync complete:",
 JSON.stringify({sourceRows,productsSaved,pageCount,confirmedPages,shippingRegions:shipped.saved,
  storedAs:"private_temp_catalog",supplierOrdersSent:0}));
