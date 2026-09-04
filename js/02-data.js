/* ===== GM Pulse · 02-data.js — Demo (mock) ma'lumotlar, saqlash, holat ===== */
/* =====================================================
   MOCK MA'LUMOTLAR (prototip — backend o'rniga)
===================================================== */
let DEPTS = [
  { id: "it",   name: "IT bo'limi",       color: "#149E93" },
  { id: "mkt",  name: "Marketing",        color: "#4C82E0" },
  { id: "sale", name: "Savdo bo'limi",    color: "#C98F2B" },
];

// role: admin | rahbar | boshliq | xodim  (rolni faqat admin belgilaydi)
let EMPLOYEES = [
  { id: 1, name: "Aziz Karimov",     role: "admin",   dept: null,   pos: "Tizim administratori", salary: 9000000,  color: "#5B6B7B", login: "admin",   pass: "admin123" },
  { id: 2, name: "Dilshod Rahimov",  role: "rahbar",  dept: null,   pos: "Bosh direktor",        salary: 15000000, color: "#7B5BA6", login: "dilshod", pass: "1234" },
  { id: 3, name: "Nodira Yusupova",  role: "boshliq", dept: "it",   pos: "IT bo'lim boshlig'i",  salary: 11000000, color: "#149E93", login: "nodira",  pass: "1234" },
  { id: 4, name: "Jasur Toshmatov",  role: "xodim",   dept: "it",   pos: "Frontend dasturchi",   salary: 8000000,  color: "#1B8FA6", login: "jasur",   pass: "1234" },
  { id: 5, name: "Malika Saidova",   role: "xodim",   dept: "it",   pos: "Backend dasturchi",    salary: 8500000,  color: "#2E7D6B", login: "malika",  pass: "1234" },
  { id: 6, name: "Bekzod Alimov",    role: "boshliq", dept: "mkt",  pos: "Marketing boshlig'i",  salary: 10000000, color: "#4C82E0", login: "bekzod",  pass: "1234" },
  { id: 7, name: "Zilola Nazarova",  role: "xodim",   dept: "mkt",  pos: "SMM mutaxassis",       salary: 6500000,  color: "#5B7BD8", login: "zilola",  pass: "1234" },
  { id: 8, name: "Sardor Umarov",    role: "boshliq", dept: "sale", pos: "Savdo boshlig'i",      salary: 10500000, color: "#C98F2B", login: "sardor",  pass: "1234" },
  { id: 9, name: "Kamola Ergasheva", role: "xodim",   dept: "sale", pos: "Savdo menejeri",       salary: 7000000,  color: "#B5762A", login: "kamola",  pass: "1234" },
  { id:10, name: "Otabek Qodirov",   role: "xodim",   dept: "sale", pos: "Savdo agenti",         salary: 6000000,  color: "#8A6B3B", login: "otabek",  pass: "1234" },
];

// Vazifa holatlari: new → progress → review (tasdiq kutilmoqda) → done
let TASKS = [
  { id: 1,  title: "Login sahifasini qayta ishlash",  desc: "Yangi dizayn bo'yicha autentifikatsiya oqimi", emp: 4, by: 3, due: "2026-07-24", status: "progress" },
  { id: 2,  title: "API xatolarini tuzatish",         desc: "Hisobot moduli 500 xatolik bermoqda",          emp: 5, by: 3, due: "2026-07-22", status: "review" },
  { id: 3,  title: "Mobil versiya testi",             desc: "iOS va Android brauzerlarda tekshirish",       emp: 4, by: 3, due: "2026-07-28", status: "new" },
  { id: 4,  title: "Iyul kontent-rejasi",             desc: "Instagram va Telegram uchun 20 ta post",       emp: 7, by: 6, due: "2026-07-20", status: "done", doneAt: "2026-07-18" },
  { id: 5,  title: "Reklama byudjeti hisoboti",       desc: "Iyun oyi target natijalari tahlili",           emp: 7, by: 6, due: "2026-07-25", status: "progress" },
  { id: 6,  title: "Yangi mijozlar bazasi",           desc: "50 ta potensial mijoz bilan aloqa",            emp: 9, by: 8, due: "2026-07-26", status: "progress" },
  { id: 7,  title: "Shartnomalarni yangilash",        desc: "3 ta yirik mijoz shartnomasi muddati tugayapti", emp: 10, by: 8, due: "2026-07-21", status: "review" },
  { id: 8,  title: "Server monitoring sozlash",       desc: "Grafana dashboardlarini o'rnatish",            emp: 5, by: 3, due: "2026-07-30", status: "new" },
  { id: 9,  title: "CRM integratsiyasi",              desc: "Telefoniya bilan bog'lash",                    emp: 3, by: 2, due: "2026-07-29", status: "progress" },
  { id: 10, title: "Sotuv skriptini yangilash",       desc: "Yangi mahsulot liniyasi uchun",                emp: 9, by: 8, due: "2026-07-19", status: "done", doneAt: "2026-07-17" },
];

// Jarima va bonuslar — faqat admin kiritadi
let FINEBONUS = [
  { id: 1, emp: 4,  type: "fine",  amount: 100000, reason: "Ishga 25 daqiqa kechikish",             date: "2026-07-06" },
  { id: 2, emp: 7,  type: "bonus", amount: 500000, reason: "Kontent-reja muddatidan oldin topshirildi", date: "2026-07-18" },
  { id: 3, emp: 9,  type: "bonus", amount: 800000, reason: "Savdo rejasi 120% bajarildi",           date: "2026-07-15" },
  { id: 4, emp: 10, type: "fine",  amount: 150000, reason: "Hisobot o'z vaqtida topshirilmadi",     date: "2026-07-10" },
  { id: 5, emp: 5,  type: "bonus", amount: 400000, reason: "Kritik xatolik tezkor bartaraf etildi", date: "2026-07-12" },
  { id: 6, emp: 4,  type: "fine",  amount: 80000,  reason: "Ishga kechikish (12 daqiqa)",           date: "2026-07-14" },
  { id: 7, emp: 3,  type: "bonus", amount: 600000, reason: "Bo'lim KPI rejasi oshirib bajarildi",   date: "2026-07-16" },
];

// Davomat — iyul 2026 (mock generatsiya)
const WORK_START = "09:00";
let ATTENDANCE = [];
(function genAttendance(){
  const today = new Date("2026-07-23");
  for (let d = 1; d <= 23; d++) {
    const dt = new Date(2026, 6, d);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue; // dam olish
    EMPLOYEES.forEach(e => {
      const seed = (e.id * 31 + d * 7) % 100;
      let inH = 8, inM = 40 + (seed % 25);          // 08:40–09:04
      if (seed > 88) { inH = 9; inM = 5 + seed % 30; } // ba'zida kechikish
      if (inM >= 60) { inH++; inM -= 60; }
      const outH = 18, outM = (seed % 3 === 0) ? 5 + seed % 20 : 0;
      const isToday = d === 23;
      ATTENDANCE.push({
        emp: e.id,
        date: `2026-07-${String(d).padStart(2,"0")}`,
        in:  `${String(inH).padStart(2,"0")}:${String(inM).padStart(2,"0")}`,
        out: isToday ? null : `${String(outH).padStart(2,"0")}:${String(outM).padStart(2,"0")}`,
        late: (inH > 9 || (inH === 9 && inM > 0)),
      });
    });
  }
})();

// Oylik samaradorlik dinamikasi (bo'limlar kesimida, %)
const MONTHLY = {
  labels: ["Yan","Fev","Mar","Apr","May","Iyn","Iyl"],
  it:   [78, 82, 80, 85, 88, 86, 91],
  mkt:  [70, 74, 79, 76, 82, 85, 84],
  sale: [65, 72, 75, 80, 78, 83, 87],
};
// Ro'yxatda bo'lmagan (yangi qo'shilgan) bo'lim uchun barqaror seriya
function monthlySeries(deptId){
  if (MONTHLY[deptId]) return MONTHLY[deptId];
  let h = 0; for (const c of String(deptId)) h = (h * 31 + c.charCodeAt(0)) % 23;
  return MONTHLY.labels.map((_, i) => Math.min(97, 62 + (h + i * 5) % 10 + i * 3));
}

const PLAN_DAYS  = 26;                     // oylik ish kunlari rejasi
const PLAN_HOURS = 8;                      // kunlik ish soati (9:00–18:00, obed 13:00–14:00)
const PLAN_TOTAL = PLAN_DAYS * PLAN_HOURS; // oylik reja: 208 soat

/* ============ SAQLASH (brauzer xotirasi, mavjud bo'lsa) ============
   Sahifa yangilansa ham amallar yo'qolmaydi. Agar muhitda saqlash
   ishlamasa (masalan, oldindan ko'rish oynasi) — jim rejimda xotirada ishlaydi. */
const STORE_KEY = "kpiPanel_v1";
let canStore = false;
try { localStorage.setItem("__t","1"); localStorage.removeItem("__t"); canStore = true; } catch(e) {}
let savedTheme = null;
function saveState(){
  if (!canStore || CLOUD) return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify({
    EMPLOYEES, TASKS, FINEBONUS, ATTENDANCE, OFFICE, FIELD_DAYS, theme: document.documentElement.dataset.theme })); } catch(e){}
}
function loadState(){
  if (!canStore || CLOUD) return;
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!s) return;
    if (s.EMPLOYEES) EMPLOYEES = s.EMPLOYEES;
    if (s.TASKS) TASKS = s.TASKS;
    if (s.FINEBONUS) FINEBONUS = s.FINEBONUS;
    if (s.ATTENDANCE) ATTENDANCE = s.ATTENDANCE;
    if (s.OFFICE) OFFICE = s.OFFICE;
    if (s.FIELD_DAYS) FIELD_DAYS = s.FIELD_DAYS;
    if (s.theme) savedTheme = s.theme;
  } catch(e){}
}
// (loadState va normalizeAttendance chaqiruvi 21-boot.js ga ko'chirildi — funksiyalar keyingi fayllarda)
function resetData(){
  if (canStore) { try { localStorage.removeItem(STORE_KEY); } catch(e){} }
  location.reload();
}

/* ============ HOLAT ============ */
let USER = null;          // joriy foydalanuvchi
let PAGE = "dashboard";
let deferredPrompt = null;

