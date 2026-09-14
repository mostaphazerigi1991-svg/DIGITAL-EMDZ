import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const grid = document.querySelector("#productGrid");
const cats = document.querySelector("#categories");
const langBtn = document.querySelector("#langBtn");
const cartBtn = document.querySelector("#cartBtn");
let cart = JSON.parse(localStorage.getItem("demdz-cart") || "[]");
let products = [];

const fallbackProducts = [
  { name: "Premium Planner", description: "قالب منظم لإدارة المهام والأهداف.", price: 19.99, oldPrice: 29.99, category: "Planners" },
  { name: "Digital Business Bundle", description: "مجموعة قوالب رقمية جاهزة للمشاريع.", price: 24.99, oldPrice: 39.99, category: "Bundles" },
  { name: "Ebook — Smart Workflow", description: "دليل عملي لتحسين الإنتاجية والعمل الرقمي.", price: 14.99, category: "Ebooks" }
];

function money(value) { return `$${Number(value || 0).toFixed(2)}`; }

function render(filter = "") {
  grid.innerHTML = "";
  const list = products.filter(p => !filter || p.category === filter);
  if (!list.length) {
    grid.innerHTML = '<div class="panel glass"><p>لا توجد منتجات في هذا القسم حاليًا.</p></div>';
    return;
  }
  list.forEach((p) => {
    const el = document.createElement("article");
    el.className = "card";
    const image = p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}">` : "";
    const discount = p.oldPrice && Number(p.oldPrice) > Number(p.price) ? Math.round((1 - Number(p.price) / Number(p.oldPrice)) * 100) : 0;
    el.innerHTML = `<div class="card-img">${image}${discount ? `<span class="badge">-${discount}%</span>` : ""}</div>
      <div class="card-body"><small>${escapeHtml(p.category || "Digital")}</small><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description || "")}</p>
      <div><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>` : ""}</div>
      <div class="card-actions"><button class="btn primary" data-buy="${p.id || ""}">شراء الآن</button><button class="btn ghost" data-cart="${p.id || ""}">أضف للسلة</button></div></div>`;
    grid.appendChild(el);
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function buildCategories() {
  cats.innerHTML = "";
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const all = document.createElement("button");
  all.className = "chip";
  all.textContent = "الكل";
  all.onclick = () => render();
  cats.appendChild(all);
  categories.forEach(c => {
    const x = document.createElement("button");
    x.className = "chip";
    x.textContent = c;
    x.onclick = () => render(c);
    cats.appendChild(x);
  });
}

grid.addEventListener("click", e => {
  const cartButton = e.target.closest("[data-cart]");
  const buyButton = e.target.closest("[data-buy]");
  const id = cartButton?.dataset.cart || buyButton?.dataset.buy;
  if (!id) return;
  const product = products.find(p => p.id === id);
  if (!product) return;
  if (cartButton) {
    cart.push(product);
    localStorage.setItem("demdz-cart", JSON.stringify(cart));
    updateCart();
    alert("تمت إضافة المنتج إلى السلة ✅");
  } else {
    cart.push(product);
    localStorage.setItem("demdz-cart", JSON.stringify(cart));
    updateCart();
    alert("تمت إضافة المنتج إلى السلة. يمكنك إكمال الطلب من السلة.");
  }
});

function updateCart() { document.querySelector("#cartCount").textContent = cart.length; }

document.querySelector("#year").textContent = new Date().getFullYear();
updateCart();

async function loadProducts() {
  try {
    const snap = await getDocs(query(collection(db, "products"), where("active", "==", true)));
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!products.length) products = fallbackProducts.map((p, i) => ({ ...p, id: `demo-${i}` }));
  } catch (error) {
    console.error("Firestore products error", error);
    products = fallbackProducts.map((p, i) => ({ ...p, id: `demo-${i}` }));
  }
  buildCategories();
  render();
}

langBtn.onclick = () => alert("واجهة English سيتم تفعيلها في المرحلة التالية.");
cartBtn.onclick = () => alert(`عدد المنتجات في السلة: ${cart.length}`);
loadProducts();
