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
const proofInput = document.querySelector("#proofScreenshot");
let selectedProofFile = null;

let cart = [];
try { cart = JSON.parse(localStorage.getItem("demdz-cart") || "[]"); if (!Array.isArray(cart)) cart = []; } catch { cart = []; }

// وسائل الدفع الرسمية الظاهرة في صفحة الشراء فقط، لمنع التكرار.
const payments = [
  { id:"baridimob", name:"BaridiMob", account:"00799999004232834408", instructions:"ادفع عبر BaridiMob باستخدام الـRIB أعلاه، ثم احتفظ بإثبات الدفع." },
  { id:"binance", name:"Binance", account:"766875587", instructions:"ادفع عبر Binance باستخدام الـID أعلاه، ثم احتفظ بإثبات الدفع." },
  { id:"redotpay", name:"RedotPay", account:"1576815123", instructions:"ادفع عبر RedotPay باستخدام الـID أعلاه، ثم احتفظ بإثبات الدفع." },
  { id:"paypal", name:"PayPal", account:"sinanamin737@gmail.com", instructions:"ادفع إلى حساب PayPal: sinanamin737@gmail.com ثم احتفظ بإثبات الدفع." }
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
    if (p.id === "paypal") label += " — sinanamin737@gmail.com";
    return `<option value="${p.id}">${label}</option>`;
  }).join("");
}

function paymentCopyText(p) { return p.account; }

paySelect?.addEventListener("change", () => {
  const p = payments.find(x => x.id === paySelect.value);
  if (!p) { payDetails.hidden = true; payDetails.innerHTML = ""; return; }
  payDetails.hidden = false;
  payDetails.innerHTML = `<strong>💳 ${esc(p.name)}</strong><span class="payment-account">${esc(p.account)}</span><span class="payment-instructions">${esc(p.instructions)}</span><button type="button" id="copyPayment" class="btn primary" style="width:100%;margin-top:12px">📋 نسخ بيانات الدفع فقط</button><small id="copyPaymentMsg" style="display:block;text-align:center;margin-top:8px;color:#86efac"></small>`;
  document.querySelector("#copyPayment")?.addEventListener("click", async () => {
    const text = paymentCopyText(p);
    try {
      await navigator.clipboard.writeText(text);
      const cm = document.querySelector("#copyPaymentMsg");
      if (cm) cm.textContent = "✅ تم نسخ رقم/حساب الدفع فقط.";
    } catch { window.prompt("انسخ رقم/حساب الدفع فقط:", text); }
  });
});

proofInput?.addEventListener("change", () => {
  selectedProofFile = proofInput.files?.[0] || null;
  if (selectedProofFile && msg) msg.textContent = `📎 تم اختيار لقطة الشاشة: ${selectedProofFile.name}`;
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
  if (!selectedProofFile) { msg.textContent = "⚠️ أرفق لقطة شاشة لإثبات الدفع قبل إرسال الطلب."; proofInput?.focus(); return; }
  if (!selectedProofFile.type.startsWith("image/") || selectedProofFile.size > 5 * 1024 * 1024) { msg.textContent = "⚠️ اختر صورة فقط بحجم لا يتجاوز 5MB."; proofInput?.focus(); return; }

  msg.textContent = "⏳ جارٍ تجهيز الطلب...";
  const orderItems = cart.map(x => ({ productId:String(x.id || ""), name:String(x.name || ""), price:Number(x.price || 0), quantity:Number(x.quantity || 1) }));
  const productSummary = orderItems.map(x => `${x.name} — ${money(x.price)} × ${x.quantity}`).join("\n");
  const localOrderId = `DEMDZ-${Date.now()}`;
  let orderId = localOrderId;
  let saved = false;

  try {
    const ref = await addDoc(collection(db,"orders"), { customerName:name, email, phone, paymentMethod:p.name, transactionId:"", proofUrl:"", items:orderItems, total, status:"pending", createdAt:serverTimestamp() });
    orderId = ref.id;
    saved = true;
  } catch (err) { console.warn("Order save failed; continuing with contact buttons", err); }

  localStorage.removeItem("demdz-cart");
  const message = `مرحبًا DIGITAL EMDZ 👋\nطلب جديد\nرقم الطلب: ${orderId}\nاسم المستخدم: ${name}\nالبريد: ${email}\nالهاتف: ${phone || "غير مذكور"}\n\nالمنتج والسعر:\n${productSummary}\n\nالإجمالي: ${money(total)}\nوسيلة الدفع: ${p.name}\nبيانات الدفع: ${p.account}`;
  const wa = `https://wa.me/213770913494?text=${encodeURIComponent(message)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=digitalemdz%40gmail.com&su=${encodeURIComponent(`طلب جديد — ${orderId}`)}&body=${encodeURIComponent(message)}`;

  document.querySelector("#checkoutContent").style.display = "none";
  const success = document.querySelector("#success");
  success.style.display = "block";
  document.querySelector("#successText").innerHTML = `
    <div style="font-size:18px;line-height:2">
      <strong>رقم الطلب:</strong> ${esc(orderId)}<br>
      <strong>اسم المستخدم:</strong> ${esc(name)}<br>
      <strong>المنتج والسعر:</strong><br>${esc(productSummary).replace(/\n/g,"<br>")}<br>
      <strong>الإجمالي:</strong> ${money(total)}<br>
      <strong>وسيلة الدفع:</strong> ${esc(p.name)}<br>
      <strong>بيانات الدفع:</strong> ${esc(p.account)}
    </div>
    <div class="notice" style="margin-top:18px">📸 لقطة الشاشة جاهزة. اضغط «مشاركة إثبات الدفع» ثم اختر واتساب لإرسال الصورة مع بيانات الطلب.</div>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:18px">
      <button id="shareProof" class="btn primary" type="button">📸 مشاركة إثبات الدفع عبر واتساب</button>
      <a class="btn primary" target="_blank" rel="noopener" href="${wa}">💬 فتح واتساب بالطلب</a>
      <a class="btn primary" target="_blank" rel="noopener" href="${gmail}">✉️ فتح البريد بالطلب</a>
    </div>
    <p id="proofShareMsg" class="mini"></p>
    <small>${saved ? "✅ تم حفظ الطلب في لوحة الإدارة." : "⚠️ تعذر حفظ الطلب في الإدارة، لكن بيانات الطلب جاهزة للإرسال."}</small>`;

  document.querySelector("#shareProof")?.addEventListener("click", async () => {
    const shareMsg = document.querySelector("#proofShareMsg");
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files:[selectedProofFile] })) {
        await navigator.share({ title:`إثبات دفع ${orderId}`, text:message, files:[selectedProofFile] });
        if (shareMsg) shareMsg.textContent = "✅ اختر WhatsApp من نافذة المشاركة لإرسال الصورة مع الطلب.";
      } else {
        if (shareMsg) shareMsg.innerHTML = "⚠️ هذا المتصفح لا يسمح للموقع بإرفاق الصورة تلقائيًا داخل رابط WhatsApp. اضغط «فتح واتساب بالطلب» ثم أرفق نفس اللقطة من زر 📎 في WhatsApp.";
      }
    } catch (err) {
      if (shareMsg) shareMsg.textContent = "ℹ️ لم يتم إرسال الصورة. اختر WhatsApp من نافذة المشاركة أو أرفقها يدويًا من زر 📎.";
    }
  });

  window.scrollTo({ top:0, behavior:"smooth" });
});

renderOrder();
renderPayments();