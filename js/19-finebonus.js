/* ===== GM Pulse · 19-finebonus.js — Jarima / bonus ===== */
/* ---------- 6. JARIMA / BONUS ---------- */
function fbRow(f){
  const e = empById(f.emp);
  const isBonus = f.type === "bonus";
  return `<div class="fb-item">
    <div class="fb-icon" style="background:${isBonus?"var(--success-soft)":"var(--danger-soft)"};color:${isBonus?"var(--success)":"var(--danger)"}">
      ${isBonus?IC.up:IC.down}</div>
    <div class="meta"><b>${esc(e.name)} · ${isBonus?"Bonus":"Jarima"}</b>
      <span>${esc(f.reason)}</span></div>
    <div class="amount num" style="color:${isBonus?"var(--success)":"var(--danger)"}">
      ${isBonus?"+":"−"}${fmtMoney(f.amount)}<small>${uzDate(f.date)}</small></div>
  </div>`;
}
function pgFineBonus(){
  const ids = scopeEmployees().map(e=>e.id);
  const list = FINEBONUS.filter(f => ids.includes(f.emp)).sort((a,b)=>b.date.localeCompare(a.date));
  const addBtn = USER.role === "admin"
    ? `<button class="btn primary" onclick="openFBModal()">${IC.plus} Jarima / bonus kiritish</button>`
    : `<span class="tag muted">Faqat admin tomonidan kiritiladi</span>`;
  return `<div class="filters">${addBtn}</div>
    <div class="card">${list.length ? list.map(fbRow).join("") : `<div class="empty">Yozuvlar yo'q</div>`}</div>`;
}

