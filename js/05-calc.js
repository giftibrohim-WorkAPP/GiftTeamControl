/* ===== GM Pulse · 05-calc.js — Hisob-kitoblar: soat, KPI, jarima, maosh ===== */
/* ============ HISOB-KITOBLAR ============ */
function minutes(t){ const [h,m] = t.split(":").map(Number); return h*60+m; }
const LUNCH_END = "14:00";
const OT_GRACE = 10; // daqiqa: shu oraliqdagi erta kelish/kech ketish ortiqcha vaqt hisoblanmaydi
/* Qo'shimcha vaqt (9:00 dan oldin + 18:00 dan keyin), daqiqada.
   10 daqiqagacha farq imtiyoz — na hisoblanadi, na tasdiq so'raladi. */
function otMinutes(a){
  if (!a.out) return 0;
  // Yakshanba — dam kuni: ishlagan BUTUN vaqti qo'shimcha hisoblanadi
  if (isSunday(a.date)) return Math.max(0, minutes(a.out) - minutes(a.in) - LUNCH_MAX);
  const early = Math.max(0, minutes(WORK_START) - minutes(a.in));
  const lateOut = Math.max(0, minutes(a.out) - minutes("18:00"));
  return (early > OT_GRACE ? early : 0) + (lateOut > OT_GRACE ? lateOut : 0);
}
const LUNCH_MAX = 60; // belgilangan obed: 60 daqiqa (13:00–14:00)
let FINE_PER_MIN = 0; // 1 daqiqa kechikish uchun jarima (admin belgilaydi)
/* Kechikkan daqiqalar (kelish). Ruxsat bilan kechirilgan bo'lsa — 0 */
/* Yakshanba — dam kuni. Kelgan bo'lsa bu ortiqcha mehnat: kechikish hisoblanmaydi. */
function isSunday(dateIso){ return new Date(dateIso + "T12:00:00").getDay() === 0; }
function lateMinutes(a){
  if (!a || a.lateExcused) return 0;
  if (isSunday(a.date)) return 0;   // dam kuni ishga chiqqan — kechikish yo'q
  const lv = approvedLeave(a.emp, a.date);
  if (lv && (lv.kind === "late" || lv.kind === "absent")) return 0; // oldindan ruxsat berilgan
  return Math.max(0, minutes(a.in) - minutes(WORK_START));
}
/* Obeddan kech qaytish daqiqalari (1 soatdan ortig'i). Kechirilgan bo'lsa — 0 */
function lunchLateMinutes(a){
  if (!a || a.lunchExcused || !a.lunchBack) return 0;
  if (isSunday(a.date)) return 0;   // dam kunida obed nazorati yo'q
  if (approvedLeave(a.emp, a.date)) return 0; // o'sha kunga ruxsat bor
  return Math.max(0, minutes(a.lunchBack) - minutes(LUNCH_END)); // 14:00 dan keyingi ortiqcha
}
/* Kechikish uchun avtomatik jarima (1 daqiqa narxi × kechikkan daqiqalar) */
function lateFine(a){
  if (!a) return 0;
  if (a.fineOverride != null) return +a.fineOverride;  // admin qo'lda o'zgartirgan
  if (!FINE_PER_MIN) return 0;
  return Math.round((lateMinutes(a) + lunchLateMinutes(a)) * FINE_PER_MIN);
}
/* Reytingga ta'sir qiladigan kechikish (kechirilgan hisobga olinmaydi) */
function countsLate(a){ return lateMinutes(a) > 0; }
function countsLunchLate(a){ return lunchLateMinutes(a) > 0; }
/* Ishlagan soat: obed vaqti ayriladi; qo'shimcha vaqt FAQAT tasdiqlansa qo'shiladi.
   Obed: agar xodim "chiqdim/qaytdim" bosgan bo'lsa — HAQIQIY tafovut hisoblanadi,
   1 soatdan oshsa ortig'i ham ayriladi. Bosmagan bo'lsa — standart 1 soat ayriladi. */
function lunchMinutes(a){
  // Standart 1 soat; 14:00 dan kech qaytilsa ortiqcha daqiqalar ham ayriladi
  if (a.lunchBack) return LUNCH_MAX + Math.max(0, minutes(a.lunchBack) - minutes(LUNCH_END));
  return LUNCH_MAX;
}
function workedHours(a){
  if (!a.out) return null;
  const approved = a.ot === "approved";
  // YAKSHANBA (dam kuni): butun kun "qo'shimcha vaqt" — faqat boshliq tasdiqlasa hisoblanadi.
  // Tasdiqlanmasa 0 (odatiy 8 soat bilan ikki marta hisoblanmasin).
  if (isSunday(a.date)) return approved ? Math.max(0, (minutes(a.out) - minutes(a.in)) / 60 - LUNCH_MAX / 60) : 0;
  const effIn  = approved ? minutes(a.in)  : Math.max(minutes(a.in),  minutes(WORK_START));
  const effOut = approved ? minutes(a.out) : Math.min(minutes(a.out), minutes("18:00"));
  const lunch = lunchMinutes(a);
  let h = (effOut - effIn) / 60 - lunch / 60;
  return Math.max(0, h);
}
function inViewMonth(d){ return d && d.slice(0,7) === VIEW_MONTH; }
function empAttendance(id){ return ATTENDANCE.filter(a => String(a.emp) === String(id) && inViewMonth(a.date)); }
function empFB(id){ return FINEBONUS.filter(f => String(f.emp) === String(id) && inViewMonth(f.date)); }
function sumFB(id, type){
  return empFB(id).filter(f => f.type === type).reduce((s,f) => s + f.amount, 0);
}
// Oy boshidan ishlab topilgani — SOATBAY hisob:
// soatlik stavka = oylik ÷ (26 kun × 8 soat) = oylik ÷ 208
// hisoblangan = soatlik × real ishlagan soat (ortiqcha soat qo'shiladi, kam ishlagani ayriladi)
let PAYROLL_SNAP = {}; // {"YYYY-MM|empId": {...}} — yopilgan oylar
let CLOSED_MONTHS = new Set();
function isMonthClosed(ym){ return CLOSED_MONTHS.has(ym || VIEW_MONTH); }
function earnedToDate(e){
  // YOPILGAN oy: muzlatilgan snapshot qaytariladi — oylik/jarima narxi o'zgarsa ham arxiv o'zgarmaydi
  const snap = PAYROLL_SNAP[VIEW_MONTH + "|" + String(e.id)];
  if (snap && isMonthClosed()) return { ...snap, frozen: true };
  return earnedLive(e);
}
function earnedLive(e){
  const att = empAttendance(e.id);
  let hours = 0, days = 0, lateFineSum = 0;
  att.forEach(a => {
    const h = workedHours(a); if (h !== null) { hours += h; days++; }
    lateFineSum += lateFine(a); // kechikish uchun avtomatik jarima
  });
  const hourRate = e.salary / PLAN_TOTAL;
  const base = hourRate * hours;
  const planSoFar = days * PLAN_HOURS;
  const diff = hours - planSoFar;
  const piece = ((typeof pieceTotal === "function") ? pieceTotal(e.id) : 0)
              + ((typeof designTotal === "function") ? designTotal(e.id) : 0)
              + ((typeof salesKpi === "function") ? salesKpi(e.id).kpi : 0); // donabay + dizayn + sotuv KPI
  const manualFine = sumFB(e.id,"fine");
  const fine = manualFine + lateFineSum;   // jami jarima (ALOHIDA hisob)
  const bonus = sumFB(e.id,"bonus");
  return { base, hours, days, hourRate, planSoFar, diff,
           bonus, fine, manualFine, lateFine: lateFineSum, piece,
           // Maosh: ishlagan soat + donabay ish + bonus. Jarima ARALASHTIRILMAYDI.
           total: base + piece + bonus,
           // Jarima alohida ko'rsatiladi va alohida undiriladi
           fineTotal: fine };
}
// Samaradorlik: 60% bajarilgan vazifalar + 20% muddatida topshirish + 20% o'z vaqtida kelish
// effDetail — KPI nimadan yig'ilganining to'liq raqamlari
function effDetail(id){
  // Butunlay yopilgan vazifalar KPI hisobiga kirmaydi (ish bekor qilingan)
  // Vazifalar ham DAVOMAT kabi ko'rilayotgan OY bo'yicha (muddati shu oyda bo'lganlar)
  const t = TASKS.filter(x => isTaskDoer(x, id) && x.status !== "closed" && inViewMonth(x.due));
  const done = t.filter(x => x.status === "done");
  // "Muddatida" — xodim TOPSHIRGAN (tasdiqqa yuborgan) sana bo'yicha; boshliq tasdiqlashni
  // kechiktirsa xodim jazolanmaydi. submittedAt bo'lmasa (eski yozuvlar) doneAt ishlatiladi.
  const onTime = done.filter(x => { const d = x.submittedAt || x.doneAt; return !d || d <= x.due; });
  const at = empAttendance(id);
  const punct = at.filter(a => !countsLate(a) && !countsLunchLate(a));
  const sundays = at.filter(a => isSunday(a.date));   // dam kunida ishga chiqqan kunlar
  const tScore = t.length ? done.length / t.length : 0;
  const oScore = done.length ? onTime.length / done.length : 0;
  const pScore = at.length ? punct.length / at.length : 0;
  // KPI faqat MAVJUD ma'lumot qismlaridan hisoblanadi (yo'q qism 100% deb olinmaydi).
  // Umuman ma'lumot bo'lmasa — KPI 0 va "ma'lumot yig'ilmoqda" holati.
  const parts = [];
  if (t.length)    parts.push([tScore, 0.6]);
  if (done.length) parts.push([oScore, 0.2]);
  if (at.length)   parts.push([pScore, 0.2]);
  const wSum = parts.reduce((s,p) => s + p[1], 0);
  let kpi = wSum ? Math.round(parts.reduce((s,p) => s + p[0]*p[1], 0) / wSum * 100) : 0;
  // Yakshanba (dam kuni) ishga chiqqan har bir kun uchun +2% bonus, jami 10% gacha.
  // Bu ortiqcha mehnat — reytingga IJOBIY ta'sir qiladi.
  const sundayBonus = Math.min(10, sundays.length * 2);
  if (wSum) kpi = Math.min(100, kpi + sundayBonus);
  return {
    tTotal: t.length, tDone: done.length, onTime: onTime.length,
    days: at.length, punct: punct.length, noData: wSum === 0,
    sundays: sundays.length, sundayBonus,
    tPc: Math.round(tScore * 100), oPc: Math.round(oScore * 100), pPc: Math.round(pScore * 100),
    kpi,
  };
}
function efficiency(id){ return effDetail(id).kpi; }
// Bo'lim bo'yicha jamlangan raqamlar
function deptDetail(deptId){
  const list = EMPLOYEES.filter(e => String(e.dept) === String(deptId));
  const a = { tTotal:0, tDone:0, onTime:0, days:0, punct:0, emps:list.length };
  list.forEach(e => { const d = effDetail(e.id);
    a.tTotal+=d.tTotal; a.tDone+=d.tDone; a.onTime+=d.onTime; a.days+=d.days; a.punct+=d.punct; });
  a.late = a.days - a.punct;
  a.kpi = deptEfficiency(deptId);
  return a;
}
/* KPI tafsiloti bloki (profil va shaxsiy sahifada) */
function kpiBreakdown(e){
  const d = effDetail(e.id);
  const row = (label, val, pc, weight) => `
    <div style="display:flex;align-items:center;gap:10px;margin-top:9px;font-size:12.5px">
      <span style="flex:1"><b>${label}</b><br><span style="color:var(--muted)">${val}</span></span>
      <div class="track" style="flex:1;height:8px;background:var(--surface2);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${pc}%;background:var(--accent);border-radius:99px"></div></div>
      <b class="num" style="width:44px;text-align:right">${pc}%</b>
      <span class="tag muted">${weight}</span>
    </div>`;
  return `<div class="card" style="padding:15px 17px;margin-bottom:15px">
    <b style="font-size:14px">KPI ${d.kpi}% — qanday hisoblandi</b>
    ${row("Vazifalar bajarilishi", `${d.tTotal} tadan ${d.tDone} tasi bajarildi`, d.tPc, "ulushi 60%")}
    ${row("Muddatida topshirish", d.tDone ? `bajarilgan ${d.tDone} tadan ${d.onTime} tasi o'z muddatida` : "hali bajarilgan vazifa yo'q", d.oPc, "ulushi 20%")}
    ${row("O'z vaqtida kelish", `${d.days} ish kunidan ${d.punct} kuni 9:00 gacha kelgan`, d.pPc, "ulushi 20%")}
    <div style="font-size:11.5px;color:var(--muted);margin-top:11px;border-top:1px solid var(--line);padding-top:9px">
      Formula: ${d.tPc}%×0.6 + ${d.oPc}%×0.2 + ${d.pPc}%×0.2 = <b>${d.kpi}%</b></div>
  </div>`;
}
function deptEfficiency(deptId){
  const list = EMPLOYEES.filter(e => e.dept === deptId);
  if (!list.length) return 0;
  return Math.round(list.reduce((s,e) => s + efficiency(e.id), 0) / list.length);
}
// Rol bo'yicha ko'rinadigan xodimlar doirasi
/* Kompaniya filtri qo'llangan xodimlar ro'yxati */
function scopeByCompany(list){
  if (!COMPANY_FILTER) return list;
  return list.filter(e => empCompany(e) === COMPANY_FILTER);
}
function scopeEmployees(){
  if (USER.role === "admin" || isExec(USER.role)) return EMPLOYEES.filter(e => e.role !== "admin");
  if (USER.role === "boshliq") return EMPLOYEES.filter(e => e.dept === USER.dept);
  return [USER];
}

