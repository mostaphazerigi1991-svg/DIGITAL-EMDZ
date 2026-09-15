const WA='213770913494';
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function openBuy(name,price){
  const customer=prompt('أدخل اسمك الكامل:');
  if(!customer?.trim()) return;
  const msg=`مرحبًا DIGITAL EMDZ 👋\nلدي عميل يريد شراء منتج.\nاسم العميل: ${customer.trim()}\nاسم المنتج: ${name}\nالسعر: $${Number(price||0).toFixed(2)}`;
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
}
window.simpleBuy=openBuy;
const css=document.createElement('style');css.textContent='.simple-buy-btn{display:block;width:100%;margin-top:10px}.payment-note{margin:22px 0;padding:18px;border-radius:18px;border:1px solid #334155;background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(59,130,246,.12));color:#cbd5e1;line-height:1.9}.payment-note strong{color:#fff}';document.head.appendChild(css);
function enhance(){document.querySelectorAll('#productGrid .product-card, #productGrid article').forEach(card=>{if(card.querySelector('.simple-buy-btn'))return;const name=card.querySelector('h3,h2,strong')?.textContent?.trim()||'منتج رقمي';const priceEl=card.querySelector('[data-price],.price');const price=(priceEl?.textContent||'').replace(/[^0-9.]/g,'');const b=document.createElement('button');b.className='btn primary simple-buy-btn';b.textContent='💬 شراء عبر واتساب';b.onclick=()=>openBuy(name,price);card.appendChild(b)});}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
