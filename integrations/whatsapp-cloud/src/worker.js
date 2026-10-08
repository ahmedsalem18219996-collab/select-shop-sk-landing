
/* SELECT SHOP WhatsApp Cloud API receiver. No auto-replies, no outbound messages. */
const reply=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
});
const string=(v,max=10000)=>typeof v==="string"?v.slice(0,max):"";
const phoneOK=s=>typeof s==="string"&&/^[0-9]{8,16}$/.test(s);
const timestamp=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):Math.floor(Date.now()/1000);
async function tokenMatches(input,expected){
 if(!expected||!input||input.length>512)return false;
 const enc=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(input)),
                                 crypto.subtle.digest("SHA-256",enc.encode(expected))]);
 const x=new Uint8Array(a),y=new Uint8Array(b);let diff=0;
 for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
 return diff===0;
}
async function verifyHmac(buffer,signature,secret){
 if(!secret||!signature?.startsWith("sha256="))return false;
 const hex=signature.slice(7);
 if(!/^[0-9a-f]{64}$/i.test(hex))return false;
 const mac=new Uint8Array(32);
 for(let i=0;i<32;i++)mac[i]=parseInt(hex.slice(i*2,i*2+2),16);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
   {name:"HMAC",hash:"SHA-256"},false,["verify"]);
 return crypto.subtle.verify("HMAC",key,mac,buffer);
}
const textOf=m=>{
 if(m.type==="text")return string(m.text?.body);
 if(m.type==="button")return string(m.button?.text);
 if(m.type==="interactive")return string(m.interactive?.button_reply?.title||m.interactive?.list_reply?.title);
 if(["image","video","audio","document"].includes(m.type))return "[مرفق وسائط]";
 if(m.type==="location")return "[موقع]";
 return "["+string(m.type||"رسالة",40)+"]";
};
async function recordMeta(request,env){
 if(!env.META_APP_SECRET||!env.WEBHOOK_VERIFY_TOKEN||!env.DB)return reply({error:"not-configured"},503);
 if(Number(request.headers.get("content-length")||0)>262144)return reply({error:"too-large"},413);
 const raw=await request.arrayBuffer();
 if(raw.byteLength>262144)return reply({error:"too-large"},413);
 if(!await verifyHmac(raw,request.headers.get("x-hub-signature-256"),env.META_APP_SECRET))
   return reply({error:"bad-signature"},401);
 let payload;
 try{payload=JSON.parse(new TextDecoder().decode(raw));}
 catch{return reply({error:"invalid-json"},400);}
 if(payload?.object!=="whatsapp_business_account")return reply({received:true,ignored:true});
 const jobs=[];
 for(const entry of payload.entry||[])for(const change of entry.changes||[]){
   if(change.field!=="messages")continue;
   const value=change.value||{};
   if(env.META_PHONE_NUMBER_ID&&value.metadata?.phone_number_id!==env.META_PHONE_NUMBER_ID)continue;
   const names=new Map((value.contacts||[]).map(c=>[c.wa_id,string(c.profile?.name,160)]));
   const all=[
      ...(value.messages||[]).map(m=>({message:m,phone:m.from,direction:"in"})),
      ...(value.smb_message_echoes||[]).map(m=>({message:m,phone:m.to||m.recipient_id,direction:"out"}))
   ];
   for(const item of all){
     const m=item.message,p=item.phone;
     if(!phoneOK(p)||!m.id)continue;
     const when=timestamp(m.timestamp);
     jobs.push(env.DB.prepare(
       "INSERT INTO customers(phone,name,last_message_at,last_inbound_at) VALUES(?,?,?,?) "+
       "ON CONFLICT(phone) DO UPDATE SET name=COALESCE(NULLIF(excluded.name,''),customers.name),"+
       "last_message_at=MAX(customers.last_message_at,excluded.last_message_at),"+
       "last_inbound_at=MAX(customers.last_inbound_at,excluded.last_inbound_at)"
     ).bind(p,names.get(p)||"",when,item.direction==="in"?when:0));
     jobs.push(env.DB.prepare(
       "INSERT OR IGNORE INTO messages(id,phone,direction,kind,body,occurred_at) VALUES(?,?,?,?,?,?)"
     ).bind(string(m.id,200),p,item.direction,string(m.type,60),textOf(m),when));
   }
 }
 if(jobs.length)await env.DB.batch(jobs);
 return reply({received:true});
}
async function api(req,url,env){
 if(!env.DB||!env.ADMIN_API_KEY)return reply({error:"not-configured"},503);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer ")||!await tokenMatches(auth.slice(7),env.ADMIN_API_KEY))
   return reply({error:"unauthorized"},401);
 if(req.method!=="GET")return reply({error:"method-not-allowed"},405);
 const limit=Math.max(1,Math.min(100,Number(url.searchParams.get("limit"))||30));
 if(url.pathname==="/api/conversations"){
   const rows=await env.DB.prepare(
      "SELECT c.phone,c.name,c.last_message_at,c.last_inbound_at,"+
      "(SELECT m.body FROM messages m WHERE m.phone=c.phone ORDER BY m.occurred_at DESC,m.id DESC LIMIT 1) AS last_text "+
      "FROM customers c ORDER BY last_message_at DESC LIMIT ?"
   ).bind(limit).all();
   return reply({conversations:rows.results||[]});
 }
 if(url.pathname==="/api/messages"){
   const number=url.searchParams.get("phone");
   if(!phoneOK(number))return reply({error:"invalid-phone"},400);
   const rows=await env.DB.prepare(
      "SELECT id,phone,direction,kind,body,occurred_at FROM messages "+
      "WHERE phone=? ORDER BY occurred_at DESC,id DESC LIMIT ?"
   ).bind(number,limit).all();
   return reply({messages:(rows.results||[]).reverse()});
 }
 return reply({error:"not-found"},404);
}
export default {
 async fetch(request,env){
   try {
     const url=new URL(request.url);
     if(url.pathname==="/health"&&request.method==="GET")
       return reply({service:"select-shop-whatsapp",read_only:true});
     if(url.pathname==="/meta/webhook"&&request.method==="GET"){
       if(!env.WEBHOOK_VERIFY_TOKEN)return new Response("not-configured",{status:503});
       const q=url.searchParams,valid=q.get("hub.mode")==="subscribe"&&
         await tokenMatches(q.get("hub.verify_token")||"",env.WEBHOOK_VERIFY_TOKEN);
       return valid?new Response(q.get("hub.challenge")||"",{status:200}):
                    new Response("unauthorized",{status:403});
     }
     if(url.pathname==="/meta/webhook"&&request.method==="POST")return recordMeta(request,env);
     if(url.pathname.startsWith("/api/"))return api(request,url,env);
     return reply({error:"not-found"},404);
   }catch(err){
     // Never log phone numbers, raw message bodies, secrets, or request headers.
     console.error("wa-cloud request failed:",err?.name||"unknown");
     return reply({error:"internal-error"},500);
   }
 }
};
