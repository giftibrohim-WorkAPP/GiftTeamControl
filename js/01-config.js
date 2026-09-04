/* ===== GM Pulse · 01-config.js — Supabase sozlamasi, sana/arxiv yordamchilari ===== */
/* =====================================================
   SUPABASE SOZLAMASI
   Supabase Dashboard → Project Settings → API dan oling.
   Bo'sh qoldirilsa ilova DEMO rejimda (mock data) ishlaydi.
===================================================== */
// 1-usul: qiymatlarni to'g'ridan-to'g'ri shu yerga yozish mumkin.
// 2-usul (Railway): tegmang — deploy paytida Railway Variables'dagi
//   SUPABASE_URL va SUPABASE_ANON_KEY avtomatik shu joyga qo'yiladi.
const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

const _cfgOk = v => v && !v.startsWith("__");
const CLOUD = !!(_cfgOk(SUPABASE_URL) && _cfgOk(SUPABASE_ANON_KEY) && window.supabase);
const sb = CLOUD ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
// Yangi xodim yaratishda admin sessiyasi buzilmasligi uchun alohida klient:
const sbSignup = CLOUD ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
/* MAHALLIY sana (YYYY-MM-DD). toISOString ishlatilmaydi — u UTC'ga o'giradi va
   UTC+5 (Toshkent) da sanani bir kun orqaga suradi. Shu bug takroriy vazifalarni buzardi. */
function isoLocal(d){
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
let TODAY = CLOUD ? isoLocal(new Date()) : "2026-07-23";
/* Yarim tun o'tsa "bugun" eskirib qolmasin: har daqiqa tekshiramiz, sana o'zgarsa ilovani yangilaymiz */
setInterval(() => {
  if (!CLOUD) return;
  const now = isoLocal(new Date());
  if (now !== TODAY) { TODAY = now; if (typeof toast === "function") toast("Yangi kun boshlandi — ma'lumot yangilanmoqda"); setTimeout(() => location.reload(), 1200); }
}, 60000);
/* ===== ARXIV: ko'rilayotgan oy (YYYY-MM). Sukut — joriy oy ===== */
let VIEW_MONTH = TODAY.slice(0,7);
const CUR_MONTH = TODAY.slice(0,7);
function viewMonthStart(){ return VIEW_MONTH + "-01"; }
function viewMonthEnd(){
  const [y,m] = VIEW_MONTH.split("-").map(Number);
  return isoLocal(new Date(y, m, 0)); // oyning oxirgi kuni
}
function isArchive(){ return VIEW_MONTH !== CUR_MONTH; }
const UZ_MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
function monthLabel(ym){ const [y,m] = (ym||VIEW_MONTH).split("-").map(Number); return `${UZ_MONTHS[m-1]} ${y}`; }
function monthLabelLow(ym){ return monthLabel(ym).toLowerCase(); }
/* Oy ro'yxati: ilova ishga tushgan oydan (2026-07) joriy oygacha — davomiga to'planib boradi */
const APP_START_MONTH = "2026-07";
function monthOptions(){
  const out = []; const d = new Date(TODAY + "T12:00:00");
  for (let i = 0; i < 120; i++) {
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (ym < APP_START_MONTH) break;
    out.push(ym); d.setMonth(d.getMonth() - 1);
  }
  return out;
}
async function setViewMonth(ym){
  if (!ym || ym === VIEW_MONTH) return;
  VIEW_MONTH = ym;
  toast(isArchive() ? `📁 Arxiv: ${monthLabel()}` : "Joriy oyga qaytildi");
  if (CLOUD) { await loadAll(); }
  render();
}
// Qisqa login: xodim "jasur" deb kiradi, kod ichkarida email ko'rinishiga keltiradi
const LOGIN_DOMAIN = "@gmpulse.uz";
const toEmail = l => l.includes("@") ? l : l + LOGIN_DOMAIN;
const toShort = e => (e || "").replace(LOGIN_DOMAIN, "");

