/* ===== GM Pulse · 09-orders.js — Zakazlar, bo'limlar, tovarlar ===== */
/* ---------- ZAKAZLAR (mijoz buyurtmalari) ---------- */
let PRODUCTS = [], ORDERS = [];
async function loadOrders(){
  if (!CLOUD) return;
  const [pr, od] = await Promise.all([
    sb.from("products").select("*").order("sort"),
    sb.from("orders").select("*").gte("date", viewMonthStart()).lte("date", viewMonthEnd()).order("date", { ascending:false }),
  ]);
  if (pr.data) PRODUCTS = pr.data.map(p => ({ id:p.id, name:p.name, unit:p.unit||"dona", company:p.company, active:p.active, sort:p.sort }));
  if (od.data) ORDERS = od.data.map(o => ({ id:o.id, date:o.date, customer:o.customer, product:o.product,
    productName:o.product_name, qty:+o.qty, price:+o.price, total:+o.total, note:o.note, company:o.company, by:o.created_by }));
}
/* Zakaz ruxsati: admin — to'liq; rahbar/direktor — ko'radi; boshqalar — admin bergan darajada */
function ordersAccess(){
  if (USER.role === "admin") return "edit";
  if (USER.ordersAccess === "edit" || USER.ordersAccess === "view") return USER.ordersAccess;
  if (isExec(USER.role)) return "view";
  return "none";
}
function canSeeOrders(){ return ordersAccess() !== "none"; }
function canEditOrders(){ return ordersAccess() === "edit"; }
/* Ruxsati borlar barcha zakazlarni ko'radi (kompaniya savdosi) */
function orderScope(){ return canSeeOrders() ? ORDERS : []; }
/* Xodimning kompaniyasi (bo'limi orqali) */
function empCompany(e){ return (e && e.dept && deptById(e.dept)?.company) || ""; }
function companies(){
  const set = new Set(DEPTS.map(d => d.company).filter(Boolean));
  PRODUCTS.forEach(p => p.company && set.add(p.company));
  return [...set];
}
let COMPANY_FILTER = ""; // "" = hammasi
function companyTabs(onchange){
  const cs = companies(); if (cs.length < 2 && !COMPANY_FILTER) return "";
  return `<div class="filters" style="margin-bottom:12px">
    <button class="btn ${COMPANY_FILTER===""?"primary":"ghost"} sm" onclick="COMPANY_FILTER='';render()">Hammasi</button>
    ${cs.map(c => `<button class="btn ${COMPANY_FILTER===c?"primary":"ghost"} sm" onclick="COMPANY_FILTER='${esc(c)}';render()">${esc(c)}</button>`).join("")}
  </div>`;
}

function pgOrders(){
  if (!canSeeOrders()) return `<div class="card empty">Zakazlar bo'limiga ruxsatingiz yo'q — administratorga murojaat qiling</div>`;
  const list = orderScope().filter(o => !COMPANY_FILTER || o.company === COMPANY_FILTER)
    .sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  const sum = list.reduce((s,o) => s + o.total, 0);
  const cnt = list.length;
  const customers = new Set(list.map(o => o.customer.trim().toLowerCase())).size;
  const isAdmin = USER.role === "admin";
  const adminBar = isAdmin ? `<button class="btn ghost" onclick="openProducts()">📦 Tovarlar ro'yxati</button>
    <button class="btn ghost" onclick="openOrderAccess()">🔑 Zakaz ruxsatlari</button>` : "";
  const myCompany = empCompany(USER);
  const addForm = (isArchive() || !canEditOrders()) ? "" : `
    <div class="card" style="padding:16px;margin-bottom:15px">
      <b style="font-size:14px">➕ Yangi zakaz</b>
      ${PRODUCTS.filter(p=>p.active).length ? `
      <div style="display:grid;grid-template-columns:2fr 2fr 1fr 1.4fr;gap:8px;margin-top:11px" class="ord-form">
        <div><label>Mijoz</label><input id="odCust" placeholder="Mijoz nomi / do'kon"></div>
        <div><label>Tovar</label><select id="odProd" onchange="odCompanyHint()">${PRODUCTS.filter(p=>p.active).map(p=>`
          <option value="${p.id}" data-company="${esc(p.company||"")}">${esc(p.name)}${p.company?" · "+esc(p.company):""}</option>`).join("")}</select></div>
        <div><label>Soni</label><input id="odQty" type="number" min="0.01" step="1" value="1" oninput="odCompanyHint()"></div>
        <div><label>Narxi (1 ${esc(PRODUCTS[0]?.unit||"dona")}, so'm)</label><input id="odPrice" type="number" min="0" step="1000" placeholder="0" oninput="odCompanyHint()"></div>
        <div><label>Sana</label><input id="odDate" type="date" value="${TODAY}" max="${TODAY}"></div>
        <div style="grid-column:span 2"><label>Izoh (ixtiyoriy)</label><input id="odNote" placeholder="masalan: yetkazib berish bilan"></div>
        <div style="display:flex;align-items:flex-end"><button class="btn primary" style="width:100%" onclick="addOrder()">Qo'shish</button></div>
      </div>
      <div id="odTotal" style="font-size:12.5px;color:var(--muted);margin-top:8px"></div>`
      : `<div class="empty">Tovarlar ro'yxati bo'sh — admin "📦 Tovarlar ro'yxati" dan kiritishi kerak</div>`}
    </div>
    <style>@media(max-width:760px){.ord-form{grid-template-columns:1fr 1fr!important}.ord-form>div[style*="span 2"]{grid-column:span 2!important}}</style>`;
  return `${companyTabs()}
    <div class="grid stats" style="margin-bottom:15px">
      <div class="card stat"><div class="lbl">${IC.money} Savdo summasi</div><div class="val num" style="color:var(--success);font-size:19px">${fmtMoney(sum)}</div>
        <div class="delta" style="color:var(--muted)">${monthLabelLow()}</div></div>
      <div class="card stat"><div class="lbl">${IC.tasks} Zakazlar</div><div class="val num">${cnt}</div>
        <div class="delta" style="color:var(--muted)">${customers} ta mijoz</div></div>
      <div class="card stat"><div class="lbl">${IC.up} O'rtacha zakaz</div><div class="val num" style="font-size:19px">${cnt?fmtMoney(sum/cnt):"—"}</div></div>
    </div>
    <div class="filters">${adminBar}
      <button class="btn ghost sm" onclick="exportOrders()">⬇ Excel (CSV)</button></div>
    ${!canEditOrders() && !isArchive() ? `<div class="tag muted" style="margin-bottom:10px">Sizda faqat ko'rish ruxsati — zakaz kiritish uchun admin "kiritish" huquqini berishi kerak</div>` : ""}
    ${addForm}
    <h3 class="section-title">${isArchive()?monthLabel()+" zakazlari":"Zakazlar"} <span>${cnt} ta</span></h3>
    ${list.length ? `<div class="card">${list.map(o => {
      const by = empById(o.by);
      const mine = String(o.by) === String(USER.id);
      return `<div class="fb-item">
        <div class="fb-icon" style="background:var(--accent-soft);color:var(--accent)">🛒</div>
        <div class="meta"><b>${esc(o.customer)} ${o.company?`<span class="tag info">${esc(o.company)}</span>`:""}</b>
          <span>${esc(o.productName||"—")} · ${o.qty} × ${fmtMoney(o.price)} · ${uzDate(o.date)}${by?" · "+esc(by.name.split(" ")[0]):""}${o.note?" · "+esc(o.note):""}</span></div>
        <div class="amount num" style="color:var(--success)">${fmtMoney(o.total)}</div>
        ${((mine && canEditOrders()) || isAdmin) && !isArchive() ? `<button class="btn sm" style="color:var(--danger)" onclick="delOrder('${o.id}')">✕</button>` : ""}
      </div>`; }).join("")}</div>` : `<div class="card empty">Zakaz yo'q</div>`}`;
}
function odCompanyHint(){
  const q = +($("#odQty")?.value||0), p = +($("#odPrice")?.value||0);
  const el = document.getElementById("odTotal");
  if (el) el.textContent = q && p ? `Jami: ${fmtMoney(q*p)} so'm` : "";
}
async function addOrder(){
  const customer = $("#odCust").value.trim(), prodId = $("#odProd").value;
  const qty = +$("#odQty").value || 0, price = +$("#odPrice").value || 0;
  const date = $("#odDate").value, note = $("#odNote").value.trim() || null;
  if (!customer) return toast("Mijoz nomini kiriting");
  if (!prodId) return toast("Tovarni tanlang");
  if (qty <= 0) return toast("Sonini kiriting");
  if (price <= 0) return toast("Narxini kiriting");
  const prod = PRODUCTS.find(p => String(p.id) === String(prodId));
  const company = prod?.company || empCompany(USER) || null;
  const rec = { date, customer, product: +prodId, productName: prod?.name, qty, price, total: qty*price, note, company, by: USER.id };
  if (CLOUD) {
    const { data, error } = await sb.from("orders")
      .insert({ date, customer, product: +prodId, product_name: prod?.name, qty, price, note, company, created_by: USER.id })
      .select().single();
    if (error) return toast("Xatolik: " + error.message);
    rec.id = data.id; rec.total = +data.total;
  } else rec.id = Date.now();
  ORDERS.push(rec);
  toast(`Zakaz qo'shildi: ${customer} — ${fmtMoney(qty*price)} ✓`);
  render();
}
async function delOrder(id){
  if (!confirm("Zakaz o'chirilsinmi?")) return;
  if (CLOUD) {
    const { error } = await sb.from("orders").delete().eq("id", id);
    if (error) return toast("Xatolik: " + error.message);
  }
  ORDERS = ORDERS.filter(o => String(o.id) !== String(id));
  toast("O'chirildi"); render();
}
function exportOrders(){
  const rows = [["Sana","Mijoz","Tovar","Soni","Narxi","Jami","Kompaniya","Kiritgan","Izoh"]];
  orderScope().sort((a,b)=>a.date.localeCompare(b.date)).forEach(o =>
    rows.push([o.date, o.customer, o.productName||"", o.qty, o.price, o.total, o.company||"", empById(o.by)?.name||"", o.note||""]));
  downloadCSV("zakazlar_" + VIEW_MONTH, rows);
}
/* ADMIN: zakazlar bo'limiga ruxsat berish */
function openOrderAccess(){
  const list = EMPLOYEES.filter(e => e.role !== "admin");
  const lbl = { none:"— yo'q —", view:"👁 Ko'radi", edit:"✏️ Ko'radi va kiritadi" };
  openModal(`<h3>🔑 Zakaz ruxsatlari</h3>
    <div class="sub">Kim zakazlarni ko'radi, kim kirita oladi. Rahbar/direktor sukut bo'yicha ko'radi.</div>
    <div style="margin-top:12px;max-height:55vh;overflow-y:auto">${list.map(e=>`
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:13px">
        ${avatarHtml(e,"sm")}<span style="flex:1">${esc(e.name)}<br><span style="color:var(--muted);font-size:11px">${esc(e.pos)}${isExec(e.role)?" · rahbariyat":""}</span></span>
        <select onchange="setOrderAccess('${e.id}', this.value)" style="width:auto;font-size:12px">
          ${["none","view","edit"].map(v=>`<option value="${v}" ${(e.ordersAccess||"none")===v?"selected":""}>${lbl[v]}</option>`).join("")}
        </select>
      </div>`).join("")}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function setOrderAccess(id, v){
  const e = empById(id); if (!e) return;
  if (CLOUD) {
    const { data, error } = await sb.from("profiles").update({ orders_access: v }).eq("id", id).select("id");
    if (error) return toast("Xatolik: " + error.message);
    if (!data || !data.length) return toast(permErr("supabase-update-18.sql"));
  }
  e.ordersAccess = v;
  toast(`${e.name.split(" ")[0]}: ${ {none:"ruxsat olib tashlandi", view:"ko'rish ruxsati", edit:"kiritish ruxsati"}[v] }`);
}

/* ADMIN: bo'limlar boshqaruvi (kompaniya kesimi bilan) */
function openDeptModal(){
  openModal(`<h3>🏢 Bo'limlar</h3>
    <div class="sub">Har bir bo'lim qaysi kompaniyaga tegishli — KPI shunga ko'ra ajratiladi</div>
    <div style="margin-top:12px;max-height:40vh;overflow-y:auto">${DEPTS.map(d=>`
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:13px">
        <span class="kdot" style="background:${d.color}"></span>
        <span style="flex:1">${esc(d.name)}</span>
        <select onchange="setDeptCompany('${d.id}', this.value)" style="width:auto;font-size:12px">
          <option value="">— kompaniya —</option>
          ${companies().map(c=>`<option value="${esc(c)}" ${d.company===c?"selected":""}>${esc(c)}</option>`).join("")}
        </select>
        <button class="btn sm" style="color:var(--danger)" onclick="delDept('${d.id}')">✕</button>
      </div>`).join("") || `<div class="empty" style="padding:10px">Bo'lim yo'q</div>`}</div>
    <div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px">
      <label>Yangi bo'lim nomi</label><input id="dpName" placeholder="masalan: Sotuv bo'limi">
      <div style="display:flex;gap:9px">
        <div style="flex:1"><label>Rang</label><input id="dpColor" type="color" value="#149E93" style="height:38px"></div>
        <div style="flex:2"><label>Kompaniya</label>
          <input id="dpCompany" list="dpCompList" placeholder="Karona / Gift Master">
          <datalist id="dpCompList">${companies().map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div>
      </div>
      <button class="btn primary sm" style="margin-top:10px" onclick="addDept()">Qo'shish</button>
    </div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function addDept(){
  const name = $("#dpName").value.trim(), color = $("#dpColor").value, company = $("#dpCompany").value.trim() || null;
  if (!name) return toast("Bo'lim nomini kiriting");
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "d" + Date.now();
  if (CLOUD) {
    const { error } = await sb.from("departments").insert({ id, name, color, company });
    if (error) return toast("Xatolik: " + error.message);
  }
  DEPTS.push({ id, name, color, company });
  toast("Bo'lim qo'shildi ✓"); openDeptModal();
}
async function setDeptCompany(id, company){
  const d = deptById(id); if (!d) return;
  if (CLOUD) {
    const { error } = await sb.from("departments").update({ company: company || null }).eq("id", id);
    if (error) return toast("Xatolik: " + error.message);
  }
  d.company = company || null;
  toast(company ? `${d.name} → ${company}` : "Kompaniya olib tashlandi"); render();
}
async function delDept(id){
  if (EMPLOYEES.some(e => String(e.dept) === String(id))) return toast("Bu bo'limda xodimlar bor — avval ularni boshqa bo'limga o'tkazing");
  if (!confirm("Bo'lim o'chirilsinmi?")) return;
  if (CLOUD) {
    const { error } = await sb.from("departments").delete().eq("id", id);
    if (error) return toast("Xatolik: " + error.message);
  }
  DEPTS = DEPTS.filter(d => String(d.id) !== String(id));
  toast("O'chirildi"); openDeptModal();
}

/* ADMIN: tovarlar ro'yxati */
function openProducts(){
  openModal(`<h3>📦 Tovarlar ro'yxati</h3>
    <div class="sub">Zakaz kiritishda shu ro'yxatdan tanlanadi. Narx har safar zakazda kiritiladi.</div>
    <div style="margin-top:12px;max-height:40vh;overflow-y:auto">${PRODUCTS.map(p=>`
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:13px">
        <span style="flex:1">${esc(p.name)} <span style="color:var(--muted);font-size:11px">(${esc(p.unit)})</span></span>
        ${p.company?`<span class="tag info">${esc(p.company)}</span>`:""}
        <button class="btn sm" style="color:var(--danger)" onclick="delProduct('${p.id}')">✕</button>
      </div>`).join("") || `<div class="empty" style="padding:10px">Ro'yxat bo'sh</div>`}</div>
    <div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px">
      <label>Tovar nomi</label><input id="prName" placeholder="masalan: Sovg'a to'plami №3">
      <div style="display:flex;gap:9px">
        <div style="flex:1"><label>Birlik</label><input id="prUnit" value="dona"></div>
        <div style="flex:2"><label>Kompaniya</label>
          <input id="prCompany" list="prCompList" placeholder="Karona / Gift Master">
          <datalist id="prCompList">${companies().map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div>
      </div>
      <button class="btn primary sm" style="margin-top:10px" onclick="addProduct()">Qo'shish</button>
    </div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function addProduct(){
  const name = $("#prName").value.trim(), unit = $("#prUnit").value.trim() || "dona", company = $("#prCompany").value.trim() || null;
  if (!name) return toast("Tovar nomini kiriting");
  if (CLOUD) {
    const { data, error } = await sb.from("products").insert({ name, unit, company, sort: PRODUCTS.length+1 }).select().single();
    if (error) return toast("Xatolik: " + error.message);
    PRODUCTS.push({ id:data.id, name, unit, company, active:true, sort:PRODUCTS.length+1 });
  } else PRODUCTS.push({ id:Date.now(), name, unit, company, active:true, sort:PRODUCTS.length+1 });
  toast("Qo'shildi ✓"); openProducts();
}
async function delProduct(id){
  if (CLOUD) {
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) return toast("O'chirilmadi: bu tovarga zakazlar bog'langan. O'rniga faolsizlantiring.");
  }
  PRODUCTS = PRODUCTS.filter(p => String(p.id) !== String(id));
  toast("O'chirildi"); openProducts();
}

