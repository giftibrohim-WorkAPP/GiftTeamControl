/* ===== GM Pulse · 03-helpers.js — Yordamchi funksiyalar, format, ruxsatlar ===== */
/* ============ YORDAMCHI ============ */
const $  = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
/* Aniq pul: 137 500 (yaxlitlamaydi) — hisob-kitob va donabay uchun */
const fmtMoney = n => {
  const v = Math.round(n || 0), sign = v < 0 ? "−" : "";
  return sign + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");  // 137 500
};
const fmtShort = n => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n/1e6).toFixed(1).replace(".0","") + " mln";
  if (a >= 1e3) return (n/1e3).toFixed(0) + " ming";
  return "" + Math.round(n);
};
const empById  = id => EMPLOYEES.find(e => String(e.id) === String(id));
const deptById = id => DEPTS.find(d => String(d.id) === String(id));
const initials = n => n.split(" ").map(w => w[0]).slice(0,2).join("");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uzDate = iso => { const [y,m,d] = iso.split("-"); return `${d}.${m}.${y}`; };

/* Geofence: ishxona nuqtasi va radius (metr) */
let OFFICE = null; // { lat, lng, radius }
/* Kunlik "tashqarida ishlash" ruxsatlari — admin belgilaydi */
let FIELD_DAYS = [
  { id: 1, emp: 9, date: "2026-07-23", note: "Mijozlar bilan uchrashuvlar" },
];
const isFieldDay = (emp, date) => FIELD_DAYS.some(f => String(f.emp) === String(emp) && f.date === date);
function distMeters(la1, lo1, la2, lo2){
  const R = 6371000, r = x => x * Math.PI / 180;
  const dla = r(la2 - la1), dlo = r(lo2 - lo1);
  const h = Math.sin(dla/2)**2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dlo/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/* Shartnoma: tugashiga necha kun qolgani */
const daysTo = iso => Math.round((new Date(iso) - new Date(TODAY)) / 86400000);
/* Shartnoma holati:
   qizil  — muddati o'tgan yoki 30 kungacha qolgan
   sariq  — 1 oydan 3 oygacha (31–90 kun)
   ko'k   — 3 oydan 6 oygacha (91–180 kun)
   yashil — 6 oydan ko'p (180+ kun) */
function contractState(iso){
  if (!iso) return { cls:"muted", txt:"sana kiritilmagan", label:"—", d:null };
  const d = daysTo(iso);
  if (d < 0)    return { cls:"danger",  txt:`muddati o'tgan (${uzDate(iso)}, ${Math.abs(d)} kun oldin)`, label:"O'tgan", d };
  if (d <= 30)  return { cls:"danger",  txt:`${d} kun qoldi — ${uzDate(iso)}`, label:`${d} kun`, d };
  if (d <= 90)  return { cls:"gold",    txt:`${d} kun qoldi (${Math.round(d/30)} oy) — ${uzDate(iso)}`, label:`${d} kun`, d };
  if (d <= 180) return { cls:"info",    txt:`${Math.round(d/30)} oy qoldi — ${uzDate(iso)}`, label:`${Math.round(d/30)} oy`, d };
  return             { cls:"success", txt:`amalda — ${uzDate(iso)} gacha (${Math.round(d/30)} oy)`, label:`${Math.round(d/30)} oy`, d };
}
function contractTag(iso, short=false){
  const s = contractState(iso);
  if (!iso) return `<span class="tag muted">📄 shartnoma sanasi yo'q</span>`;
  return `<span class="tag ${s.cls}" title="Shartnoma: ${uzDate(iso)}">📄 ${short ? s.label : s.txt}</span>`;
}
/* "Ketdim" unutilgan o'tgan kunlarni 18:00 bilan avto-yopish */
/* "Ketdim" bosilmagan kun 18:00 bilan AVTOMATIK YOPILMAYDI — xodim bosmasa yoki
   admin qo'lda tuzatmasa, o'sha kun uchun soat/pul hisoblanmaydi. */
function normalizeAttendance(){
  ATTENDANCE.forEach(a => { if (!a.out && a.date < TODAY) a.unclosed = true; });
}

function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2400);
}
function avatarHtml(e, cls=""){
  if (!e) return `<div class="avatar ${cls}" style="background:#8DA2B5">?</div>`;
  if (e.photo) return `<div class="avatar ${cls} has-img" style="background:${e.color}"><img src="${esc(e.photo)}" alt="" loading="lazy"></div>`;
  return `<div class="avatar ${cls}" style="background:${e.color}">${initials(e.name)}</div>`;
}
/* Ruxsat xatosi xabari: adminga texnik ko'rsatma, xodimlarga oddiy matn */
function permErr(sqlFile){
  return USER && USER.role === "admin"
    ? `Ruxsat yo'q — Supabase'da ${sqlFile} ni Run qiling`
    : "Bu amalni bajarishga ruxsatingiz yo'q. Administratorga murojaat qiling.";
}
function permErrMsg(msg, sqlFile){
  return USER && USER.role === "admin" ? `${msg} — ${sqlFile} ni Run qiling` : "Xatolik yuz berdi. Administratorga murojaat qiling.";
}
