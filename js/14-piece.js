/* ===== GM Pulse · 14-piece.js — Donabay ish ===== */
/* ---------- DONABAY ISH (Karona) ---------- */
let PIECE_JOBS = [], PIECE_ENTRIES = [];
async function loadPiece(){
  if (!CLOUD) return;
  const [pj, pe] = await Promise.all([
    sb.from("piece_jobs").select("*").order("sort"),
    sb.from("piece_entries").select("*").gte("date", viewMonthStart()).lte("date", viewMonthEnd()).order("date", { ascending:false }),
  ]);
  if (pj.data) PIECE_JOBS = pj.data.map(j => ({ id:j.id, name:j.name, price:+j.price, unit:j.unit||"dona", active:j.active, sort:j.sort }));
  if (pe.data) PIECE_ENTRIES = pe.data.map(x => ({ id:x.id, emp:x.emp, date:x.date, job:x.job, qty:+x.qty, price:+x.price, note:x.note, status:x.status||'pending' }));
}
function monthStartIso(){ const d = new Date(); return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1)); }
/* Donabay bo'yicha oylik jami */
function pieceTotal(empId){
  return PIECE_ENTRIES.filter(x => String(x.emp) === String(empId) && x.status === "approved")
    .reduce((s,x) => s + x.qty * x.price, 0);
}
function piecePending(empId){
  return PIECE_ENTRIES.filter(x => String(x.emp) === String(empId) && x.status === "pending")
    .reduce((s,x) => s + x.qty * x.price, 0);
}
/* Kim tasdiqlaydi: bo'lim boshlig'i (o'z xodimi), rahbariyat, admin */
function canApprovePiece(empId){ return canApproveOT({ emp: empId }); }
async function decidePiece(id, status){
  const x = PIECE_ENTRIES.find(p => String(p.id) === String(id)); if (!x) return;
  if (!canApprovePiece(x.emp)) return toast("Sizda tasdiqlash huquqi yo'q");
  if (CLOUD) {
    const { data, error } = await sb.from("piece_entries").update({ status, decided_by: USER.id, decided_at: new Date().toISOString() }).eq("id", x.id).select();
    if (error) return toast("Xatolik: " + error.message);
    if (!data || !data.length) return toast(permErr("supabase-update-19.sql"));
  }
  x.status = status;
  toast(status === "approved" ? "Tasdiqlandi ✓ — hisobga qo'shildi" : "Rad etildi");
  render();
  const mb = document.getElementById("modalBox");
  if (mb && document.getElementById("modalBg")?.classList.contains("open") && mb.innerHTML.includes("donabay ish")) openPieceEmp(x.emp);
}
async function decidePieceDay(empId, date, status){
  const list = PIECE_ENTRIES.filter(p => String(p.emp)===String(empId) && p.date===date && p.status==="pending");
  for (const x of list) await decidePiece(x.id, status);
}
/* Kim donabay ma'lumotini ko'ra oladi: o'zi, bo'lim boshlig'i, rahbariyat, admin */
function canSeePiece(empId){
  if (String(USER.id) === String(empId)) return true;
  if (USER.role === "admin" || isExec(USER.role)) return true;
  return USER.role === "boshliq" && String(empById(empId)?.dept) === String(USER.dept);
}
/* Donabay xodimlari (admin belgilaydi) */
function pieceEmployees(){ return EMPLOYEES.filter(e => e.piecework); }

function pgPiece(){
  const isAdmin = USER.role === "admin";
  const me = USER.piecework;
  // Ko'rinadigan xodimlar: o'zi (agar donabay bo'lsa) + boshqaruv doirasi
  const list = pieceEmployees().filter(e => canSeePiece(e.id));
  const adminBar = isAdmin
    ? `<div class="filters"><button class="btn primary" onclick="openPieceJobs()">📋 Ishlar va narxlar</button>
       <button class="btn ghost" onclick="openPieceEmps()">👥 Kim donabay ishlaydi</button></div>` : "";

  // Xodimning o'z kiritish bloki
  const myBlock = me ? (() => {
    const today = PIECE_ENTRIES.filter(x => String(x.emp)===String(USER.id) && x.date===TODAY);
    const todaySum = today.reduce((s,x)=>s+x.qty*x.price,0);
    const monthSum = pieceTotal(USER.id);
    return `
    <div class="grid stats" style="margin-bottom:15px">
      <div class="card stat"><div class="lbl">${IC.money} Bugun</div><div class="val num">${fmtMoney(todaySum)}</div>
        <div class="delta" style="color:var(--muted)">${today.length} ta yozuv</div></div>
      <div class="card stat"><div class="lbl">${IC.up} Shu oy (tasdiqlangan)</div><div class="val num" style="color:var(--success)">${fmtMoney(monthSum)}</div>
        <div class="delta" style="color:${piecePending(USER.id)?"var(--gold)":"var(--muted)"}">${piecePending(USER.id)?"tasdiq kutmoqda: "+fmtMoney(piecePending(USER.id)):"donabay ish haqi"}</div></div>
    </div>
    ${isArchive() ? "" : `<div class="card" style="padding:16px;margin-bottom:15px">
      <b style="font-size:14px">➕ Bugungi ishni yozish</b>`}
      <div style="font-size:12px;color:var(--muted);margin:5px 0 11px">Kechqurun qaysi ishdan nechta qilganingizni kiriting</div>
      ${PIECE_JOBS.filter(j=>j.active).length ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <div style="flex:2;min-width:170px"><label>Ish turi</label>
            <select id="peJob">${PIECE_JOBS.filter(j=>j.active).map(j=>`
              <option value="${j.id}">${esc(j.name)} — ${fmtMoney(j.price)}/${esc(j.unit)}</option>`).join("")}</select></div>
          <div style="flex:1;min-width:95px"><label>Soni</label>
            <input id="peQty" type="number" min="0" step="1" value="1"></div>
          <div style="flex:2;min-width:150px"><label>Sana</label>
            <input id="peDate" type="date" value="${TODAY}" max="${TODAY}"></div>
          <button class="btn primary" onclick="addPiece()">Qo'shish</button>
        </div>`
        : `<div class="empty">Ishlar ro'yxati hali kiritilmagan — admin qo'shishi kerak</div>`}
    ${isArchive() ? "" : "</div>"}
    <h3 class="section-title">${isArchive() ? monthLabel() + " yozuvlarim" : "Mening yozuvlarim"}</h3>
    ${pieceTable(USER.id, true)}` ;
  })() : "";

  // Boshqaruv: har bir donabay xodim bo'yicha jamlanma
  const others = list.filter(e => String(e.id) !== String(USER.id));
  const mgmt = (isAdmin || isExec(USER.role) || USER.role === "boshliq") && others.length ? `
    <h3 class="section-title" style="margin-top:18px">Donabay xodimlar (shu oy)</h3>
    <div class="card">${others.map(e => {
      const sum = pieceTotal(e.id);
      const cnt = PIECE_ENTRIES.filter(x=>String(x.emp)===String(e.id)).length;
      const pend = PIECE_ENTRIES.filter(x=>String(x.emp)===String(e.id) && x.status==="pending").length;
      return `<div class="fb-item" style="cursor:pointer" onclick="openPieceEmp('${e.id}')">
        ${avatarHtml(e,"sm")}
        <div class="meta"><b>${esc(e.name)} ${pend?`<span class="tag gold">${pend} ta tasdiq kutmoqda</span>`:""}</b><span>${esc(e.pos)} · ${cnt} ta yozuv</span></div>
        <div class="amount num" style="color:var(--success)">${fmtMoney(sum)}</div></div>`;
    }).join("")}</div>` : "";

  if (!me && !others.length && !isAdmin)
    return `<div class="card empty">Sizda donabay ish yo'q</div>`;
  return adminBar + myBlock + mgmt;
}
function pieceTable(empId, own){
  const rows = PIECE_ENTRIES.filter(x => String(x.emp) === String(empId))
    .sort((a,b)=>b.date.localeCompare(a.date));
  if (!rows.length) return `<div class="card empty">Hali yozuv yo'q</div>`;
  const byDate = {};
  rows.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  return Object.keys(byDate).sort((a,b)=>b.localeCompare(a)).map(date => {
    const list = byDate[date];
    const sum = list.reduce((s,x)=>s+x.qty*x.price,0);
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:9px;padding:11px 15px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <b style="font-size:13.5px">${uzDate(date)}</b>
        ${list.some(x=>x.status==="pending") && canApprovePiece(empId) && !isArchive()
          ? `<button class="btn success sm" onclick="decidePieceDay('${empId}','${date}','approved')">✓ Kunni tasdiqlash</button>` : ""}
        <span class="num" style="margin-left:auto;font-weight:800;color:var(--success)">${fmtMoney(list.filter(x=>x.status==="approved").reduce((s,x)=>s+x.qty*x.price,0))}</span></div>
      ${list.map(x => { const j = PIECE_JOBS.find(y=>String(y.id)===String(x.job));
        const st = x.status || "pending";
        const stTag = st==="approved" ? '<span class="tag success">✓</span>' : st==="rejected" ? '<span class="tag danger">rad</span>' : '<span class="tag gold">kutmoqda</span>';
        const appr = st==="pending" && canApprovePiece(x.emp) && !isArchive()
          ? `<button class="btn success sm" onclick="decidePiece('${x.id}','approved')">✓</button>
             <button class="btn ghost sm" onclick="decidePiece('${x.id}','rejected')">✗</button>` : "";
        return `<div class="fb-item">
          <div class="fb-icon" style="background:var(--accent-soft);color:var(--accent)">📦</div>
          <div class="meta"><b>${j?esc(j.name):"—"} ${stTag}</b><span>${x.qty} ${j?esc(j.unit):"dona"} × ${fmtMoney(x.price)}</span></div>
          <div class="amount num" style="${st!=="approved"?"color:var(--muted)":""}">${fmtMoney(x.qty*x.price)}</div>
          ${appr}
          ${(own && st==="pending") || USER.role==="admin" ? `<button class="btn sm" style="color:var(--danger)" onclick="delPiece('${x.id}')">✕</button>` : ""}
        </div>`; }).join("")}
    </div>`;
  }).join("");
}
function openPieceEmp(empId){
  const e = empById(empId); if (!e || !canSeePiece(empId)) return;
  openModal(`<h3>${esc(e.name)} — donabay ish</h3>
    <div class="sub">Shu oy jami: <b style="color:var(--success)">${fmtMoney(pieceTotal(empId))}</b></div>
    <div style="margin-top:12px;max-height:55vh;overflow-y:auto">${pieceTable(empId, false)}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function addPiece(){
  const jobId = $("#peJob").value, qty = +$("#peQty").value || 0, date = $("#peDate").value;
  if (!jobId) return toast("Ish turini tanlang");
  if (qty <= 0) return toast("Sonini kiriting");
  const job = PIECE_JOBS.find(j => String(j.id) === String(jobId));
  const rec = { emp: USER.id, date, job: +jobId, qty, price: job.price, status: "pending" };
  if (CLOUD) {
    const { data, error } = await sb.from("piece_entries")
      .insert({ emp: USER.id, date, job: +jobId, qty, price: job.price }).select().single();
    if (error) return toast("Xatolik: " + error.message);
    rec.id = data.id;
  } else rec.id = Date.now();
  PIECE_ENTRIES.push(rec);
  toast(`${esc(job.name)}: ${qty} ${job.unit} = ${fmtMoney(qty*job.price)} — boshliq tasdig'iga yuborildi`);
  render();
}
async function delPiece(id){
  if (CLOUD) {
    const { error } = await sb.from("piece_entries").delete().eq("id", id);
    if (error) return toast("Xatolik: " + error.message);
  }
  PIECE_ENTRIES = PIECE_ENTRIES.filter(x => String(x.id) !== String(id));
  closeModal(); toast("O'chirildi"); render();
}
/* ADMIN: ishlar ro'yxati va narxlari */
function openPieceJobs(){
  openModal(`<h3>📋 Donabay ishlar va narxlari</h3>
    <div class="sub">Xodimlar shu ro'yxatdan tanlab, sonini kiritadi</div>
    <div style="margin-top:12px">${PIECE_JOBS.map(j=>`
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:13px">
        <span style="flex:1">${esc(j.name)}</span>
        <b class="num">${fmtMoney(j.price)}</b><span style="font-size:11px;color:var(--muted)">/${esc(j.unit)}</span>
        <button class="btn sm" style="color:var(--danger)" onclick="delPieceJob('${j.id}')">✕</button>
      </div>`).join("") || `<div class="empty" style="padding:10px">Ro'yxat bo'sh</div>`}</div>
    <div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px">
      <label>Ish nomi</label><input id="pjName" placeholder="masalan: Karobka yig'ish">
      <div style="display:flex;gap:9px">
        <div style="flex:2"><label>1 dona narxi (so'm)</label><input id="pjPrice" type="number" min="0" step="500" value="1000"></div>
        <div style="flex:1"><label>Birlik</label><input id="pjUnit" value="dona"></div>
      </div>
      <button class="btn primary sm" style="margin-top:10px" onclick="addPieceJob()">Qo'shish</button>
    </div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function addPieceJob(){
  const name = $("#pjName").value.trim(), price = +$("#pjPrice").value || 0, unit = $("#pjUnit").value.trim() || "dona";
  if (!name) return toast("Ish nomini kiriting");
  if (CLOUD) {
    const { data, error } = await sb.from("piece_jobs")
      .insert({ name, price, unit, sort: PIECE_JOBS.length + 1 }).select().single();
    if (error) return toast("Xatolik: " + error.message);
    PIECE_JOBS.push({ id:data.id, name, price, unit, active:true, sort:PIECE_JOBS.length+1 });
  } else PIECE_JOBS.push({ id:Date.now(), name, price, unit, active:true, sort:PIECE_JOBS.length+1 });
  toast("Qo'shildi ✓"); openPieceJobs();
}
async function delPieceJob(id){
  if (CLOUD) {
    const { error } = await sb.from("piece_jobs").delete().eq("id", id);
    if (error) return toast("Xatolik: " + error.message + " (bu ishga yozuvlar bog'langan bo'lishi mumkin)");
  }
  PIECE_JOBS = PIECE_JOBS.filter(j => String(j.id) !== String(id));
  toast("O'chirildi"); openPieceJobs();
}
/* ADMIN: kim donabay ishlaydi */
function openPieceEmps(){
  const list = EMPLOYEES.filter(e => e.role !== "admin");
  openModal(`<h3>👥 Kim donabay ishlaydi</h3>
    <div class="sub">Belgilangan xodimlarda "Donabay ish" bo'limi ochiladi</div>
    <div class="emp-pick" style="margin-top:11px;max-height:50vh">${list.map(e=>`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:13px;width:100%">
        <input type="checkbox" class="pwChk" value="${e.id}" ${e.piecework?"checked":""} style="width:auto">
        <span style="flex:1">${esc(e.name)}</span>
        <select class="pwKind" data-id="${e.id}" style="width:auto;font-size:12px">
          <option value="work" ${e.pieceKind!=="design"?"selected":""}>Ishlab chiqarish (donabay)</option>
          <option value="design" ${e.pieceKind==="design"?"selected":""}>Dizayner (brend bo'yicha)</option></select></div>`).join("")}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor</button>
    <button class="btn primary" onclick="savePieceEmps()">Saqlash</button></div>`);
}
async function savePieceEmps(){
  const on = new Set([...document.querySelectorAll(".pwChk:checked")].map(i => i.value));
  const kinds = {}; document.querySelectorAll(".pwKind").forEach(sel => kinds[sel.dataset.id] = sel.value);
  for (const e of EMPLOYEES.filter(x => x.role !== "admin")) {
    const want = on.has(String(e.id)), kind = kinds[String(e.id)] || "work";
    if (!!e.piecework === want && (e.pieceKind||"work") === kind) continue;
    if (CLOUD) {
      const { error } = await sb.from("profiles").update({ piecework: want, piece_kind: kind }).eq("id", e.id);
      if (error) { toast("Xatolik: " + error.message); return; }
    }
    e.piecework = want; e.pieceKind = kind;
    if (String(USER.id) === String(e.id)) { USER.piecework = want; USER.pieceKind = kind; }
  }
  closeModal(); toast("Saqlandi ✓"); render();
}

