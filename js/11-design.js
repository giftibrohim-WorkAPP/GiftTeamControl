/* ===== GM Pulse · 11-design.js — Dizayner hisobi ===== */
/* ================= DIZAYNER HISOBI (3 brend) ================= */
let DESIGN_BRANDS = [], DESIGN_ENTRIES = [];
function isDesigner(e){ return e && e.piecework && e.pieceKind === "design"; }
function isKassir(){ return USER.role === "admin" || isExec(USER.role) || USER.snabRole === "kassir"; }
async function loadDesign(){
  if (!CLOUD) return;
  const [br, en] = await Promise.all([
    sb.from("design_brands").select("*").order("sort"),
    sb.from("design_entries").select("*").gte("date", viewMonthStart()).lte("date", viewMonthEnd()).order("date", { ascending:false }),
  ]);
  if (br.data) DESIGN_BRANDS = br.data.map(b => ({ id:b.id, name:b.name, price:+b.price, active:b.active }));
  if (en.data) DESIGN_ENTRIES = en.data.map(x => ({ id:x.id, emp:x.emp, date:x.date, brand:x.brand, price:+x.price, note:x.note, status:x.status||"pending" }));
}
function designTotal(empId, onlyApproved=true){
  return DESIGN_ENTRIES.filter(x => String(x.emp)===String(empId) && (!onlyApproved || x.status==="approved")).reduce((s,x)=>s+x.price,0);
}
/* Brendlar bo'yicha jamlanma: {brendId: {n, sum}} */
function designByBrand(empId){
  const out = {};
  DESIGN_ENTRIES.filter(x => String(x.emp)===String(empId) && x.status==="approved").forEach(x => {
    out[x.brand] = out[x.brand] || { n:0, sum:0 }; out[x.brand].n++; out[x.brand].sum += x.price; });
  return out;
}
function pgDesign(){
  const me = isDesigner(USER);
  const canSeeAll = USER.role === "admin" || isExec(USER.role) || isKassir();
  if (!me && !canSeeAll) return `<div class="card empty">Bu bo'lim faqat dizaynerlar va rahbariyat uchun</div>`;
  const adminBar = USER.role === "admin" ? `<div class="filters"><button class="btn primary sm" onclick="openDesignBrands()">🎨 Brendlar va narxlar</button></div>` : "";
  const brandCards = (empId) => { const bb = designByBrand(empId);
    return `<div class="grid stats" style="margin-bottom:14px">${DESIGN_BRANDS.map(b => { const v = bb[b.id]||{n:0,sum:0};
      return `<div class="card stat"><div class="lbl">🎨 ${esc(b.name)}</div><div class="val num">${v.n}<small style="font-size:12px;color:var(--muted);font-weight:600"> ta</small></div>
        <div class="delta" style="color:var(--success)">${fmtMoney(v.sum)} so'm</div></div>`; }).join("")}
      <div class="card stat"><div class="lbl">${IC.money} Jami (tasdiqlangan)</div><div class="val num" style="color:var(--success);font-size:19px">${fmtMoney(designTotal(empId))}</div>
        <div class="delta" style="color:${designTotal(empId,false)-designTotal(empId)>0?"var(--gold)":"var(--muted)"}">${designTotal(empId,false)-designTotal(empId)>0?"tasdiq kutmoqda: "+fmtMoney(designTotal(empId,false)-designTotal(empId)):monthLabelLow()}</div></div></div>`; };
  const myBlock = me ? `${brandCards(USER.id)}
    ${!isArchive() ? `<div class="card" style="padding:16px;margin-bottom:15px">
      <b style="font-size:14px">➕ Dizayn yozish</b>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:10px">
        <div style="flex:1;min-width:140px"><label>Brend</label><select id="dsBrand">${DESIGN_BRANDS.filter(b=>b.active).map(b=>`<option value="${b.id}">${esc(b.name)} — ${fmtMoney(b.price)}</option>`).join("")}</select></div>
        <div style="flex:2;min-width:180px"><label>Izoh (qaysi firma / dizayn nomi)</label><input id="dsNote" placeholder="masalan: Mega do'kon — banner"></div>
        <div style="flex:1;min-width:130px"><label>Sana</label><input id="dsDate" type="date" value="${TODAY}" max="${TODAY}"></div>
        <button class="btn primary" onclick="addDesign()">Qo'shish</button></div>
      ${DESIGN_BRANDS.some(b=>!b.price) ? `<div style="font-size:11.5px;color:var(--gold);margin-top:8px">⚠️ Ba'zi brendlar narxi 0 — admin "Brendlar va narxlar"da kiritishi kerak</div>` : ""}
    </div>` : ""}
    <h3 class="section-title">Mening dizaynlarim</h3>${designTable(USER.id, true)}` : "";
  const designers = EMPLOYEES.filter(e => isDesigner(e) && String(e.id)!==String(USER.id));
  const mgmt = canSeeAll && designers.length ? `<h3 class="section-title" style="margin-top:18px">Dizaynerlar (${monthLabelLow()})</h3>
    <div class="card">${designers.map(e => { const pend = DESIGN_ENTRIES.filter(x=>String(x.emp)===String(e.id)&&x.status==="pending").length;
      const pendToday = DESIGN_ENTRIES.filter(x=>String(x.emp)===String(e.id)&&x.status==="pending"&&x.date===TODAY).length;
      return `<div class="fb-item" style="cursor:pointer" onclick="openDesignEmp('${e.id}')">${avatarHtml(e,"sm")}
        <div class="meta"><b>${esc(e.name)} ${pend?`<span class="tag gold">${pend} ta kutmoqda${pendToday&&pendToday!==pend?` (bugun ${pendToday})`:""}</span>`:""}</b>
          <span>${DESIGN_BRANDS.map(b=>`${esc(b.name)}: ${(designByBrand(e.id)[b.id]||{n:0}).n}`).join(" · ")}</span></div>
        <div class="amount num" style="color:var(--success)">${fmtMoney(designTotal(e.id))}</div></div>`; }).join("")}</div>` : "";
  const emptyHint = !me && canSeeAll && !designers.length
    ? `<div class="card empty">Dizayner topilmadi. Admin "Donabay → Kim donabay ishlaydi"da xodimni "Dizayner" deb belgilashi kerak${USER.snabRole==="kassir"&&USER.role!=="admin"?" (va supabase-update-22.sql Run qilingan bo'lishi kerak)":""}</div>` : "";
  return adminBar + myBlock + mgmt + emptyHint;
}
function designTable(empId, own){
  const rows = DESIGN_ENTRIES.filter(x => String(x.emp)===String(empId)).sort((a,b)=>b.date.localeCompare(a.date));
  if (!rows.length) return `<div class="card empty">Hali yozuv yo'q</div>`;
  const byDate = {}; rows.forEach(r => { (byDate[r.date]=byDate[r.date]||[]).push(r); });
  return Object.keys(byDate).sort((a,b)=>b.localeCompare(a)).map(date => { const list = byDate[date];
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:9px;padding:11px 15px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <b style="font-size:13.5px">${uzDate(date)}</b>
        ${list.some(x=>x.status==="pending") && isKassir() && !isArchive() ? `<button class="btn success sm" onclick="decideDesignDay('${empId}','${date}','approved')">✓ Kunni tasdiqlash</button>` : ""}
        <span class="num" style="margin-left:auto;font-weight:800;color:var(--success)">${fmtMoney(list.filter(x=>x.status==="approved").reduce((s,x)=>s+x.price,0))}</span></div>
      ${list.map(x => { const b = DESIGN_BRANDS.find(y=>String(y.id)===String(x.brand)); const st = x.status;
        const stTag = st==="approved"?'<span class="tag success">✓</span>':st==="rejected"?'<span class="tag danger">rad</span>':'<span class="tag gold">kutmoqda</span>';
        return `<div class="fb-item"><div class="fb-icon" style="background:var(--accent-soft);color:var(--accent)">🎨</div>
          <div class="meta"><b>${b?esc(b.name):"—"} ${stTag}</b><span>${esc(x.note||"")}</span></div>
          <div class="amount num" style="${st!=="approved"?"color:var(--muted)":""}">${fmtMoney(x.price)}</div>
          ${st==="pending" && isKassir() && !isArchive() ? `<button class="btn success sm" onclick="decideDesign('${x.id}','approved')">✓</button><button class="btn ghost sm" onclick="decideDesign('${x.id}','rejected')">✗</button>` : ""}
          ${(own && st==="pending") || USER.role==="admin" ? `<button class="btn sm" style="color:var(--danger)" onclick="delDesign('${x.id}')">✕</button>` : ""}</div>`; }).join("")}</div>`; }).join("");
}
function openDesignEmp(empId){ const e = empById(empId); if (!e) return;
  openModal(`<h3>${esc(e.name)} — dizaynlar</h3><div class="sub">${DESIGN_BRANDS.map(b=>`${esc(b.name)}: ${(designByBrand(empId)[b.id]||{n:0,sum:0}).n} ta / ${fmtMoney((designByBrand(empId)[b.id]||{sum:0}).sum)}`).join(" · ")}<br>Jami: <b style="color:var(--success)">${fmtMoney(designTotal(empId))}</b></div>
    <div style="margin-top:12px;max-height:55vh;overflow-y:auto">${designTable(empId,false)}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`); }
async function addDesign(){
  const brandId = $("#dsBrand").value, note = $("#dsNote").value.trim(), date = $("#dsDate").value;
  if (!brandId) return toast("Brendni tanlang"); if (!note) return toast("Izoh yozing (qaysi firma / dizayn nomi)");
  const b = DESIGN_BRANDS.find(x=>String(x.id)===String(brandId));
  const rec = { emp:USER.id, date, brand:+brandId, price:b.price, note, status:"pending" };
  if (CLOUD) { const { data, error } = await sb.from("design_entries").insert({ emp:USER.id, date, brand:+brandId, price:b.price, note }).select().single(); if (error) return toast("Xatolik: "+error.message); rec.id = data.id; } else rec.id = Date.now();
  DESIGN_ENTRIES.push(rec); $("#dsNote").value = "";
  toast(`${b.name}: ${fmtMoney(b.price)} — kassir tasdig'iga yuborildi`); render();
}
let __designBusy = false;
async function decideDesign(id, status, silent){
  const x = DESIGN_ENTRIES.find(d=>String(d.id)===String(id)); if (!x) return;
  if (x.status !== "pending") return;                       // ikki marta bosish himoyasi
  if (!isKassir()) return toast("Tasdiqlash huquqi yo'q");
  if (__designBusy) return; __designBusy = true;
  toast("Saqlanmoqda...");
  try {
    if (CLOUD) { const { data, error } = await sb.from("design_entries").update({ status, decided_by:USER.id, decided_at:new Date().toISOString() }).eq("id", x.id).select();
      if (error) return toast("Xatolik: "+error.message); if (!data||!data.length) return toast(permErr("supabase-update-20.sql")); }
    x.status = status;
    if (!silent) toast(status==="approved"?"Tasdiqlandi ✓":"Rad etildi");
  } finally { __designBusy = false; }
  refreshDesignView(x.emp);
}
async function decideDesignDay(empId, date, status){
  const list = DESIGN_ENTRIES.filter(d=>String(d.emp)===String(empId)&&d.date===date&&d.status==="pending");
  for (const x of list) await decideDesign(x.id, status, true);
  toast(`${list.length} ta yozuv ${status==="approved"?"tasdiqlandi ✓":"rad etildi"}`);
  refreshDesignView(empId);
}
/* Ochiq oyna (modal) va sahifani DARHOL yangilash — oynani yopib-ochish shart emas */
function refreshDesignView(empId){
  render();
  const mb = document.getElementById("modalBox");
  if (mb && document.getElementById("modalBg")?.classList.contains("open") && mb.innerHTML.includes("dizaynlar")) openDesignEmp(empId);
}
async function delDesign(id){
  if (CLOUD) { const { error } = await sb.from("design_entries").delete().eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  DESIGN_ENTRIES = DESIGN_ENTRIES.filter(d=>String(d.id)!==String(id)); closeModal(); render();
}
function openDesignBrands(){
  openModal(`<h3>🎨 Brendlar va dizayn narxi</h3><div class="sub">1 ta dizayn uchun so'm</div>
    <div style="margin-top:12px">${DESIGN_BRANDS.map(b=>`<div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">
      <span style="flex:1;font-size:13.5px;font-weight:700">${esc(b.name)}</span>
      <input type="number" min="0" step="5000" value="${b.price}" style="width:140px" onchange="setBrandPrice('${b.id}', this.value)"><span style="font-size:12px;color:var(--muted)">so'm</span></div>`).join("")}</div>
    <div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px;display:flex;gap:8px;align-items:flex-end">
      <div style="flex:1"><label>Yangi brend</label><input id="dbName" placeholder="Brend nomi"></div>
      <div><label>Narxi</label><input id="dbPrice" type="number" min="0" value="0" style="width:120px"></div>
      <button class="btn primary sm" onclick="addBrand()">Qo'shish</button></div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function setBrandPrice(id, v){ const b = DESIGN_BRANDS.find(x=>String(x.id)===String(id)); if (!b) return; const price = Math.max(0,+v||0);
  if (CLOUD) { const { error } = await sb.from("design_brands").update({ price }).eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  b.price = price; toast(`${b.name}: ${fmtMoney(price)}`); }
async function addBrand(){ const name = $("#dbName").value.trim(), price = +$("#dbPrice").value||0; if (!name) return toast("Nomini kiriting");
  if (CLOUD) { const { data, error } = await sb.from("design_brands").insert({ name, price, sort:DESIGN_BRANDS.length+1 }).select().single(); if (error) return toast("Xatolik: "+error.message); DESIGN_BRANDS.push({ id:data.id, name, price, active:true }); }
  else DESIGN_BRANDS.push({ id:Date.now(), name, price, active:true });
  toast("Qo'shildi ✓"); openDesignBrands(); }

