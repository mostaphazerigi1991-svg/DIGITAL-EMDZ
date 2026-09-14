import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const grid = document.querySelector("#productGrid");
const cats = document.querySelector("#categories");
const paymentsBox = document.querySelector("#paymentMethods");
const contactWhatsApp = document.querySelector("#contactWhatsApp");
const contactEmail = document.querySelector("#contactEmail");
let products = [];
let cart = JSON.parse(localStorage.getItem("demdz-cart") || "[]");

const fallback = [
 {id:"demo-1",name:"Premium Planner",description:"قالب رقمي منظم لإدارة المهام والأهداف.",price:19.99,oldPrice:29.99,category:"Planners"},
 {id:"demo-2",name:"Digital Business Bundle",description:"مجموعة قوالب رقمية جاهزة للمشاريع.",price:24.99,oldPrice:39.99,category:"Bundles"},
 {id:"demo-3",name:"Ebook — Smart Workflow",description:"دليل عملي لتحسين الإنتاجية والعمل الرقمي.",price:14.99,category:"Ebooks"}
];

function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function money(v){return `$${Number(v||0).toFixed(2)}`;}
function updateCart(){document.querySelector("#cartCount").textContent=cart.length;}

function render(filter=""){
 grid.innerHTML="";
 const list=products.filter(p=>!filter||p.category===filter);
 if(!list.length){grid.innerHTML='<div class="empty glass">لا توجد منتجات في هذا القسم حاليًا.</div>';return;}
 list.forEach(p=>{
  const discount=p.oldPrice&&Number(p.oldPrice)>Number(p.price)?Math.round((1-Number(p.price)/Number(p.oldPrice))*100):0;
  const visual=p.imageUrl?`<img class="product-image" src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy">`:`<div class="image-placeholder"><span>✦</span><small>DIGITAL EMDZ</small></div>`;
  const el=document.createElement("article");el.className="card";
  el.innerHTML=`<div class="card-img">${visual}${discount?`<span class="badge">-${discount}%</span>`:""}</div><div class="card-body"><small class="category">${esc(p.category||"Digital")}</small><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="price-row"><span class="price">${money(p.price)}</span>${p.oldPrice?`<span class="old">${money(p.oldPrice)}</span>`:""}</div><div class="card-actions"><button class="btn primary" data-buy="${p.id}">شراء الآن</button><button class="btn ghost" data-cart="${p.id}">أضف للسلة</button></div></div>`;
  grid.appendChild(el);
 });
}

function buildCategories(){cats.innerHTML="";const all=document.createElement("button");all.className="chip active";all.textContent="الكل";all.onclick=()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));all.classList.add("active");render()};cats.appendChild(all);[...new Set(products.map(p=>p.category).filter(Boolean))].forEach(c=>{const b=document.createElement("button");b.className="chip";b.textContent=c;b.onclick=()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");render(c)};cats.appendChild(b)});}

grid.addEventListener("click",e=>{const b=e.target.closest("[data-cart],[data-buy]");if(!b)return;const p=products.find(x=>x.id===b.dataset.cart||x.id===b.dataset.buy);if(!p)return;cart.push(p);localStorage.setItem("demdz-cart",JSON.stringify(cart));updateCart();document.querySelector("#cartPanel").classList.add("open");renderCart();});
function renderCart(){const box=document.querySelector("#cartItems");const total=cart.reduce((s,p)=>s+Number(p.price||0),0);box.innerHTML=cart.length?cart.map((p,i)=>`<div class="cart-item"><span>${esc(p.name)}</span><strong>${money(p.price)}</strong><button data-remove="${i}">×</button></div>`).join("")+`<div class="cart-total">الإجمالي <strong>${money(total)}</strong></div>`:'<p class="muted">السلة فارغة.</p>';}
document.querySelector("#cartItems").addEventListener("click",e=>{const b=e.target.closest("[data-remove]");if(!b)return;cart.splice(Number(b.dataset.remove),1);localStorage.setItem("demdz-cart",JSON.stringify(cart));updateCart();renderCart();});
document.querySelector("#cartBtn").onclick=()=>{document.querySelector("#cartPanel").classList.toggle("open");renderCart()};
document.querySelector("#closeCart").onclick=()=>document.querySelector("#cartPanel").classList.remove("open");

async function load(){
 try{const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));products=snap.docs.map(d=>({id:d.id,...d.data()}));}catch(e){console.error(e);}
 if(!products.length)products=fallback;
 buildCategories();render();
 try{const s=await getDoc(doc(db,"settings","store"));if(s.exists()){const d=s.data();if(d.whatsapp)contactWhatsApp.textContent=d.whatsapp,contactWhatsApp.href=`https://wa.me/${String(d.whatsapp).replace(/\D/g,"")}`;if(d.email)contactEmail.textContent=d.email,contactEmail.href=`mailto:${d.email}`;}}catch(e){console.error(e)}
 try{const snap=await getDocs(query(collection(db,"paymentMethods"),where("enabled","==",true)));paymentsBox.innerHTML="";snap.forEach(d=>{const p=d.data();const el=document.createElement("div");el.className="payment-public";el.innerHTML=`<div class="pay-icon">${esc((p.name||"P").slice(0,1))}</div><div><strong>${esc(p.name)}</strong>${p.account?`<span class="ltr">${esc(p.account)}</span>`:""}${p.instructions?`<small>${esc(p.instructions)}</small>`:""}</div>`;paymentsBox.appendChild(el)});if(!paymentsBox.children.length)paymentsBox.innerHTML='<p class="muted">لا توجد وسائل دفع مفعلة حاليًا.</p>';}catch(e){console.error(e);paymentsBox.innerHTML='<p class="muted">تعذر تحميل وسائل الدفع.</p>';}
}
updateCart();load();