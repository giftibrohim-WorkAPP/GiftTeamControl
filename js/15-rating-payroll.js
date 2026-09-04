/* ===== GM Pulse · 15-rating-payroll.js — Reyting, hisob-kitob, dashboard ===== */
/* ---------- REYTING (hammaga ochiq, KPI bo'yicha) ---------- */
function kpiFromNums(n){
  const parts = [];
  const sundayBonus = Math.min(10, (+n.sundays || 0) * 2);
  if (+n.t_total) parts.push([n.t_done / n.t_total, 0.6]);
  if (+n.t_done)  parts.push([n.on_time / n.t_done, 0.2]);
  if (+n.days)    parts.push([n.punct / n.days, 0.2]);
  const wSum = parts.reduce((s,p) => s + p[1], 0);
  if (!wSum) return 0;
  return Math.min(100, Math.round(parts.reduce((s,p) => s + p[0]*p[1], 0) / wSum * 100) + sundayBonus);
}
function ratingRows(list){
  const medal = i => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `<b class="num" style="color:var(--muted)">${i+1}</b>`;
  return list.map((r, i) => {
    r.noData = !(+r.t_total || +r.days);
    const me = String(r.id) === String(USER.id);
    const d = r.dept ? deptById(r.dept) : null;
    return `<div class="fb-item" style="${me ? "background:var(--accent-soft);border-radius:12px" : ""}">
      <div style="width:30px;text-align:center;font-size:17px;align-self:center">${medal(i)}</div>
      <div style="align-self:center">${avatarHtml({ name:r.name, color:r.color, photo:r.photo }, "sm")}</div>
      <div class="meta"><b>${esc(r.name)}${me ? " (siz)" : ""} ${d ? `<span class="tag" style="background:${d.color}22;color:${d.color}">${d.name.replace(" bo'limi","")}</span>` : ""}</b>
        <span>vazifa ${r.t_done}/${r.t_total} · muddatida ${r.on_time} · vaqtida kelish ${r.punct}/${r.days} kun · ${(+r.hours).toFixed(1)} soat</span></div>
      <div class="amount num">${r.noData ? "—" : r.kpi + "%"}<small>${r.noData ? "ma'lumot yo'q" : "KPI"}</small></div>
    </div>`;
  }).join("");
}
function pgRating(){
  const note = `<p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">
    Reyting hammaga bir xil ochiq formula bilan tuziladi: <b>KPI = 60% vazifa bajarilishi + 20% muddatida topshirish + 20% o'z vaqtida kelish</b>
    (obeddan 14:00 dan kech qaytish ham kechikish hisoblanadi). Maosh va jarima ma'lumotlari reytingda ko'rsatilmaydi.</p>`;
  if (CLOUD) return companyTabs() + note + `<div class="card" id="ratingList"><div class="empty">Yuklanmoqda...</div></div>`;
  const list = scopeByCompany(EMPLOYEES.filter(e => e.role === "xodim" || e.role === "boshliq")).map(e => {
    const d = effDetail(e.id), earn = earnedToDate(e);
    return { id: e.id, name: e.name, dept: e.dept, color: e.color, photo: e.photo,
      t_total: d.tTotal, t_done: d.tDone, on_time: d.onTime, days: d.days, punct: d.punct,
      hours: earn.hours, kpi: d.kpi };
  }).sort((a,b) => (a.t_total||a.days?0:1) - (b.t_total||b.days?0:1) || b.kpi - a.kpi || b.hours - a.hours);
  return companyTabs() + note + `<div class="card">${ratingRows(list)}</div>`;
}
async function loadRating(){
  const el = document.getElementById("ratingList"); if (!el) return;
  const { data, error } = await sb.rpc("rating_data", { p_month: viewMonthStart() });
  if (error) { el.innerHTML = `<div class="empty">${USER.role==='admin' ? 'Yuklanmadi: '+esc(error.message)+'<br>supabase-update-15.sql bajarilganini tekshiring' : 'Reyting hozircha mavjud emas'}</div>`; return; }
  const list = (data || [])
    .filter(r => !COMPANY_FILTER || (deptById(r.dept)?.company === COMPANY_FILTER))
    .map(r => ({ ...r, kpi: kpiFromNums(r) }))
    .sort((a,b) => ((a.t_total||a.days)?0:1) - ((b.t_total||b.days)?0:1) || b.kpi - a.kpi || b.hours - a.hours);
  el.innerHTML = ratingRows(list) || `<div class="empty">Ma'lumot yo'q</div>`;
}

/* ---------- HISOB-KITOB (payroll, soatbay) ---------- */
/* ADMIN: oyni yopish — barcha xodim raqamlari muzlatiladi */
async function closeMonth(){
  if (isArchive() && !isMonthClosed()) { /* oldingi oyni yopish ham mumkin */ }
  const ym = VIEW_MONTH;
  if (isMonthClosed(ym)) return toast("Bu oy allaqachon yopilgan");
  const emps = EMPLOYEES.filter(e => e.role !== "admin");
  if (!confirm(`${monthLabel(ym)} oyi YOPILSINMI?\n\n${emps.length} xodimning maosh/jarima/KPI raqamlari muzlatiladi. Keyin oylik yoki jarima narxi o'zgarsa ham bu oy o'zgarmaydi.\n\nBu amalni faqat oy tugagach, hamma davomat va tasdiqlar yakunlangach bajaring.`)) return;
  const rows = emps.map(e => { const r = earnedLive(e); const d = effDetail(e.id);
    return { month: ym, emp: e.id, salary: e.salary, hours: +r.hours.toFixed(2), days: r.days, base: Math.round(r.base), piece: Math.round(r.piece),
      bonus: Math.round(r.bonus), fine: Math.round(r.fine), total: Math.round(r.total), kpi: d.noData ? null : d.kpi, closed_by: USER.id }; });
  if (CLOUD) {
    const { error } = await sb.from("payroll_snapshot").upsert(rows, { onConflict: "month,emp" });
    if (error) return toast("Xatolik: " + error.message);
    const { error: e2 } = await sb.from("closed_months").upsert({ month: ym, closed_by: USER.id });
    if (e2) return toast("Xatolik: " + e2.message);
    await loadAll();
  } else { CLOSED_MONTHS.add(ym); rows.forEach(r => PAYROLL_SNAP[ym+"|"+r.emp] = { ...r, hourRate:0, planSoFar:r.days*PLAN_HOURS, diff:r.hours-r.days*PLAN_HOURS, manualFine:r.fine, lateFine:0, fineTotal:r.fine }); }
  toast(`${monthLabel(ym)} yopildi ✓ — raqamlar muzlatildi`); render();
}
async function reopenMonth(){
  const ym = VIEW_MONTH;
  if (!confirm(`${monthLabel(ym)} QAYTA OCHILSINMI? Raqamlar yana jonli hisoblanadi (o'zgarishi mumkin).`)) return;
  if (CLOUD) { const { error } = await sb.from("closed_months").delete().eq("month", ym); if (error) return toast("Xatolik: " + error.message); await loadAll(); }
  else CLOSED_MONTHS.delete(ym);
  toast("Oy qayta ochildi"); render();
}
/* KO'PRIK: server (SQL calc_payroll) va brauzer (earnedLive) hisobini yonma-yon solishtirish.
   Xodimga ko'rinadigan raqam O'ZGARMAYDI — bu faqat admin tekshiruvi. Hamma ✓ bo'lsa serverga o'tamiz. */
async function comparePayroll(){
  if (!CLOUD) return toast("Faqat Supabase rejimida");
  toast("Server hisoblanmoqda...");
  const { data, error } = await sb.rpc("calc_payroll", { p_month: viewMonthStart() });
  if (error) return toast(permErrMsg("Server hisobi ishlamadi: " + error.message, "supabase-update-28.sql"));
  const rows = EMPLOYEES.filter(e => e.role !== "admin").map(e => {
    const b = earnedLive(e); const s = (data || []).find(x => String(x.emp) === String(e.id));
    const cmp = (k1, k2) => s ? Math.abs((+b[k1]) - (+s[k2])) : null;
    const dTotal = cmp("total","total"), dHours = cmp("hours","hours"), dFine = s ? Math.abs(b.fine - (+s.manual_fine + +s.late_fine)) : null;
    const okAll = s && dTotal < 2 && dHours < 0.01 && dFine < 2;
    return { e, b, s, dTotal, dHours, dFine, okAll };
  });
  const bad = rows.filter(r => !r.okAll).length;
  openModal(`<h3>🔬 Hisob solishtiruvi — ${monthLabel()}</h3>
    <div class="sub">Brauzer (hozirgi) ↔ Server (SQL). ${bad ? `<b style="color:var(--danger)">${bad} ta farq</b>` : `<b style="color:var(--success)">Hammasi mos ✓</b>`} — xodimlar hozircha brauzer hisobini ko'radi.</div>
    <div style="max-height:60vh;overflow:auto;margin-top:10px">
      <table class="md-t" style="display:table;width:100%"><tr><td>Xodim</td><td class="r">Soat (B/S)</td><td class="r">Jarima (B/S)</td><td class="r">Maosh (B/S)</td><td></td></tr>
      ${rows.map(r => `<tr style="${r.okAll?"":"background:rgba(212,72,72,.08)"}">
        <td>${esc(r.e.name)}</td>
        <td class="num" style="text-align:right">${r.b.hours.toFixed(2)} / ${r.s?(+r.s.hours).toFixed(2):"—"}</td>
        <td class="num" style="text-align:right">${fmtMoney(r.b.fine)} / ${r.s?fmtMoney(+r.s.manual_fine + +r.s.late_fine):"—"}</td>
        <td class="num" style="text-align:right">${fmtMoney(r.b.total)} / ${r.s?fmtMoney(+r.s.total):"—"}</td>
        <td>${r.okAll ? '<span class="tag success">✓</span>' : `<span class="tag danger">farq ${r.dTotal!=null?fmtMoney(Math.round(r.dTotal)):"?"}</span>`}</td></tr>`).join("")}</table></div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
function pgPayroll(){
  const scope = scopeEmployees();
  const diffCell = d => {
    if (Math.abs(d) < 0.05) return `<span class="tag muted">rejada</span>`;
    return d > 0
      ? `<span class="num" style="color:var(--success);font-weight:800">+${d.toFixed(1)} soat</span>`
      : `<span class="num" style="color:var(--danger);font-weight:800">−${Math.abs(d).toFixed(1)} soat</span>`;
  };
  const rows = scope.map(e => {
    const r = earnedToDate(e);
    return `<tr class="rowhover">
      <td><div style="display:flex;align-items:center;gap:9px">${avatarHtml(e,"sm")}
        <div><b style="font-size:13.5px">${esc(e.name)}</b><br><span style="font-size:11.5px;color:var(--muted)">${esc(e.pos)}</span></div></div></td>
      <td class="num">${fmtMoney(e.salary)}</td>
      <td class="num" style="color:var(--muted)">${new Intl.NumberFormat("uz-UZ").format(Math.round(r.hourRate))}</td>
      <td class="num">${r.hours.toFixed(1)} / ${r.planSoFar}</td>
      <td>${diffCell(r.diff)}</td>
      <td class="num">${fmtMoney(r.base)}</td>
      <td class="num" style="color:var(--success)">+${fmtMoney(r.bonus)}</td>
      <td class="num"><b>${fmtMoney(r.total)}</b></td>
      <td class="num" style="color:var(--danger)">${r.fine ? "−"+fmtMoney(r.fine) : "—"}</td>
    </tr>`;
  }).join("");
  const totals = scope.reduce((s,e)=>{ const r=earnedToDate(e);
    s.base+=r.base; s.bonus+=r.bonus; s.fine+=r.fine; s.total+=r.total; return s; },{base:0,bonus:0,fine:0,total:0});
  return `
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">
      Reja: <b>oyiga ${PLAN_DAYS} ish kuni × ${PLAN_HOURS} soat = ${PLAN_TOTAL} soat</b> (ish vaqti 9:00–18:00, obed 13:00–14:00).
      Formula: <b>soatlik stavka (oylik ÷ ${PLAN_TOTAL}) × real ishlagan soat + bonus</b>.
      <b style="color:var(--danger)">Jarima maoshga qo'shib hisoblanmaydi</b> — u alohida ustunda ko'rsatiladi va alohida undiriladi.
      Masalan, oylik 5&nbsp;mln bo'lsa soatlik ≈ 24&nbsp;038 so'm — ortiqcha ishlagan soatlar qo'shiladi, kam kelgan/kam ishlagan soatlar shunga ko'ra kamaytiradi.</p>
    ${isMonthClosed() ? `<div class="archive-bar">🔒 ${monthLabel()} YOPILGAN — raqamlar muzlatilgan (oylik/jarima narxi o'zgarsa ham bu oy o'zgarmaydi)
        ${USER.role==="admin" ? `<button class="btn ghost sm" onclick="reopenMonth()">↩ Qayta ochish</button>` : ""}</div>` : ""}
    <div class="filters"><button class="btn ghost sm" onclick="exportPayroll()">⬇ Excel (CSV) yuklab olish</button>
      ${USER.role==="admin" && !isMonthClosed() ? `<button class="btn primary sm" onclick="closeMonth()">🔒 ${monthLabel()} oyini yopish</button>` : ""}
      ${USER.role==="admin" && CLOUD ? `<button class="btn ghost sm" onclick="comparePayroll()" title="Server va brauzer hisobini solishtirish">🔬 Solishtirish</button>` : ""}</div>
    <div class="pay-cards">${scope.map(e => { const r = earnedToDate(e); return `
      <div class="card pay-card">
        <div class="top">${avatarHtml(e,"sm")}<div><b>${esc(e.name)}</b><span>oylik ${fmtMoney(e.salary)}</span></div>
          <div class="net num">${fmtMoney(r.total)}<br><span style="font-size:10px;color:var(--muted);font-weight:600">maosh (jarimasiz)</span></div></div>
        <div class="rows">
          <div><b class="num">${r.hours.toFixed(1)} / ${r.planSoFar}</b><span>SOAT / REJA</span></div>
          <div><b class="num" style="color:${r.diff>=0?"var(--success)":"var(--danger)"}">${r.diff>=0?"+":"−"}${Math.abs(r.diff).toFixed(1)} soat</b><span>FARQ</span></div>
          <div><b class="num" style="color:var(--success)">+${fmtMoney(r.bonus)}</b><span>BONUS</span></div>
          <div><b class="num" style="color:var(--danger)">${r.fine?fmtMoney(r.fine):"—"}</b><span>JARIMA (ALOHIDA)</span></div>
        </div></div>`; }).join("")}</div>
    <div class="card t-wrap pay-table"><table>
      <tr><th>Xodim</th><th>Oylik maosh</th><th>Soatlik (so'm)</th><th>Ishlagan / reja soat</th><th>Farq</th><th>Hisoblangan</th><th>Bonus</th><th>Maosh (jarimasiz)</th><th>Jarima (alohida)</th></tr>
      ${rows}
      <tr style="background:var(--surface2)"><td><b>Jami</b></td><td></td><td></td><td></td><td></td>
        <td class="num"><b>${fmtMoney(totals.base)}</b></td>
        <td class="num" style="color:var(--success)"><b>+${fmtMoney(totals.bonus)}</b></td>
        <td class="num" style="color:var(--danger)"><b>−${fmtMoney(totals.fine)}</b></td>
        <td class="num"><b>${fmtMoney(totals.total)}</b></td></tr>
    </table></div>`;
}

/* ---------- 1. DASHBOARD (admin / rahbar / boshliq) ---------- */
function pgDashboard(){
  const scope = scopeByCompany(scopeEmployees());
  if (!scope.length) return companyTabs() + `<div class="card empty">${COMPANY_FILTER} bo'yicha xodim topilmadi — Xodimlar → Bo'limlar da bo'limga kompaniya belgilang</div>`;
  const ids = scope.map(e => e.id);
  const isHead = USER.role === "boshliq";
  const bonus = FINEBONUS.filter(f => f.type==="bonus" && ids.includes(f.emp)).reduce((s,f)=>s+f.amount,0);
  const fine  = FINEBONUS.filter(f => f.type==="fine"  && ids.includes(f.emp)).reduce((s,f)=>s+f.amount,0);
  const payroll = scope.reduce((s,e) => s + earnedToDate(e).total, 0);
  const avgEff = Math.round(scope.reduce((s,e)=>s+efficiency(e.id),0) / scope.length);
  const pending = TASKS.filter(t => t.status==="review" && ids.includes(t.emp)).length;
  const lateTotal = ATTENDANCE.filter(a => (a.late || a.lunchLate) && ids.includes(a.emp)).length;

  const scopeLabel = isHead ? deptById(USER.dept).name : (COMPANY_FILTER || "Butun kompaniya");

  // Boshliq: pul (bonus/jarima/fond) ko'rinmaydi — o'rniga davomat ko'rsatkichlari
  let stats = isHead ? `
    <div class="grid stats">
      <div class="card stat"><div class="lbl">${IC.users} Xodimlar</div><div class="val num">${scope.length}</div><div class="delta" style="color:var(--muted)">${scopeLabel}</div></div>
      <div class="card stat"><div class="lbl">${IC.dash} O'rtacha samaradorlik</div><div class="val num">${avgEff}%</div><div class="delta" style="color:var(--muted)">o'z bo'limingiz</div></div>
      <div class="card stat"><div class="lbl">${IC.clock} Kechikishlar</div><div class="val num" style="color:${lateTotal?"var(--danger)":"var(--success)"}">${lateTotal}</div><div class="delta" style="color:var(--muted)">shu oy, o'z bo'limingiz</div></div>
      <div class="card stat"><div class="lbl">${IC.tasks} Tasdiq kutmoqda</div><div class="val num">${pending}</div><div class="delta" style="color:${pending?"var(--gold)":"var(--muted)"}">${pending?"ta vazifa":"vazifa yo'q"}</div></div>
    </div>` : `
    <div class="grid stats">
      <div class="card stat"><div class="lbl">${IC.users} Xodimlar</div><div class="val num">${scope.length}</div><div class="delta" style="color:var(--muted)">${scopeLabel}</div></div>
      <div class="card stat"><div class="lbl">${IC.up} Jami bonuslar</div><div class="val num" style="color:var(--success)">+${fmtShort(bonus)}</div><div class="delta" style="color:var(--muted)">${monthLabelLow()}</div></div>
      <div class="card stat"><div class="lbl">${IC.down} Jami jarimalar</div><div class="val num" style="color:var(--danger)">−${fmtShort(fine)}</div><div class="delta" style="color:var(--muted)">${monthLabelLow()}</div></div>
      <div class="card stat"><div class="lbl">${IC.money} Sof to'lov fondi</div><div class="val num">${fmtShort(payroll)}</div><div class="delta" style="color:var(--muted)">oy boshidan hisoblangan</div></div>
      <div class="card stat"><div class="lbl">${IC.dash} O'rtacha samaradorlik</div><div class="val num">${avgEff}%</div><div class="delta" style="color:${pending? "var(--gold)":"var(--muted)"}">${pending? pending+" ta vazifa tasdiq kutmoqda":"tasdiq kutayotgan vazifa yo'q"}</div></div>
    </div>`;

  // Boshliq: butun kompaniya bo'limlar grafigi emas, faqat o'z jamoasi
  let charts = isHead ? `
    <div class="card chart-card">
      <h3>Jamoam samaradorligi</h3><div class="sub">${scopeLabel} · o'rtacha KPI ${avgEff}%</div>
      ${[...scope].sort((a,b)=>efficiency(b.id)-efficiency(a.id)).map(e=>`
        <div class="bar-row"><span class="nm" style="width:130px">${esc(e.name.split(" ")[0])} ${esc(e.name.split(" ")[1]?.[0]||"")}.</span>
        <div class="track"><div class="fill" style="width:${efficiency(e.id)}%"></div></div>
        <span class="pc num">${effDetail(e.id).noData ? "—" : efficiency(e.id)+"%"}</span></div>`).join("")}
    </div>` : `
    <div class="grid charts">
      <div class="card chart-card"><h3>Oylik samaradorlik dinamikasi</h3><div class="sub">Bo'limlar kesimida, % (yanvar–iyul)</div>${svgLineChart()}</div>
      <div class="card chart-card"><h3>Bo'limlar samaradorligi</h3><div class="sub">Joriy oy, o'rtacha KPI</div>${deptBars()}
        <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:13px">
          <h3 style="margin-bottom:9px">Eng faol xodimlar</h3>
          ${[...scope].sort((a,b)=>efficiency(b.id)-efficiency(a.id)).slice(0,4).map(e=>`
            <div class="bar-row"><span class="nm" style="width:130px">${esc(e.name.split(" ")[0])} ${esc(e.name.split(" ")[1]?.[0]||"")}.</span>
            <div class="track"><div class="fill" style="width:${efficiency(e.id)}%"></div></div>
            <span class="pc num">${efficiency(e.id)}%</span></div>`).join("")}
        </div>
      </div>
    </div>`;

  // Xodimlar kesimida KPI raqamlari (nimadan hisoblanayotgani ko'rinadi)
  const kpiTable = `
    <h3 class="section-title">Samaradorlik tafsiloti <span>KPI = 60% vazifa + 20% muddatida + 20% vaqtida kelish</span></h3>
    <div class="kpi-cards">${[...scope].sort((a,b)=>efficiency(b.id)-efficiency(a.id)).map(e => { const dd = effDetail(e.id); return `
      <div class="card pay-card" onclick="viewEmp('${e.id}')" style="cursor:pointer">
        <div class="top">${avatarHtml(e,"sm")}<div><b>${esc(e.name)}</b><span>${esc(e.pos)}</span></div>
          <div class="net num">${dd.kpi}%<br><span style="font-size:10px;color:var(--muted);font-weight:600">KPI</span></div></div>
        <div class="rows">
          <div><b class="num">${dd.tDone}/${dd.tTotal}</b><span>VAZIFA</span></div>
          <div><b class="num">${dd.tDone?dd.onTime+"/"+dd.tDone:"—"}</b><span>MUDDATIDA</span></div>
          <div><b class="num">${dd.punct}/${dd.days}</b><span>VAQTIDA KELISH</span></div>
          <div><b class="num" style="color:${dd.days-dd.punct>0?"var(--danger)":"var(--success)"}">${dd.days-dd.punct}</b><span>KECHIKISH</span></div>
        </div></div>`; }).join("")}</div>
    <div class="card t-wrap kpi-table"><table>
      <tr><th>Xodim</th><th>Vazifalar</th><th>Muddatida</th><th>Vaqtida kelish</th><th>KPI</th></tr>
      ${[...scope].sort((a,b)=>efficiency(b.id)-efficiency(a.id)).map(e => { const d = effDetail(e.id); return `
      <tr class="rowhover" style="cursor:pointer" onclick="viewEmp('${e.id}')">
        <td><div style="display:flex;align-items:center;gap:9px">${avatarHtml(e,"sm")} ${esc(e.name)}</div></td>
        <td class="num">${d.tDone}/${d.tTotal} bajarildi <span style="color:var(--muted)">(${d.tPc}%)</span></td>
        <td class="num">${d.tDone ? `${d.onTime}/${d.tDone} <span style="color:var(--muted)">(${d.oPc}%)</span>` : "—"}</td>
        <td class="num">${d.punct}/${d.days} kun <span style="color:var(--muted)">(${d.pPc}%)</span>
          ${d.days - d.punct > 0 ? `<span class="tag danger">${d.days - d.punct} kechikish</span>` : ""}</td>
        <td><b class="num" style="font-size:14.5px">${d.noData ? '<span style="color:var(--muted)">—</span>' : d.kpi + "%"}</b></td>
      </tr>`; }).join("")}
    </table></div>
    <p style="font-size:11.5px;color:var(--muted);margin-top:8px">Qatorni bossangiz xodimning to'liq profili ochiladi.</p>`;

  // Boshliq dashboardida shaxsiy karta ham (o'ziniki ham ko'rinadi)
  let personal = "";
  if (USER.role === "boshliq") personal = `<h3 class="section-title">Mening shaxsiy ko'rsatkichlarim</h3>` + personalBlock(USER);
  return ((USER.role==="admin"||isExec(USER.role)) ? companyTabs() : "") + stats + charts + kpiTable + personal;
}
