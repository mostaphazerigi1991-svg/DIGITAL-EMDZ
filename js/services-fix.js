import{initializeApp}from"https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import{getFirestore,collection,addDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import{firebaseConfig}from"../firebase-config.js";

const db=getFirestore(initializeApp(firebaseConfig));
const form=document.querySelector("#serviceForm");
if(form){
  form.onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const name=String(fd.get("name")||"").trim();
    const email=String(fd.get("email")||"").trim();
    const phone=String(fd.get("phone")||"").trim();
    const service=String(fd.get("service")||"").trim();
    const message=String(fd.get("message")||"").trim();
    if(!name||!email||!service||!message){return;}

    const text=`طلب خدمة جديد - DIGITAL EMDZ\nالاسم: ${name}\nالبريد: ${email}\nالهاتف: ${phone||"غير مذكور"}\nالخدمة: ${service}\nالتفاصيل: ${message}`;
    const wa=`https://wa.me/213770913494?text=${encodeURIComponent(text)}`;
    const mail=`https://mail.google.com/mail/?view=cm&fs=1&to=digitalemdz%40gmail.com&su=${encodeURIComponent("طلب خدمة جديد - "+service)}&body=${encodeURIComponent(text)}`;

    const button=form.querySelector("button[type=submit]");
    if(button){button.disabled=true;button.textContent="جارٍ تجهيز الطلب...";}

    // حفظ نسخة في Firestore إن كانت القواعد متاحة، لكن لا نجعل ذلك شرطًا لنجاح الطلب.
    try{await addDoc(collection(db,"serviceRequests"),{name,email,phone,service,message,status:"pending",createdAt:serverTimestamp()});}catch(err){console.warn("Firestore service request skipped:",err);}

    form.innerHTML=`<div class="service-alert" style="text-align:center;padding:22px;border:1px solid #334155;border-radius:18px;background:#0b1220;color:#e2e8f0;line-height:2"><strong style="font-size:22px;color:#fff">تم تجهيز طلبك بنجاح ✅</strong><br><span>اضغط على الزر المناسب لإرسال تفاصيل الطلب مباشرة.</span></div><div class="notify-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px"><a class="notify-btn notify-wa" href="${wa}" target="_blank" rel="noopener" style="background:#25D366;color:#fff;text-decoration:none;padding:15px;border-radius:14px;text-align:center;font-weight:800">💬 إرسال عبر WhatsApp</a><a class="notify-btn notify-mail" href="${mail}" target="_blank" rel="noopener" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);color:#fff;text-decoration:none;padding:15px;border-radius:14px;text-align:center;font-weight:800">✉️ فتح Gmail وإرسال الطلب</a></div>`;
  };
}
