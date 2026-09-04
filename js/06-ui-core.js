/* ===== GM Pulse · 06-ui-core.js — SVG grafiklar, ikonkalar, bildirishnoma paneli, CSV ===== */
/* ============ SVG GRAFIKLAR ============ */
function svgLineChart(){
  const W = 460, H = 210, P = 34;
  const min = 55, max = 100;
  const x = i => P + i * (W - P - 12) / (MONTHLY.labels.length - 1);
  const y = v => H - P + 6 - (v - min) / (max - min) * (H - P - 24);
  const series = DEPTS.slice(0, 4).map(d => ({ key: d.id, color: d.color }));
  let grid = "", labels = "";
  [60,70,80,90,100].forEach(v => {
    grid += `<line x1="${P}" x2="${W-8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>
             <text x="${P-7}" y="${y(v)+4}" font-size="10" fill="var(--muted)" text-anchor="end">${v}</text>`;
  });
  MONTHLY.labels.forEach((l,i) => {
    labels += `<text x="${x(i)}" y="${H-8}" font-size="10.5" fill="var(--muted)" text-anchor="middle">${l}</text>`;
  });
  let paths = "";
  series.forEach(s => {
    const vals = monthlySeries(s.key);
    const pts = vals.map((v,i) => `${x(i)},${y(v)}`).join(" ");
    paths += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    vals.forEach((v,i) => { paths += `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="${s.color}"/>`; });
  });
  const legend = DEPTS.map(d =>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:12px;font-weight:700;color:var(--muted)">
      <span style="width:9px;height:9px;border-radius:3px;background:${d.color};display:inline-block"></span>${d.name}</span>`).join("");
  return `<div style="margin-bottom:8px">${legend}</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}${labels}${paths}</svg>`;
}
function deptBars(){
  return DEPTS.map(d => {
    const dd = deptDetail(d.id);
    return `<div style="margin-bottom:13px">
      <div class="bar-row" style="margin-bottom:4px">
        <span class="nm">${d.name.replace(" bo'limi","")}</span>
        <div class="track"><div class="fill" style="width:${dd.kpi}%;background:${d.color}"></div></div>
        <span class="pc num">${dd.kpi}%</span></div>
      <div style="font-size:11.5px;color:var(--muted);padding-left:102px">
        ${dd.emps} xodim · vazifa: ${dd.tDone}/${dd.tTotal} bajarildi (${dd.onTime} tasi muddatida) · kechikish: ${dd.late} marta</div>
    </div>`;
  }).join("");
}

/* ============ IKONKALAR ============ */
const IC = {
  dash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5M16 5a3.5 3.5 0 010 6.8M21.5 20c-.5-2.1-1.8-3.6-3.5-4.4"/></svg>`,
  tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8.5 9.5l2 2 4-4.5M8.5 16h7"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
  money: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v.01M18 14.5v.01"/></svg>`,
  me:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c1-3.8 4-5.8 7.5-5.8s6.5 2 7.5 5.8"/></svg>`,
  plus:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  up:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>`,
  down:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M15 17H7V9"/></svg>`,
  sun:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.5 14.5A8.5 8.5 0 019.5 3.5a8.5 8.5 0 1011 11z"/></svg>`,
  out:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 4h3.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H15M10 8l-4 4 4 4M6 12h10"/></svg>`,
  calc:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/></svg>`,
  brush: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 114.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 00-3-3.02z"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  bot:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V4M8 4h8M8 14h.01M16 14h.01M9 17h6"/></svg>`,
  cart:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></svg>`,
  box:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3.3 7.5L12 12.5l8.7-5M12 12.5V21"/></svg>`,
  trophy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4.5A1.5 1.5 0 003 7.5C3 10 5 11 7 11M17 6h2.5A1.5 1.5 0 0121 7.5C21 10 19 11 17 11"/></svg>`,
};

/* ============ BILDIRISHNOMALAR (ilova ichida) ============ */
function notifList(){
  const items = [], seen = new Set();
  const ids = scopeEmployees().map(e => String(e.id));
  // Vazifani BERGAN odamga (yoki admin) tasdiq so'rovi keladi
  TASKS.filter(t => t.status==="review" && !isTaskDoer(t, USER.id)
      && (String(t.by) === String(USER.id) || USER.role === "admin")).forEach(t => {
      seen.add(t.id);
      items.push({ ic:"✅", cls:"info", text:`«${t.title}» tasdiq kutmoqda — ${empById(t.emp)?.name.split(" ")[0]||""}`, go:"tasks" });
    });
  TASKS.filter(t => isTaskDoer(t, USER.id) && t.status === "new").forEach(t => {
    seen.add(t.id);
    items.push({ ic:"🆕", cls:"accent", text:`Yangi vazifa: «${t.title}» (muddat ${uzDate(t.due)})`, go:"tasks" });
  });
  TASKS.filter(t => (isTaskDoer(t, USER.id) || taskEmps(t).some(e => ids.includes(String(e))))
      && t.status !== "done" && t.status !== "closed" && t.due < TODAY && !seen.has(t.id))
    .forEach(t => items.push({ ic:"⚠️", cls:"danger", text:`Muddati o'tdi: «${t.title}» — ${taskEmps(t).map(e=>empById(e)?.name.split(" ")[0]||"").join(", ")}`, go:"tasks" }));
  ATTENDANCE.filter(a => a.ot === "pending" && canApproveOT(a) && ids.includes(String(a.emp))).forEach(a =>
    items.push({ ic:"⏱", cls:"gold", text:`${empById(a.emp).name.split(" ")[0]} — qo'shimcha ${otMinutes(a)} daqiqa tasdiq kutmoqda (${uzDate(a.date)})`, go:"attendance" }));
  ATTENDANCE.filter(a => String(a.emp)===String(USER.id) && !a.out && a.date < TODAY).slice(-3).forEach(a =>
    items.push({ ic:"⚠️", cls:"danger", text:`${uzDate(a.date)} — "Ketdim" bosilmagan, bu kun soati hisoblanmadi. Adminga ayting`, go:"me" }));
  if (USER.role === "admin") ATTENDANCE.filter(a => !a.out && a.date < TODAY).forEach(a =>
    items.push({ ic:"⚠️", cls:"gold", text:`${empById(a.emp)?.name.split(" ")[0]} — ${uzDate(a.date)} ketish vaqti yo'q (tuzatish kerak)`, go:"attendance" }));
  LEAVE_REQS.filter(r => r.status === "pending" && canDecideLeave(r)).forEach(r =>
    items.push({ ic:"📝", cls:"gold",
      text:`${empById(r.emp)?.name.split(" ")[0]} — ${leaveKindLabel(r.kind)}ga ruxsat so'radi (${uzDate(r.date)}${r.fromTime?" "+r.fromTime:""})`, go:"attendance" }));
  LEAVE_REQS.filter(r => String(r.emp)===String(USER.id) && r.status !== "pending" && r.date >= TODAY).forEach(r =>
    items.push({ ic: r.status==="approved"?"✅":"❌", cls: r.status==="approved"?"success":"danger",
      text:`${uzDate(r.date)} — ${leaveKindLabel(r.kind)} so'rovingiz ${r.status==="approved"?"tasdiqlandi":"rad etildi"}`, go:"me" }));
  if (canSeeSnab()) {
    const r = snabRole();
    if (canApprovePrice()) SNAB_ITEMS.filter(i=>i.priceAppr==="pending").forEach(i => { const o = SNAB_ORDERS.find(x=>String(x.id)===String(i.ord)); if (o) items.push({ ic:"⚠️", cls:"danger", text:`${o.num}: ${i.name} narxi oshdi ${fmtMoney(i.prevPrice)} → ${fmtMoney(i.price)} — tasdiqlash kerak`, go:"snab" }); });
    if (["admin","zavsklad"].includes(r)) SNAB_ITEMS.filter(i=>!i.received).forEach(i => { const o = SNAB_ORDERS.find(x=>String(x.id)===String(i.ord)); if (o && snabStatus(o)!=="closed") items.push({ ic:"📦", cls:"gold", text:`${o.num}: ${i.name} — qabul qilishni kutmoqda`, go:"snab" }); });
    if (["admin","kassir"].includes(r)) SNAB_PAYS.filter(p=>p.status==="requested").forEach(p => { const o = SNAB_ORDERS.find(x=>String(x.id)===String(p.ord)); if (o) items.push({ ic:"💳", cls:"gold", text:`${o.num}: ${fmtMoney(p.amount)} to'lov so'raldi — ${p.purpose||""}`, go:"snab" }); });
    if (["admin","snab"].includes(r)) SNAB_PAYS.filter(p=>p.status==="paid").forEach(p => { const o = SNAB_ORDERS.find(x=>String(x.id)===String(p.ord)); if (o) items.push({ ic:"⏳", cls:"info", text:`${o.num}: ${fmtMoney(p.amount)} to'landi — postavshik tasdig'i kutilmoqda`, go:"snab" }); });
  }
  (() => { const byEmp = {}; PIECE_ENTRIES.filter(p => p.status==="pending" && canApproveOT({emp:p.emp})).forEach(p => { byEmp[p.emp]=(byEmp[p.emp]||0)+1; });
    Object.entries(byEmp).forEach(([id,n]) => items.push({ ic:"📦", cls:"gold", text:`${empById(id)?.name.split(" ")[0]} — ${n} ta donabay yozuv tasdiq kutmoqda`, go:"piece" })); })();
  ATTENDANCE.filter(a => a.inField && a.inAppr === "pending" && canApproveOT({emp:a.emp}) && ids.includes(String(a.emp))).forEach(a =>
    items.push({ ic:"🚶", cls:"info", text:`${empById(a.emp).name.split(" ")[0]} — tashqaridan kelishni tasdiqlash (${uzDate(a.date)})`, go:"attendance" }));
  ATTENDANCE.filter(a => a.outField && a.outAppr === "pending" && canApproveOT({emp:a.emp}) && ids.includes(String(a.emp))).forEach(a =>
    items.push({ ic:"🚶", cls:"info", text:`${empById(a.emp).name.split(" ")[0]} — tashqarida ish tugatishni tasdiqlash (${uzDate(a.date)})`, go:"attendance" }));
  if (USER.role === "admin" || isExec(USER.role))
    EMPLOYEES.filter(e => e.contract && daysTo(e.contract) <= 30).forEach(e =>
      items.push({ ic:"📄", cls:"gold", text: daysTo(e.contract) < 0
        ? `${e.name} — shartnoma muddati O'TGAN (${uzDate(e.contract)})`
        : `${e.name} — shartnoma tugashiga ${daysTo(e.contract)} kun`, go:"employees" }));
  const dismissed = notifDismissed();
  return items.filter(n => !dismissed.has(n.text));
}
function notifKey(){ return "gm_notif_dismissed_" + (USER ? USER.id : "x"); }
function notifDismissed(){ try { return new Set(JSON.parse(localStorage.getItem(notifKey()) || "[]")); } catch(e){ return new Set(); } }
/* Hozirgi bildirishnomalarni "o'qilgan" deb yashirish. Yangi hodisa bo'lsa yana chiqadi. */
function notifClear(){
  const cur = notifList().map(n => n.text);
  const set = notifDismissed(); cur.forEach(t => set.add(t));
  try { localStorage.setItem(notifKey(), JSON.stringify([...set].slice(-300))); } catch(e){}
  toast("Bildirishnomalar tozalandi"); renderBell();
}
function renderBell(){
  const list = notifList();
  const badge = $("#bellBadge");
  badge.style.display = list.length ? "flex" : "none";
  badge.textContent = list.length;
  $("#notifPanel").innerHTML = (list.length
    ? list.map(n => `<button class="notif-item" onclick="toggleNotif();go('${n.go}')"><span>${n.ic}</span><span>${esc(n.text)}</span></button>`).join("")
    : `<div class="empty" style="padding:18px">Yangi bildirishnoma yo'q</div>`)
    + (list.length ? `<button class="notif-item" onclick="notifClear()" style="border-top:1px solid var(--line);color:var(--muted)"><span>🧹</span><span>Hammasini o'qilgan deb belgilash</span></button>` : "")
    + `<button class="notif-item" onclick="toggleNotif();notifyEnable()" style="border-top:1px solid var(--line);color:var(--accent)"><span>🔔</span><span>${("Notification" in window && Notification.permission==="granted") ? "Telefon bildirishnomasi yoqilgan ✓" : "Telefon bildirishnomasini yoqish (ovoz bilan)"}</span></button>`;
}
function toggleNotif(){ $("#notifPanel").classList.toggle("open"); }
document.addEventListener("click", e => {
  if (!e.target.closest("#bellWrap")) $("#notifPanel")?.classList.remove("open");
});

/* ============ CSV EKSPORT (Excel ochadi) ============ */
function downloadCSV(name, rows){
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name + ".csv"; a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV yuklab olindi — Excel'da oching");
}
function exportPayroll(){
  const rows = [["Xodim","Lavozim","Oylik maosh","Soatlik stavka","Ishlagan soat","Reja soat","Farq (soat)","Hisoblangan","Bonus","Maosh (jarimasiz)","Jarima: kechikish","Jarima: qo'lda","Jarima jami (alohida)"]];
  scopeEmployees().forEach(e => {
    const r = earnedToDate(e);
    rows.push([e.name, e.pos, e.salary, Math.round(r.hourRate), r.hours.toFixed(1), r.planSoFar,
               r.diff.toFixed(1), Math.round(r.base), r.bonus, Math.round(r.total),
               Math.round(r.lateFine), Math.round(r.manualFine), Math.round(r.fine)]);
  });
  downloadCSV("hisob-kitob_" + VIEW_MONTH, rows);
}
function exportAttendance(){
  const ids = scopeEmployees().map(e=>e.id);
  const rows = [["Xodim","Sana","Kelgan","Ketgan","Ishlagan soat","Kechikish"]];
  ATTENDANCE.filter(a => ids.includes(a.emp)).forEach(a => {
    rows.push([empById(a.emp).name, a.date, a.in, a.out ?? "", a.out ? workedHours(a).toFixed(1) : "", a.late ? "ha" : "yo'q"]);
  });
  downloadCSV("davomat_" + VIEW_MONTH, rows);
}
