const DEFAULTS=["تصميم منتج رقمي","تعديل قالب","تصميم Canva","إنشاء متجر إلكتروني","كتاب إلكتروني / PDF","خدمة مخصصة أخرى"],LOCAL="digitalemdz_services",BLOCKED="digitalemdz_blocked_services";
const form=document.querySelector("#serviceForm");
const select=form?.querySelector('select[name="service"]');
const read=(key)=>{try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value.filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim()):[]}catch{return[]}};
const unique=(items)=>[...new Set(items.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))];
const setOptions=(names)=>{if(!select)return;select.innerHTML='<option value="">اختر نوع الخدمة</option>'+unique(names).map(name=>{const e=name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");return `<option value="${e}">${e}</option>`}).join("");};

// Always show the built-in services immediately, even if Firebase is unavailable.
const localCustom=read(LOCAL),localBlocked=new Set(read(BLOCKED));
setOptions(unique([...DEFAULTS,...localCustom]).filter(x=>!localBlocked.has(x)));

async function loadRemoteServices(){
  try{
    const [{getApps,getApp,initializeApp},{getFirestore,doc,getDoc},{firebaseConfig}]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"),
      import("../firebase-config.js")
    ]);
    const app=getApps().length?getApp():initializeApp(firebaseConfig),db=getFirestore(app);
    const snap=await getDoc(doc(db,"settings","store"));
    const data=snap.exists()?snap.data():{};
    const custom=unique([...(Array.isArray(data.services)?data.services:[]),...read(LOCAL)]);
    const blocked=new Set(unique([...(Array.isArray(data.blockedServices)?data.blockedServices:[]),...read(BLOCKED)]));
    try{localStorage.setItem(LOCAL,JSON.stringify(custom.filter(x=>!DEFAULTS.includes(x))));localStorage.setItem(BLOCKED,JSON.stringify([...blocked]))}catch{}
    if(data.serviceRequestsEnabled===false){
      form.innerHTML='<div class="service-alert" style="text-align:center;padding:28px"><strong>🛑 استقبال طلبات الخدمات مغلق حاليًا</strong><br><span>يمكنك التواصل معنا مباشرة عبر WhatsApp أو Gmail.</span><div class="notify-actions"><a class="notify-btn notify-wa" href="https://wa.me/213770913494" target="_blank" rel="noopener">💬 WhatsApp</a><a class="notify-btn notify-mail" href="https://mail.google.com/mail/?view=cm&fs=1&to=digitalemdz%40gmail.com" target="_blank" rel="noopener">✉️ Gmail</a></div></div>';
      return;
    }
    setOptions(unique([...DEFAULTS,...custom]).filter(x=>!blocked.has(x)));
  }catch(error){
    // Keep the local/default services usable when Firebase is unreachable.
    console.warn("DIGITAL EMDZ services sync unavailable:",error);
  }
}
loadRemoteServices();

if(form){
  form.addEventListener("submit",async(event)=>{
    event.preventDefault();
    const fd=new FormData(form),name=String(fd.get("name")||"").trim(),email=String(fd.get("email")||"").trim(),phone=String(fd.get("phone")||"").trim(),service=String(fd.get("service")||"").trim(),message=String(fd.get("message")||"").trim();
    if(!name||!email||!service||!message)return;
    const text=`طلب خدمة جديد - DIGITAL EMDZ\nالاسم: ${name}\nالبريد: ${email}\nالهاتف: ${phone||"غير مذكور"}\nالخدمة: ${service}\nالتفاصيل: ${message}`;
    let saved=false;
    try{
      const [{getApps,getApp,initializeApp},{getFirestore,collection,addDoc,serverTimestamp},{firebaseConfig}]=await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"),
        import("../firebase-config.js")
      ]);
      const app=getApps().length?getApp():initializeApp(firebaseConfig),db=getFirestore(app);
      await addDoc(collection(db,"serviceRequests"),{name,email,phone,service,message,status:"pending",createdAt:serverTimestamp()});
      saved=true;
    }catch(error){console.warn("Service request Firebase save failed:",error)}
    form.innerHTML=`<div class="service-alert" style="text-align:center;padding:22px"><strong>${saved?"تم حفظ طلبك وتجهيزه بنجاح ✅":"تم تجهيز طلبك للإرسال ✅"}</strong><br>اضغط على الزر المناسب لإرسال التفاصيل.</div><div class="notify-actions"><a class="notify-btn notify-wa" href="https://wa.me/213770913494?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">💬 إرسال عبر WhatsApp</a><a class="notify-btn notify-mail" href="https://mail.google.com/mail/?view=cm&fs=1&to=digitalemdz%40gmail.com&su=${encodeURIComponent("طلب خدمة جديد - "+service)}&body=${encodeURIComponent(text)}" target="_blank" rel="noopener">✉️ فتح Gmail وإرسال الطلب</a></div>`;
  });
}