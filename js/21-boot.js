/* Demo holatini yuklash (monolitda 02-data.js oxirida edi; endi hamma funksiya yuklangach) */
loadState();
normalizeAttendance();

/* ===== GM Pulse · 21-boot.js — Kirish, Supabase yuklash, realtime, PWA, ishga tushirish ===== */
/* =====================================================
   KIRISH, MAVZU, SOAT, PWA
===================================================== */
/* Supabase'dan barcha ruxsat etilgan ma'lumotlarni yuklash (RLS avtomatik filtrlaydi) */
function mapTasks(rows){
  TASKS = rows.map(t => {
    const nt = { id: t.id, title: t.title, desc: t.descr, emp: t.emp,
      emps: t.emps || null, by: t.created_by, due: t.due, status: t.status, doneAt: t.done_at,
      rep: t.repeat || "none", voice: t.voice, extended: !!t.extended, duePrev: t.due_prev,
      dueTime: t.due_time ? String(t.due_time).slice(0,5) : null, forAll: !!t.for_all, submittedAt: t.submitted_at };
    // Yaqinda mahalliy o'zgartirilgan vazifa (masalan hozirgina tasdiqlangan):
    // bazadan hali eski holat kelsa, mahalliy holatni saqlab qolamiz (orqaga qaytmasin).
    const p = window.__pendingTask && window.__pendingTask[String(t.id)];
    if (p && Date.now() - p.at < 12000) { nt.status = p.status; if (p.status === "done") nt.doneAt = nt.doneAt || TODAY; }
    return nt;
  });
}
function mapAttendance(rows){
  ATTENDANCE = rows.map(a => ({ id: a.id, emp: a.emp, date: a.date,
    in: (a.check_in || "").slice(0,5), out: a.check_out ? a.check_out.slice(0,5) : null,
    late: a.late, ot: a.ot_status || "none",
    lunchBack: a.lunch_back ? a.lunch_back.slice(0,5) : null, lunchLate: !!a.lunch_late,
    lunchOut: a.lunch_out ? a.lunch_out.slice(0,5) : null,
    lateExcused: !!a.late_excused, lunchExcused: !!a.lunch_excused,
    fineOverride: a.fine_override != null ? +a.fine_override : null,
    excuseNote: a.excuse_note, excuseReq: a.excuse_req || "none",
    excuseAt: a.excuse_at, excuseLate: !!a.excuse_late, adminExcused: !!a.admin_excused,
    inField: !!a.in_field, outField: !!a.out_field, inAppr: a.in_appr || "none", outAppr: a.out_appr || "none",
    outGeo: (a.out_lat != null && a.out_lng != null) ? a.out_lat.toFixed(5) + "," + a.out_lng.toFixed(5) : null,
    geo: (a.lat != null && a.lng != null) ? a.lat.toFixed(5) + "," + a.lng.toFixed(5) : null }));
}
async function loadAll(){
  const monthStart = viewMonthStart(), monthEnd = viewMonthEnd();
  const R = await Promise.allSettled([
    sb.from("profiles").select("id,email,name,role,dept,pos,color,active,created_at,contract_until,field_work,can_reassign,photo,piecework,piece_kind,sales_manager,orders_access,stock_access,snab_role").eq("active", true),
    sb.from("tasks").select("*").order("created_at"),
    sb.from("fine_bonus").select("*").gte("date", monthStart).lte("date", monthEnd).order("date"),
    sb.from("attendance").select("*").gte("date", monthStart).lte("date", monthEnd).order("date"),
    sb.from("settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("departments").select("*").order("name"),
    sb.from("field_days").select("*").gte("date", monthStart).lte("date", monthEnd),
    sb.rpc("my_visible_salaries"),   // maosh — faqat ko'rish huquqi borlarga (boshliq ko'rmaydi)
    sb.from("closed_months").select("month"),
    sb.from("payroll_snapshot").select("*").eq("month", VIEW_MONTH),
  ]);
  // Bitta jadval xato bersa hammasi to'xtamasin — xatoni ko'rsatamiz, qolgani ishlaydi
  const names = ["profiles","tasks","fine_bonus","attendance","settings","departments","field_days","salaries","closed_months","payroll_snapshot"];
  const unwrap = (r, i) => { if (r.status === "rejected") { console.error(names[i], r.reason); return { data: null, error: r.reason }; }
    if (r.value && r.value.error) console.error(names[i], r.value.error.message); return r.value || { data: null }; };
  const [pr, tk, fb, at, st, dp, fd, sal, cm, ps] = R.map(unwrap);
  const failed = R.map((r,i) => (r.status === "rejected" || (r.value && r.value.error)) ? names[i] : null).filter(Boolean);
  if (failed.length && USER && USER.role === "admin") toast("Yuklanmadi: " + failed.join(", ") + " — SQL yangilanishlarini tekshiring");
  if (!pr.data) throw new Error("profiles yuklanmadi: " + (pr.error?.message || pr.error || "?"));
  const SAL = {}; (sal && sal.data || []).forEach(x => SAL[String(x.id)] = +x.salary);
  CLOSED_MONTHS = new Set((cm && cm.data || []).map(x => x.month));
  PAYROLL_SNAP = {}; (ps && ps.data || []).forEach(x => PAYROLL_SNAP[x.month + "|" + x.emp] =
    { base:+x.base, hours:+x.hours, days:x.days, hourRate:0, planSoFar:x.days*PLAN_HOURS, diff:+x.hours - x.days*PLAN_HOURS,
      bonus:+x.bonus, fine:+x.fine, manualFine:+x.fine, lateFine:0, piece:+x.piece, total:+x.total, fineTotal:+x.fine, salary:+x.salary, kpi:x.kpi });
  if (dp.data && dp.data.length) DEPTS = dp.data.map(d => ({ id: d.id, name: d.name, color: d.color, company: d.company || null }));
  OFFICE = (st.data && st.data.office_lat != null)
    ? { lat: st.data.office_lat, lng: st.data.office_lng, radius: st.data.radius_m || 100 } : null;
  FINE_PER_MIN = st.data ? (+st.data.fine_per_min || 0) : 0;
  FIELD_DAYS = (fd.data || []).map(f => ({ id: f.id, emp: f.emp, date: f.date, note: f.note }));
  EMPLOYEES = (pr.data || []).map(p => ({ id: p.id, name: p.name, role: p.role, dept: p.dept,
    pos: p.pos, salary: SAL[String(p.id)] != null ? SAL[String(p.id)] : (p.salary != null ? +p.salary : 0), color: p.color, login: toShort(p.email),
    contract: p.contract_until, fieldWork: !!p.field_work, canReassign: !!p.can_reassign,
    photo: p.photo || null, piecework: !!p.piecework, ordersAccess: p.orders_access || "none",
    stockAccess: p.stock_access || "none", snabRole: p.snab_role || "none",
    pieceKind: p.piece_kind || "work", salesManager: !!p.sales_manager }));
  mapTasks(tk.data || []);
  // Kassir: dizayner va sotuv menejerlarini (boshqa bo'limdan bo'lsa ham) ko'rishi kerak — maoshsiz
  let myId = USER ? USER.id : null;
  if (!myId) { try { const { data: ses } = await sb.auth.getSession(); myId = ses?.session?.user?.id || null; } catch(e){} }
  const meRow = EMPLOYEES.find(e => String(e.id) === String(myId));
  if (meRow && meRow.snabRole === "kassir" && meRow.role !== "admin") {
    const { data: kp } = await sb.rpc("kassir_people");
    (kp || []).forEach(p => { if (!EMPLOYEES.some(e => String(e.id) === String(p.id)))
      EMPLOYEES.push({ id:p.id, name:p.name, pos:p.pos, dept:p.dept, color:p.color, photo:p.photo, role:"xodim", salary:0,
        piecework:!!p.piecework, pieceKind:p.piece_kind||"work", salesManager:!!p.sales_manager, _light:true }); });
  }
  loadDocTypes(); loadLeaves(); loadPiece(); loadOrders(); loadStock(); loadSnab(); loadDesign(); loadSales();
  FINEBONUS = (fb.data || []).map(f => ({ id: f.id, emp: f.emp, type: f.type,
    amount: +f.amount, reason: f.reason, date: f.date }));
  mapAttendance(at.data || []);
  normalizeAttendance();
}

async function doLogin(){
  const l = $("#loginUser").value.trim().toLowerCase();
  const p = $("#loginPass").value;
  const err = m => { const e = $("#loginErr"); e.textContent = m; e.style.display = "block"; };
  if (CLOUD) {
    const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(l), password: p });
    if (error) return err("Kirish rad etildi: " + (error.message === "Invalid login credentials" ? "email yoki parol noto'g'ri" : error.message));
    await loadAll();
    const me = EMPLOYEES.find(e => e.id === data.user.id);
    if (!me) { await sb.auth.signOut(); return err("Profil topilmadi yoki faol emas"); }
    enterApp(me);
  } else {
    const u = EMPLOYEES.find(e => e.login === l && e.pass === p);
    if (!u) return err("Login yoki parol noto'g'ri");
    enterApp(u);
  }
  $("#loginErr").style.display = "none";
  $("#loginUser").value = ""; $("#loginPass").value = "";
}

async function refreshNow(){
  if (window.__rtRefresh) { await window.__rtRefresh(); toast("Yangilandi ✓"); }
}
function subscribeRealtime(){
  if (!CLOUD || window.__rt) return;
  const refresh = async () => {
    if (!USER) return;
    if (window.__writing) return; // yozish amali ketayotganda yangilamaymiz (poyga holatini oldini oladi)
    await loadAll();
    const me = EMPLOYEES.find(e => String(e.id) === String(USER.id));
    if (me) USER = me;
    render();
    if (window.__taskOpen && document.getElementById("cmList")) loadComments(window.__taskOpen);
    AST_CACHE = {};
    checkNewNotifs();
  };
  window.__rtRefresh = refresh;
  // NISHONLI yangilash: qaysi jadval o'zgargan bo'lsa faqat shuni qayta yuklaymiz.
  // 30 xodim ochiq turganda har o'zgarishda 12 ta so'rov o'rniga 1 ta ketadi.
  const LIGHT = {
    tasks: async () => { const { data } = await sb.from("tasks").select("*").order("created_at"); if (data) mapTasks(data); },
    task_comments: async () => {},
    attendance: async () => { const { data } = await sb.from("attendance").select("*").gte("date", viewMonthStart()).lte("date", viewMonthEnd()).order("date"); if (data) mapAttendance(data); },
    fine_bonus: async () => { const { data } = await sb.from("fine_bonus").select("*").gte("date", viewMonthStart()).lte("date", viewMonthEnd()).order("date"); if (data) FINEBONUS = data.map(f => ({ id: f.id, emp: f.emp, type: f.type, amount: +f.amount, reason: f.reason, date: f.date })); },
    leave_requests: loadLeaves, piece_entries: loadPiece, piece_jobs: loadPiece, orders: loadOrders, products: loadOrders,
    stock_moves: loadStock, stock_items: loadStock, snab_msgs: loadSnab, snab_orders: loadSnab, snab_items: loadSnab, snab_payments: loadSnab, contractors: loadSnab,
    design_entries: loadDesign, design_brands: loadDesign, sales_entries: loadSales, sales_tiers: loadSales,
    doc_types: loadDocTypes, emp_docs: loadDocTypes,
  };
  let pending = new Set();
  const light = async () => {
    if (!USER || window.__writing) return;
    const tables = [...pending]; pending = new Set();
    try {
      if (tables.some(t => !LIGHT[t])) await loadAll();          // noma'lum/asosiy jadval — to'liq
      else for (const t of tables) await LIGHT[t]();             // ma'lum — faqat o'sha
    } catch(e) { console.warn("Realtime yangilash xatosi:", e); }
    const me = EMPLOYEES.find(e => String(e.id) === String(USER.id)); if (me) USER = me;
    render();
    if (window.__taskOpen && document.getElementById("cmList")) loadComments(window.__taskOpen);
    AST_CACHE = {}; checkNewNotifs();
  };
  window.__rt = sb.channel("gm-live")
    .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
      pending.add(payload.table);
      clearTimeout(window.__rtT);
      window.__rtT = setTimeout(light, 500);
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") window.__rtDown = true;
      if (status === "SUBSCRIBED" && window.__rtDown) { window.__rtDown = false; refresh(); }
    });
  clearInterval(window.__poll);
  // Zaxira: birinchi daqiqa 25s da; keyin Realtime ishlasa 90s, uzilgan bo'lsa 25s
  window.__poll = setInterval(() => { if (USER && !document.hidden && (window.__rtDown || (Date.now() - (window.__lastFull||0)) > 90000)) { window.__lastFull = Date.now(); refresh(); } }, 25000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && USER) refresh(); });
}
/* Yozish amalini o'rab, shu davrda Realtime yangilashini to'xtatadi.
   Yozish tugagach, mahalliy o'zgarish bazaga aniq yetib borishi uchun qisqa muhlat qoldiradi. */
async function guardWrite(fn){
  window.__writing = true;
  try { return await fn(); }
  finally { setTimeout(() => { window.__writing = false; }, 1500); }
}
/* (15) Sessiya tugasa yoki boshqa qurilmada chiqilsa — jimgina ishlamasin, login ekraniga qaytsin */
if (CLOUD && typeof sb !== "undefined" && sb && sb.auth && sb.auth.onAuthStateChange) {
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" && USER) { toast("Sessiya tugadi — qayta kiring"); setTimeout(() => location.reload(), 1200); }
  });
}
function enterApp(u){
  USER = u;
  PAGE = (USER.role === "xodim") ? "me" : "dashboard";
  $("#login").style.display = "none";
  $("#app").style.display = "block";
  render(); startClock(); subscribeRealtime(); __seenNotif = null; checkNewNotifs();
  toast(`Xush kelibsiz, ${USER.name.split(" ")[0]}!`);
}

// Sessiya saqlangan bo'lsa avtomatik kirish
if (CLOUD) {
  sb.auth.getSession().then(async ({ data }) => {
    if (!data.session) return;
    await loadAll();
    const me = EMPLOYEES.find(e => e.id === data.session.user.id);
    if (me) enterApp(me);
  });
}

/* Kirish ekrani rejim ko'rsatkichi */
$("#loginHint").innerHTML = CLOUD
  ? `<span class="tag success">Supabase ulangan</span> — login va parolingiz bilan kiring. Hisoblarni admin yaratadi.`
  : `<span class="tag gold">Demo rejim</span> — Supabase sozlanmagan (SUPABASE_URL bo'sh).<br>
     <b>Demo hisoblar:</b> admin / admin123 (Admin) · dilshod / 1234 (Rahbar) · nodira / 1234 (Bo'lim boshlig'i) · jasur / 1234 (Xodim)`;
if (CLOUD) $("#loginUser").placeholder = "masalan: jasur";

/* Mavzu (dark/light) */
function setTheme(t){
  document.documentElement.dataset.theme = t;
  $("#themeBtn").innerHTML = t === "dark" ? IC.sun : IC.moon;
  if (USER) saveState();
}
$("#themeBtn").addEventListener("click", () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
setTheme(savedTheme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

/* Jonli soat */
let clockTimer = null;
function startClock(){
  clearInterval(clockTimer);
  const tick = () => {
    const el = document.getElementById("liveClock");
    if (!el) return;
    const n = new Date();
    el.textContent = `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}:${String(n.getSeconds()).padStart(2,"0")}`;
  };
  tick(); clockTimer = setInterval(tick, 1000);
}

/* POSTAVSHIK: ?sup=TOKEN bir marta ochilsa — token telefonda eslab qolinadi.
   Keyin ilova (bosh ekrandan) oddiy ochilganda ham to'g'ridan postavshik kabineti chiqadi. */
(function(){
  let tok = new URLSearchParams(location.search).get("sup");
  if (tok) { try { localStorage.setItem("gm_sup_token", tok); } catch(e){} history.replaceState(null, "", location.pathname); }
  else { try { tok = localStorage.getItem("gm_sup_token"); } catch(e){} }
  if (tok) { window.__supMode = true; setTimeout(() => supplierPage(tok), 50); }
})();
function supExit(){
  if (!confirm("Postavshik kabinetidan chiqilsinmi? Qayta kirish uchun havola kerak bo'ladi.")) return;
  try { localStorage.removeItem("gm_sup_token"); } catch(e){}
  location.href = location.pathname;
}

/* PWA: service worker + o'rnatish tugmasi */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferredPrompt = e;
  const b = $("#installBtn"); if (b) b.style.display = "flex";
  const sb2 = document.getElementById("supInstallBtn"); if (sb2) sb2.style.display = "inline-flex";
});
$("#installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null; $("#installBtn").style.display = "none";
});
