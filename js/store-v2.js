import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const grid = document.querySelector("#productGrid");
const cats = document.querySelector("#categories");
const paymentsBox = document.querySelector("#paymentMethods");
const statusBox = document.querySelector("#productsStatus");

const fallback = [
  { id: "demo-1", name: "Premium Planner", description: "قالب رقمي منظم لإدارة المهام والأهداف.", price: 19.99, oldPrice: 29.99, category: "Planners" },
  { id: "demo-2", name: "Digital Business Bundle", description: "مجموعة قوالب رقمية جاهزة للمشاريع.", price: 24.99, oldPrice: 39.99, category: "Bundles" },
  { id: "demo-3", name: "Ebook — Smart Workflow", description: "دليل عملي لتحسين الإنتاجية والعمل الرقمي.", price: 14.99, oldPrice: 19.99, category: "Ebooks" }
];

let products = [...fallback];
let cart = JSON.parse(localStorage.getItem("demdz-cart") || "[]");

function esc(v) {
  return String(v ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
function money(v) { return `$${Number(v || 0).toFixed(2)}`; }
function updateStatus(text) { if (statusBox) statusBox.innerHTML = text; }
function updateCart() { const el = document.querySelector("#cartCount"); if (el) el.textContent = cart.length; }

function render(filter = "") {
  if (!grid) return;
  grid.innerHTML = "";
  const list = products.filter(p => !filter || p.category === filter);
  if (!list.length) {
    grid.innerHTML = '<div class="product-empty"><strong>لا توجد منتجات في هذا القسم حاليًا.</strong><span>جرّب تصنيفًا آخر.</span></div>';
    return;
  }
  list.forEach(p => {
    const discount = p.oldPrice && Number(p.oldPrice) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.oldPrice)) * 100) : 0;
    const visual = p.imageUrl
      ? `<img class="product-image" src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` + `<div class="image-placeholder fallback-image"><span>✦</span><small>DIGITAL EMDZ</small></div>`
      : `<div class="image-placeholder"><span>✦</span><small>DIGITAL EMDZ</small></div>`;
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `<div class="card-img">${visual}${discount ? `<span class="badge">-${discount}%</span>` : ""}</div><div class="card-body"><small class="category">${esc(p.category || "Digital")}</small><h3>${esc(p.name)}</h3><p>${esc(p.description || "")}</p><div class="price-row"><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>` : ""}</div><div class="card-actions"><button class="btn primary" data-buy="${p.id}">شراء الآن</button><button class="btn ghost" data-cart="${p.id}">أضف للسلة</button></div></div>`;
    grid.appendChild(el);
  });
}

function buildCategories() {
  if (!cats) return;
  cats.innerHTML = "";
  const all = document.createElement("button");
  all.className = "chip active";
  all.textContent = "الكل";
  all.onclick = () => { document.querySelectorAll(".chip").forEach(x => x.classList.remove("active")); all.classList.add("active"); render(); };
  cats.appendChild(all);
  [...new Set(products.map(p => p.category).filter(Boolean))].forEach(c => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = c;
    b.onclick = () => { document.querySelectorAll(".chip").forEach(x => x.classList.remove("active")); b.classList.add("active"); render(c); };
    cats.appendChild(b);
  });
}

if (grid) grid.addEventListener("click", e => {
  const b = e.target.closest("[data-cart],[data-buy]");
  if (!b) return;
  const p = products.find(x => x.id === b.dataset.cart || x.id === b.dataset.buy);
  if (!p) return;
  cart.push(p);
  localStorage.setItem("demdz-cart", JSON.stringify(cart));
  updateCart();
  document.querySelector("#cartPanel")?.classList.add("open");
  renderCart();
});

function renderCart() {
  const box = document.querySelector("#cartItems");
  if (!box) return;
  const total = cart.reduce((s, p) => s + Number(p.price || 0), 0);
  box.innerHTML = cart.length ? cart.map((p, i) => `<div class="cart-item"><span>${esc(p.name)}</span><strong>${money(p.price)}</strong><button data-remove="${i}">×</button></div>`).join("") + `<div class="cart-total">الإجمالي <strong>${money(total)}</strong></div>` : '<p class="muted">السلة فارغة.</p>';
}

const cartItems = document.querySelector("#cartItems");
if (cartItems) cartItems.addEventListener("click", e => {
  const b = e.target.closest("[data-remove]");
  if (!b) return;
  cart.splice(Number(b.dataset.remove), 1);
  localStorage.setItem("demdz-cart", JSON.stringify(cart));
  updateCart();
  renderCart();
});
document.querySelector("#cartBtn")?.addEventListener("click", () => { document.querySelector("#cartPanel")?.classList.toggle("open"); renderCart(); });
document.querySelector("#closeCart")?.addEventListener("click", () => document.querySelector("#cartPanel")?.classList.remove("open"));

function paymentIcon(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("binance")) return ["₿", "pay-binance"];
  if (n.includes("redot")) return ["R", "pay-redot"];
  if (n.includes("baridi")) return ["BD", "pay-baridi"];
  if (n.includes("paypal")) return ["P", "pay-paypal"];
  if (n.includes("cib")) return ["CIB", "pay-cib"];
  if (n.includes("ccp")) return ["CCP", "pay-ccp"];
  return [String(name || "P").slice(0, 3).toUpperCase(), ""];
}

function setContacts(d) {
  const wa = d.whatsapp || "+213770913494", email = d.email || "digitalemdz@gmail.com", digits = String(wa).replace(/\D/g, "");
  [document.querySelector("#topWhatsApp"), document.querySelector("#whatsappFloat"), document.querySelector("#contactWhatsApp")].forEach(a => { if (a) { a.href = `https://wa.me/${digits}`; a.target = "_blank"; a.rel = "noopener"; } });
  const wv = document.querySelector("#contactWhatsApp .contact-value"); if (wv) wv.textContent = wa;
  const te = document.querySelector("#topEmail"); if (te) { te.textContent = `✉️ ${email}`; te.href = `mailto:${email}`; }
  const ev = document.querySelector("#contactEmail .contact-value"); if (ev) ev.textContent = email;
  const el = document.querySelector("#contactEmail"); if (el) el.href = `mailto:${email}`;
}
function scrollToHash() { const hash = location.hash; if (!hash) return; const target = document.querySelector(hash); if (!target) return; requestAnimationFrame(() => requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }))); }

async function load() {
  // Show products immediately. Firestore is used to replace the demo products when real active products are available.
  buildCategories();
  render();
  updateStatus(`🛍️ <strong>${products.length} منتجات جاهزة للعرض</strong>`);
  scrollToHash();

  try {
    const snap = await getDocs(query(collection(db, "products"), where("active", "==", true)));
    const realProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (realProducts.length) {
      products = realProducts;
      buildCategories();
      render();
      updateStatus(`✅ <strong>${products.length} منتج مفعّل ظاهر الآن</strong>`);
    } else {
      updateStatus(`🛍️ <strong>${products.length} منتجات جاهزة للعرض</strong> — أضف منتجاتك من لوحة الإدارة وستظهر تلقائيًا.`);
    }
  } catch (e) {
    console.error("Products load:", e);
    updateStatus(`🛍️ <strong>${products.length} منتجات جاهزة للعرض</strong> — تعذر الاتصال بقاعدة المنتجات حاليًا.`);
  }

  try {
    const s = await getDoc(doc(db, "settings", "store"));
    if (s.exists()) {
      const d = s.data();
      setContacts(d);
      if (d.heroTitle) { const h = document.querySelector(".hero h1"); if (h) h.innerHTML = esc(d.heroTitle).replace(/\n/g, "<br>"); }
      if (d.heroDescription) { const h = document.querySelector(".hero-copy"); if (h) h.textContent = d.heroDescription; }
      if (d.contactTitle) { const h = document.querySelector("#contactTitle"); if (h) h.textContent = d.contactTitle; }
      if (d.logoText) document.querySelectorAll(".logo").forEach(x => x.innerHTML = esc(d.logoText).replace(/\s+/g, " "));
    }
  } catch (e) { console.error("Settings load:", e); }

  try {
    if (paymentsBox) {
      const snap = await getDocs(query(collection(db, "paymentMethods"), where("enabled", "==", true)));
      paymentsBox.innerHTML = "";
      snap.forEach(d => {
        const p = d.data(), [icon, cls] = paymentIcon(p.name), el = document.createElement("div");
        el.className = "payment-public";
        el.innerHTML = `${p.iconData ? `<img class="payment-thumb" src="${esc(p.iconData)}" alt="${esc(p.name)}">` : `<div class="pay-icon ${cls}">${esc(icon)}</div>`}<div><strong>${esc(p.name)}</strong>${p.account ? `<span class="ltr">${esc(p.account)}</span>` : ""}${p.instructions ? `<small>${esc(p.instructions)}</small>` : ""}</div>`;
        paymentsBox.appendChild(el);
      });
      if (!paymentsBox.children.length) paymentsBox.innerHTML = '<p class="muted">لا توجد وسائل دفع مفعلة حاليًا. يمكنك إضافتها من لوحة الإدارة.</p>';
    }
  } catch (e) { console.error("Payments load:", e); if (paymentsBox) paymentsBox.innerHTML = '<p class="muted">تعذر تحميل وسائل الدفع. يمكنك إدارتها من لوحة الإدارة.</p>'; }
  scrollToHash();
}

updateCart();
load();
window.addEventListener("hashchange", () => setTimeout(scrollToHash, 50));