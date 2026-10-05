// ===== SELECT SHOP CONFIG =====
// اكتب رقم واتساب بصيغة دولية بدون + أو مسافات، مثال مصر: 2010XXXXXXXX
const WHATSAPP_NUMBER = "";
// ضع Meta Pixel ID هنا لاحقًا إن رغبت.
const META_PIXEL_ID = "";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const heroImage = $("#heroImage");
const floatingPill = $(".floating-pill");
const toast = $("#toast");

function selectProduct(image, label, colorCode) {
  heroImage.src = image;
  floatingPill.textContent = label;
  $$(".thumb").forEach(btn => btn.classList.toggle("active", btn.dataset.image === image));
  $$(".color-card").forEach(card => card.classList.toggle("selected", card.dataset.color === colorCode));
  const radio = $(`input[name="color"][value^="${colorCode}"]`);
  if (radio) radio.checked = true;
}

$$(".thumb").forEach(btn => btn.addEventListener("click", () => {
  const code = btn.dataset.image.includes("sk-2") ? "SK-2" : "SK-1";
  selectProduct(btn.dataset.image, btn.dataset.label, code);
}));

$$(".color-card").forEach(card => card.addEventListener("click", () => {
  const code = card.dataset.color;
  const label = code === "SK-1" ? "SK-1 • أبيض × وردي" : "SK-2 • أسود × أزرق";
  selectProduct(card.dataset.image, label, code);
}));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function cleanPhone(value) { return value.replace(/[^0-9]/g, ""); }
function validEgyptPhone(value) {
  const p = cleanPhone(value);
  return /^01[0125][0-9]{8}$/.test(p) || /^201[0125][0-9]{8}$/.test(p);
}

function track(eventName, params = {}) {
  if (typeof window.fbq === "function") window.fbq("track", eventName, params);
}

$("#orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = $("#formError");
  error.classList.remove("show");

  const name = $("#name").value.trim();
  const phone = $("#phone").value.trim();
  const governorate = $("#governorate").value;
  const size = $("#size").value;
  const color = $("input[name='color']:checked")?.value || "";
  const address = $("#address").value.trim();

  if (!name || !phone || !governorate || !size || !address) {
    error.textContent = "كمّلي كل بيانات الطلب الأول.";
    error.classList.add("show");
    return;
  }
  if (!validEgyptPhone(phone)) {
    error.textContent = "رقم الموبايل مش واضح. اكتبيه 11 رقم ويبدأ بـ 01.";
    error.classList.add("show");
    return;
  }

  const message = [
    "طلب جديد من Landing Page - SELECT SHOP",
    "",
    `المنتج: SK Sneakers`,
    `السعر: 680 جنيه شامل الشحن`,
    `الاسم: ${name}`,
    `الموبايل: ${phone}`,
    `المحافظة: ${governorate}`,
    `العنوان: ${address}`,
    `اللون: ${color}`,
    `المقاس: ${size}`,
    "",
    "الدفع عند الاستلام - معاينة عند الاستلام"
  ].join("\n");

  track("InitiateCheckout", { content_name: "SK Sneakers", value: 680, currency: "EGP" });

  if (WHATSAPP_NUMBER) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
    return;
  }

  try {
    await navigator.clipboard.writeText(message);
    showToast("بيانات الطلب اتنسخت. ضيف رقم واتساب في script.js لتفعيل الإرسال المباشر.");
  } catch {
    showToast("ضيف رقم واتساب في script.js لتفعيل إرسال الطلب.");
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

// Meta Pixel loader — does nothing until META_PIXEL_ID is set.
if (META_PIXEL_ID) {
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');
}
