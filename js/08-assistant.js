/* ===== GM Pulse · 08-assistant.js — Assistent (mahalliy + Gemini AI) ===== */
/* ================= ASSISTENT (rahbar uchun) =================
   Dasturning O'Z ma'lumotlaridan aniq hisoblab javob beradi — raqamlarda adashmaydi.
   Savol o'zbekcha tahlil qilinadi: davr (bu hafta/oy, o'tgan oy, oy nomi), mavzu
   (kechikish, vazifa, zakaz, savdo, davomat, jarima, bonus, KPI), xodim yoki bo'lim nomi. */
let AST_HISTORY = [];
let AST_CACHE = {}; // {ym: {att, fb, orders, piece}} — oylar bo'yicha yuklangan ma'lumot

/* Kerakli oy(lar) ma'lumotini yuklash (cloud) */
async function astLoadMonth(ym){
  if (AST_CACHE[ym]) return AST_CACHE[ym];
  if (!CLOUD) {
    const inM = d => d && d.slice(0,7) === ym;
    return AST_CACHE[ym] = { att: ATTENDANCE.filter(a=>inM(a.date)), fb: FINEBONUS.filter(f=>inM(f.date)),
      orders: ORDERS.filter(o=>inM(o.date)), piece: PIECE_ENTRIES.filter(p=>inM(p.date)) };
  }
  const [y,m] = ym.split("-").map(Number);
  const from = ym + "-01", to = isoLocal(new Date(y, m, 0));
  const [at, fb, od, pe] = await Promise.all([
    sb.from("attendance").select("*").gte("date", from).lte("date", to),
    sb.from("fine_bonus").select("*").gte("date", from).lte("date", to),
    sb.from("orders").select("*").gte("date", from).lte("date", to),
    sb.from("piece_entries").select("*").gte("date", from).lte("date", to),
  ]);
  return AST_CACHE[ym] = {
    att: (at.data||[]).map(a => ({ emp:a.emp, date:a.date, in:a.check_in?a.check_in.slice(0,5):null, out:a.check_out?a.check_out.slice(0,5):null,
      late:a.late, lateExcused:!!a.late_excused, lunchBack:a.lunch_back?a.lunch_back.slice(0,5):null, lunchExcused:!!a.lunch_excused,
      ot:a.ot_status||"none", fineOverride:a.fine_override!=null?+a.fine_override:null, inField:!!a.in_field, outField:!!a.out_field })),
    fb: (fb.data||[]).map(f => ({ emp:f.emp, type:f.type, amount:+f.amount, reason:f.reason, date:f.date })),
    orders: (od.data||[]).map(o => ({ date:o.date, customer:o.customer, productName:o.product_name, qty:+o.qty, price:+o.price, total:+o.total, company:o.company, by:o.created_by })),
    piece: (pe.data||[]).map(p => ({ emp:p.emp, date:p.date, qty:+p.qty, price:+p.price })),
  };
}
/* Davrni aniqlash */
function astPeriod(q){
  const now = new Date(TODAY + "T12:00:00");
  const ymOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const monthIdx = UZ_MONTHS.findIndex(m => q.includes(m.toLowerCase()));
  if (q.includes("bu hafta") || q.includes("shu hafta") || q.includes("hafta")) {
    const d = new Date(now); const dow = (d.getDay()+6)%7; d.setDate(d.getDate()-dow); // dushanba
    const from = isoLocal(d); const e = new Date(d); e.setDate(e.getDate()+6);
    return { from, to: isoLocal(e) < TODAY ? isoLocal(e) : TODAY, label: "bu hafta", months:[ymOf(d), ymOf(e)] };
  }
  if (q.includes("bugun")) return { from: TODAY, to: TODAY, label: "bugun", months:[CUR_MONTH] };
  if (q.includes("kecha")) { const d=new Date(now); d.setDate(d.getDate()-1); const s=isoLocal(d); return { from:s, to:s, label:"kecha", months:[ymOf(d)] }; }
  if (q.includes("o'tgan oy") || q.includes("otgan oy") || q.includes("oldingi oy")) {
    const d = new Date(now.getFullYear(), now.getMonth()-1, 1); const ym = ymOf(d);
    return { from: ym+"-01", to: isoLocal(new Date(d.getFullYear(), d.getMonth()+1, 0)), label: monthLabelLow(ym), months:[ym] };
  }
  if (monthIdx >= 0) {
    let y = now.getFullYear(); const ym = `${y}-${String(monthIdx+1).padStart(2,"0")}`;
    const yMatch = q.match(/20\d\d/); const yy = yMatch ? +yMatch[0] : y;
    const ym2 = `${yy}-${String(monthIdx+1).padStart(2,"0")}`;
    return { from: ym2+"-01", to: isoLocal(new Date(yy, monthIdx+1, 0)), label: monthLabelLow(ym2), months:[ym2] };
  }
  if (q.includes("oylar kesimida") || q.includes("oylar bo") || q.includes("har oy") || q.includes("dinamika")) {
    const months = monthOptions().slice().reverse();
    return { from: months[0]+"-01", to: TODAY, label: "oylar kesimida", months, byMonth: true };
  }
  return { from: CUR_MONTH+"-01", to: TODAY, label: "bu oy", months:[CUR_MONTH] };
}
/* Xodim / bo'lim / kompaniya nomini topish */
function astWho(q){
  const emp = EMPLOYEES.find(e => e.role !== "admin" && e.name.toLowerCase().split(" ").some(w => w.length > 3 && new RegExp("\\b" + w + "\\b").test(q)));
  // Bo'lim faqat "bo'lim" so'zi bilan tanilsin ("savdo bo'limi"), aks holda "savdo" = sotuv mavzusi
  const dept = (q.includes("bo'lim") || q.includes("bolim"))
    ? DEPTS.find(d => q.includes(d.name.toLowerCase().replace(" bo'limi","")))
    : null;
  const comp = companies().find(c => q.includes(c.toLowerCase()));
  return { emp, dept, comp };
}
function astEmpSet(who){
  let list = EMPLOYEES.filter(e => e.role !== "admin" && !isExec(e.role));
  if (who.emp) list = [who.emp];
  else if (who.dept) list = list.filter(e => String(e.dept) === String(who.dept.id));
  else if (who.comp) list = list.filter(e => empCompany(e) === who.comp);
  return list;
}
function astFmtList(items, max=8){
  if (!items.length) return "";
  const shown = items.slice(0, max).map(x => "• " + x).join("\n");
  return shown + (items.length > max ? `\n… va yana ${items.length-max} ta` : "");
}
/* ASOSIY: savolga javob */
async function astAnswer(qRaw){
  const q = qRaw.toLowerCase().replace(/[?.,!]/g," ").replace(/\s+/g," ").trim();
  const per = astPeriod(q), who = astWho(q);
  const emps = astEmpSet(who);
  const ids = new Set(emps.map(e => String(e.id)));
  const scopeTxt = who.emp ? who.emp.name : who.dept ? who.dept.name : who.comp ? who.comp : "barcha xodimlar";
  // Ma'lumotni yuklaymiz
  const data = { att:[], fb:[], orders:[], piece:[] };
  for (const ym of [...new Set(per.months)]) { const d = await astLoadMonth(ym); ["att","fb","orders","piece"].forEach(k => data[k].push(...d[k])); }
  const inRange = d => d >= per.from && d <= per.to;
  const att = data.att.filter(a => inRange(a.date) && ids.has(String(a.emp)));
  const fb = data.fb.filter(f => inRange(f.date) && ids.has(String(f.emp)));
  const orders = data.orders.filter(o => inRange(o.date) && (!who.comp || o.company === who.comp) && (!who.emp || String(o.by)===String(who.emp.id)) && (!who.dept || ids.has(String(o.by))));
  const piece = data.piece.filter(p => inRange(p.date) && ids.has(String(p.emp)));
  const name = id => empById(id)?.name.split(" ")[0] || "?";
  const lateOf = a => (a.lateExcused || isSunday(a.date)) ? 0 : Math.max(0, minutes(a.in) - minutes(WORK_START));

  // --- Oylar kesimida ---
  if (per.byMonth) {
    const rows = [];
    for (const ym of per.months) {
      const d = await astLoadMonth(ym);
      const a = d.att.filter(x => ids.has(String(x.emp)));
      const o = d.orders.filter(x => (!who.comp || x.company===who.comp) && (!who.emp || String(x.by)===String(who.emp.id)) && (!who.dept || ids.has(String(x.by))));
      const late = a.filter(x => lateOf(x) > 0).length;
      const hrs = a.reduce((s,x)=> s + (x.out ? Math.max(0,(Math.min(minutes(x.out),minutes("18:00"))-Math.max(minutes(x.in),minutes(WORK_START)))/60-1) : 0), 0);
      const sales = o.reduce((s,x)=>s+x.total,0);
      const tk = TASKS.filter(t => t.due && t.due.slice(0,7)===ym && taskEmps(t).some(e=>ids.has(String(e))) && t.status!=="closed");
      const done = tk.filter(t=>t.status==="done").length;
      rows.push(`${monthLabel(ym)}: davomat ${a.length} kun, kechikish ${late}, ${hrs.toFixed(0)} soat, vazifa ${done}/${tk.length}, zakaz ${o.length} ta = ${fmtMoney(sales)}`);
    }
    return `📊 ${scopeTxt} — oylar kesimida:\n${rows.join("\n")}`;
  }

  const wantSales = /savdo|sotuv|zakaz|buyurtma|tushum|mijoz/.test(q);
  const wantLate = /kech|kechik/.test(q);
  const wantTasks = /vazifa|topshiriq|bajaril/.test(q);
  const wantAtt = /davomat|keldi|kelmadi|kelgan|ishga chiq|ishlagan|soat/.test(q);
  const wantFine = /jarima/.test(q), wantBonus = /bonus|mukofot/.test(q);
  const wantKpi = /kpi|samaradorlik|reyting|eng yaxshi|eng yomon/.test(q);
  const wantPiece = /donabay/.test(q);
  const wantAbsent = /kelmadi|kelmagan|yo'q|yoq|absent/.test(q);
  const out = [];

  if (wantLate) {
    const lates = att.filter(a => lateOf(a) > 0);
    const byEmp = {}; lates.forEach(a => { byEmp[a.emp] = byEmp[a.emp] || {n:0,min:0}; byEmp[a.emp].n++; byEmp[a.emp].min += lateOf(a); });
    const people = Object.keys(byEmp);
    out.push(`⏰ Kechikish (${per.label}, ${scopeTxt}): ${people.length} kishi, jami ${lates.length} marta.`);
    out.push(astFmtList(people.sort((a,b)=>byEmp[b].n-byEmp[a].n).map(id => `${name(id)} — ${byEmp[id].n} marta, ${byEmp[id].min} daq`)));
    const fine = lates.reduce((s,a)=> s + (a.fineOverride!=null ? a.fineOverride : lateOf(a)*FINE_PER_MIN), 0);
    if (FINE_PER_MIN) out.push(`Kechikish jarimasi: ${fmtMoney(fine)} so'm`);
  }
  if (wantAbsent && !wantLate) {
    const days = [...new Set(att.map(a=>a.date))];
    const missing = [];
    days.forEach(d => { if (isSunday(d)) return; emps.forEach(e => { if (!att.some(a=>String(a.emp)===String(e.id)&&a.date===d)) missing.push(`${uzDate(d)} — ${e.name.split(" ")[0]}`); }); });
    out.push(`🚫 Kelmaganlar (${per.label}, ${scopeTxt}): ${missing.length} holat.\n` + astFmtList(missing, 12));
  }
  if (wantTasks) {
    const tk = TASKS.filter(t => taskEmps(t).some(e => ids.has(String(e))) && t.status !== "closed" && (!t.due || (t.due >= per.from.slice(0,7)+"-01")));
    const undone = tk.filter(t => t.status !== "done");
    const overdue = undone.filter(t => t.due < TODAY);
    const review = tk.filter(t => t.status === "review");
    out.push(`📋 Vazifalar (${scopeTxt}): jami ${tk.length}, bajarilgan ${tk.length-undone.length}, bajarilmagan ${undone.length}, muddati o'tgan ${overdue.length}, tasdiq kutayotgan ${review.length}.`);
    if (overdue.length) out.push("Muddati o'tganlar:\n" + astFmtList(overdue.map(t => `${t.title} — ${taskEmps(t).map(name).join(", ")} (${uzDate(t.due)})`)));
    else if (undone.length) out.push("Bajarilmaganlar:\n" + astFmtList(undone.map(t => `${t.title} — ${taskEmps(t).map(name).join(", ")} (${uzDate(t.due)})`)));
  }
  if (wantSales) {
    const sum = orders.reduce((s,o)=>s+o.total,0);
    const custs = {}; orders.forEach(o => { const k=o.customer.trim(); custs[k]=(custs[k]||0)+o.total; });
    const prods = {}; orders.forEach(o => { const k=o.productName||"—"; prods[k]=prods[k]||{q:0,s:0}; prods[k].q+=o.qty; prods[k].s+=o.total; });
    const byComp = {}; orders.forEach(o => { const k=o.company||"—"; byComp[k]=(byComp[k]||0)+o.total; });
    out.push(`🛒 Savdo (${per.label}${who.comp?", "+who.comp:""}): ${orders.length} ta zakaz, jami ${fmtMoney(sum)} so'm, ${Object.keys(custs).length} ta mijoz, o'rtacha ${orders.length?fmtMoney(sum/orders.length):0}.`);
    if (Object.keys(byComp).length > 1) out.push("Kompaniyalar:\n" + astFmtList(Object.entries(byComp).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} — ${fmtMoney(v)}`)));
    if (orders.length) {
      out.push("Eng katta mijozlar:\n" + astFmtList(Object.entries(custs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} — ${fmtMoney(v)}`), 5));
      out.push("Tovarlar:\n" + astFmtList(Object.entries(prods).sort((a,b)=>b[1].s-a[1].s).map(([k,v])=>`${k} — ${v.q} dona, ${fmtMoney(v.s)}`), 5));
    }
  }
  if (wantAtt && !wantLate && !wantAbsent) {
    const days = [...new Set(att.map(a=>a.date))].length;
    const hrs = att.reduce((s,a)=> s + (a.out ? Math.max(0,(Math.min(minutes(a.out),minutes("18:00"))-Math.max(minutes(a.in),minutes(WORK_START)))/60-1) : 0), 0);
    const byEmp = {}; att.forEach(a => { byEmp[a.emp]=(byEmp[a.emp]||0)+1; });
    out.push(`📅 Davomat (${per.label}, ${scopeTxt}): ${days} ish kuni, ${att.length} belgilash, jami ${hrs.toFixed(1)} soat.`);
    out.push(astFmtList(Object.entries(byEmp).sort((a,b)=>b[1]-a[1]).map(([id,n])=>`${name(id)} — ${n} kun`)));
  }
  if (wantFine) {
    const manual = fb.filter(f=>f.type==="fine"); const ms = manual.reduce((s,f)=>s+f.amount,0);
    const lateF = att.reduce((s,a)=> s + (a.fineOverride!=null ? a.fineOverride : lateOf(a)*FINE_PER_MIN), 0);
    out.push(`💸 Jarimalar (${per.label}, ${scopeTxt}): qo'lda ${manual.length} ta = ${fmtMoney(ms)}, kechikish uchun ${fmtMoney(lateF)}, jami ${fmtMoney(ms+lateF)} so'm.`);
    if (manual.length) out.push(astFmtList(manual.map(f=>`${name(f.emp)} — ${fmtMoney(f.amount)} (${f.reason||""})`)));
  }
  if (wantBonus) {
    const b = fb.filter(f=>f.type==="bonus"); const bs = b.reduce((s,f)=>s+f.amount,0);
    out.push(`🎁 Bonuslar (${per.label}, ${scopeTxt}): ${b.length} ta = ${fmtMoney(bs)} so'm.`);
    if (b.length) out.push(astFmtList(b.map(f=>`${name(f.emp)} — ${fmtMoney(f.amount)} (${f.reason||""})`)));
  }
  if (wantPiece) {
    const sum = piece.reduce((s,p)=>s+p.qty*p.price,0);
    const byEmp = {}; piece.forEach(p => { byEmp[p.emp]=(byEmp[p.emp]||0)+p.qty*p.price; });
    out.push(`📦 Donabay ish (${per.label}, ${scopeTxt}): ${piece.length} yozuv, jami ${fmtMoney(sum)} so'm.`);
    out.push(astFmtList(Object.entries(byEmp).sort((a,b)=>b[1]-a[1]).map(([id,v])=>`${name(id)} — ${fmtMoney(v)}`)));
  }
  if (wantKpi) {
    // KPI joriy oy ma'lumotidan (effDetail) — boshqa oy so'ralsa arxivga o'tishni maslahat beramiz
    const rows = emps.map(e => ({ e, d: effDetail(e.id) })).filter(x => !x.d.noData).sort((a,b)=>b.d.kpi-a.d.kpi);
    const best = rows.slice(0,3), worst = rows.slice(-3).reverse();
    out.push(`🏆 KPI (${monthLabelLow()}, ${scopeTxt}): o'rtacha ${rows.length?Math.round(rows.reduce((s,x)=>s+x.d.kpi,0)/rows.length):0}%.`);
    if (rows.length) {
      out.push("Eng yaxshi:\n" + astFmtList(best.map(x=>`${x.e.name.split(" ")[0]} — ${x.d.kpi}% (vazifa ${x.d.tDone}/${x.d.tTotal}, vaqtida ${x.d.punct}/${x.d.days})`)));
      if (rows.length > 3) out.push("Eng past:\n" + astFmtList(worst.map(x=>`${x.e.name.split(" ")[0]} — ${x.d.kpi}%`)));
    }
    if (per.label !== "bu oy") out.push("ℹ️ KPI faqat joriy oy uchun hisoblanadi. Boshqa oy KPI si uchun yuqoridagi oy tanlagichdan o'sha oyga o'ting.");
  }
  if (!out.length) {
    // Umumiy xulosa
    const lates = att.filter(a => lateOf(a) > 0).length;
    const undone = TASKS.filter(t => taskEmps(t).some(e=>ids.has(String(e))) && t.status!=="done" && t.status!=="closed").length;
    const sum = orders.reduce((s,o)=>s+o.total,0);
    out.push(`📌 Qisqacha (${per.label}, ${scopeTxt}): davomat ${att.length} belgilash, kechikish ${lates}, bajarilmagan vazifa ${undone}, zakaz ${orders.length} ta = ${fmtMoney(sum)} so'm.`);
    out.push("Aniqroq so'rang: «bu hafta kim kech keldi», «bu oy nechta zakaz», «avgust savdosi», «IT bo'limi vazifalari», «Jasur davomati», «oylar kesimida savdo».");
  }
  return out.join("\n\n");
}
/* ===== AI ASSISTENT (Gemini — server orqali, kalit brauzerga bormaydi) ===== */
let AI_ON = null; // null = tekshirilmagan
async function aiCheck(){
  if (AI_ON !== null) return AI_ON;
  try { const r = await fetch("/api/health"); const j = await r.json(); AI_ON = !!j.ai; } catch(e) { AI_ON = false; }
  return AI_ON;
}
/* Dastur ma'lumotlarini AI uchun ixcham JSON qilib yig'ish (faqat rahbariyat chaqiradi) */
async function aiContext(){
  const name = id => empById(id)?.name || "?";
  const months = monthOptions().slice(0, 3); // joriy + 2 oldingi oy
  const att = [], fb = [], ords = [], piece = [];
  for (const ym of months) { const d = await astLoadMonth(ym); att.push(...d.att); fb.push(...d.fb); ords.push(...d.orders); piece.push(...d.piece); }
  const lateOf = a => (a.lateExcused || isSunday(a.date)) ? 0 : Math.max(0, minutes(a.in) - minutes(WORK_START));
  const emps = EMPLOYEES.filter(e => e.role !== "admin").map(e => {
    const d = effDetail(e.id); const earn = earnedToDate(e);
    const myAtt = att.filter(a => String(a.emp)===String(e.id));
    return { id: e.id, ism: e.name, lavozim: e.pos, bolim: e.dept ? deptById(e.dept)?.name : "rahbariyat", kompaniya: empCompany(e) || null,
      rol: e.role, oylik: e.salary, shartnoma_tugash: e.contract || null,
      kpi_joriy_oy: d.noData ? null : d.kpi, vazifa_jami: d.tTotal, vazifa_bajarilgan: d.tDone, muddatida: d.onTime,
      davomat_kun: d.days, vaqtida_kelgan_kun: d.punct, yakshanba_ishlagan: d.sundays,
      kechikish_soni_3oy: myAtt.filter(a => lateOf(a) > 0).length, kechikish_daqiqa_3oy: myAtt.reduce((s,a)=>s+lateOf(a),0),
      ishlagan_soat_joriy_oy: +earn.hours.toFixed(1), maosh_joriy_oy: Math.round(earn.total), jarima_joriy_oy: Math.round(earn.fine), bonus_joriy_oy: Math.round(earn.bonus),
      donabay_dizayn_sotuvkpi: Math.round(earn.piece), donabay: !!e.piecework, dizayner: isDesigner(e), sotuv_menejeri: !!e.salesManager };
  });
  const tasks = TASKS.filter(t => t.status !== "closed").map(t => ({ nomi: t.title, masullar: taskEmps(t).map(name), beruvchi: name(t.by), muddat: t.due, holat: t.status, muddati_otgan: taskOverdue(t), takror: t.rep !== "none" ? repLabel(t.rep) : null }));
  const byMonth = months.map(ym => { const a = att.filter(x=>x.date.slice(0,7)===ym), o = ords.filter(x=>x.date.slice(0,7)===ym);
    return { oy: monthLabel(ym), davomat_belgilash: a.length, kechikish: a.filter(x=>lateOf(x)>0).length, zakaz_soni: o.length, savdo_summa: o.reduce((s,x)=>s+x.total,0),
      donabay_summa: piece.filter(x=>x.date.slice(0,7)===ym).reduce((s,x)=>s+x.qty*x.price,0) }; });
  const sales = salesManagers().map(e => { const k = salesKpi(e.id); return { menejer: e.name, jami_sotuv: k.total, kpi_som: k.kpi, bosqich_foiz: k.cur.pct, sovga: k.gift, sovgagacha_qoldi: k.toGift }; });
  const snab = CONTRACTORS.map(c => { const b = ctBalance(c.id); return { kontragent: c.name, tovar_olindi: b.goods, tolandi: b.paid, balans: b.balance, izoh: b.balance>0?"biz plyusdamiz":b.balance<0?"biz qarzdormiz":"teng",
    ochiq_zakazlar: SNAB_ORDERS.filter(o=>String(o.contractor)===String(c.id) && !["done","closed"].includes(snabStatus(o))).map(o=>o.num+" "+SNAB_ST[snabStatus(o)][1]) }; });
  const stock = stockBalance().filter(b => b.inQ > 0).map(b => ({ tovar: b.name + (b.color?" ("+b.color+")":""), qoldiq: b.left, kam_qolgan: b.left <= 5, narx: b.lastPrice }));
  const custs = {}; ords.forEach(o => { const k = o.customer.trim(); custs[k] = (custs[k]||0) + o.total; });
  return JSON.stringify({
    bugun: TODAY, korilayotgan_oy: monthLabel(), ish_vaqti: "9:00-18:00, obed 13:00-14:00, yakshanba dam",
    kompaniyalar: companies(), bolimlar: DEPTS.map(d => ({ nomi: d.name, kompaniya: d.company || null, xodim_soni: EMPLOYEES.filter(e=>String(e.dept)===String(d.id)).length })),
    xodimlar: emps, vazifalar_ochiq: tasks.filter(t=>t.holat!=="done"), vazifalar_bajarilgan_soni: tasks.filter(t=>t.holat==="done").length,
    oylar_kesimida: byMonth, eng_katta_mijozlar: Object.entries(custs).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([m,s])=>({ mijoz:m, summa:s })),
    sotuv_kpi: sales, snabjeniya_kontragentlar: snab, sklad_qoldiq: stock,
    ruxsat_sorovlari_kutayotgan: LEAVE_REQS.filter(r=>r.status==="pending").map(r=>({ xodim: name(r.emp), sana: r.date, tur: leaveKindLabel(r.kind), sabab: r.reason })),
  });
}
async function aiAsk(q){
  const { data: ses } = await sb.auth.getSession();
  const token = ses?.session?.access_token; if (!token) throw new Error("Sessiya topilmadi — qayta kiring");
  const context = await aiContext();
  const history = AST_HISTORY.slice(0, 6).reverse().map(h => ({ q: h.q, a: h.a }));
  const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, question: q, context, history }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.answer;
}
function pgAssistant(){
  if (!(isExec(USER.role) || USER.role === "admin")) return `<div class="card empty">Assistent faqat rahbariyat uchun</div>`;
  return `
    <div class="card" style="padding:16px;margin-bottom:14px">
      <b style="font-size:14px">🤖 Assistent</b> <span id="aiBadge" class="tag muted">tekshirilmoqda...</span>
      <div style="font-size:12.5px;color:var(--muted);margin:5px 0 10px">Istalgan savolni bering — dastur ma'lumotlari asosida javob beradi, tahlil qiladi, maslahat beradi. Masalan: "bu oy kim eng yaxshi ishladi va nega", "sotuvni oshirish uchun nima qilay", "qaysi postavshikka qarzimiz ko'p".</div>
      <div style="display:flex;gap:8px">
        <input id="astInput" placeholder="Savolingizni yozing..." onkeydown="if(event.key==='Enter')astAsk()">
        <button class="btn primary" onclick="astAsk()">So'rash</button>
      </div>
    </div>
    <div id="astLog">${AST_HISTORY.map(h=>astBubble(h)).join("")}</div>`;
}
/* Oddiy markdown → HTML: **qalin**, *kursiv*, # sarlavha, - ro'yxat, 1. ro'yxat, | jadval | */
function mdToHtml(src){
  const lines = esc(src || "").split("\n");
  let out = "", inUl = false, inOl = false, inTable = false;
  const closeLists = () => { if (inUl) { out += "</ul>"; inUl = false; } if (inOl) { out += "</ol>"; inOl = false; } if (inTable) { out += "</table>"; inTable = false; } };
  const inline = t => t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
  for (let raw of lines) {
    const l = raw.trim();
    if (!l) { closeLists(); continue; }
    if (/^\|.*\|$/.test(l)) {
      if (/^\|[\s:|-]+\|$/.test(l)) continue; // |---|---| ajratgich
      if (!inTable) { closeLists(); out += "<table class='md-t'>"; inTable = true; }
      out += "<tr>" + l.slice(1,-1).split("|").map(c => `<td>${inline(c.trim())}</td>`).join("") + "</tr>"; continue;
    }
    if (inTable) { out += "</table>"; inTable = false; }
    const hm = l.match(/^(#{1,4})\s+(.*)$/);
    if (hm) { closeLists(); out += `<div class="md-h">${inline(hm[2])}</div>`; continue; }
    const um = l.match(/^[-*•]\s+(.*)$/);
    if (um) { if (inOl) { out += "</ol>"; inOl = false; } if (!inUl) { out += "<ul>"; inUl = true; } out += `<li>${inline(um[1])}</li>`; continue; }
    const om = l.match(/^\d+[.)]\s+(.*)$/);
    if (om) { if (inUl) { out += "</ul>"; inUl = false; } if (!inOl) { out += "<ol>"; inOl = true; } out += `<li>${inline(om[1])}</li>`; continue; }
    closeLists(); out += `<p>${inline(l)}</p>`;
  }
  closeLists(); return out;
}
function astBubble(h){
  return `<div class="card" style="padding:13px 15px;margin-bottom:10px">
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">❓ ${esc(h.q)}</div>
    <div class="md" style="font-size:13.5px;line-height:1.55">${mdToHtml(h.a)}</div></div>`;
}
async function astAsk(text){
  const inp = document.getElementById("astInput");
  const q = (text || (inp ? inp.value : "")).trim();
  if (!q) return;
  if (inp) inp.value = "";
  const log = document.getElementById("astLog");
  if (log) log.insertAdjacentHTML("afterbegin", astBubble({ q, a: "⏳ Hisoblanmoqda..." }));
  let a;
  try {
    if (CLOUD && await aiCheck()) {
      try { a = await aiAsk(q); }
      catch(e) { const loc = await astAnswer(q); a = `⚠️ AI javob bermadi (${e.message}). Mahalliy hisob:\n\n${loc}`; }
    } else a = await astAnswer(q);
  } catch(e) { a = "Xatolik: " + e.message; }
  AST_HISTORY.unshift({ q, a });
  if (AST_HISTORY.length > 30) AST_HISTORY.pop();
  if (log) log.innerHTML = AST_HISTORY.map(astBubble).join("");
}

