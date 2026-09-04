/* ===== GM Pulse · 12-snab.js — Snabjeniya, postavshik sahifasi ===== */
/* ================= SNABJENIYA (ta'minot) ================= */
let CONTRACTORS = [], SNAB_ORDERS = [], SNAB_ITEMS = [], SNAB_PAYS = [], SNAB_MSGS = [];
let SNAB_VIEW = { page: "list", contractor: null, order: null }; // list | contractor | order | balance
function snabRole(){
  if (USER.role === "admin" || isExec(USER.role)) return "admin";
  return USER.snabRole || "none";
}
function canSeeSnab(){ return snabRole() !== "none"; }
const seesGoods = () => ["admin","snab","zavsklad"].includes(snabRole());
const seesPay   = () => ["admin","snab","kassir"].includes(snabRole());
async function loadSnab(){
  if (!CLOUD || !canSeeSnab()) return;
  const qs = [
    sb.from("contractors").select("*").order("name"),
    sb.from("snab_orders").select("*").order("created_at", { ascending:false }),
    sb.from("snab_msgs").select("*").order("created_at"),
    seesGoods() ? sb.from("snab_items").select("*") : Promise.resolve({ data: [] }),
    seesPay()   ? sb.from("snab_payments").select("*").order("created_at") : Promise.resolve({ data: [] }),
  ];
  const [ct, so, sm, si, sp] = await Promise.all(qs);
  if (ct.data) CONTRACTORS = ct.data.map(c => ({ id:c.id, name:c.name, phone:c.phone, note:c.note, token:c.token, active:c.active }));
  if (so.data) SNAB_ORDERS = so.data.map(o => ({ id:o.id, num:o.num, contractor:o.contractor, title:o.title, status:o.status, by:o.created_by, at:o.created_at }));
  if (sm.data) SNAB_MSGS = sm.data.map(m => ({ id:m.id, ord:m.ord, author:m.author, authorName:m.author_name, text:m.text, kind:m.kind, scope:m.scope, at:m.created_at }));
  if (si.data) SNAB_ITEMS = si.data.map(i => ({ id:i.id, ord:i.ord, name:i.name, qty:+i.qty, price:+i.price, received:i.received, receivedAt:i.received_at }));
  if (sp.data) SNAB_PAYS = sp.data.map(p => ({ id:p.id, ord:p.ord, amount:+p.amount, purpose:p.purpose, status:p.status, reqBy:p.requested_by, paidBy:p.paid_by, paidAt:p.paid_at, confirmedAt:p.confirmed_at, at:p.created_at }));
}
/* Kontragent balansi: to'langan (tasdiqlangan) − qabul qilingan tovar.
   + → biz PLYUSDAMIZ (postavshik bizga qarz), − → biz QARZDORMIZ */
function ctBalance(cid){
  const ords = SNAB_ORDERS.filter(o => String(o.contractor)===String(cid)).map(o=>String(o.id));
  const goods = SNAB_ITEMS.filter(i => ords.includes(String(i.ord)) && i.received).reduce((s,i)=>s+i.qty*i.price,0);
  const paid = SNAB_PAYS.filter(p => ords.includes(String(p.ord)) && p.status==="confirmed").reduce((s,p)=>s+p.amount,0);
  return { goods, paid, balance: paid - goods };
}
function balTag(b, big){
  const cls = b > 0 ? "success" : b < 0 ? "danger" : "muted";
  const txt = b > 0 ? `+${fmtMoney(b)} plyus` : b < 0 ? `−${fmtMoney(-b)} qarz` : "0 · teng";
  return `<span class="tag ${cls}" style="${big?"font-size:13px;padding:6px 11px":""}">${txt}</span>`;
}
/* Kontragent bilan barcha oldi-berdi — sana bo'yicha, yig'ilib boruvchi qoldiq bilan */
function ctLedger(cid){
  const ords = SNAB_ORDERS.filter(o => String(o.contractor)===String(cid));
  const numOf = id => ords.find(o=>String(o.id)===String(id))?.num || "";
  const ev = [];
  const tsOf = v => { if (!v) return TODAY + "T00:00:00"; const d = new Date(v); if (isNaN(d)) return v;
    return isoLocal(d) + "T" + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0") + ":" + String(d.getSeconds()).padStart(2,"0"); };
  SNAB_ITEMS.filter(i => i.received && ords.some(o=>String(o.id)===String(i.ord))).forEach(i => { const ts = tsOf(i.receivedAt||i.at);
    ev.push({ ts, date:ts.slice(0,10), time:ts.slice(11,16), ord:numOf(i.ord), desc:`${i.name} — ${i.qty} × ${fmtMoney(i.price)}`, goods:i.qty*i.price, pay:0 }); });
  SNAB_PAYS.filter(p => p.status==="confirmed" && ords.some(o=>String(o.id)===String(p.ord))).forEach(p => { const ts = tsOf(p.confirmedAt||p.paidAt||p.at);
    ev.push({ ts, date:ts.slice(0,10), time:ts.slice(11,16), ord:numOf(p.ord), desc:`To'lov: ${p.purpose||""}`, goods:0, pay:p.amount }); });
  // Aniq VAQT bo'yicha (soat-daqiqa) — bir kunda bir nechta harakat bo'lsa to'g'ri tartibda
  ev.sort((a,b)=>a.ts.localeCompare(b.ts));
  let bal = 0;
  return ev.map(e => { bal += e.pay - e.goods; return { ...e, bal }; });
}
function ledgerHtml(cid, compact){
  const rows = ctLedger(cid);
  const b = ctBalance(cid);
  if (!rows.length) return `<div class="card empty">Hali oldi-berdi yo'q</div>`;
  return `<div class="card ledger">
    <div class="ledger-head"><span>Sana</span><span>Zakaz</span><span>Tavsif</span><span class="r">Tovar</span><span class="r">To'lov</span><span class="r">Qoldiq</span></div>
    ${rows.map(r=>`<div class="ledger-row">
      <span class="num">${uzDate(r.date)}<br><small class="muted">${r.time||""}</small></span><span class="num muted">${esc(r.ord)}</span><span>${esc(r.desc)}</span>
      <span class="r num" style="color:var(--danger)">${r.goods?"−"+fmtMoney(r.goods):""}</span>
      <span class="r num" style="color:var(--success)">${r.pay?"+"+fmtMoney(r.pay):""}</span>
      <span class="r num" style="font-weight:800;color:${r.bal>0?"var(--success)":r.bal<0?"var(--danger)":""}">${r.bal>0?"+":r.bal<0?"−":""}${fmtMoney(Math.abs(r.bal))}</span></div>`).join("")}
    <div class="ledger-foot"><span>JAMI</span><span></span><span></span>
      <span class="r num" style="color:var(--danger)">${b.goods?"−"+fmtMoney(b.goods):"0"}</span>
      <span class="r num" style="color:var(--success)">${b.paid?"+"+fmtMoney(b.paid):"0"}</span>
      <span class="r num" style="font-weight:900;color:${b.balance>0?"var(--success)":b.balance<0?"var(--danger)":""}">${b.balance>0?"+":b.balance<0?"−":""}${fmtMoney(Math.abs(b.balance))}</span></div>
    <div style="padding:8px 14px;font-size:11.5px;color:var(--muted)">− tovar qabul qilindi (bizning qarz oshadi) · + to'lov tasdiqlandi (qarz kamayadi) · Qoldiq: + biz plyusdamiz, − biz qarzdormiz</div>
  </div>`;
}
function exportLedger(cid){
  const c = CONTRACTORS.find(x=>String(x.id)===String(cid));
  const rows = [["Sana","Zakaz","Tavsif","Tovar (−)","To'lov (+)","Qoldiq"]];
  ctLedger(cid).forEach(r => rows.push([r.date, r.ord, r.desc, r.goods||"", r.pay||"", r.bal]));
  downloadCSV("oldi-berdi_" + (c?c.name.replace(/\s+/g,"-"):cid), rows);
}
const SNAB_ST = {
  new:        ["muted",   "Yangi — tovar kiritilmagan"],
  goods_wait: ["gold",    "Tovar kutilmoqda"],
  pay_wait:   ["gold",    "To'lov kutilmoqda (kassir)"],
  sup_wait:   ["info",    "Postavshik tasdig'i kutilmoqda"],
  both_wait:  ["gold",    "Tovar va to'lov kutilmoqda"],
  done:       ["success", "Yakunlandi ✓"],
  closed:     ["muted",   "Yopilgan"],
};
/* Zakazning HAQIQIY holati — tovar va to'lovlarning ahvolidan hisoblanadi */
function snabStatus(o){
  if (o.status === "closed") return "closed";
  const items = SNAB_ITEMS.filter(i=>String(i.ord)===String(o.id));
  const pays = SNAB_PAYS.filter(p=>String(p.ord)===String(o.id) && p.status!=="rejected");
  if (!items.length && !pays.length) return "new";
  const goodsWait = items.some(i => !i.received);
  const kasWait = pays.some(p => p.status === "requested");
  const supWait = pays.some(p => p.status === "paid");
  if (goodsWait && (kasWait || supWait)) return "both_wait";
  if (goodsWait) return "goods_wait";
  if (kasWait) return "pay_wait";
  if (supWait) return "sup_wait";
  return "done";
}
function snabGo(page, id){ SNAB_VIEW = { page, contractor: page==="contractor"?id:SNAB_VIEW.contractor, order: page==="order"?id:null, tab: page==="contractor" ? (SNAB_VIEW.tab||"orders") : "orders" }; render(); }

function pgSnab(){
  if (!canSeeSnab()) return `<div class="card empty">Snabjeniya bo'limiga ruxsatingiz yo'q</div>`;
  const r = snabRole();
  const roleTag = `<span class="tag info">${ {admin:"rahbariyat",snab:"ta'minotchi",kassir:"kassir",zavsklad:"zavsklad"}[r] }</span>`;
  const inside = SNAB_VIEW.page === "order" || SNAB_VIEW.page === "contractor";
  const nav = inside ? "" : `<div class="snab-top">
    <button class="btn ${SNAB_VIEW.page==="list"?"primary":"ghost"}" onclick="snabGo('list')">👥 Kontragentlar</button>
    <button class="btn ${SNAB_VIEW.page==="balance"?"primary":"ghost"}" onclick="snabGo('balance')">⚖️ Umumiy hisob</button>
    ${USER.role==="admin" ? `<button class="btn ghost sm" style="flex:0" title="Rollar" onclick="openSnabRoles()">🔑</button>` : ""}</div>`;
  if (SNAB_VIEW.page === "order") return nav + snabOrderView(SNAB_VIEW.order);
  if (SNAB_VIEW.page === "contractor") return nav + snabContractorView(SNAB_VIEW.contractor);
  if (SNAB_VIEW.page === "balance") {
    const rows = CONTRACTORS.map(c => ({ c, b: ctBalance(c.id) }));
    const plus = rows.filter(x=>x.b.balance>0).reduce((s,x)=>s+x.b.balance,0);
    const minus = rows.filter(x=>x.b.balance<0).reduce((s,x)=>s-x.b.balance,0);
    return nav + `<div class="grid stats" style="margin-bottom:14px">
      <div class="card stat"><div class="lbl">${IC.up} Bizning plyus</div><div class="val num" style="color:var(--success);font-size:19px">${fmtMoney(plus)}</div><div class="delta" style="color:var(--muted)">postavshiklar bizga qarz</div></div>
      <div class="card stat"><div class="lbl">${IC.down} Bizning qarz</div><div class="val num" style="color:var(--danger);font-size:19px">${fmtMoney(minus)}</div><div class="delta" style="color:var(--muted)">biz postavshiklarga qarz</div></div>
      <div class="card stat"><div class="lbl">${IC.money} Sof</div><div class="val num" style="font-size:19px;color:${plus-minus>=0?"var(--success)":"var(--danger)"}">${plus-minus>=0?"+":"−"}${fmtMoney(Math.abs(plus-minus))}</div></div></div>

      <div class="card">${rows.sort((a,b)=>a.b.balance-b.b.balance).map(({c,b})=>`
        <div class="fb-item" style="cursor:pointer" onclick="snabGo('contractor','${c.id}')">
          <div class="fb-icon" style="background:var(--accent-soft);color:var(--accent)">🏭</div>
          <div class="meta"><b>${esc(c.name)}</b><span>tovar ${fmtMoney(b.goods)} · to'langan ${fmtMoney(b.paid)}</span></div>
          ${balTag(b.balance)}</div>`).join("") || `<div class="empty">Kontragent yo'q</div>`}</div>`;
  }

  // list
  const canAdd = ["admin","snab"].includes(r);
  return nav + `${canAdd ? `<div class="card" style="padding:14px 16px;margin-bottom:14px;display:flex;gap:9px;flex-wrap:wrap;align-items:flex-end">
      <div style="flex:2;min-width:160px"><label>Yangi kontragent</label><input id="ctName" placeholder="Postavshik nomi"></div>
      <div style="flex:1;min-width:120px"><label>Telefon</label><input id="ctPhone" placeholder="+998"></div>
      <button class="btn primary" onclick="addContractor()">Qo'shish</button></div>` : ""}
    <div class="card">${CONTRACTORS.map(c => { const b = ctBalance(c.id); const n = SNAB_ORDERS.filter(o=>String(o.contractor)===String(c.id)).length;
      const open = SNAB_ORDERS.filter(o=>String(o.contractor)===String(c.id) && !["done","closed"].includes(snabStatus(o))).length;
      return `<div class="fb-item" style="cursor:pointer" onclick="snabGo('contractor','${c.id}')">
        <div class="fb-icon" style="background:var(--accent-soft);color:var(--accent)">🏭</div>
        <div class="meta"><b>${esc(c.name)}</b><span>${n} zakaz${open?` · <span style="color:var(--gold)">${open} ochiq</span>`:""}${c.phone?" · "+esc(c.phone):""}</span></div>
        ${balTag(b.balance)}</div>`; }).join("") || `<div class="empty">Kontragent yo'q — yuqoridan qo'shing</div>`}</div>`;
}
function snabOrderRow(o){
  const c = CONTRACTORS.find(x=>String(x.id)===String(o.id===o.id&&o.contractor));
  const [cls,lbl] = SNAB_ST[snabStatus(o)] || ["muted",""];
  const goods = SNAB_ITEMS.filter(i=>String(i.ord)===String(o.id)).reduce((s,i)=>s+i.qty*i.price,0);
  const pays = SNAB_PAYS.filter(p=>String(p.ord)===String(o.id) && p.status!=="rejected").reduce((s,p)=>s+p.amount,0);
  const unread = SNAB_MSGS.filter(m=>String(m.ord)===String(o.id)).length;
  return `<div class="fb-item" style="cursor:pointer" onclick="snabGo('order','${o.id}')">
    <div class="fb-icon" style="background:var(--surface2)">📋</div>
    <div class="meta"><b>${esc(o.num)} ${o.title?"· "+esc(o.title):""}</b>
      <span>${c?esc(c.name)+" · ":""}${uzDate(o.at.slice(0,10))}${seesGoods()&&goods?" · tovar "+fmtMoney(goods):""}${seesPay()&&pays?" · to'lov "+fmtMoney(pays):""} · 💬 ${unread}</span></div>
    <span class="tag ${cls}">${lbl}</span></div>`;
}
function snabContractorView(cid){
  const c = CONTRACTORS.find(x=>String(x.id)===String(cid)); if (!c) return `<div class="card empty">Topilmadi</div>`;
  const b = ctBalance(cid);
  const ords = SNAB_ORDERS.filter(o=>String(o.contractor)===String(cid)).sort((a,b)=>b.at.localeCompare(a.at));
  const canAdd = ["admin","snab"].includes(snabRole());
  const link = location.origin + location.pathname + "?sup=" + c.token;
  const tab = SNAB_VIEW.tab || "orders";
  return `<div class="card" style="padding:14px 16px;margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn ghost sm" onclick="snabGo('list')">←</button>
        <div style="flex:1;min-width:140px"><b style="font-family:'Sora';font-size:17px">${esc(c.name)}</b><br><span style="color:var(--muted);font-size:12px">${c.phone?esc(c.phone)+" · ":""}${ords.length} zakaz</span></div>
        <div style="text-align:right"><div class="num" style="font-size:20px;font-weight:900;color:${b.balance>0?"var(--success)":b.balance<0?"var(--danger)":""}">${b.balance>0?"+":b.balance<0?"−":""}${fmtMoney(Math.abs(b.balance))}</div>
          <div style="font-size:10.5px;color:var(--muted);font-weight:700">${b.balance>0?"BIZ PLYUSDAMIZ":b.balance<0?"BIZ QARZDORMIZ":"HISOB TENG"}</div></div>
      </div>
      <div class="snab-top" style="margin:12px 0 0">
        <button class="btn ${tab==="orders"?"primary":"ghost"} sm" onclick="SNAB_VIEW.tab='orders';render()">📋 Zakazlar</button>
        <button class="btn ${tab==="ledger"?"primary":"ghost"} sm" onclick="SNAB_VIEW.tab='ledger';render()">🧾 Oldi-berdi</button>
        ${["admin","snab"].includes(snabRole()) ? `<button class="btn ghost sm" style="flex:0" title="Postavshik havolasi" onclick="navigator.clipboard.writeText('${esc(link)}').then(()=>toast('Postavshik havolasi nusxalandi ✓ — unga yuboring'))">🔗</button>` : ""}
      </div>
    </div>
    ${tab === "ledger"
      ? `<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="btn ghost sm" onclick="exportLedger('${cid}')">⬇ Excel</button></div>` + ledgerHtml(cid)
      : `${canAdd && !isArchive() ? `<div style="display:flex;gap:8px;margin-bottom:10px">
          <input id="soTitle" placeholder="Yangi zakaz nomi (masalan: 100 futbolka)" style="flex:1">
          <button class="btn primary" onclick="addSnabOrder('${cid}')">➕ Ochish</button></div>` : ""}
        <div class="card">${ords.map(snabOrderRow).join("") || `<div class="empty">Zakaz yo'q</div>`}</div>`}`;
}
function snabOrderView(oid){
  const o = SNAB_ORDERS.find(x=>String(x.id)===String(oid)); if (!o) return `<div class="card empty">Topilmadi</div>`;
  const c = CONTRACTORS.find(x=>String(x.id)===String(o.contractor));
  const r = snabRole(); const [cls,lbl] = SNAB_ST[snabStatus(o)] || ["muted",""];
  const items = SNAB_ITEMS.filter(i=>String(i.ord)===String(o.id));
  const pays = SNAB_PAYS.filter(p=>String(p.ord)===String(o.id));
  const msgs = SNAB_MSGS.filter(m=>String(m.ord)===String(o.id) && (m.scope==="all" || (m.scope==="goods"&&seesGoods()) || (m.scope==="pay"&&seesPay())));
  const goodsSum = items.reduce((s,i)=>s+i.qty*i.price,0), recvSum = items.filter(i=>i.received).reduce((s,i)=>s+i.qty*i.price,0);
  const paySum = pays.filter(p=>p.status==="confirmed").reduce((s,p)=>s+p.amount,0);
  const b = c ? ctBalance(c.id) : {balance:0};
  const isClosed = o.status === "closed";
  const canSnab = ["admin","snab"].includes(r) && !isClosed, canZav = ["admin","zavsklad"].includes(r) && !isClosed, canKas = ["admin","kassir"].includes(r) && !isClosed;
  // TOVARLAR bloki (kassirga ko'rinmaydi)
  const goodsBlock = seesGoods() ? `<div class="card" style="padding:14px 16px;margin-bottom:12px">
      <b style="font-size:13.5px">📦 Tovarlar</b> <span style="color:var(--muted);font-size:12px">jami ${fmtMoney(goodsSum)} · qabul qilingan ${fmtMoney(recvSum)}</span>
      ${items.map(i=>`<div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;flex-wrap:wrap">
        <span style="flex:1;min-width:120px">${esc(i.name)} — ${i.qty} × ${fmtMoney(i.price)} = <b>${fmtMoney(i.qty*i.price)}</b></span>
        ${i.received ? '<span class="tag success">qabul qilindi ✓</span>' : (canZav && !isArchive() ? `<button class="btn success sm" onclick="recvSnabItem('${i.id}')">✓ Qabul qildim</button>` : '<span class="tag gold">zavsklad kutmoqda</span>')}
        ${canSnab && !i.received ? `<button class="btn sm" style="color:var(--danger)" onclick="delSnabItem('${i.id}')">✕</button>` : ""}</div>`).join("") || `<div style="color:var(--muted);font-size:12px;margin-top:6px">Tovar kiritilmagan</div>`}
      ${canSnab && !isArchive() ? `<details style="margin-top:10px"><summary class="btn ghost sm" style="display:inline-flex;cursor:pointer;list-style:none">➕ Tovar qo'shish</summary>
        <div style="display:flex;gap:7px;margin-top:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:2;min-width:130px"><label>Tovar</label><input id="siName" placeholder="Futbolka oq"></div>
        <div style="flex:1;min-width:70px"><label>Soni</label><input id="siQty" type="number" value="1" min="0.01"></div>
        <div style="flex:1;min-width:100px"><label>Narxi</label><input id="siPrice" type="number" min="0" placeholder="0"></div>
        <button class="btn primary sm" onclick="addSnabItem('${o.id}')">Saqlash</button></div></details>` : ""}
    </div>` : `<div class="card" style="padding:12px 16px;margin-bottom:12px;color:var(--muted);font-size:12.5px">📦 Tovar tafsilotlari sizning rolingizga ko'rsatilmaydi</div>`;
  // TO'LOVLAR bloki (zavskladga ko'rinmaydi)
  const payBlock = seesPay() ? `<div class="card" style="padding:14px 16px;margin-bottom:12px">
      <b style="font-size:13.5px">💳 To'lovlar</b> <span style="color:var(--muted);font-size:12px">tasdiqlangan ${fmtMoney(paySum)}</span>
      ${pays.map(p=>{ const st = {requested:["gold","kassir kutmoqda"],paid:["info","to'landi — postavshik tasdig'i kutilmoqda"],confirmed:["success","tasdiqlandi ✓"],rejected:["danger","rad etildi"]}[p.status];
        return `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;flex-wrap:wrap">
        <span style="flex:1;min-width:120px"><b>${fmtMoney(p.amount)}</b> — ${esc(p.purpose||"")} <span style="color:var(--muted);font-size:11px">${empById(p.reqBy)?.name.split(" ")[0]||""}</span></span>
        <span class="tag ${st[0]}">${st[1]}</span>
        ${p.status==="requested" && canKas && !isArchive() ? `<button class="btn success sm" onclick="paySnab('${p.id}')">💳 To'ladim</button><button class="btn ghost sm" onclick="rejectSnabPay('${p.id}')">✗</button>` : ""}
        ${p.status==="paid" && r==="admin" ? `<button class="btn ghost sm" title="Postavshik o'rniga tasdiqlash" onclick="confirmSnabPayAdmin('${p.id}')">✓ tasdiq</button>` : ""}</div>`; }).join("") || `<div style="color:var(--muted);font-size:12px;margin-top:6px">To'lov yo'q</div>`}
      ${canSnab && !isArchive() ? `<details style="margin-top:10px"><summary class="btn ghost sm" style="display:inline-flex;cursor:pointer;list-style:none">💳 To'lov so'rash</summary>
        <div style="display:flex;gap:7px;margin-top:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:110px"><label>Summa</label><input id="spAmt" type="number" min="0" placeholder="0"></div>
        <div style="flex:2;min-width:150px"><label>Nima uchun</label><input id="spPurp" placeholder="masalan: 100 futbolka uchun avans"></div>
        <button class="btn primary sm" onclick="reqSnabPay('${o.id}')">Kassirga yuborish</button></div></details>` : ""}
    </div>` : `<div class="card" style="padding:12px 16px;margin-bottom:12px;color:var(--muted);font-size:12.5px">💳 To'lov tafsilotlari sizning rolingizga ko'rsatilmaydi</div>`;
  // CHAT
  const chat = `<div class="card" style="padding:14px 16px">
      <b style="font-size:13.5px">💬 Chat</b>
      <div style="max-height:320px;overflow-y:auto;margin-top:8px">${msgs.map(m=>{ const a = m.author ? empById(m.author) : null; const nm = a ? a.name.split(" ")[0] : (m.authorName || "Postavshik");
        const mine = a && String(a.id)===String(USER.id); const sys = m.kind !== "text";
        return `<div style="display:flex;gap:8px;margin-top:8px;${mine?"flex-direction:row-reverse":""}">
          ${a ? avatarHtml(a,"sm") : `<div class="avatar sm" style="background:#7B5BA6">🏭</div>`}
          <div style="max-width:78%;background:${sys?"var(--gold-soft, rgba(212,160,23,.12))":mine?"var(--accent-soft)":"var(--surface2)"};border-radius:12px;padding:7px 11px">
            <b style="font-size:11.5px">${esc(nm)}</b> <span style="font-size:10.5px;color:var(--muted)">${(m.at||"").slice(5,16).replace("T"," ")}</span>
            <div style="font-size:13px;white-space:pre-wrap;margin-top:2px">${esc(m.text)}</div></div></div>`; }).join("") || `<div style="color:var(--muted);font-size:12px">Xabar yo'q</div>`}</div>
      ${!isArchive() && !isClosed ? `<div style="display:flex;gap:7px;margin-top:10px"><input id="snMsg" placeholder="Xabar yozing..." onkeydown="if(event.key==='Enter')sendSnabMsg('${o.id}')"><button class="btn primary sm" onclick="sendSnabMsg('${o.id}')">Yuborish</button></div>` : (isClosed ? `<div style="font-size:12px;color:var(--muted);margin-top:8px">Zakaz yopilgan — o'zgartirish uchun "↩ Qayta ochish"</div>` : "")}
    </div>`;
  // Zakaz cheki: tovar va to'lovlar bir ko'rinishda
  const receipt = `<div class="card" style="padding:12px 16px;margin-bottom:12px;background:var(--surface2)">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;flex-wrap:wrap;gap:6px">
        ${seesGoods() ? `<span>📦 Tovar: <b>${fmtMoney(goodsSum)}</b> — qabul qilingan <b style="color:${recvSum<goodsSum?"var(--danger)":"var(--success)"}">${fmtMoney(recvSum)}</b>${recvSum<goodsSum?" ⚠️":""}</span>` : ""}
        ${seesPay() ? `<span>💳 To'lov: <b>${fmtMoney(paySum)}</b> tasdiqlangan${pays.some(p=>["requested","paid"].includes(p.status))?" <span style='color:var(--gold)'>(kutilayotgan bor)</span>":""}</span>` : ""}
        ${seesGoods()&&seesPay() ? `<span title="To'langan − qabul qilingan tovar">Hisob: <b style="color:${paySum-recvSum>0?"var(--success)":paySum-recvSum<0?"var(--danger)":""}">${paySum-recvSum>0?"+":paySum-recvSum<0?"−":""}${fmtMoney(Math.abs(paySum-recvSum))}</b> ${paySum-recvSum>0?"(oldindan to'langan)":paySum-recvSum<0?"(qarz)":""}</span>` : ""}
      </div></div>`;
  return `<div class="card" style="padding:12px 16px;margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn ghost sm" onclick="snabGo('contractor','${o.contractor}')">←</button>
      <div style="flex:1;min-width:140px"><b style="font-family:'Sora';font-size:16px">${esc(o.num)}</b> ${o.title?"· "+esc(o.title):""}<br>
        <span style="color:var(--muted);font-size:12px">${c?esc(c.name)+" · ":""}${uzDate(o.at.slice(0,10))}</span></div>
      <span class="tag ${cls}">${lbl}</span>
      ${canSnab && !isArchive() ? `<button class="btn ghost sm" title="Zakazni yopish" onclick="closeSnabOrder('${o.id}')">✔ Yopish</button>` : ""}
      ${isClosed && ["admin","snab"].includes(r) && !isArchive() ? `<button class="btn ghost sm" onclick="reopenSnabOrder('${o.id}')">↩ Qayta ochish</button>` : ""}
    </div>${receipt}${goodsBlock}${payBlock}${chat}`;
}
/* Amallar */
async function snabMsg(ord, text, kind="text", scope="all"){
  const rec = { ord, author: USER.id, text, kind, scope, at: new Date().toISOString() };
  if (CLOUD) { const { data, error } = await sb.from("snab_msgs").insert({ ord, author: USER.id, text, kind, scope }).select().single(); if (error) return toast("Xatolik: "+error.message); rec.id = data.id; } else rec.id = Date.now();
  SNAB_MSGS.push(rec);
}
async function setSnabStatus(o, status){
  if (CLOUD) { const { error } = await sb.from("snab_orders").update({ status }).eq("id", o.id); if (error) return toast("Xatolik: "+error.message); }
  o.status = status;
}
async function addContractor(){
  const name = $("#ctName").value.trim(), phone = $("#ctPhone").value.trim() || null;
  if (!name) return toast("Nomini kiriting");
  if (CLOUD) { const { data, error } = await sb.from("contractors").insert({ name, phone }).select().single(); if (error) return toast("Xatolik: "+error.message);
    CONTRACTORS.push({ id:data.id, name, phone, token:data.token, active:true }); }
  else CONTRACTORS.push({ id:Date.now(), name, phone, token:Math.random().toString(36).slice(2), active:true });
  toast("Kontragent qo'shildi ✓"); render();
}
async function addSnabOrder(cid){
  const title = $("#soTitle").value.trim() || null;
  let num = "SZ-" + String(SNAB_ORDERS.length + 1).padStart(4,"0");
  const rec = { contractor: CLOUD?cid:+cid, title, status:"new", by:USER.id, at:new Date().toISOString() };
  if (CLOUD) {
    const { data: n } = await sb.rpc("snab_next_num"); if (n) num = n;
    const { data, error } = await sb.from("snab_orders").insert({ num, contractor: cid, title, created_by: USER.id }).select().single();
    if (error) return toast("Xatolik: "+error.message); rec.id = data.id;
  } else rec.id = Date.now();
  rec.num = num; SNAB_ORDERS.unshift(rec);
  await snabMsg(rec.id, `Zakaz ochildi: ${num}${title?" — "+title:""}`, "sys", "all");
  toast(`Zakaz ${num} ochildi`); snabGo("order", rec.id);
}
async function addSnabItem(oid){
  const name = $("#siName").value.trim(), qty = +$("#siQty").value||0, price = +$("#siPrice").value||0;
  if (!name || qty<=0) return toast("Tovar va sonini kiriting");
  const rec = { ord: oid, name, qty, price, received:false };
  if (CLOUD) { const { data, error } = await sb.from("snab_items").insert({ ord: oid, name, qty, price }).select().single(); if (error) return toast("Xatolik: "+error.message); rec.id = data.id; } else rec.id = Date.now();
  SNAB_ITEMS.push(rec);
  await snabMsg(oid, `📦 Tovar qo'shildi: ${name} — ${qty} × ${fmtMoney(price)}`, "goods", "goods");
  render();
}
async function delSnabItem(id){
  const i = SNAB_ITEMS.find(x=>String(x.id)===String(id));
  if (!confirm(`«${i?i.name:""}» tovari zakazdan O'CHIRILSINMI?\n\nBu qaytarib bo'lmaydi. Chatga izoh qoladi.`)) return;
  await snabMsg(i.ord, `✗ Tovar o'chirildi: ${i.name} — ${i.qty} × ${fmtMoney(i.price)}`, "goods", "goods");
  if (CLOUD) { const { error } = await sb.from("snab_items").delete().eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  SNAB_ITEMS = SNAB_ITEMS.filter(i=>String(i.id)!==String(id)); render();
}
async function recvSnabItem(id){
  const i = SNAB_ITEMS.find(x=>String(x.id)===String(id)); if (!i) return;
  if (CLOUD) { const { error } = await sb.from("snab_items").update({ received:true, received_by:USER.id, received_at:new Date().toISOString() }).eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  i.received = true; i.receivedAt = new Date().toISOString();
  await snabMsg(i.ord, `✅ Zavsklad tovarni qabul qildi: ${i.name} — ${i.qty} dona`, "goods_ok", "all");
  const o = SNAB_ORDERS.find(x=>String(x.id)===String(i.ord));
  if (o && SNAB_ITEMS.filter(x=>String(x.ord)===String(o.id)).every(x=>x.received) && o.status==="new") await setSnabStatus(o, "goods_ok");
  toast("Tovar qabul qilindi ✓"); render();
}
async function reqSnabPay(oid){
  const amount = +$("#spAmt").value||0, purpose = $("#spPurp").value.trim();
  if (amount<=0) return toast("Summani kiriting"); if (!purpose) return toast("Nima uchun to'lanishini yozing");
  const rec = { ord: oid, amount, purpose, status:"requested", reqBy:USER.id, at:new Date().toISOString() };
  if (CLOUD) { const { data, error } = await sb.from("snab_payments").insert({ ord: oid, amount, purpose, requested_by:USER.id }).select().single(); if (error) return toast("Xatolik: "+error.message); rec.id = data.id; } else rec.id = Date.now();
  SNAB_PAYS.push(rec);
  await snabMsg(oid, `💳 To'lov so'rovi kassirga: ${fmtMoney(amount)} — ${purpose}`, "pay_req", "pay");
  const o = SNAB_ORDERS.find(x=>String(x.id)===String(oid)); if (o && o.status!=="paid") await setSnabStatus(o, "pay_requested");
  toast("Kassirga yuborildi"); render();
}
async function paySnab(id){
  const p = SNAB_PAYS.find(x=>String(x.id)===String(id)); if (!p) return;
  if (!confirm(`${fmtMoney(p.amount)} so'm to'landi deb belgilaysizmi?`)) return;
  if (CLOUD) { const { error } = await sb.from("snab_payments").update({ status:"paid", paid_by:USER.id, paid_at:new Date().toISOString() }).eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  p.status = "paid"; p.paidBy = USER.id;
  await snabMsg(p.ord, `💳 Kassir to'lov qildi: ${fmtMoney(p.amount)} — postavshik tasdig'i kutilmoqda`, "paid", "all");
  const o = SNAB_ORDERS.find(x=>String(x.id)===String(p.ord)); if (o) await setSnabStatus(o, "paid");
  toast("To'landi — postavshik tasdiqlashi kutilmoqda"); render();
}
async function rejectSnabPay(id){
  const p = SNAB_PAYS.find(x=>String(x.id)===String(id)); if (!p) return;
  if (CLOUD) { const { error } = await sb.from("snab_payments").update({ status:"rejected" }).eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  p.status = "rejected"; await snabMsg(p.ord, `✗ Kassir to'lovni rad etdi: ${fmtMoney(p.amount)}`, "pay_rej", "pay"); render();
}
async function confirmSnabPayAdmin(id){
  const p = SNAB_PAYS.find(x=>String(x.id)===String(id)); if (!p) return;
  if (CLOUD) { const { error } = await sb.from("snab_payments").update({ status:"confirmed", confirmed_at:new Date().toISOString() }).eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  p.status = "confirmed"; p.confirmedAt = new Date().toISOString(); await snabMsg(p.ord, `✓ To'lov tasdiqlandi (admin): ${fmtMoney(p.amount)}`, "pay_confirm", "all");
  const o = SNAB_ORDERS.find(x=>String(x.id)===String(p.ord));
  if (o && !SNAB_PAYS.some(x=>String(x.ord)===String(o.id) && ["requested","paid"].includes(x.status))) await setSnabStatus(o, "confirmed");
  render();
}
async function closeSnabOrder(id){
  const o = SNAB_ORDERS.find(x=>String(x.id)===String(id)); if (!o) return;
  const st = snabStatus(o);
  const warn = st !== "done" ? `\n\n⚠️ DIQQAT: ${SNAB_ST[st][1]}. Yopilsa ham qabul qilinmagan tovar va tasdiqlanmagan to'lov hisobga kirmaydi.` : "";
  if (!confirm("Zakaz yopilsinmi?" + warn)) return;
  await setSnabStatus(o, "closed"); await snabMsg(o.id, "Zakaz yopildi", "sys", "all"); render();
}
async function reopenSnabOrder(id){
  const o = SNAB_ORDERS.find(x=>String(x.id)===String(id)); if (!o) return;
  await setSnabStatus(o, "new"); await snabMsg(o.id, "Zakaz qayta ochildi", "sys", "all"); toast("Zakaz qayta ochildi"); render();
}
async function sendSnabMsg(oid){
  const inp = $("#snMsg"); const t = inp.value.trim(); if (!t) return; inp.value = "";
  await snabMsg(oid, t, "text", "all"); render();
}
function openSnabRoles(){
  const cnt = r => EMPLOYEES.filter(e=>e.snabRole===r).length;
  const warn = ["snab","kassir","zavsklad"].filter(r=>cnt(r)>1).map(r=>`${ {snab:"Ta'minotchi",kassir:"Kassir",zavsklad:"Zavsklad"}[r] }: ${cnt(r)} kishi`).join(", ");
  openAccessModal("snab_role", "snabRole", "🔑 Snabjeniya rollari", { none:"— yo'q —", snab:"📋 Ta'minotchi (snab)", kassir:"💳 Kassir", zavsklad:"📦 Zavsklad" },
    "Ta'minotchi zakaz ochadi va to'lov so'raydi; kassir to'laydi (tovarni ko'rmaydi); zavsklad tovarni qabul qiladi (to'lovni ko'rmaydi). <b>Kassir — faqat bitta odam</b> (dizayn va sotuv KPI tasdig'i ham unda). Ta'minotchi/zavsklad bir nechta bo'lishi mumkin." + (cnt("kassir")>1 ? ` <b style="color:var(--danger)">⚠️ Hozir ${cnt("kassir")} ta kassir bor — bittasini tanlang, qolganidan olinadi.</b>` : "")); }

/* ================= POSTAVSHIK sahifasi (?sup=TOKEN, login yo'q) ================= */
async function supplierPage(token){
  document.body.innerHTML = `<div style="max-width:720px;margin:0 auto;padding:16px;font-family:inherit"><div id="supRoot" class="empty">Yuklanmoqda...</div></div>`;
  const root = document.getElementById("supRoot");
  if (!CLOUD) { root.innerHTML = "Postavshik sahifasi faqat Supabase ulanganda ishlaydi"; return; }
  const { data, error } = await sb.rpc("sup_view", { tok: token });
  if (error || !data) { root.innerHTML = `<div class="card empty">Havola noto'g'ri yoki faol emas</div>`; return; }
  const bal = (+data.paid_total) - (+data.goods_total); // + = postavshik bizga qarz
  const st = SNAB_ST;
  root.className = "";
  // Yangi xabar/to'lov bo'lsa ovoz + bildirishnoma
  const sig = JSON.stringify((data.orders||[]).map(o => [o.id, o.status, o.msgs.length, o.payments.map(p=>p.status).join("")]));
  if (window.__supSig && window.__supSig !== sig) notifyUser("GM Pulse — yangi o'zgarish", "Zakazingizda yangilik bor");
  window.__supSig = sig;
  if (!window.__supPoll) window.__supPoll = setInterval(() => supplierPage(token), 30000);
  root.innerHTML = `<div class="card" style="padding:16px;margin-bottom:12px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:150px"><b style="font-family:'Sora';font-size:18px">🏭 ${esc(data.contractor.name)}</b>
          <div style="color:var(--muted);font-size:12.5px;margin-top:3px">GM Pulse · postavshik kabineti</div></div>
        <button class="btn ghost sm" id="supInstallBtn" style="display:none" onclick="if(deferredPrompt){deferredPrompt.prompt()}">📲 O'rnatish</button>
        <button class="btn ghost sm" onclick="notifyEnable()" title="Bildirishnoma">🔔</button>
        <button class="btn ghost sm" onclick="supExit()" title="Chiqish">⏏</button></div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:8px">Bu sahifa telefoningizda eslab qolindi — keyingi safar havola kerak emas. Bosh ekranga qo'shib ilova kabi ishlating.</div>
      <div class="emp-mini" style="margin-top:12px">
        <div><b class="num">${fmtMoney(+data.goods_total)}</b><span>YETKAZILGAN TOVAR</span></div>
        <div><b class="num">${fmtMoney(+data.paid_total)}</b><span>OLINGAN TO'LOV</span></div>
        <div><b class="num" style="color:${bal>0?"var(--danger)":bal<0?"var(--success)":""}">${bal>0?"−":bal<0?"+":""}${fmtMoney(Math.abs(bal))}</b><span>${bal>0?"SIZ QARZDORSIZ":bal<0?"SIZGA QARZ":"TENG"}</span></div></div></div>
    ${(data.orders||[]).map(o => { const [cls,lbl] = st[o.status]||["muted",o.status];
      return `<div class="card" style="padding:14px 16px;margin-bottom:12px">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${esc(o.num)}</b> ${o.title?"· "+esc(o.title):""}<span class="tag ${cls}" style="margin-left:auto">${lbl}</span></div>
        ${o.items.length ? `<div style="margin-top:8px;font-size:12.5px">📦 ${o.items.map(i=>`${esc(i.name)} ${i.qty}×${fmtMoney(i.price)} ${i.received?"✓":"⏳"}`).join(" · ")}</div>` : ""}
        ${o.payments.map(p=>`<div style="margin-top:8px;font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">💳 <b>${fmtMoney(p.amount)}</b> ${esc(p.purpose||"")}
          ${p.status==="paid" ? `<span class="tag info">to'landi</span><button class="btn success sm" onclick="supConfirm('${token}','${p.id}')">✓ Pul keldi</button>`
            : p.status==="confirmed" ? '<span class="tag success">qabul qilindi ✓</span>' : p.status==="requested" ? '<span class="tag gold">to\'lov tayyorlanmoqda</span>' : '<span class="tag danger">rad</span>'}</div>`).join("")}
        <div style="margin-top:10px;max-height:200px;overflow-y:auto">${o.msgs.map(m=>`<div style="font-size:12.5px;margin-top:5px"><b>${esc(m.author_name||"")}:</b> ${esc(m.text)} <span style="color:var(--muted);font-size:10.5px">${(m.created_at||"").slice(5,16).replace("T"," ")}</span></div>`).join("")}</div>
        <div style="display:flex;gap:7px;margin-top:9px"><input id="sm${o.id}" placeholder="Xabar..."><button class="btn primary sm" onclick="supMsg('${token}','${o.id}')">Yuborish</button></div>
      </div>`; }).join("") || `<div class="card empty">Hali zakaz yo'q</div>`}`;
}
async function supConfirm(tok, pid){
  const { data } = await sb.rpc("sup_confirm_payment", { tok, pay_id: +pid });
  if (!data) return toast("Tasdiqlanmadi"); toast("Rahmat, to'lov tasdiqlandi ✓"); supplierPage(tok);
}
async function supMsg(tok, oid){
  const inp = document.getElementById("sm"+oid); const t = inp.value.trim(); if (!t) return;
  const { data } = await sb.rpc("sup_msg", { tok, order_id: +oid, txt: t });
  if (!data) return toast("Yuborilmadi"); inp.value=""; supplierPage(tok);
}

