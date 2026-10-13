/* SELECT SHOP - Meta Pixel (static GitHub Pages storefront).
   This file owns the ONLY Meta Pixel initializer; no PII or access tokens.
   Lead = prepared WhatsApp order; Purchase = confirmed order receipt only.
*/
(() => {
  'use strict';
  const PIXEL_ID = '992616030526349';
  const enabled = /^\d{5,20}$/.test(PIXEL_ID) && !/^0+$/.test(PIXEL_ID) && window.SELECT_SHOP_TEST_MODE !== true;
  const seenViews = new Set();
  const seenSafqaViews = new Set();
  const sentOrderEvents = new Set();
  let lastCheckoutKey = '';
  let lastSafqaCheckoutKey = '';
  let sdkReady = Promise.resolve(false);

  if (enabled) {
    if (!window.fbq) {
      const q = window.fbq = function () {
        q.callMethod ? q.callMethod.apply(q, arguments) : q.queue.push(arguments);
      };
      window._fbq = q;
      q.push = q;
      q.loaded = true;
      q.version = '2.0';
      q.queue = [];
      sdkReady = new Promise(resolve => {
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    }
    window.fbq('init', PIXEL_ID);
    window.fbq('trackSingle', PIXEL_ID, 'PageView');
  }

  function send(name, data, eventID) {
    if (!enabled || typeof window.fbq !== 'function') return false;
    try {
      if (eventID) window.fbq('trackSingle', PIXEL_ID, name, data, { eventID });
      else window.fbq('trackSingle', PIXEL_ID, name, data);
      return true; // Queued, not an acknowledgement from Meta servers.
    } catch {
      return false;
    }
  }

  const isTrial = item => item.role === 'trial' || item.role === 'optional_choice';

  function orderData(items, value) {
    const payable = items.filter(item => !isTrial(item));
    return {
      content_type: 'product',
      content_ids: payable.map(item => String(item.variantId)),
      contents: payable.map(item => ({
        id: String(item.variantId),
        quantity: 1,
        item_price: Number(item.payablePrice ?? item.price ?? 0)
      })),
      num_items: payable.length,
      value: Number(value),
      currency: 'EGP'
    };
  }

  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

  window.SELECT_SHOP_META = {
    view(product, variant) {
      if (!enabled || !product || !variant || seenViews.has(variant.id)) return;
      if (send('ViewContent', {
        content_name: `${product.name} — ${variant.name}`,
        content_type: 'product',
        content_ids: [String(variant.id)],
        value: Number(product.price),
        currency: 'EGP'
      })) seenViews.add(variant.id);
    },

    add(product, variant, item, payablePrice) {
      if (!product || !variant) return;
      send('AddToCart', {
        content_name: `${product.name} — ${variant.name}`,
        content_type: 'product',
        content_ids: [String(variant.id)],
        contents: [{ id: String(variant.id), quantity: 1, item_price: Number(payablePrice) }],
        num_items: 1,
        value: Number(payablePrice),
        currency: 'EGP',
        selection_role: item.role,
        try_two_sizes: item.sizes?.length === 2
      });
    },

    checkout(items, total) {
      if (!enabled || !items?.length) return;
      const key = JSON.stringify(items.map(item => [item.variantId, item.role, item.sizes]));
      if (key === lastCheckoutKey) return;
      if (send('InitiateCheckout', orderData(items, total))) lastCheckoutKey = key;
    },

    // Temporary Safqa storefront funnel: customer review requests are Leads,
    // not completed Purchases. IDs and currency only; never names, phones or addresses.
    safkaView(product) {
      const id=String(product?.id||"");
      if(!enabled||!/^[a-f0-9]{24}$/i.test(id)||seenSafqaViews.has(id))return;
      const value=Number(product?.display_price_egp)||0;
      if(send('ViewContent',{content_type:'product',content_ids:['SS:'+id],
        content_name:String(product?.name||'منتج SELECT SHOP').slice(0,120),
        value,currency:'EGP'}))seenSafqaViews.add(id);
    },
    safkaAdd(product,option,quantity=1) {
      const id=String(product?.id||""),vid=String(option?.id||"");
      const amount=Number(option?.display_price_egp),qty=Number(quantity);
      if(!enabled||!/^[a-f0-9]{24}$/i.test(id)||!/^[a-f0-9]{24}$/i.test(vid)||
         !Number.isFinite(amount)||amount<=0||!Number.isInteger(qty)||qty<1||qty>3)return;
      send('AddToCart',{content_type:'product',content_ids:['SS:'+id],
        contents:[{id:'SS:'+id,quantity:qty,item_price:amount}],
        num_items:qty,value:amount*qty,currency:'EGP'});
    },
    safkaCheckout(lines,total) {
      if(!enabled||!Array.isArray(lines)||!lines.length)return;
      const clean=lines.filter(x=>/^[a-f0-9]{24}$/i.test(String(x.productId))&&
        Number.isFinite(Number(x.unitPrice))&&Number(x.unitPrice)>0&&
        Number.isInteger(Number(x.quantity))&&Number(x.quantity)>0);
      if(!clean.length)return;
      const key=JSON.stringify(clean.map(x=>[x.productId,x.variantId,x.quantity,x.unitPrice]));
      if(key===lastSafqaCheckoutKey)return;
      const sent=send('InitiateCheckout',{content_type:'product',
        content_ids:clean.map(x=>'SS:'+x.productId),
        contents:clean.map(x=>({id:'SS:'+x.productId,quantity:Number(x.quantity),item_price:Number(x.unitPrice)})),
        num_items:clean.reduce((sum,x)=>sum+Number(x.quantity),0),
        value:Number(total)||0,currency:'EGP'});
      if(sent)lastSafqaCheckoutKey=key;
    },
    safkaLead(orderCode,total,lines) {
      const code=String(orderCode||"").slice(0,90);
      if(!enabled||!/^[-A-Za-z0-9_]{5,90}$/.test(code)||!Array.isArray(lines)||!lines.length)return;
      const eventID='SafkaLead:'+code;
      if(sentOrderEvents.has(eventID))return;
      try{if(JSON.parse(sessionStorage.getItem('selectShopMetaOrders')||'[]').includes(eventID))return}catch{}
      const clean=lines.filter(x=>/^[a-f0-9]{24}$/i.test(String(x.productId)));
      if(!clean.length)return;
      const success=send('Lead',{content_type:'product',content_ids:clean.map(x=>'SS:'+x.productId),
        contents:clean.map(x=>({id:'SS:'+x.productId,quantity:Number(x.quantity)||1,
          item_price:Number(x.unitPrice)||0})),
        num_items:clean.reduce((v,x)=>v+(Number(x.quantity)||1),0),
        value:Number(total)||0,currency:'EGP',
        lead_type:'order_received_for_review'},eventID);
      if(success){
        sentOrderEvents.add(eventID);
        try{
          const prior=JSON.parse(sessionStorage.getItem('selectShopMetaOrders')||'[]');
          sessionStorage.setItem('selectShopMetaOrders',JSON.stringify([...new Set([...prior,eventID])].slice(-100)));
        }catch{}
      }
    },

    async finish(order, receipt = {}) {
      if (!enabled) return { queued: false, reason: 'pixel-not-configured' };
      const confirmed = receipt.saved === true && Boolean(receipt.orderId);
      const eventName = confirmed ? 'Purchase' : 'Lead';
      const orderId = String(confirmed ? receipt.orderId : order.orderId);
      if (!orderId || orderId === 'undefined') return { queued: false, reason: 'missing-order-id' };
      const eventID = `${eventName}:${orderId}`;
      if (sentOrderEvents.has(eventID)) return { queued: false, reason: 'duplicate', event: eventName };
      try {
        const previous = JSON.parse(sessionStorage.getItem('selectShopMetaOrders') || '[]');
        if (previous.includes(eventID)) return { queued: false, reason: 'duplicate', event: eventName };
      } catch {}
      sentOrderEvents.add(eventID); // Block simultaneous submits before asynchronous work.
      await Promise.race([sdkReady, pause(750)]);
      const queued = send(eventName, {
        ...orderData(order.items, order.totals.total),
        order_id: orderId
      }, eventID);
      if (!queued) {
        sentOrderEvents.delete(eventID);
        return { queued: false, reason: 'pixel-queue-failed', event: eventName };
      }
      try {
        const previous = JSON.parse(sessionStorage.getItem('selectShopMetaOrders') || '[]');
        sessionStorage.setItem('selectShopMetaOrders', JSON.stringify([...new Set([...previous, eventID])].slice(-100)));
      } catch {}
      await pause(350); // Best-effort network time before navigating to WhatsApp.
      return { queued: true, event: eventName };
    }
  };
})();
