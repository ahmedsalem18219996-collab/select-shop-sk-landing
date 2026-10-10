/* SELECT SHOP Foundation v1: sourced product catalog, no live order side effects */
const PRODUCTS = Object.freeze({
  sk: {
    id: "sk", name: "SK Sneakers", short: "SK", price: 680, badge: "الأكثر طلبًا",
    headline: "راحة تحسيها.<br><em>ستايل يبان.</em>",
    description: "سنيكر خفيف بخامة Mesh مهوّاة ونعل EVA مرن للمشي، الشغل، الخروج والجيم.",
    hero: "assets/sk-1.jpg", sizeSummary: "37–41",
    features: [
      { title: "Mesh مهوّاة", copy: "خامة خفيفة تساعد القدم تتنفس وتفضل مرتاحة طول اليوم." },
      { title: "نعل EVA ممتص للصدمات", copy: "مرن وخفيف جداً لخطوة مريحة بدون إجهاد." },
      { title: "لكل المشاوير", copy: "مثالي للمشي والشغل والجامعة والجيم." },
      { title: "طلب مطمّن 100%", copy: "معاينة وتجربة مع المندوب والدفع عند الاستلام." }
    ],
    variants: [
      { id: "sk1", code: "SK-1", name: "أبيض × وردي", image: "assets/sk-1.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "sk2", code: "SK-2", name: "أسود × أزرق", image: "assets/sk-2.jpg", sizes: [37, 38, 39, 40, 41] }
    ]
  },
  alex: {
    id: "alex", name: "ALEX Premium", short: "ALEX", price: 540, badge: "ستايل فاخر",
    headline: "تفاصيل فخمة.<br><em>خطوة واثقة.</em>",
    description: "تصميم جلدي بلمسة عصرية، تبطين داخلي ونعل خفيف ومتين للاستخدام اليومي الراقي.",
    hero: "assets/alex01.jpg", sizeSummary: "37–46*",
    features: [
      { title: "خامة جلد فاخرة", copy: "تشطيب نظيف ولمسة أنيقة تدوم وتتحمل." },
      { title: "تبطين داخلي مريح", copy: "راحة فائقة مع اللبس اليومي لساعات طويلة." },
      { title: "5 اختيارات لونية", copy: "ألوان كلاسيكية واضحة وسهلة التنسيق مع كل لبسك." },
      { title: "مقاس حسب اللون", copy: "ALEX04 يبدأ من 42؛ باقي الألوان من 37 حتى 46." }
    ],
    variants: [
      { id: "alex01", code: "ALEX01", name: "أسود كامل", image: "assets/alex01.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
      { id: "alex02", code: "ALEX02", name: "أبيض كامل", image: "assets/alex02.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
      { id: "alex03", code: "ALEX03", name: "أسود بنعل أبيض", image: "assets/alex03.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] },
      { id: "alex04", code: "ALEX04", name: "أبيض بظهر أسود", image: "assets/alex04.jpg", sizes: [42, 43, 44, 45, 46] },
      { id: "alex05", code: "ALEX05", name: "أبيض بلسان أسود", image: "assets/alex05.jpg", sizes: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46] }
    ]
  },
  eqwal: {
    id: "eqwal", name: "EQWAL Street", short: "EQWAL", price: 580, badge: "كاجوال يومي",
    headline: "كاجوال نظيف.<br><em>سهل يتلبس.</em>",
    description: "تصميم كاجوال Street بألوان هادئة وسهلة التنسيق، مناسب للخروج والاستخدام اليومي.",
    hero: "assets/eqwal03.jpg", sizeSummary: "37–45*",
    features: [
      { title: "ستايل ستريت كاجوال", copy: "شكل تريندي وشيك يليق على الجينز واللبس الكاجوال." },
      { title: "4 توليفات ألوان", copy: "اختيارات لونية مميزة وتفاصيل شمواه أنيقة." },
      { title: "مقاس حسب الموديل", copy: "EQWAL03: مقاسات 37–41، وباقي الموديلات 41–45." },
      { title: "شحن التجربة مجاني", copy: "جرّبي موديل إضافي من غير أي شحن زيادة، ولو احتفظتي بزوج إضافي يظهر لك الخصم كنسبة مئوية قبل التأكيد." }
    ],
    variants: [
      { id: "eqwal03", code: "EQWAL03", name: "أبيض × بيج", image: "assets/eqwal03.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "eqwal04", code: "EQWAL04", name: "أبيض بنعل أسود", image: "assets/eqwal04.jpg", sizes: [41, 42, 43, 44, 45] },
      { id: "eqwal05", code: "EQWAL05", name: "أبيض × رمادي بنعل رمادي", image: "assets/eqwal05.jpg", sizes: [41, 42, 43, 44, 45] },
      { id: "eqwal07", code: "EQWAL07", name: "أبيض × بيج بنعل بيج", image: "assets/eqwal07.jpg", sizes: [41, 42, 43, 44, 45] }
    ]
  },
  wk: {
    id: "wk", name: "WK Retro", short: "WK", price: 630, badge: "8 اختيارات",
    headline: "ثمانية اختيارات.<br><em>ستايلك أنتِ.</em>",
    description: "مجموعة سنيكرز يومية بطابع Retro ورياضي جذاب، بتفاصيل لونية ونعل Gum كلاسيكي، مقاسات 37–41.",
    hero: "assets/wk_1.jpg", sizeSummary: "37–41",
    features: [
      { title: "8 تصميمات ريترو", copy: "بدّلي بين 8 اختيارات مستوحاة من أشهر الموديلات الكلاسيكية." },
      { title: "نعل Gum أصيل", copy: "ثبات عالي ولمسة كلاسيكية مميزة جداً." },
      { title: "مقاسات 37–41", copy: "كل اختيارات WK متوفرة بنفس المقاسات الحقيقية." },
      { title: "شحن التجربة مجاني", copy: "جرّبي موديل إضافي من غير أي شحن زيادة، ولو احتفظتي بزوج إضافي يظهر لك الخصم كنسبة مئوية قبل التأكيد." }
    ],
    variants: [
      { id: "wk1", code: "WK-1", name: "بوما أبيض كلاسيك", image: "assets/wk_1.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk2", code: "WK-2", name: "بوما أبيض × أسود شمواه", image: "assets/wk_2.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk3", code: "WK-3", name: "توين سترايب أسود", image: "assets/wk_3.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk4", code: "WK-4", name: "توين سترايب أبيض كامل", image: "assets/wk_4.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk5", code: "WK-5", name: "سامبا خطوط نبيتي", image: "assets/wk_5.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk6", code: "WK-6", name: "سامبا خطوط أسود", image: "assets/wk_6.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk7", code: "WK-7", name: "نيو بالانس حرف N أسود", image: "assets/wk_7.jpg", sizes: [37, 38, 39, 40, 41] },
      { id: "wk8", code: "WK-8", name: "نيو بالانس حرف N نبيتي", image: "assets/wk_8.jpg", sizes: [37, 38, 39, 40, 41] }
    ]
  }
});



/* Separately sourced from the current /product/carwash48/ public landing;
   shipping included in Cairo/Giza, other regions must be confirmed. */
const CAR_CARE = Object.freeze({
 id:"carwash48",name:"مسدس غسيل سيارات لاسلكي",short:"CAR WASH 48V",price:999,
 category:"car",badge:"للعربية والبيت",description:"مسدس غسيل لاسلكي ببطاريتين، يشتغل من جردل مياه. السعر يشمل التوصيل للقاهرة والجيزة فقط.",
 hero:"assets/carwash48-real-kit.webp",sizeSummary:"بدون مقاسات",
 features:[{title:"بطاريتين",copy:"للاستخدام بدون كابل أثناء الغسيل"},{title:"مصدر مياه مرن",copy:"يعمل بسحب المياه من جردل"},{title:"توصيل القاهرة والجيزة",copy:"السعر المعلن ٩٩٩ جنيه شامل الشحن بالقاهرة والجيزة"}],
 variants:[{id:"carwash48",code:"CW48",name:"الطقم ببطاريتين",image:"assets/carwash48-real-kit.webp",sizes:[]}]
});
window.SELECT_FOUNDATION_CATALOG=Object.freeze({...PRODUCTS,carwash48:CAR_CARE});
window.SELECT_FOUNDATION_CONFIG=Object.freeze({SHOE_EXTRA_DISCOUNT:80,CAR_INCLUDED_REGIONS:["القاهرة","الجيزة"],PREVIEW:true,SOURCE:"V20 catalog + /product/carwash48/"});
