import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const base = 'http://127.0.0.1:4173/preview/women/glass-v3/';
const browser = await chromium.launch({headless:true});
mkdirSync('test-results/women-glass-v3', { recursive: true });
const results=[];
async function test(width,height=860){
 const ctx=await browser.newContext({ viewport:{width,height}, reducedMotion:'reduce' });
 const page=await ctx.newPage();
 const errors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url())});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,hero:!!document.querySelector('.glass'),cards:document.querySelectorAll('.card').length}));
 assert(layout.scroll<=layout.width+1,width+'px horizontal overflow '+JSON.stringify(layout));
 assert(layout.hero && layout.cards===4);
 await page.locator('[data-filter="evening"]').click();
 assert.equal(await page.locator('.card:visible').count(),1);
 await page.locator('[data-filter="all"]').click();
 assert.equal(await page.locator('.card:visible').count(),4);
 await page.locator('[data-open-login]').first().click();
 assert.equal(await page.locator('#login.show').count(),1);
 await page.locator('#eye').click();
 assert.equal(await page.locator('#pass').getAttribute('type'),'text');
 await page.locator('#email').fill('test@example.invalid');
 await page.locator('#pass').fill('not-a-real-password');
 await page.locator('#form [type=submit]').click();
 assert.equal(await page.locator('#login.show').count(),0);
 assert.equal(writes.length,0,'Demo should never submit: '+writes.join(','));
 await page.locator('[data-detail]').first().click();
 assert.equal(await page.locator('#product.show').count(),1);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#product.show').count(),0);
 assert.equal(errors.length,0,JSON.stringify(errors));
 await page.screenshot({path:'test-results/women-glass-v3/'+width+'.png',fullPage:true,animations:'disabled'});
 await ctx.close();
 results.push(width+'px OK');
}
try {
 for(const width of [320,360,390,400,768,1280])await test(width);
 console.log('GLASS V3 visual interactions PASS',results.join(', '));
}finally{await browser.close()}