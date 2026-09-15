import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const esc = v => String(v ?? "").replace(/[&<>\'\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c] || c));
const money = v => `$${Number(v || 0).toFixed(2)}`;
const form = document.querySelector("#checkoutForm");
const itemsBox = document.querySelector("#orderItems");
const totalBox = document.querySelector("#orderTotal");
const paySelect = document.querySelector("#paymentMethod");
const payDetails = document.querySelector("#paymentDetails");
const msg = document.querySelector("#formMessage");

let cart = [];
try { cart = JSON.parse(localStorage.getItem("demdz-cart") || "[]"); if (!Array.isArray(cart)) cart = []; } catch { cart = []; }

// وسائل الدفع الرسمية التي تظهر للزبون فقط: لا نقرأ paymentMethods من Firebase حتى لا تتكرر.
const payments = [
  { id:"baridimob", name:"BaridiMob", account:"00799999004232834408", instructions:"ادفع عبر BaridiMob باستخدام الرقم أعلاه، ثم احتفظ بإثبات الدفع." },
  { id:"binance", name:"Binance", account:"766875587", instructions:"ادفع عبر Binance باستخدام الـID أعلاه، ثم احتفظ بإثبات الدفع." },
  { id:"redotpay", name:"RedotPay", account:"1576815123", instructions:"ادفع عبر RedotPay باستخدام الـID أعلاه، ثم احتفظ بإثبات الدفع." },
  { id:"paypal", name:"PayPal", account:"الدفع عبر PayPal", instructions:"أكمل الدفع عبر PayPal، ثم احتفظ بإثبات الدفع." }
];

function renderOrder() {
  if (!cart.length) {
    const c = document.querySelector("#checkoutContent");
    if (c) c.innerHTML = '<section class="checkout-card empty"><h2>السلة فارغة 🛒</h2><p>أضف منتجًا أولًا ثم ارجع لإتمام الطلب.</p><a class="btn primary" href="products.html">تصفح المنتجات</a></section>';
    return;
  }
  if (itemsBox) itemsBox.innerHTML = cart.map(p => `<div class="order-line"><span>${esc(p.name)}</span><strong>${money(p.price)} × ${Number(p.quantity || 1)}</strong></div>`).join("");
  if (totalBox) totalBox.innerHTML = `<span>الإجمالي</span><strong>${money(cart.reduce((s,p) => s + Number(p.price || 0) * Number(p.quantity || 1), 0))}</strong>`;
}

function renderPayments() {
  if (!paySelect) return;
  paySelect.innerHTML = '<option value="">اختر وسيلة الدفع</option>' + payments.map(p => {
    let label = p.name;
    if (p.id === "baridimob") label += " — RIB: 00799999004232834408";
    if (p.id === "binance") label += " — ID: 766875587";
    if (p.id === "redotpay") label += " — ID: 1576815123";
    return `<option value="${p.id}">${label}</option>`;
  }).join("");
}

function paymentCopyText(p) {
  return `وسيلة الدفع: ${p.name}\nبيانات الدفع: ${p.account}`;
}

paySelect?.addEventListener("change", () => {
  const p = payments.find(x => x.id === paySelect.value);
  if (!p) { payDetails.hidden = true; payDetails.innerHTML = ""; return; }
  payDetails.hidden = false;
  payDetails.innerHTML = `<strong>💳 ${esc(p.name)}</strong><span class="payment-account">${esc(p.account)}</span><span class="payment-instructions">${esc(p.instructions)}</span><button type="button" id="copyPayment" class="btn primary" style="width:100%;margin-top:12px">📋 نسخ بيانات الدفع</button><small id="copyPaymentMsg" style="display:block;text-align:center;margin-top:8px;color:#86efac"></small>`;
  document.querySelector("#copyPayment")?.addEventListener("click", async () => {
    const text = paymentCopyText(p);
    try {
      await navigator.clipboard.writeText(text);
      const cm = document.querySelector("#copyPaymentMsg");
      if (cm) cm.textContent = "✅ تم نسخ بيانات الدفع. يمكنك الآن الدفع ثم إكمال الطلب.";
    } catch {
      window.prompt("انسخ بيانات الدفع:", text);
    }
  });
});

form?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!cart.length) return;

  const firstName = document.querySelector("#firstName")?.value.trim() || "";
  const lastName = document.querySelector("#lastName")?.value.trim() || "";
  const name = `${firstName} ${lastName}`.trim();
  const email = document.querySelector("#email").value.trim();
  const phone = document.querySelector("#phone").value.trim();
  const p = payments.find(x => x.id === paySelect.value);
  const total = cart.reduce((s,x) => s + Number(x.price || 0) * Number(x.quantity || 1), 0);

  if (!firstName || !lastName) { msg.textContent = "⚠️ اكتب الاسم واللقب."; return; }
  if (!p) { msg.textContent = "⚠️ اختر وسيلة الدفع أولًا."; return; }

  msg.textContent = "⏳ جارٍ تجهيز الطلب...";
  const orderItems = cart.map(x => ({ productId:String(x.id || ""), name:String(x.name || ""), price:Number(x.price || 0), quantity:Number(x.quantity || 1) }));
  const productSummary = orderItems.map(x => `${x.name} — ${money(x.price)} × ${x.quantity}`).join("\n");
  const paymentSummary = paymentCopyText(p);
  const localOrderId = `DEMDZ-${Date.now()}`;
  let orderId = localOrderId;
  let saved = false;

  try {
    const ref = await addDoc(collection(db,"orders"), { customerName:name, email, phone, paymentMethod:p.name, transactionId:"", proofUrl:"", items:orderItems, total, status:"pending", createdAt:serverTimestamp() });
    orderId = ref.id;
    saved = true;
  } catch (err) {
    console.warn("Order save failed; continuing with contact buttons", err);
  }

  localStorage.removeItem("demdz-cart");
  const message = `مرحبًا DIGITAL EMDZ 👋\nطلب جديد\nرقم الطلب: ${orderId}\nالاسم واللقب: ${name}\nالبريد: ${email}\nالهاتف: ${phone || "غير مذكور"}\n\nالمنتجات:\n${productSummary}\n\nالإجمالي: ${money(total)}\n${paymentSummary}\n\nقمت بالدفع وسأرسل لقطة شاشة لإثبات الدفع.`;
  const wa = `https://wa.me/213770913494?text=${encodeURIComponent(message)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=digitalemdz%40gmail.com&su=${encodeURIComponent(`إثبات دفع — ${orderId}`)}&body=${encodeURIComponent(message)}`;

  document.querySelector("#checkoutContent").style.display = "none";
  const success = document.querySelector("#success");
  success.style.display = "block";
  document.querySelector("#successText").innerHTML = `
    <div style="font-size:18px;line-height:2">
      <strong>رقم الطلب:</strong> ${esc(orderId)}<br>
      <strong>الاسم واللقب:</strong> ${esc(name)}<br>
      <strong>المنتج والسعر:</strong><br>${esc(productSummary).replace(/\n/g,"<br>")}<br>
      <strong>الإجمالي:</strong> ${money(total)}<br>
      <strong>وسيلة الدفع:</strong> ${esc(p.name)}<br>
      <strong>بيانات الدفع:</strong> ${esc(p.account)}
    </div>
    <div class="notice" style="margin-top:18px">📸 بعد الدفع، اضغط واتساب أو البريد وأرسل بيانات الطلب مع لقطة شاشة لإثبات الدفع.</div>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:18px">
      <a class="btn primary" target="_blank" rel="noopener" href="${wa}">💬 إرسال الطلب عبر واتساب</a>
      <a class="btn primary" target="_blank" rel="noopener" href="${gmail}">✉️ إرسال الطلب عبر البريد</a>
    </div>
    <br><small>${saved ? "✅ تم حفظ الطلب في لوحة الإدارة." : "⚠️ لم يتم حفظ الطلب في الإدارة، لكن رسالة واتساب والبريد جاهزتان."}</small>`;
  window.scrollTo({ top:0, behavior:"smooth" });
});

renderOrder();
renderPayments();