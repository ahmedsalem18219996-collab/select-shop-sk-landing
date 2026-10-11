// Pure, read-only portable export validator + proposed import plan.
// No DB connection, no order/pricing writes, no network, no credentials.
// Usage: node validate-and-plan.mjs ./select-shop-safka-portable-v1-....json
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const supplierId = /^[a-f0-9]{24}$/;
const driveVideo = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{15,}\/preview$/;
const allowedStates = new Set(['pending','folder_verified','video_found','no_video','needs_review','access_denied']);
function fail(message){throw new Error('Import blocked: '+message)}
function urls(value,kind,id){
  if(!Array.isArray(value))fail(kind+' not array for '+id);
  for(const url of value){
    if(typeof url!=='string'||url.length>1600)fail('invalid '+kind+' for '+id);
    if(kind==='source_videos'){
      if(!driveVideo.test(url))fail('unverified supplier video URL for '+id);
    } else {
      try{const u=new URL(url);
        if(u.protocol!=='https:'||u.username||u.password)fail('invalid image URL for '+id);
      }catch{fail('invalid image URL for '+id)}
    }
  }
  return [...new Set(value)];
}
export function validateAndPlan(snapshot){
  if(!snapshot||snapshot.format!=='select-shop.supplier-catalog'||snapshot.schema_version!==1||
     snapshot.origin?.source!=='safka'||snapshot.requires_import_review!==true||
     !Array.isArray(snapshot.categories)||!Array.isArray(snapshot.products))
    fail('unsupported contract version or invalid root');
  const denied=['orders','customers','credentials','prices','supplier_costs','checkout'];
  if(!Array.isArray(snapshot.excludes)||denied.some(k=>!snapshot.excludes.includes(k)))
    fail('snapshot missing safety exclusions');
  const categories=new Map();
  for(const c of snapshot.categories){
    if(!c||!supplierId.test(c.supplier_category_id)||c.verified!==true||!c.name||
       categories.has(c.supplier_category_id))fail('invalid or duplicate supplier category');
    categories.set(c.supplier_category_id,{
      supplier:'safka',external_category_id:c.supplier_category_id,
      title:String(c.name),parent_external_category_id:c.parent_supplier_category_id??null
    });
  }
  const seen=new Set(),products=[],media=[];
  for(const item of snapshot.products){
    const id=item?.external_product_id;
    if(!supplierId.test(id||'')||seen.has(id)||item.supplier!=='safka')
      fail('duplicate/invalid supplier product ID '+id);
    seen.add(id);
    if(item.purchase_enabled!==false||item.price!==undefined||
       item.supplier_value!==undefined||item.suggested_sale_price_egp!==undefined||
       item.final_price_egp!==undefined)fail('unapproved price/publishing data for '+id);
    if(typeof item.name!=='string'||!item.name.trim()||
       typeof item.description_text!=='string'||!Array.isArray(item.variants))
      fail('missing text or variants for '+id);
    if(!allowedStates.has(item.media_state))fail('unknown media state for '+id);
    if(item.category_verified===true &&
       !categories.has(item.supplier_category_id))fail('verified category unknown for '+id);
    if(item.category_verified!==true && item.supplier_category_id!==null)
      fail('unverified category should be null for '+id);
    const images=urls(item.images,'images',id);
    const videos=urls(item.source_videos,'source_videos',id);
    if(item.media_state==='video_found'&&videos.length===0)
      fail('video_found but no source video for '+id);
    const variants=[],variantSeen=new Set();
    for(const v of item.variants){
      const vid=v?.external_variant_id;
      if(typeof vid!=='string'||!supplierId.test(vid)||variantSeen.has(vid))
        fail('invalid supplier variant ID for '+id);
      variantSeen.add(vid);
      variants.push({
        supplier:'safka',external_variant_id:vid,
        label:String(v.label||''),supplier_available:v.supplier_available===true
      });
    }
    products.push({
      supplier:'safka',external_product_id:id,barcode:item.barcode??null,
      title:item.name,description_text:item.description_text,
      supplier_category_id:item.category_verified?item.supplier_category_id:null,
      category_verified:item.category_verified===true,
      supplier_available:item.supplier_available===true,
      variants,
      proposed_publish_state:'draft',requires_price_review:true,
      requires_order_integration_review:true
    });
    media.push({
      supplier:'safka',external_product_id:id,
      image_urls:images,
      original_supplier_video_preview_urls:videos,
      supplier_media_status:item.media_state,
      source_folder_url:item.source_media_folder??null,
      rehosting_required_for_reliable_playback:true
    });
  }
  if(products.length!==snapshot.summary?.product_count||
     products.length!==snapshot.summary?.verified_category_products+
                       snapshot.summary?.products_requiring_category_review ||
     media.reduce((n,p)=>n+p.original_supplier_video_preview_urls.length,0)!==
       snapshot.summary?.supplier_video_urls)
    fail('count mismatch / incomplete export');
  return {
    contract:'select-shop.safka.import-plan',schema_version:1,
    derived_from:snapshot.exported_at,
    mode:'dry_run_only',
    match_key:['supplier','external_product_id'],
    categories:[...categories.values()],
    products,media,
    warnings:[
      'Do not write to SELECT-SHOP-CLEAN until its canonical schema and permissions are reviewed.',
      'Draft-only: prices, checkout and supplier orders are never imported from this snapshot.',
      'Google Drive preview URLs are references, not hosted MP4 files; verify rights and mobile playback before publishing.'
    ]
  };
}
if(process.argv[1]&&process.argv[1].endsWith('validate-and-plan.mjs')){
  const file=process.argv[2];if(!file)fail('Pass a portable .json file path');
  const snap=JSON.parse(readFileSync(resolve(file),'utf8'));
  const plan=validateAndPlan(snap);
  const target=resolve(process.cwd(),'safka-import-plan-v1.json');
  writeFileSync(target,JSON.stringify(plan,null,2)+'\n');
  process.stdout.write(JSON.stringify({
    source_file:basename(file),products:plan.products.length,
    categories:plan.categories.length,
    with_original_video:plan.media.filter(p=>p.original_supplier_video_preview_urls.length>0).length,
    video_links:plan.media.reduce((n,p)=>n+p.original_supplier_video_preview_urls.length,0),
    plan_file:target,published:false
  },null,2)+'\n');
}
