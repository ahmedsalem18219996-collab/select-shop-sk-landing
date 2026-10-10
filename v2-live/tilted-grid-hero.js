/* SELECT SHOP • Tilted Grid Hero — static-site adaptation of the owner's
   21st.dev SerafimCloud component. Same measured curved 3D carousel model,
   one synchronized animation per tile, 16 fixed facets per tile, recycling
   product images only while the tile wraps off screen.
   Decorative images. Never alters commerce, analytics or navigation. */
(()=>{
 "use strict";
 const stage=document.querySelector("[data-tgh-stage]");
 if(!stage || stage.dataset.tghMounted==="yes")return;
 const band=stage.querySelector(".tgh-band");
 if(!band)return;
 stage.dataset.tghMounted="yes";
 const catalog=window.SELECT_FOUNDATION_CATALOG||{};
 const paths=[
  ["wk",0],["alex",1],["eqwal",0],["sk",0],["wk",4],
  ["carwash48",0],["alex",3],["wk",6],["sk",1],["eqwal",2],["wk",1]
 ];
 const images=paths.map(([id,index])=>{
  const p=catalog[id],v=p?.variants?.[index]||p?.variants?.[0];
  if(!v?.image)return null;
  return {src: v.image.startsWith("/")?v.image:"/"+v.image,
    name:p.name+" "+v.name,contain:id==="carwash48"};
 }).filter(Boolean);
 if(!images.length){stage.classList.add("tgh-unavailable");return}
 const SLICES=16, CAMERA=1.6, MAX_SHARE=.55, SPEED=4.2, ASPECT=1.62, GAP=.065;
 const rad=deg=>deg*Math.PI/180;
 const deg=value=>value*180/Math.PI;
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)");
 const preload=()=>{
  for(const item of images){const img=new Image();img.decoding="async";img.src=item.src;}
 };
 preload();
 const style=document.createElement("style");
 style.setAttribute("data-tgh-animation","");
 stage.appendChild(style);
 let lastKey="",disposed=false,tiles=[];
 const mod=(a,b)=>((a%b)+b)%b;
 const rounded=v=>Math.round(v*1000)/1000;
 const turn=(radius,angle)=>"translateZ("+rounded(radius)+"px) rotateY("+rounded(angle)+"deg) translateZ(-"+rounded(radius)+"px)";
 function setTileImage(tile,item){
   if(!item)return;
   for(const img of tile.querySelectorAll("img")){
     img.src=item.src;
     img.alt="";
     img.style.objectFit=item.contain?"contain":"cover";
     img.style.backgroundColor=item.contain?"#e8eee3":"#e6eee1";
   }
 }
 function renderStill(){
   stage.classList.add("tgh-reduced");
   band.replaceChildren();
   images.slice(0,3).forEach((item,i)=>{
     const img=document.createElement("img");img.src=item.src;img.alt="";
     img.decoding="async";img.loading=i===0?"eager":"lazy";
     img.style.objectFit=item.contain?"contain":"cover";
     band.appendChild(img);
   });
 }
 function layout(){
   if(disposed||reduced?.matches){if(!stage.classList.contains("tgh-reduced"))renderStill();return}
   const {width,height}=stage.getBoundingClientRect();
   if(width<140||height<100)return;
   const isMobile=width<=620;
   const curve=rad(isMobile?76:78);
   const tileShare=isMobile?.56:.48;
   const tileHeight=Math.min(height*tileShare,(MAX_SHARE*width)/ASPECT);
   const radius=width*(CAMERA-1+Math.cos(curve))/(2*CAMERA*Math.sin(curve));
   if(!(tileHeight>0)||!(radius>0))return;
   const unit=deg(tileHeight/radius);
   const pitch=(ASPECT+GAP)*unit;
   const limit=deg(curve)+(ASPECT*unit)/2;
   const columns=Math.min(12,Math.max(2,Math.ceil((2*limit)/pitch)));
   const sweep=rounded(columns*pitch/2);
   const visibleLimit=Math.min(sweep,limit);
   const hide=Math.max(0,Math.min(48,rounded((sweep-visibleLimit)/(2*sweep)*100)));
   const key=[width.toFixed(1),height.toFixed(1),columns,rounded(unit),rounded(sweep)].join(":");
   if(key===lastKey)return;
   lastKey=key;
   const tileWidth=tileHeight*ASPECT;
   const strip=tileWidth/SLICES;
   const name="tgh-scroll-select";
   const start=turn(radius,-sweep),end=turn(radius,sweep);
   style.textContent="@keyframes "+name+"{"+
     "0%{transform:"+start+";visibility:hidden}"+
     rounded(hide+.01)+"%{visibility:visible}"+
     rounded(100-hide-.01)+"%{visibility:visible}"+
     "100%{transform:"+end+";visibility:hidden}}";
   const period=columns*SPEED;
   const fragment=document.createDocumentFragment();
   tiles=[];
   for(let i=0;i<columns;i++){
     const first=columns-1-i;
     const tile=document.createElement("div");
     tile.className="tgh-tile";
     tile.style.cssText="width:"+rounded(tileWidth)+"px;height:"+rounded(tileHeight)+"px;"+
       "left:calc(50% - "+rounded(tileWidth/2)+"px);top:calc(56% - "+rounded(tileHeight/2)+"px);"+
       "animation:"+name+" "+rounded(period)+"s linear "+rounded(-i*SPEED)+"s infinite;";
     for(let k=0;k<SLICES;k++){
       const facet=document.createElement("div");
       facet.className="tgh-slice";
       facet.style.left=rounded((tileWidth-strip)/2)+"px";
       facet.style.width=rounded(strip+(k===SLICES-1?0:1))+"px";
       facet.style.height=rounded(tileHeight)+"px";
       const sliceAngle=(ASPECT/2-(k+.5)*(ASPECT/SLICES))*unit;
       facet.style.transform=turn(radius,sliceAngle);
       if(k===0)facet.style.borderRadius="9px 0 0 9px";
       if(k===SLICES-1)facet.style.borderRadius="0 9px 9px 0";
       const img=document.createElement("img");img.alt="";img.draggable=false;
       img.decoding="async";img.style.width=rounded(tileWidth)+"px";
       img.style.height=rounded(tileHeight)+"px";
       img.style.left=rounded(-k*strip)+"px";
       facet.appendChild(img);tile.appendChild(facet);
     }
     setTileImage(tile,images[mod(first,images.length)]);
     tile.addEventListener("animationiteration",event=>{
       if(event.animationName!==name||disposed)return;
       const lap=Math.round(event.elapsedTime/period);
       const idx=mod(lap*columns+first,images.length);
       setTileImage(tile,images[idx]);
     });
     fragment.appendChild(tile);
     tiles.push(tile);
   }
   band.replaceChildren(fragment);
   band.style.perspective=rounded(radius*CAMERA)+"px";
   band.style.perspectiveOrigin="50% 56%";
   stage.classList.add("tgh-ready");
 }
 const resize=window.ResizeObserver?new ResizeObserver(layout):null;
 if(resize)resize.observe(stage);
 else window.addEventListener("resize",layout,{passive:true});
 if(reduced?.addEventListener)reduced.addEventListener("change",()=>{lastKey="";stage.classList.remove("tgh-reduced");layout()});
 document.addEventListener("visibilitychange",()=>{
   tiles.forEach(t=>t.style.animationPlayState=document.hidden?"paused":"running");
 });
 window.addEventListener("pagehide",()=>{disposed=true;resize?.disconnect()},{once:true});
 layout();
})();