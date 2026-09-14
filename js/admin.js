import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const productForm = document.querySelector("#productForm");
const productMessage = document.querySelector("#productMessage");
const productsList = document.querySelector("#productsList");
const payments = document.querySelector("#payments");
const settingsForm = document.querySelector("#settingsForm");
const settingsMessage = document.querySelector("#settingsMessage");

async function isAdmin(user) {
  if (!user) return false;
  const snap = await getDoc(doc(db, "admins", user.uid));
  return snap.exists();
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginMessage.textContent = "جارٍ تسجيل الدخول...";
  try {
    const credential = await signInWithEmailAndPassword(auth, loginForm.loginEmail.value, loginForm.loginPassword.value);
    if (!(await isAdmin(credential.user))) {
      await signOut(auth);
      throw new Error("هذا الحساب ليس لديه صلاحية إدارة المتجر.");
    }
    loginMessage.textContent = "تم الدخول بنجاح ✅";
  } catch (error) {
    loginMessage.textContent = error.message || "تعذر تسجيل الدخول.";
  }
});

document.querySelector("#logoutBtn").onclick = () => signOut(auth);

onAuthStateChanged(auth, async user => {
  if (!user) {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    return;
  }
  if (!(await isAdmin(user))) {
    await signOut(auth);
    return;
  }
  loginPanel.hidden = true;
  dashboard.hidden = false;
  document.querySelector("#adminEmail").textContent = user.email;
  await Promise.all([loadProducts(), loadPayments(), loadSettings()]);
});

productForm.addEventListener("submit", async e => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!(await isAdmin(user))) return;
  const data = new FormData(productForm);
  const price = Number(data.get("price"));
  const oldPrice = data.get("oldPrice") ? Number(data.get("oldPrice")) : null;
  try {
    await addDoc(collection(db, "products"), {
      name: data.get("name").trim(),
      description: data.get("description").trim(),
      price,
      oldPrice,
      category: data.get("category"),
      imageUrl: data.get("imageUrl").trim(),
      active: true,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });
    productForm.reset();
    productMessage.textContent = "تم حفظ المنتج في Firestore ✅";
    await loadProducts();
  } catch (error) {
    console.error(error);
    productMessage.textContent = "حدث خطأ أثناء حفظ المنتج.";
  }
});

async function loadProducts() {
  productsList.innerHTML = "جارٍ التحميل...";
  const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
  if (snap.empty) { productsList.innerHTML = "لا توجد منتجات محفوظة بعد."; return; }
  productsList.innerHTML = "";
  snap.forEach(d => {
    const p = d.data();
    const row = document.createElement("div");
    row.className = "payment";
    row.innerHTML = `<strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.category || "")} — $${Number(p.price || 0).toFixed(2)} — ${p.active ? "ظاهر" : "مخفي"}</small><br><button class="btn ghost" data-toggle="${d.id}">${p.active ? "إخفاء" : "إظهار"}</button> <button class="btn ghost" data-delete="${d.id}">حذف</button>`;
    productsList.appendChild(row);
  });
}

productsList.addEventListener("click", async e => {
  const toggle = e.target.closest("[data-toggle]");
  const del = e.target.closest("[data-delete]");
  if (toggle) {
    const id = toggle.dataset.toggle;
    const current = await getDoc(doc(db, "products", id));
    await updateDoc(doc(db, "products", id), { active: !(current.data()?.active) });
    loadProducts();
  }
  if (del && confirm("هل تريد حذف هذا المنتج؟")) {
    await deleteDoc(doc(db, "products", del.dataset.delete));
    loadProducts();
  }
});

async function loadPayments() {
  payments.innerHTML = "";
  const snap = await getDocs(collection(db, "paymentMethods"));
  if (snap.empty) {
    for (const name of ["BaridiMob", "CCP", "CIB", "Binance", "RedotPay", "PayPal"]) {
      await addDoc(collection(db, "paymentMethods"), { name, enabled: true, createdAt: serverTimestamp() });
    }
    return loadPayments();
  }
  snap.forEach(d => {
    const p = d.data();
    const row = document.createElement("div"); row.className = "payment";
    row.innerHTML = `<strong>${escapeHtml(p.name)}</strong> — ${p.enabled ? "مفعلة" : "معطلة"} <button class="btn ghost" data-pay-toggle="${d.id}">${p.enabled ? "تعطيل" : "تفعيل"}</button> <button class="btn ghost" data-pay-delete="${d.id}">حذف</button>`;
    payments.appendChild(row);
  });
}

document.querySelector("#addPayment").onclick = async () => {
  const name = prompt("اسم وسيلة الدفع:");
  if (!name?.trim()) return;
  await addDoc(collection(db, "paymentMethods"), { name: name.trim(), enabled: true, createdAt: serverTimestamp() });
  loadPayments();
};

payments.addEventListener("click", async e => {
  const t = e.target.closest("[data-pay-toggle]");
  const d = e.target.closest("[data-pay-delete]");
  if (t) {
    const ref = doc(db, "paymentMethods", t.dataset.payToggle); const snap = await getDoc(ref);
    await updateDoc(ref, { enabled: !(snap.data()?.enabled) }); loadPayments();
  }
  if (d && confirm("هل تريد حذف وسيلة الدفع؟")) { await deleteDoc(doc(db, "paymentMethods", d.dataset.payDelete)); loadPayments(); }
});

settingsForm.addEventListener("submit", async e => {
  e.preventDefault();
  const data = new FormData(settingsForm);
  await setDoc(doc(db, "settings", "store"), { storeName: data.get("storeName"), whatsapp: data.get("whatsapp"), email: data.get("email"), currency: "USD", updatedAt: serverTimestamp() }, { merge: true });
  settingsMessage.textContent = "تم حفظ إعدادات المتجر ✅";
});

async function loadSettings() {
  const snap = await getDoc(doc(db, "settings", "store"));
  if (!snap.exists()) return;
  const s = snap.data();
  settingsForm.storeName.value = s.storeName || "DIGITAL EMDZ";
  settingsForm.whatsapp.value = s.whatsapp || "+213770913494";
  settingsForm.email.value = s.email || "digitalemdz@gmail.com";
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
