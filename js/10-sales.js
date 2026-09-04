/* ===== GM Pulse · 10-sales.js — Sotuv menejeri KPI ===== */
/* ================= SOTUV MENEJERI KPI (bosqichli foiz) ================= */
let SALES_ENTRIES = [], SALES_TIERS = [
  { id:1, from:0,   to:100,  pct:0,   gift:false },
  { id:2, from:100, to:150,  pct:1.0, gift:false },
  { id:3, from:150, to:300,  pct:1.7, gift:false },
  { id:4, from:300, to:500,  pct:2.1, gift:false },
  { id:5, from:500, to:750,  pct:2.4, gift:false },
  { id:6, from:750, to:null, pct:2.4, gift:true  },
];
const MLN = 1e6;
async function loadSales(){
  if (!CLOUD) return;
  const [se, st] = await Promise.all([
    sb.from("sales_entries").select("*").gte("date", viewMonthStart()).lte("date", viewMonthEnd()).order("date", { ascending:false }),
    sb.from("sales_tiers").select("*").order("sort"),
  ]);
  if (se.data) SALES_ENTRIES = se.data.map(x => ({ id:x.id, manager:x.manager, date:x.date, brand:x.brand, product:x.product, code:x.code, orderNum:x.order_num, price:x.price!=null?+x.price:null, amount:+x.amount, note:x.note, by:x.created_by }));
  if (st.data && st.data.length) SALES_TIERS = st.data.map(t => ({ id:t.id, from:+t.from_mln, to:t.to_mln!=null?+t.to_mln:null, pct:+t.pct, gift:t.gift }));
}
function salesTotal(mgr){ return SALES_ENTRIES.filter(x => String(x.manager)===String(mgr)).reduce((s,x)=>s+x.amount,0); }
/* BOSQICHLI KPI: har oraliqdagi QISM o'z foizida. Masalan 200 mln: (150-100)×1% + (200-150)×1.7% */
function salesKpi(mgr){
  const total = salesTotal(mgr);
  let kpi = 0; const parts = [];
  for (const t of SALES_TIERS) {
    const lo = t.from*MLN, hi = t.to==null ? Infinity : t.to*MLN;
    const part = Math.max(0, Math.min(total, hi) - lo);
    if (part > 0 && t.pct > 0) { const v = part * t.pct / 100; kpi += v; parts.push({ tier:t, part, v }); }
  }
  const cur = SALES_TIERS.slice().reverse().find(t => total >= t.from*MLN) || SALES_TIERS[0];
  const next = SALES_TIERS.find(t => t.from*MLN > total);
  const giftTier = SALES_TIERS.find(t => t.gift);
  const gift = giftTier && total >= giftTier.from*MLN;
  const toGift = giftTier ? Math.max(0, giftTier.from*MLN - total) : 0;
  return { total, kpi: Math.round(kpi), parts, cur, next, gift, toGift, toNext: next ? next.from*MLN - total : 0 };
}
function salesManagers(){ return EMPLOYEES.filter(e => e.salesManager); }
function tierLabel(t){ return t.to==null ? `${t.from} mln+` : `${t.from}–${t.to} mln`; }
/* Vizual: bosqichli shkala */
function salesBar(k){
  const maxMln = (SALES_TIERS.find(t=>t.gift)?.from || 750) * 1.15;
  const pct = Math.min(100, k.total / (maxMln*MLN) * 100);
  const marks = SALES_TIERS.filter(t=>t.from>0).map(t => `<div style="position:absolute;left:${Math.min(100,t.from/maxMln*100)}%;top:-4px;bottom:-4px;width:2px;background:${t.gift?"var(--gold)":"var(--line)"}" title="${tierLabel(t)} · ${t.pct}%"></div>
    <div style="position:absolute;left:${Math.min(100,t.from/maxMln*100)}%;top:22px;transform:translateX(-50%);font-size:10px;color:${t.gift?"var(--gold)":"var(--muted)"};white-space:nowrap">${t.gift?"🎁 ":""}${t.from}</div>`).join("");
  return `<div style="position:relative;height:14px;background:var(--surface2);border-radius:99px;margin:14px 0 26px">
    <div style="height:100%;width:${pct}%;border-radius:99px;background:linear-gradient(90deg,var(--accent),${k.gift?"var(--gold)":"var(--success)"});transition:width .4s"></div>${marks}</div>`;
}
function canSeeKpi(){ return USER.role === "admin" || isExec(USER.role); }
function salesCard(e, k, big){
  const giftTier = SALES_TIERS.find(t=>t.gift);
  const mine = String(e.id) === String(USER.id);
  // Kassir: faqat sotuv summasi va soni — KPI/foiz/bosqich ko'rinmaydi
  if (!mine && !canSeeKpi()) return `<div class="card" style="padding:14px 16px;margin-bottom:10px">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${avatarHtml(e,"sm")}
      <div style="flex:1;min-width:140px"><b style="font-size:14px">${esc(e.name)}</b><br>
        <span style="font-size:12px;color:var(--muted)">${SALES_ENTRIES.filter(x=>String(x.manager)===String(e.id)).length} ta sotuv · ${monthLabelLow()}</span></div>
      <div style="text-align:right"><div class="num" style="font-size:18px;font-weight:900">${fmtMoney(k.total)}</div>
        <div style="font-size:10.5px;color:var(--muted);font-weight:700">JAMI SOTUV</div></div></div></div>`;
  return `<div class="card" style="padding:16px;margin-bottom:12px;${k.gift?"border:2px solid var(--gold)":""}">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      ${avatarHtml(e, big?"lg":"sm")}
      <div style="flex:1;min-width:140px"><b style="font-family:'Sora';font-size:${big?17:14}px">${esc(e.name)}</b><br>
        <span style="font-size:12px;color:var(--muted)">${esc(e.pos)} · ${SALES_ENTRIES.filter(x=>String(x.manager)===String(e.id)).length} ta sotuv</span></div>
      <div style="text-align:right">
        <div class="num" style="font-size:${big?22:18}px;font-weight:900">${fmtMoney(k.total)}</div>
        <div style="font-size:10.5px;color:var(--muted);font-weight:700">JAMI SOTUV</div></div></div>
    ${salesBar(k)}
    <div class="emp-mini" style="grid-template-columns:1fr 1fr 1fr">
      <div><b class="num" style="color:var(--success)">${fmtMoney(k.kpi)}</b><span>KPI (SO'M)</span></div>
      <div><b class="num">${k.cur.pct}%</b><span>JORIY BOSQICH · ${tierLabel(k.cur)}</span></div>
      <div><b class="num" style="color:${k.gift?"var(--gold)":""}">${k.gift ? "🎁 SOVG'A!" : fmtMoney(k.toGift)}</b><span>${k.gift ? "750 MLN O'TILDI" : "SOVG'AGACHA QOLDI"}</span></div></div>
    ${k.next && !k.gift ? `<div style="font-size:12px;color:var(--muted);margin-top:8px">Keyingi bosqich (${tierLabel(k.next)} · ${k.next.pct}%) gacha <b>${fmtMoney(k.toNext)}</b> qoldi</div>` : ""}
    ${big && k.parts.length ? `<div style="margin-top:10px;font-size:12px;border-top:1px solid var(--line);padding-top:8px">
      ${k.parts.map(p=>`<div style="display:flex;justify-content:space-between"><span>${tierLabel(p.tier)} oralig'i: ${fmtMoney(p.part)} × ${p.tier.pct}%</span><b>${fmtMoney(Math.round(p.v))}</b></div>`).join("")}
      <div style="display:flex;justify-content:space-between;font-weight:800;margin-top:4px"><span>Jami KPI</span><span style="color:var(--success)">${fmtMoney(k.kpi)}</span></div></div>` : ""}
  </div>`;
}
function pgSales(){
  const me = USER.salesManager, kas = isKassir();
  if (!me && !kas) return `<div class="card empty">Bu bo'lim sotuv menejerlari, kassir va rahbariyat uchun</div>`;
  const adminBar = USER.role==="admin" ? `<div class="filters"><button class="btn ghost sm" onclick="openSalesManagers()">👥 Sotuv menejerlari</button><button class="btn ghost sm" onclick="openSalesTiers()">📊 KPI bosqichlari</button></div>` : "";
  const myBlock = me ? salesCard(USER, salesKpi(USER.id), true) + `<h3 class="section-title">Mening sotuvlarim</h3>${salesTable(USER.id)}` : "";
  const mgrs = salesManagers().filter(e => String(e.id)!==String(USER.id));
  const canEdit = (USER.role==="admin" || USER.snabRole==="kassir") && !isArchive();
  const form = canEdit && mgrs.length ? `<div class="card" style="padding:16px;margin-bottom:14px">
      <b style="font-size:14px">➕ Sotuv yozish (kassir)</b>
      <div class="ord-form" style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-top:10px">
        <div><label>Menejer</label><select id="slMgr">${mgrs.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select></div>
        <div><label>Brend</label><input id="slBrand" list="slBrands" placeholder="Karona / Gift Master"><datalist id="slBrands">${[...new Set(SALES_ENTRIES.map(x=>x.brand).filter(Boolean))].map(b=>`<option value="${esc(b)}">`).join("")}</datalist></div>
        <div><label>Zakaz raqami</label><input id="slOrder" placeholder="№"></div>
        <div><label>Tovar nomi</label><input id="slProd" placeholder="Tovar"></div>
        <div><label>Kodi</label><input id="slCode" placeholder="Kod"></div>
        <div><label>Narxi (ixtiyoriy)</label><input id="slPrice" type="number" min="0"></div>
        <div><label>Summa (so'm) *</label><input id="slAmt" type="number" min="0" step="1000" placeholder="0"></div>
        <div><label>Sana</label><input id="slDate" type="date" value="${TODAY}" max="${TODAY}"></div>
        <div style="display:flex;align-items:flex-end"><button class="btn primary" style="width:100%" onclick="addSale()">Qo'shish</button></div>
      </div></div>` : (canEdit ? `<div class="card empty">Sotuv menejeri belgilanmagan — admin "👥 Sotuv menejerlari"dan belgilasin</div>` : "");
  const list = kas && mgrs.length ? `<h3 class="section-title" style="margin-top:6px">Menejerlar (${monthLabelLow()})</h3>` +
    mgrs.map(e => ({ e, k: salesKpi(e.id) })).sort((a,b)=>b.k.total-a.k.total).map(({e,k}) => `<div onclick="openSalesEmp('${e.id}')" style="cursor:pointer">${salesCard(e,k,false)}</div>`).join("") : "";
  return adminBar + myBlock + form + list;
}
function salesTable(mgr){
  const rows = SALES_ENTRIES.filter(x=>String(x.manager)===String(mgr)).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  if (!rows.length) return `<div class="card empty">Sotuv yo'q</div>`;
  const canDel = (USER.role==="admin" || USER.snabRole==="kassir") && !isArchive();
  return `<div class="card">${rows.map(x=>`<div class="fb-item"><div class="fb-icon" style="background:var(--accent-soft);color:var(--accent)">🛍</div>
    <div class="meta"><b>${esc(x.product||"—")} ${x.brand?`<span class="tag info">${esc(x.brand)}</span>`:""}</b>
      <span>${uzDate(x.date)}${x.orderNum?" · №"+esc(x.orderNum):""}${x.code?" · kod "+esc(x.code):""}${x.price?" · "+fmtMoney(x.price):""}${x.by?" · "+(empById(x.by)?.name.split(" ")[0]||""):""}</span></div>
    <div class="amount num" style="color:var(--success)">${fmtMoney(x.amount)}</div>
    ${canDel?`<button class="btn sm" style="color:var(--danger)" onclick="delSale('${x.id}')">✕</button>`:""}</div>`).join("")}</div>`;
}
function openSalesEmp(id){ const e = empById(id); if (!e) return;
  openModal(`<h3>${esc(e.name)} — sotuvlar</h3>${salesCard(e, salesKpi(id), true)}<div style="max-height:45vh;overflow-y:auto">${salesTable(id)}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`); }
async function addSale(){
  const manager = $("#slMgr").value, amount = +$("#slAmt").value||0, date = $("#slDate").value;
  if (!manager) return toast("Menejerni tanlang"); if (amount<=0) return toast("Summani kiriting");
  const rec = { manager: CLOUD?manager:+manager, date, brand:$("#slBrand").value.trim()||null, product:$("#slProd").value.trim()||null, code:$("#slCode").value.trim()||null,
    orderNum:$("#slOrder").value.trim()||null, price:+$("#slPrice").value||null, amount, by:USER.id };
  if (CLOUD) { const { data, error } = await sb.from("sales_entries").insert({ manager, date, brand:rec.brand, product:rec.product, code:rec.code, order_num:rec.orderNum, price:rec.price, amount, created_by:USER.id }).select().single();
    if (error) return toast("Xatolik: "+error.message); rec.id = data.id; } else rec.id = Date.now();
  SALES_ENTRIES.push(rec);
  ["slProd","slCode","slOrder","slPrice","slAmt"].forEach(i=>{ const el=$("#"+i); if (el) el.value=""; });
  toast(`Sotuv yozildi: ${fmtMoney(amount)} ✓`); render();
}
async function delSale(id){ if (!confirm("Sotuv yozuvi o'chirilsinmi?")) return;
  if (CLOUD) { const { error } = await sb.from("sales_entries").delete().eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  SALES_ENTRIES = SALES_ENTRIES.filter(x=>String(x.id)!==String(id)); closeModal(); render(); }
function openSalesManagers(){
  const list = EMPLOYEES.filter(e=>e.role!=="admin");
  openModal(`<h3>👥 Sotuv menejerlari</h3><div class="sub">Belgilanganlar uchun sotuv KPI hisoblanadi</div>
    <div class="emp-pick" style="margin-top:11px;max-height:50vh">${list.map(e=>`<label class="pick-chip"><input type="checkbox" class="smChk" value="${e.id}" ${e.salesManager?"checked":""}><span>${esc(e.name)}</span></label>`).join("")}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor</button><button class="btn primary" onclick="saveSalesManagers()">Saqlash</button></div>`);
}
async function saveSalesManagers(){
  const on = new Set([...document.querySelectorAll(".smChk:checked")].map(i=>i.value));
  for (const e of EMPLOYEES.filter(x=>x.role!=="admin")) { const want = on.has(String(e.id)); if (!!e.salesManager===want) continue;
    if (CLOUD) { const { error } = await sb.from("profiles").update({ sales_manager: want }).eq("id", e.id); if (error) return toast("Xatolik: "+error.message); }
    e.salesManager = want; if (String(USER.id)===String(e.id)) USER.salesManager = want; }
  closeModal(); toast("Saqlandi ✓"); render();
}
function openSalesTiers(){
  openModal(`<h3>📊 KPI bosqichlari</h3><div class="sub">Har oraliqdagi QISM o'z foizida hisoblanadi (bosqichli)</div>
    <div style="margin-top:12px">${SALES_TIERS.map(t=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px">
      <span style="flex:1">${tierLabel(t)}${t.gift?" 🎁":""}</span>
      <input type="number" min="0" step="0.1" value="${t.pct}" style="width:80px" onchange="setTierPct('${t.id}', this.value)"><span style="color:var(--muted)">%</span></div>`).join("")}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function setTierPct(id, v){ const t = SALES_TIERS.find(x=>String(x.id)===String(id)); if (!t) return; const pct = Math.max(0,+v||0);
  if (CLOUD) { const { error } = await sb.from("sales_tiers").update({ pct }).eq("id", id); if (error) return toast("Xatolik: "+error.message); }
  t.pct = pct; toast(`${tierLabel(t)}: ${pct}%`); }

