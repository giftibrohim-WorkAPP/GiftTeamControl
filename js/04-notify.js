/* ===== GM Pulse · 04-notify.js — Brauzer bildirishnomasi, ovoz, rasm yuklash ===== */
/* ===== BRAUZER BILDIRISHNOMASI + OVOZ =====
   Ilova ochiq (yoki fonda) bo'lsa — telefon/kompyuter bildirishnomasi chiqadi va ovoz beradi. */
function beep(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.15;
    o.connect(g); g.connect(ctx.destination); o.start();
    setTimeout(() => { o.frequency.value = 1175; }, 120);
    setTimeout(() => { o.stop(); ctx.close(); }, 260);
  } catch(e){}
}
async function notifyEnable(){
  if (!("Notification" in window)) return toast("Bu brauzer bildirishnomani qo'llamaydi");
  if (Notification.permission === "granted") { beep(); notifyUser("GM Pulse", "Bildirishnomalar allaqachon yoqilgan ✓"); return toast("Allaqachon yoqilgan ✓ (sinov bildirishnomasi yuborildi)"); }
  if (Notification.permission === "denied") return toast("Brauzer bildirishnomani TAQIQLAGAN — manzil qatoridagi qulf belgisi → Bildirishnomalar → Ruxsat berish");
  toast("Brauzer ruxsat so'rayapti — 'Ruxsat berish' ni bosing");
  const p = await Notification.requestPermission();
  if (p === "granted") { toast("Bildirishnomalar yoqildi 🔔"); beep(); notifyUser("GM Pulse", "Bildirishnomalar yoqildi ✓"); }
  else toast("Ruxsat berilmadi — keyinroq manzil qatoridagi qulf belgisidan yoqishingiz mumkin");
  renderBell();
}
function notifyUser(title, body){
  beep();
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: "icon-192.png", badge: "icon-192.png", vibrate: [150, 80, 150], tag: "gm-" + Date.now() }));
    } else new Notification(title, { body, icon: "icon-192.png" });
  } catch(e){}
}
/* Yangi bildirishnomalarni aniqlab, faqat YANGILARI uchun ovoz + bildirishnoma */
let __seenNotif = null;
function checkNewNotifs(){
  if (!USER) return;
  const items = notifList().map(n => n.text);
  if (__seenNotif === null) { __seenNotif = new Set(items); return; } // birinchi yuklash — eskilarni belgilaymiz
  const fresh = items.filter(t => !__seenNotif.has(t));
  if (fresh.length) {
    notifyUser("GM Pulse", fresh.length === 1 ? fresh[0] : `${fresh.length} ta yangi bildirishnoma: ${fresh[0]}`);
    fresh.forEach(t => __seenNotif.add(t));
  }
}

/* Rasm bilan avatar + tahrirlash tugmasi (kamera belgisi) */
function photoEditHtml(e, cls="lg"){
  const canEdit = CLOUD && USER.role === "admin";   // rasmni faqat admin yuklaydi
  if (!canEdit) return avatarHtml(e, cls);
  return `<div class="photo-edit">${avatarHtml(e, cls)}
    <label class="cam" title="Rasm yuklash">📷
      <input type="file" accept="image/*" style="display:none" onchange="uploadPhoto('${e.id}', this)"></label></div>`;
}
/* Rasm yuklash (admin har kimga, xodim o'ziga) */
async function uploadPhoto(empId, input){
  const file = input.files[0]; if (!file) return;
  if (!file.type.startsWith("image/")) { input.value=""; return toast("Faqat rasm fayli"); }
  if (file.size > 5 * 1024 * 1024) { input.value=""; return toast("Rasm 5 MB dan katta"); }
  toast("Rasm yuklanmoqda...");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g,"") || "jpg";
  const path = `${empId}/avatar.${ext}`;
  const { error } = await sb.storage.from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "0" });
  input.value = "";
  if (error) return toast("Yuklanmadi: " + error.message);
  const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
  const url = pub.publicUrl + "?v=" + Date.now();   // kesh yangilanishi uchun
  if (USER.role === "admin") {
    // Admin — to'g'ridan-to'g'ri yozadi
    const { data, error: e2 } = await sb.from("profiles").update({ photo: url }).eq("id", empId).select("id");
    if (e2) return toast("Saqlanmadi: " + e2.message);
    if (!data || !data.length) return toast(permErr("supabase-update-15.sql"));
  } else {
    // Xodim — faqat O'Z rasmini, xavfsiz funksiya orqali (boshqa maydonlarga tegmaydi)
    const { error: e2 } = await sb.rpc("set_my_photo", { url });
    if (e2) return toast(permErrMsg("Saqlanmadi: " + e2.message, "supabase-update-16.sql"));
  }
  const emp = empById(empId); if (emp) emp.photo = url;
  if (String(USER.id) === String(empId)) USER.photo = url;
  toast("Rasm yangilandi ✓"); render();
}
async function removePhoto(empId){
  const { error } = USER.role === "admin"
    ? await sb.from("profiles").update({ photo: null }).eq("id", empId)
    : await sb.rpc("set_my_photo", { url: null });
  if (error) return toast("Xatolik: " + error.message);
  const emp = empById(empId); if (emp) emp.photo = null;
  if (String(USER.id) === String(empId)) USER.photo = null;
  toast("Rasm olib tashlandi"); render();
}
// Rahbariyat darajasi: rahbar va direktor bir xil to'liq huquqqa ega
const isExec = r => r === "rahbar" || r === "direktor";
function roleLabel(r){
  return {admin:"Admin", rahbar:"Rahbar", direktor:"Direktor", boshliq:"Bo'lim boshlig'i", xodim:"Xodim"}[r];
}
function roleTag(r){
  const cls = {admin:"danger", rahbar:"gold", direktor:"gold", boshliq:"info", xodim:"accent"}[r];
  return `<span class="tag ${cls}">${roleLabel(r)}</span>`;
}

