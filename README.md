# SELECT SHOP — SK Sneakers Landing Page

صفحة Landing Page عربية RTL، Mobile-first، جاهزة لـ GitHub Pages.

## بيانات المنتج الحالية
- السعر: **680 جنيه شامل الشحن لجميع المحافظات**
- الألوان: SK-1 أبيض × وردي / SK-2 أسود × أزرق
- المقاسات: 37–41
- خامة Mesh + نعل EVA
- معاينة عند الاستلام + الدفع عند الاستلام

## قبل النشر
1. استبدل `assets/sk-1.jpg` و `assets/sk-2.jpg` بصور المنتج الأصلية بنفس الأسماء.
2. افتح `script.js` وضع رقم واتساب في `WHATSAPP_NUMBER` بصيغة دولية بدون `+`.
3. اختياري: ضع Meta Pixel ID في `META_PIXEL_ID`.

## GitHub Pages
المشروع يحتوي Workflow للنشر من GitHub Actions. بعد رفعه إلى Repository:
- Settings → Pages
- Source: GitHub Actions
- شغّل workflow أو اعمل push إلى `main`.

## ملاحظة تقنية
GitHub Pages static hosting ولا يخزن بيانات الطلبات. الفورم يبني رسالة WhatsApp كاملة ويرسلها عند وضع رقم واتساب.
