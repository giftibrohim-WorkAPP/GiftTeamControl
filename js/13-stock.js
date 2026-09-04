/* ===== GM Pulse · 13-stock.js — Sklad ===== */
/* ================= SKLAD (ombor) ================= */
let STOCK_ITEMS = [], STOCK_MOVES = [];
function stockAccess(){
  if (USER.role === "admin") return "edit";
  if (USER.stockAccess === "edit" || USER.stockAccess === "view") return USER.stockAccess;
  if (isExec(USER.role)) return "view";
  return "none";
}
async function loadStock(){
  if (!CLOUD || stockAccess() === "none") return;
  const [it, mv] = await Promise.all([
    sb.from("stock_items").select("*").order("name"),
    sb.from("stock_moves").select("*").order("date", { ascending:false }).order("id", { ascending:false }),
  ]);
  if (it.data) STOCK_ITEMS = it.data.map(i => ({ id:i.id, name:i.name, color:i.color||"", unit:i.unit||"dona", active:i.active }));
  if (mv.data) STOCK_MOVES = mv.data.map(m => ({ id:m.id, item:m.item, kind:m.kind, qty:+m.qty, price:+m.price, date:m.date, party:m.party, note:m.note, by:m.created_by }));
}
/* Har tovar bo'yicha qoldiq */
function stockBalance(){
  return STOCK_ITEMS.map(i => {
    const mv = STOCK_MOVES.filter(m => String(m.item) === String(i.id));
    const inQ = mv.filter(m=>m.kind==="in").reduce((s,m)=>s+m.qty,0);
    const outQ = mv.filter(m=>m.kind==="out").reduce((s,m)=>s+m.qty,0);
    const lastIn = mv.find(m=>m.kind==="in");
    const inSum = mv.filter(m=>m.kind==="in").reduce((s,m)=>s+m.qty*m.price,0);
    const avg = inQ ? inSum/inQ : 0;
    return { ...i, inQ, outQ, left: inQ - outQ, lastPrice: lastIn?lastIn.price:0, avg, value: (inQ-outQ)*avg };
  });
}
let STOCK_TAB = "balance";
function pgStock(){
  if (stockAccess() === "none") return `<div class="card empty">Sklad bo'limiga ruxsatingiz yo'q</div>`;
  const canEdit = stockAccess() === "edit" && !isArchive();
  const bal = stockBalance();
  const totalValue = bal.reduce((s,b)=>s+b.value,0);
  const tabs = `<div class="filters">
    ${[["balance","📦 Qoldiq"],["in","⬇ Kirim"],["out","⬆ Otgruzka"],["history","🕓 Tarix"]].map(([k,l])=>`
      <button class="btn ${STOCK_TAB===k?"primary":"ghost"} sm" onclick="STOCK_TAB='${k}';render()">${l}</button>`).join("")}
    ${USER.role==="admin" ? `<button class="btn ghost sm" onclick="openStockAccess()">🔑 Ruxsatlar</button>` : ""}
    <button class="btn ghost sm" onclick="exportStock()">⬇ Excel</button></div>`;
  const stats = `<div class="grid stats" style="margin-bottom:14px">
    <div class="card stat"><div class="lbl">${IC.box} Tovar turlari</div><div class="val num">${bal.filter(b=>b.left>0).length}</div><div class="delta" style="color:var(--muted)">qoldig'i borlar</div></div>
    <div class="card stat"><div class="lbl">${IC.money} Qoldiq qiymati</div><div class="val num" style="font-size:19px">${fmtMoney(totalValue)}</div><div class="delta" style="color:var(--muted)">o'rtacha kirim narxida</div></div>
    <div class="card stat"><div class="lbl">${IC.down} Kam qolgan</div><div class="val num" style="color:${bal.some(b=>b.left>0&&b.left<=5)?"var(--danger)":"var(--success)"}">${bal.filter(b=>b.left>0&&b.left<=5).length}</div><div class="delta" style="color:var(--muted)">5 va undan kam</div></div>
  </div>`;
  let body = "";
  if (STOCK_TAB === "balance") {
    const rows = bal.filter(b => b.inQ > 0).sort((a,b)=>a.name.localeCompare(b.name));
    body = rows.length ? `<div class="card">${rows.map(b=>`
      <div class="fb-item"><div class="fb-icon" style="background:var(--accent-soft);color:var(--accent)">📦</div>
        <div class="meta"><b>${esc(b.name)}${b.color?` <span class="tag info">${esc(b.color)}</span>`:""}</b>
          <span>kirim ${b.inQ} · chiqim ${b.outQ} · oxirgi narx ${fmtMoney(b.lastPrice)}</span></div>
        <div class="amount num" style="color:${b.left<=0?"var(--danger)":b.left<=5?"var(--gold)":"var(--success)"}">${b.left} ${esc(b.unit)}</div>
      </div>`).join("")}</div>` : `<div class="card empty">Skladda tovar yo'q — "Kirim" orqali qo'shing</div>`;
  } else if (STOCK_TAB === "in" || STOCK_TAB === "out") {
    const isIn = STOCK_TAB === "in";
    body = canEdit ? `<div class="card" style="padding:16px">
      <b style="font-size:14px">${isIn?"⬇ Tovar kirimi":"⬆ Otgruzka (chiqim)"}</b>
      <div class="ord-form" style="display:grid;grid-template-columns:2fr 1fr 1fr 1.4fr;gap:8px;margin-top:11px">
        <div><label>Tovar nomi</label><input id="stName" list="stNames" placeholder="masalan: Futbolka">
          <datalist id="stNames">${[...new Set(STOCK_ITEMS.map(i=>i.name))].map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
        <div><label>Rangi</label><input id="stColor" list="stColors" placeholder="oq / qora">
          <datalist id="stColors">${[...new Set(STOCK_ITEMS.map(i=>i.color).filter(Boolean))].map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
        <div><label>Soni</label><input id="stQty" type="number" min="0.01" step="1" value="1"></div>
        <div><label>Narxi (1 dona)</label><input id="stPrice" type="number" min="0" step="1000" placeholder="0"></div>
        <div><label>${isIn?"Kimdan keldi":"Kimga ketdi (mijoz)"}</label><input id="stParty" placeholder="${isIn?"postavshik":"mijoz / do'kon"}"></div>
        <div><label>Sana</label><input id="stDate" type="date" value="${TODAY}" max="${TODAY}"></div>
        <div><label>Izoh</label><input id="stNote"></div>
        <div style="display:flex;align-items:flex-end"><button class="btn primary" style="width:100%" onclick="addStockMove('${STOCK_TAB}')">${isIn?"Kirim qilish":"Otgruzka qilish"}</button></div>
      </div>
      ${!isIn ? `<div style="font-size:12px;color:var(--muted);margin-top:8px">Qoldiqdan ko'p chiqarib bo'lmaydi. Mavjud: ${bal.filter(b=>b.left>0).map(b=>`${esc(b.name)}${b.color?" ("+esc(b.color)+")":""} — ${b.left}`).join(", ")||"—"}</div>` : ""}
    </div>` : `<div class="card empty">Sizda faqat ko'rish ruxsati</div>`;
  } else {
    const mv = STOCK_MOVES.filter(m => inViewMonth(m.date));
    body = mv.length ? `<div class="card">${mv.map(m => { const i = STOCK_ITEMS.find(x=>String(x.id)===String(m.item));
      return `<div class="fb-item"><div class="fb-icon" style="background:${m.kind==="in"?"var(--success-soft, rgba(46,125,107,.12))":"var(--danger-soft, rgba(212,72,72,.12))"};color:${m.kind==="in"?"var(--success)":"var(--danger)"}">${m.kind==="in"?"⬇":"⬆"}</div>
        <div class="meta"><b>${i?esc(i.name):"—"}${i&&i.color?` <span class="tag info">${esc(i.color)}</span>`:""}</b>
          <span>${uzDate(m.date)} · ${m.kind==="in"?"kirim":"otgruzka"} · ${m.party?esc(m.party)+" · ":""}${empById(m.by)?.name.split(" ")[0]||""}${m.note?" · "+esc(m.note):""}</span></div>
        <div class="amount num">${m.kind==="in"?"+":"−"}${m.qty} ${i?esc(i.unit):""}<small>${fmtMoney(m.qty*m.price)}</small></div>
        ${canEdit && USER.role==="admin" ? `<button class="btn sm" style="color:var(--danger)" onclick="delStockMove('${m.id}')">✕</button>` : ""}
      </div>`; }).join("")}</div>` : `<div class="card empty">${monthLabel()} da harakat yo'q</div>`;
  }
  return tabs + stats + body;
}
async function addStockMove(kind){
  const name = $("#stName").value.trim(), color = $("#stColor").value.trim();
  const qty = +$("#stQty").value || 0, price = +$("#stPrice").value || 0;
  const date = $("#stDate").value, party = $("#stParty").value.trim() || null, note = $("#stNote").value.trim() || null;
  if (!name) return toast("Tovar nomini kiriting");
  if (qty <= 0) return toast("Sonini kiriting");
  let item = STOCK_ITEMS.find(i => i.name.toLowerCase()===name.toLowerCase() && (i.color||"").toLowerCase()===color.toLowerCase());
  if (kind === "out") {
    if (!item) return toast("Bunday tovar skladda yo'q");
    const b = stockBalance().find(x => String(x.id)===String(item.id));
    if (b.left < qty) return toast(`Qoldiq yetarli emas — mavjud: ${b.left}`);
  }
  if (!item) {
    if (CLOUD) {
      const { data, error } = await sb.from("stock_items").insert({ name, color }).select().single();
      if (error) return toast("Xatolik: " + error.message);
      item = { id:data.id, name, color, unit:"dona", active:true };
    } else item = { id:Date.now(), name, color, unit:"dona", active:true };
    STOCK_ITEMS.push(item);
  }
  const rec = { item:item.id, kind, qty, price, date, party, note, by:USER.id };
  if (CLOUD) {
    const { data, error } = await sb.from("stock_moves").insert({ item:item.id, kind, qty, price, date, party, note, created_by:USER.id }).select().single();
    if (error) return toast("Xatolik: " + error.message);
    rec.id = data.id;
  } else rec.id = Date.now();
  STOCK_MOVES.unshift(rec);
  toast(`${kind==="in"?"Kirim":"Otgruzka"}: ${name}${color?" ("+color+")":""} × ${qty} ✓`);
  render();
}
async function delStockMove(id){
  if (!confirm("Yozuv o'chirilsinmi?")) return;
  if (CLOUD) { const { error } = await sb.from("stock_moves").delete().eq("id", id); if (error) return toast("Xatolik: " + error.message); }
  STOCK_MOVES = STOCK_MOVES.filter(m => String(m.id)!==String(id)); toast("O'chirildi"); render();
}
function exportStock(){
  const rows = [["Tovar","Rangi","Kirim","Chiqim","Qoldiq","Oxirgi narx","O'rtacha narx","Qoldiq qiymati"]];
  stockBalance().forEach(b => rows.push([b.name, b.color, b.inQ, b.outQ, b.left, b.lastPrice, Math.round(b.avg), Math.round(b.value)]));
  downloadCSV("sklad_" + TODAY, rows);
}
function openStockAccess(){ openAccessModal("stock_access", "stockAccess", "🔑 Sklad ruxsatlari", { none:"— yo'q —", view:"👁 Ko'radi", edit:"✏️ Kirim/otgruzka qiladi" }); }
/* Umumiy ruxsat oynasi (zakaz, sklad, snab uchun) */
function openAccessModal(col, field, title, lbl, extraNote){
  const list = EMPLOYEES.filter(e => e.role !== "admin");
  openModal(`<h3>${title}</h3><div class="sub">${extraNote||"Rahbar/direktor sukut bo'yicha ko'radi."}</div>
    <div style="margin-top:12px;max-height:55vh;overflow-y:auto">${list.map(e=>`
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:13px">
        ${avatarHtml(e,"sm")}<span style="flex:1">${esc(e.name)}<br><span style="color:var(--muted);font-size:11px">${esc(e.pos)}</span></span>
        <select onchange="setAccess('${col}','${field}','${e.id}', this.value)" style="width:auto;font-size:12px">
          ${Object.keys(lbl).map(v=>`<option value="${v}" ${(e[field]||"none")===v?"selected":""}>${lbl[v]}</option>`).join("")}</select>
      </div>`).join("")}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function setAccess(col, field, id, v){
  const e = empById(id); if (!e) return;
  // KASSIR faqat bitta odam: yangisiga berilsa, oldingi kassirdan avtomatik olinadi
  if (col === "snab_role" && v === "kassir") {
    const prev = EMPLOYEES.find(x => x.snabRole === "kassir" && String(x.id) !== String(id));
    if (prev) {
      if (!confirm(`Hozir kassir — ${prev.name}. Kassir faqat BITTA odam bo'ladi.\n\n${prev.name}dan olib, ${e.name}ga berilsinmi?`)) { openSnabRoles(); return; }
      if (CLOUD) { const { error } = await sb.from("profiles").update({ snab_role: "none" }).eq("id", prev.id); if (error) return toast("Xatolik: " + error.message); }
      prev.snabRole = "none";
      if (String(USER.id) === String(prev.id)) USER.snabRole = "none";
    }
  }
  if (CLOUD) {
    const { data, error } = await sb.from("profiles").update({ [col]: v }).eq("id", id).select("id");
    if (error) return toast("Xatolik: " + error.message);
    if (!data || !data.length) return toast(permErr("supabase-update-19.sql"));
  }
  e[field] = v;
  if (String(USER.id) === String(id)) USER[field] = v;
  toast(`${e.name.split(" ")[0]}: ${v === "none" ? "olib tashlandi" : v}`); renderNav();
  if (col === "snab_role") openSnabRoles(); // oynani yangilash (eski kassir "yo'q" bo'lib ko'rinsin)
}

