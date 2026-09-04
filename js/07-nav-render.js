/* ===== GM Pulse · 07-nav-render.js — Navigatsiya, sahifa renderi, profil ===== */
/* =====================================================
   NAVIGATSIYA (rolga qarab menyu)
===================================================== */
function navItems(){
  const n = [];
  if (USER.role !== "xodim") n.push({ id:"dashboard", label:"Dashboard", icon:IC.dash });
  if (USER.role === "xodim" || USER.role === "boshliq") n.push({ id:"me", label:"Mening sahifam", icon:IC.me });
  if (USER.role !== "xodim") n.push({ id:"employees", label:"Xodimlar", icon:IC.users });
  n.push({ id:"tasks", label:"Vazifalar", icon:IC.tasks });
  n.push({ id:"attendance", label:"Davomat", icon:IC.clock });
  n.push({ id:"rating", label:"Reyting", icon:IC.trophy });
  if (canSeeOrders()) n.push({ id:"orders", label:"Zakazlar", icon:IC.cart });
  if (stockAccess() !== "none") n.push({ id:"stock", label:"Sklad", icon:IC.box });
  if (canSeeSnab()) n.push({ id:"snab", label:"Snabjeniya", icon:IC.truck });
  if (isDesigner(USER) || USER.role === "admin" || isExec(USER.role) || USER.snabRole === "kassir") n.push({ id:"design", label:"Dizayn", icon:IC.brush });
  if (USER.salesManager || USER.role === "admin" || isExec(USER.role) || USER.snabRole === "kassir") n.push({ id:"sales", label:"Sotuv KPI", icon:IC.up });
  if (isExec(USER.role) || USER.role === "admin") n.push({ id:"assistant", label:"Assistent", icon:IC.bot });
  // Donabay ish — o'zi donabay bo'lsa yoki boshqaruvchi bo'lsa
  if ((USER.piecework && USER.pieceKind !== "design") || USER.role === "admin" || isExec(USER.role) ||
      (USER.role === "boshliq" && pieceEmployees().some(e => String(e.dept) === String(USER.dept))))
    n.push({ id:"piece", label:"Donabay ish", icon:IC.box });
  n.push({ id:"finebonus", label:"Jarima / Bonus", icon:IC.money });
  if (USER.role === "admin" || isExec(USER.role)) n.push({ id:"payroll", label:"Hisob-kitob", icon:IC.calc });
  return n;
}
function openMoreNav(){
  const items = navItems().slice(4);
  openModal(`<h3>Bo'limlar</h3>
    <div class="more-grid">${items.map(it => `
      <button class="more-item ${PAGE===it.id?"active":""}" onclick="closeModal(); go('${it.id}')">${it.icon}<span>${esc(it.label)}</span></button>`).join("")}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
function renderNav(){
  const items = navItems();
  const mk = it => `<button class="nav-btn ${PAGE===it.id?"active":""}" onclick="go('${it.id}')">${it.icon}<span>${it.label}</span></button>`;
  $("#sideNav").innerHTML = items.map(mk).join("");
  // Telefon: 4 ta asosiy + "Yana" (qolganlari oynada). Faol sahifa "yana" ichida bo'lsa, "Yana" faol ko'rinadi.
  const MAX_BOTTOM = 4;
  const main = items.slice(0, MAX_BOTTOM), more = items.slice(MAX_BOTTOM);
  const moreActive = more.some(it => it.id === PAGE);
  $("#bottomNav").innerHTML = main.map(it =>
    `<button class="${PAGE===it.id?"active":""}" onclick="go('${it.id}')">${it.icon}<span>${it.label.split(" ")[0]}</span></button>`).join("")
    + (more.length ? `<button class="${moreActive?"active":""}" onclick="openMoreNav()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        <span>Yana</span></button>` : "");
  const rb = $("#resetBtn"); if (rb) rb.style.display = (USER.role === "admin" && canStore && !CLOUD) ? "flex" : "none";
  $("#sideUser").innerHTML = `${avatarHtml(USER)}
    <div class="meta"><b>${esc(USER.name)}</b><span>${roleLabel(USER.role)}</span></div>
    <button class="logout" title="Chiqish" onclick="logout()">${IC.out}</button>`;
}
function go(p){ PAGE = p; render(); window.scrollTo({top:0}); }
function logout(){
  if (CLOUD) sb.auth.signOut();
  USER = null; $("#app").style.display="none"; $("#login").style.display="flex";
}

/* =====================================================
   SAHIFALAR
===================================================== */
const TITLES = {
  dashboard:  ["Dashboard", "Umumiy ko'rsatkichlar va dinamika"],
  me:         ["Mening sahifam", "Shaxsiy ko'rsatkichlar va balans"],
  employees:  ["Xodimlar", "Jamoa a'zolari va samaradorlik"],
  tasks:      ["Vazifalar", "Topshiriqlar oqimi — 3 bosqich + tasdiqlash"],
  attendance: ["Davomat", "Kelish-ketish vaqtlari, iyul 2026"],
  finebonus:  ["Jarima va Bonuslar", "Sabab va sanasi bilan, shaffof"],
  payroll:    ["Hisob-kitob", "Oylik maoshdan kelib chiqqan to'lov hisobi"],
  profile:    ["Xodim profili", "To'liq ma'lumot"],
  rating:     ["Reyting", "Barcha xodimlarga ochiq — KPI bo'yicha halol saralangan"],
  piece:      ["Donabay ish", "Bajarilgan ish soniga qarab hisoblanadi"],
  orders:     ["Zakazlar", "Mijozlardan tushgan buyurtmalar va savdo"],
  stock:      ["Sklad", "Tovar kirimi, otgruzka va qoldiq"],
  snab:       ["Snabjeniya", "Kontragentlar, zakazlar, to'lovlar va balans"],
  design:     ["Dizayn hisobi", "Brend bo'yicha dizayn haqi — kassir tasdiqlaydi"],
  sales:      ["Sotuv KPI", "Oylik sotuv summasiga qarab bosqichli foiz"],
  assistant:  ["Assistent", "Ma'lumotlardan aniq hisoblab javob beradi"],
};
let PROFILE_ID = null;
function viewEmp(id){ PROFILE_ID = id; go("profile"); }

function render(){
  renderNav();
  const [t, s] = TITLES[PAGE];
  $("#pageTitle").textContent = t;
  $("#pageSub").textContent = s;
  const fn = { dashboard: pgDashboard, me: pgMe, employees: pgEmployees,
               tasks: pgTasks, attendance: pgAttendance, finebonus: pgFineBonus,
               payroll: pgPayroll, profile: pgProfile, rating: pgRating, piece: pgPiece, orders: pgOrders, assistant: pgAssistant, stock: pgStock, snab: pgSnab, design: pgDesign, sales: pgSales }[PAGE];
  $("#page").innerHTML = fn();
  renderBell();
  saveState();
}

/* ---------- XODIM PROFILI (admin/rahbar/boshliq uchun to'liq sahifa) ---------- */
function pgProfile(){
  const e = empById(PROFILE_ID);
  if (!e || !scopeEmployees().some(x => String(x.id) === String(e.id))) { go("employees"); return ""; }
  const earn = earnedToDate(e);
  const d = e.dept ? deptById(e.dept) : null;
  const myTasks = TASKS.filter(t => String(t.emp) === String(e.id));
  const myFB = empFB(e.id).slice().sort((a,b) => b.date.localeCompare(a.date));
  const att = empAttendance(e.id).slice(-10).reverse();
  const stLbl = { new:"Tushdi", progress:"Jarayonda", review:"Tasdiq kutmoqda", done:"Bajarildi" };
  const stCls = { new:"info", progress:"gold", review:"danger", done:"success", closed:"muted" };
  const contractHtml = contractTag(e.contract);
  const adminBtns = USER.role === "admin"
    ? `<button class="btn ghost sm" onclick="openEmpModal('${e.id}')">Tahrirlash</button>
       <button class="btn ghost sm" onclick="openFBModal('${e.id}')">Jarima/Bonus</button>` : "";
  const docsCard = `
    <h3 class="section-title">📄 Hujjatlar (PDF) <span>rahbariyat va xodimning o'ziga ko'rinadi</span></h3>
    <div class="card">
      ${CLOUD
        ? `<div id="docsList"><div class="empty">Yuklanmoqda...</div></div>
           <div id="docsUpload"></div>`
        : `<div class="empty">Hujjatlar bo'limi Supabase ulanganda ishlaydi (demo rejimda mavjud emas)</div>`}
    </div>`;
  // Pul ko'rsatkichlari: admin/rahbar har kimni; boshliq esa FAQAT o'zini ko'radi
  const seeMoney = USER.role === "admin" || isExec(USER.role) || String(e.id) === String(USER.id);
  const moneyCards = seeMoney ? `
      <div class="card stat"><div class="lbl">${IC.money} Maosh (jarimasiz)</div><div class="val num" style="font-size:19px">${fmtMoney(earn.total)}</div>
        <div class="delta" style="color:var(--muted)">oylik ${fmtMoney(e.salary)} · bonus qo'shilgan</div></div>
      <div class="card stat"><div class="lbl">${IC.down} Jarima (alohida)</div>
        <div class="val num" style="color:var(--danger);font-size:19px">${earn.fine?"−"+fmtMoney(earn.fine):"yo'q"}</div>
        <div class="delta" style="color:var(--muted)">${earn.lateFine?`kechikish ${fmtMoney(earn.lateFine)}`:""}${earn.lateFine&&earn.manualFine?" · ":""}${earn.manualFine?`qo'lda ${fmtMoney(earn.manualFine)}`:""}</div></div>` : "";
  return `
    <div class="card" style="padding:18px;display:flex;gap:15px;align-items:center;flex-wrap:wrap;margin-bottom:15px">
      <button class="btn ghost sm" onclick="go('employees')">← Orqaga</button>
      ${photoEditHtml(e,"lg")}
      <div style="flex:1;min-width:170px"><b style="font-family:'Sora';font-size:17px">${esc(e.name)}</b><br>
        <span style="color:var(--muted);font-size:13px">${esc(e.pos)} ${d ? "· " + d.name : ""}</span><br>
        <span style="display:inline-block;margin-top:6px">${roleTag(e.role)} ${contractHtml}</span></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">${adminBtns}</div>
    </div>
    <div class="grid stats">
      <div class="card stat"><div class="lbl">${IC.dash} KPI</div><div class="val num">${effDetail(e.id).noData ? "—" : efficiency(e.id)+"%"}</div></div>
      <div class="card stat"><div class="lbl">${IC.clock} Ishlagan soat</div><div class="val num">${earn.hours.toFixed(1)}</div>
        <div class="delta" style="color:${earn.diff>=0?"var(--success)":"var(--danger)"}">reja ${earn.planSoFar} · ${earn.diff>=0?"+":"−"}${Math.abs(earn.diff).toFixed(1)}</div></div>
      ${moneyCards}
    </div>
    ${kpiBreakdown(e)}
    ${docsCard}
    <h3 class="section-title">Vazifalari <span>${myTasks.length} ta</span></h3>
    <div class="card">${myTasks.length ? myTasks.map(t => `
      <div class="fb-item"><div class="meta"><b>${esc(t.title)}</b><span>muddat ${uzDate(t.due)}</span></div>
      <span class="tag ${stCls[t.status]}">${stLbl[t.status]}</span></div>`).join("") : `<div class="empty">Vazifa berilmagan</div>`}</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:6px" id="profTwo">
      ${seeMoney ? `<div><h3 class="section-title">Jarima / bonus tarixi</h3>
        <div class="card">${myFB.length ? myFB.map(fbRow).join("") : `<div class="empty">Yozuv yo'q</div>`}</div></div>` : ""}
      <div><h3 class="section-title">So'nggi davomat</h3>
        <div class="card t-wrap"><table>
          <tr><th>Sana</th><th>Kelgan</th><th>Ketgan</th><th>Soat</th></tr>
          ${att.map(a=>`<tr><td>${uzDate(a.date)}</td>
            <td class="num">${a.in} ${a.late?'<span class="tag danger">kech</span>':""}</td>
            <td class="num">${a.out ?? (a.date===TODAY ? "—" : '<span class="tag danger" title="Ketdim bosilmagan — soat hisoblanmaydi">yo\'q ⚠️</span>')}</td>
            <td class="num">${a.out ? workedHours(a).toFixed(1) : "—"}</td></tr>`).join("") || "<tr><td colspan='4' class='empty'>Yo'q</td></tr>"}
        </table></div></div>
    </div>
    <style>@media(max-width:900px){#profTwo{grid-template-columns:1fr!important}}</style>`;
}
// Profil ochilganda hujjatlar ro'yxatini yuklash
const _origRender = render;
function pageSubWithMonth(){
  const el = document.getElementById("pageSub"); if (!el) return;
  if (["dashboard","attendance","payroll","finebonus","rating","piece","orders"].includes(PAGE))
    el.textContent = (isArchive() ? "📁 " : "") + monthLabel() + " · " + (el.textContent || "");
}
function fillMonthSel(){
  const sel = document.getElementById("monthSel"); if (!sel) return;
  sel.innerHTML = monthOptions().map(ym => `<option value="${ym}" ${ym===VIEW_MONTH?"selected":""}>${ym===CUR_MONTH?"📅 ":"📁 "}${monthLabel(ym)}</option>`).join("");
  sel.classList.toggle("archive", isArchive());
}
function archiveBar(){
  if (!isArchive()) return "";
  return `<div class="archive-bar">📁 Arxiv rejimi — <b>${monthLabel()}</b> ma'lumotlari (faqat ko'rish)
    <button class="btn ghost sm" onclick="setViewMonth(CUR_MONTH)">Joriy oyga qaytish</button></div>`;
}
render = function(){ _origRender();
  fillMonthSel(); pageSubWithMonth();
  // Arxiv banneri: oyga bog'liq sahifalarda
  if (isArchive() && ["dashboard","me","attendance","payroll","finebonus","rating","piece","orders"].includes(PAGE)) {
    const pg = document.getElementById("page");
    if (pg && !pg.querySelector(".archive-bar")) pg.insertAdjacentHTML("afterbegin", archiveBar());
  }
  if (PAGE === "profile" && CLOUD) loadDocs(PROFILE_ID);
  if (PAGE === "me" && CLOUD) loadDocs(USER.id);
  if (PAGE === "rating" && CLOUD) loadRating();
  if (PAGE === "assistant") aiCheck().then(on => { const b = document.getElementById("aiBadge"); if (b) { b.textContent = on ? "🟢 Gemini AI ulangan" : (CLOUD ? "⚪ AI yo'q — mahalliy hisoblovchi" : "demo"); b.className = "tag " + (on ? "success" : "muted"); } });
};

/* --- Hujjatlar (Supabase Storage) --- */
let DOC_TYPES = [], EMP_DOCS = [];
async function loadDocTypes(){
  if (!CLOUD) return;
  const [dt, ed] = await Promise.all([
    sb.from("doc_types").select("*").order("sort"),
    sb.from("emp_docs").select("*"),
  ]);
  if (dt.data) DOC_TYPES = dt.data.map(d => ({ id: d.id, name: d.name, required: d.required, sort: d.sort }));
  if (ed.data) EMP_DOCS = ed.data.map(d => ({ emp: d.emp, file: d.file,
    types: (d.doc_types && d.doc_types.length) ? d.doc_types : (d.doc_type ? [d.doc_type] : []) }));
}
/* Xodimda qaysi majburiy hujjatlar bor / yetishmayapti */
function docStatus(empId){
  const req = DOC_TYPES.filter(d => d.required);
  const mine = EMP_DOCS.filter(d => String(d.emp) === String(empId));
  // Bitta fayl ichida bir nechta hujjat bo'lishi mumkin — belgilangan barcha turlarni yig'amiz
  const covered = new Set();
  mine.forEach(m => (m.types || []).forEach(t => covered.add(String(t))));
  const have = req.filter(r => covered.has(String(r.id)));
  const missing = req.filter(r => !covered.has(String(r.id)));
  return { total: req.length, have: have.length, missing, ok: req.length > 0 && missing.length === 0 };
}
async function loadDocs(empId){
  const el = document.getElementById("docsList"); if (!el) return;
  await loadDocTypes();
  const { data, error } = await sb.storage.from("docs").list(String(empId), { sortBy: { column: "name" } });
  if (error) { el.innerHTML = `<div class="empty">Xatolik: ${esc(error.message)}</div>`; return; }
  const files = (data || []).filter(f => f.name !== ".emptyFolderPlaceholder");
  const st = docStatus(empId);
  const typesOf = fname => {
    const rec = EMP_DOCS.find(d => String(d.emp) === String(empId) && d.file === fname);
    if (!rec || !rec.types) return [];
    return rec.types.map(t => DOC_TYPES.find(x => String(x.id) === String(t))).filter(Boolean);
  };
  const checklist = DOC_TYPES.length ? `
    <div style="margin-bottom:11px;padding:10px 12px;border-radius:12px;background:var(--surface2)">
      <b style="font-size:12.5px">Hujjatlar to'liqligi: ${st.have}/${st.total}
        ${st.ok ? `<span class="tag success">to'liq ✓</span>` : `<span class="tag danger">${st.missing.length} ta yetishmaydi</span>`}</b>
      ${st.missing.length ? `<div style="font-size:12px;color:var(--muted);margin-top:5px">Yetishmayapti: ${st.missing.map(m=>esc(m.name)).join(", ")}</div>` : ""}
    </div>` : "";
  // Yuklash bloki (checkbox ro'yxati) — DOC_TYPES yuklangandan KEYIN render qilinadi
  const up = document.getElementById("docsUpload");
  if (up && USER.role === "admin") {
    up.innerHTML = `<div style="padding:12px 16px;border-top:1px solid var(--line)">
      <div style="font-size:12px;color:var(--muted);margin-bottom:7px">
        Bu fayl ichida qaysi hujjatlar bor? Belgilang, keyin faylni tanlang.
        ${DOC_TYPES.length ? "" : "<b style='color:var(--danger)'>Hujjat turlari ro'yxati bo'sh — Xodimlar → 📄 Hujjatlar ro'yxati dan qo'shing.</b>"}</div>
      <div class="emp-pick" style="margin-bottom:10px">${DOC_TYPES.map(d=>`
        <label class="pick-chip"><input type="checkbox" class="docTypeChk" value="${d.id}"><span>${esc(d.name)}${d.required?" *":""}</span></label>`).join("")}</div>
      <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
        <label class="btn ghost sm" style="cursor:pointer">📤 Fayl yuklash
          <input type="file" accept="application/pdf,.pdf,.jpg,.jpeg,.png" style="display:none" onchange="uploadDoc('${empId}', this)"></label>
        <span style="font-size:11.5px;color:var(--muted)">PDF yoki rasm, 10 MB gacha</span></div>
    </div>`;
  }
  el.innerHTML = checklist + (files.length ? files.map(f => {
    const tl = typesOf(f.name);
    const title = tl.length ? tl.map(t=>esc(t.name)).join(" + ") : esc(f.name);
    return `<div class="fb-item"><div class="fb-icon" style="background:var(--info-soft);color:var(--info)">📄</div>
      <div class="meta"><b>${title}</b><span>${tl.length ? esc(f.name)+" · " : ""}${f.metadata ? Math.max(1, Math.round(f.metadata.size/1024))+" KB" : ""}${tl.length>1?` · ${tl.length} ta hujjat bitta faylda`:""}</span></div>
      ${USER.role==="admin" ? `<button class="btn ghost sm" title="Ichidagi hujjatlarni belgilash" data-e="${empId}" data-n="${encodeURIComponent(f.name)}" onclick="openDocTag(this.dataset.e, decodeURIComponent(this.dataset.n))">🏷</button>` : ""}
      <button class="btn ghost sm" data-e="${empId}" data-n="${encodeURIComponent(f.name)}"
        onclick="downloadDoc(this.dataset.e, decodeURIComponent(this.dataset.n))">⬇</button>
      ${USER.role === "admin" ? `<button class="btn sm" style="color:var(--danger)" data-e="${empId}" data-n="${encodeURIComponent(f.name)}"
        onclick="deleteDoc(this.dataset.e, decodeURIComponent(this.dataset.n))">✕</button>` : ""}</div>`;
  }).join("") : `<div class="empty">Hujjat yuklanmagan</div>`);
}
/* Fayl nomini Supabase Storage qabul qiladigan holatga keltirish.
   Sabab: o'zbek/rus harflari, bo'shliq va maxsus belgilar "Invalid key" xatosini beradi. */
function safeFileName(name){
  const dot = name.lastIndexOf(".");
  let base = dot > 0 ? name.slice(0, dot) : name;
  let ext  = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const map = { "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"j","з":"z","и":"i",
    "й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u",
    "ф":"f","х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sch","ъ":"","ы":"i","ь":"","э":"e","ю":"yu","я":"ya",
    "ў":"o","қ":"q","ғ":"g","ҳ":"h","ʻ":"","ʼ":"","'":"","'":"","'":"" };
  base = base.toLowerCase().split("").map(ch => map[ch] !== undefined ? map[ch] : ch).join("");
  base = base.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!base) base = "hujjat";
  base = base.slice(0, 60);
  ext = ext.replace(/[^a-z0-9]/g, "").slice(0, 8);
  return ext ? `${base}.${ext}` : base;
}
async function uploadDoc(empId, input){
  const file = input.files[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) { input.value=""; return toast("Fayl 10 MB dan katta"); }
  toast("Yuklanmoqda...");
  const picked = [...document.querySelectorAll(".docTypeChk:checked")].map(i => +i.value);
  const clean = safeFileName(file.name);
  const stamped = Date.now().toString(36) + "-" + clean; // nom to'qnashuvining oldini oladi
  const { error } = await sb.storage.from("docs")
    .upload(`${empId}/${stamped}`, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  input.value = "";
  if (error) return toast("Yuklanmadi: " + error.message);
  // Hujjat turlarini belgilash
  if (picked.length) {
    const { data: d2, error: e2 } = await sb.from("emp_docs")
      .upsert({ emp: empId, doc_types: picked, doc_type: picked[0], file: stamped }, { onConflict: "emp,file" })
      .select();
    if (e2) { toast("Turlar belgilanmadi: " + e2.message); }
    else if (!d2 || !d2.length) { toast(permErrMsg("Turlar yozilmadi", "supabase-update-15.sql")); }
    else {
      // Mahalliy ro'yxatni darrov yangilaymiz (bazani kutmasdan)
      EMP_DOCS = EMP_DOCS.filter(x => !(String(x.emp)===String(empId) && x.file===stamped));
      EMP_DOCS.push({ emp: empId, file: stamped, types: picked });
      const names = picked.map(p => DOC_TYPES.find(t=>String(t.id)===String(p))?.name).filter(Boolean);
      toast(`Yuklandi ✓ Belgilandi: ${names.join(", ")}`);
    }
  } else {
    toast("Yuklandi ✓ (hujjat turi belgilanmadi — 🏷 tugmasi bilan keyin belgilashingiz mumkin)");
  }
  await loadDocs(empId);
  render();
}
async function downloadDoc(empId, name){
  const { data, error } = await sb.storage.from("docs").createSignedUrl(`${empId}/${name}`, 300);
  if (error || !data) return toast("Ochib bo'lmadi: " + (error?.message || ""));
  window.open(data.signedUrl, "_blank");
}
async function deleteDoc(empId, name){
  const { error } = await sb.storage.from("docs").remove([`${empId}/${name}`]);
  if (error) return toast("Xatolik: " + error.message);
  toast("Hujjat o'chirildi"); loadDocs(empId);
}

