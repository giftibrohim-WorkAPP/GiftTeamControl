/* ===== GM Pulse · 16-me-employees.js — Mening sahifam, xodimlar ===== */
/* ---------- 2. MENING SAHIFAM (xodim / boshliq) ---------- */
function personalBlock(e){
  const earn = earnedToDate(e);
  const todayAtt = ATTENDANCE.find(a => a.emp === e.id && a.date === TODAY);
  const myFB = empFB(e.id).sort((a,b)=>b.date.localeCompare(a.date));
  const eff = efficiency(e.id);
  const lateCount = empAttendance(e.id).filter(a=>a.late).length;

  const lunchInfo = todayAtt && todayAtt.lunchBack
    ? `<span class="tag ${todayAtt.lunchLate?"danger":"success"}">🍽 obeddan ${todayAtt.lunchBack} da qaytgan${todayAtt.lunchLate?" (kech)":""}</span>` : "";
  const lunchBtn = todayAtt && !todayAtt.out && !todayAtt.lunchBack
    ? `<button class="btn ghost" onclick="checkLunch()">🍽 Obeddan qaytdim</button>
       <span style="font-size:11px;color:var(--muted)">14:00 gacha bosing — kech qaytilsa ortiqcha vaqt ayriladi</span>`
    : "";
  const otInfo = todayAtt && todayAtt.out && otMinutes(todayAtt) > 0
    ? `<span class="tag ${ {pending:"gold",approved:"success",rejected:"danger",none:"muted"}[todayAtt.ot||"none"] }">
        qo'shimcha ${otMinutes(todayAtt)} daq — ${ {pending:"tasdiq kutilmoqda",approved:"tasdiqlangan ✓",rejected:"rad etilgan",none:"hisoblanmagan"}[todayAtt.ot||"none"] }</span>` : "";
  const fieldInfo = todayAtt ? [
    todayAtt.inField ? `<span class="tag ${ {pending:"gold",approved:"success",rejected:"danger"}[todayAtt.inAppr]||"info" }">tashqaridan kelish — ${ {pending:"tasdiq kutilmoqda",approved:"tasdiqlangan ✓",rejected:"rad etilgan"}[todayAtt.inAppr]||"" }</span>` : "",
    todayAtt.outField ? `<span class="tag ${ {pending:"gold",approved:"success",rejected:"danger"}[todayAtt.outAppr]||"info" }">tashqarida tugatish — ${ {pending:"tasdiq kutilmoqda",approved:"tasdiqlangan ✓",rejected:"rad etilgan"}[todayAtt.outAppr]||"" }</span>` : ""
  ].join(" ") : "";
  const fieldToday = isFieldDay(e.id, TODAY)
    ? `<span class="tag info">Bugun tashqarida ishlashga ruxsat berilgan — istalgan joydan belgilaysiz</span>` : "";
  const myLeaves = LEAVE_REQS.filter(r => String(r.emp) === String(e.id) && r.date >= TODAY)
    .sort((a,b)=>a.date.localeCompare(b.date));
  const leaveBtn = String(e.id) === String(USER.id)
    ? `<button class="btn ghost" onclick="openLeave()">📝 Oldindan ruxsat so'rash</button>` : "";
  const checkBtn = !todayAtt
    ? `<button class="btn primary" onclick="checkIn()">${IC.clock} Keldim</button>`
    : (!todayAtt.out
      ? `<div class="check-state" style="color:var(--success)">Kelgan vaqt: <span class="num">${todayAtt.in}</span>${todayAtt.late?' <span class="tag danger">kechikish</span>':''} ${lunchInfo}</div>
         ${fieldInfo}
         ${lunchBtn}
         <button class="btn ghost" onclick="checkOut()">${IC.out} Ketdim</button>
         <span style="font-size:11px;color:var(--muted)">Ishxonadan tashqarida bo'lsangiz, tugma joylashuvingizni yozib boshliq tasdig'iga yuboradi</span>`
      : `<div class="check-state">Bugun: <span class="num">${todayAtt.in} — ${todayAtt.out}</span> ${lunchInfo}</div>
         <span class="tag success">Ish kuni yakunlangan</span> ${otInfo} ${fieldInfo}`);

  return `
    <div class="card clock-card">
      <div>
        <div class="time num" id="liveClock">--:--</div>
        <div class="date">${CLOUD ? new Date().toLocaleDateString("uz-UZ",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : "Payshanba, 23-iyul 2026"} · ish vaqti 9:00–18:00 · obed 13:00–14:00</div>
      </div>
      <div class="right">${isArchive()
        ? `<span class="tag gold">📁 ${monthLabel()} arxivi — belgilash faqat joriy oyda</span>`
        : fieldToday + checkBtn + leaveBtn}</div>
    </div>
    <div class="grid stats">
      <div class="card stat"><div class="lbl">${IC.money} Oy boshidan topilgan</div><div class="val num">${fmtMoney(earn.total)}</div>
        <div class="delta" style="color:var(--muted)">oylik ${fmtMoney(e.salary)} · soatlik ${new Intl.NumberFormat("uz-UZ").format(Math.round(earn.hourRate))} so'm</div></div>
      <div class="card stat"><div class="lbl">${IC.clock} Ishlagan soat</div><div class="val num">${earn.hours.toFixed(1)}</div>
        <div class="delta" style="color:${earn.diff>=0?"var(--success)":"var(--danger)"}">reja ${earn.planSoFar} soat · ${earn.diff>=0?"+":"−"}${Math.abs(earn.diff).toFixed(1)} soat</div></div>
      <div class="card stat"><div class="lbl">${IC.up} Bonuslar</div><div class="val num" style="color:var(--success)">+${fmtMoney(earn.bonus)}</div></div>
      <div class="card stat"><div class="lbl">${IC.down} Jarimalar</div><div class="val num" style="color:var(--danger)">−${fmtMoney(earn.fine)}</div>
        <div class="delta" style="color:var(--muted)">${lateCount} marta kechikish</div></div>
      <div class="card stat"><div class="lbl">${IC.dash} Samaradorlik</div><div class="val num">${eff}%</div></div>
    </div>
    ${kpiBreakdown(e)}
    <div class="grid" style="grid-template-columns:1fr 1fr">
      <div>
        <h3 class="section-title">Jarima / bonus tarixi</h3>
        <div class="card">${myFB.length ? myFB.map(fbRow).join("") : `<div class="empty">Hozircha yozuvlar yo'q</div>`}</div>
      </div>
      <div>
        <h3 class="section-title">So'nggi davomat</h3>
        <div class="card t-wrap"><table>
          <tr><th>Sana</th><th>Kelgan</th><th>Ketgan</th><th>Soat</th></tr>
          ${empAttendance(e.id).slice(-7).reverse().map(a=>{
            const lm = Math.max(0, minutes(a.in) - minutes(WORK_START));
            const llm = a.lunchBack ? Math.max(0, minutes(a.lunchBack) - minutes(LUNCH_END)) : 0;
            const own = String(e.id) === String(USER.id);
            let lateTag = "";
            if (lm || llm) {
              if (a.lateExcused || a.lunchExcused) lateTag = `<span class="tag info">sababli ✓</span>`;
              else if (a.excuseReq === "pending") lateTag = `<span class="tag gold">sabab yuborildi</span>`;
              else {
                const f = FINE_PER_MIN ? ` · ${fmtMoney((lm+llm)*FINE_PER_MIN)}` : "";
                lateTag = `<span class="tag danger">kech ${lm+llm} daq${f}</span>`;
              }
            }
            return `<tr><td>${uzDate(a.date)}</td>
            <td class="num">${a.in} ${a.geo?`<a href="https://maps.google.com/?q=${a.geo}" target="_blank" rel="noopener" style="text-decoration:none">📍</a>`:""} ${lateTag}</td>
            <td class="num">${a.out ?? (a.date===TODAY ? "—" : '<span class="tag danger" title="Ketdim bosilmagan — soat hisoblanmaydi">yo\'q ⚠️</span>')}</td>
            <td class="num">${a.out ? workedHours(a).toFixed(1) : "—"}</td></tr>`;}).join("")}
        </table></div>
      </div>
    </div>
    ${String(e.id) === String(USER.id) && myLeaves.length ? `
    <h3 class="section-title" style="margin-top:18px">📝 Ruxsat so'rovlarim</h3>
    <div class="card">${myLeaves.map(r=>`
      <div class="fb-item">
        <div class="fb-icon" style="background:var(--info-soft);color:var(--info)">📝</div>
        <div class="meta"><b>${uzDate(r.date)} — ${esc(leaveKindLabel(r.kind))}${r.fromTime?" ("+r.fromTime+")":""}</b>
          <span>${esc(r.reason)}</span></div>
        <span class="tag ${r.status==="approved"?"success":r.status==="rejected"?"danger":"gold"}">
          ${r.status==="approved"?"tasdiqlangan ✓":r.status==="rejected"?"rad etilgan":"kutilmoqda"}</span>
      </div>`).join("")}</div>` : ""}
    ${String(e.id) === String(USER.id) ? `
    <h3 class="section-title" style="margin-top:18px">Mening ma'lumotlarim</h3>
    <div class="grid" style="grid-template-columns:1fr 1fr">
      <div class="card" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">${photoEditHtml(e,"lg")}
          <div><b style="font-family:'Sora';font-size:16px">${esc(e.name)}</b><br>
            <span style="color:var(--muted);font-size:13px">${esc(e.pos)}${e.dept?" · "+esc(deptById(e.dept)?.name||""):""}</span></div></div>
        <div class="emp-mini">
          <div><b class="num">${roleLabel(e.role)}</b><span>LAVOZIM TURI</span></div>
          <div><b class="num">${e.login?esc(e.login):"—"}</b><span>LOGIN</span></div>
          <div><b class="num">${fmtMoney(e.salary)}</b><span>OYLIK</span></div>
        </div>
        <div style="margin-top:12px">${contractTag(e.contract)}</div>
        ${e.fieldWork?'<div style="margin-top:7px"><span class="tag info">Tashqaridan keldim/ketdim bosa oladi</span></div>':""}
        ${e.canReassign?`<div style="margin-top:7px"><span class="tag info">Vazifani boshqaga o'tkaza oladi</span></div>`:""}
      </div>
      <div class="card" style="padding:16px">
        <b style="font-size:13.5px">📄 Mening hujjatlarim</b>
        <div id="docsList" style="margin-top:9px"><div class="empty" style="padding:10px">Yuklanmoqda...</div></div>
      </div>
    </div>` : ""}
    <style>@media(max-width:900px){#page .grid[style*="1fr 1fr"]{grid-template-columns:1fr!important}}</style>`;
}
function pgMe(){ return personalBlock(USER); }

/* ---------- 3. XODIMLAR ---------- */
function pgEmployees(){
  const scope = scopeEmployees();
  const addBtn = USER.role === "admin"
    ? `<button class="btn primary" onclick="openEmpModal()">${IC.plus} Xodim qo'shish</button>
       <button class="btn ghost" onclick="openDeptModal()">Bo'limlar</button>
       <button class="btn ghost" onclick="openDocTypes()">📄 Hujjatlar ro'yxati</button>
       <button class="btn ghost" onclick="openFineSettings()">⏱ Kechikish jarimasi</button>` : "";
  const cards = scope.map(e => {
    const earn = earnedToDate(e);
    const d = e.dept ? deptById(e.dept) : null;
    const adminBtns = USER.role === "admin"
      ? `<div style="display:flex;gap:7px"><button class="btn ghost sm" onclick="openEmpModal('${e.id}')">Tahrirlash</button>
         <button class="btn sm" style="color:var(--danger)" onclick="removeEmp('${e.id}')">Chiqarish</button></div>` : "";
    const contractWarn = `<span style="align-self:flex-start">${contractTag(e.contract, true)}</span>`;
    const docWarn = (CLOUD && DOC_TYPES.length && (USER.role==="admin"||isExec(USER.role)))
      ? (() => { const st = docStatus(e.id);
          return `<span style="align-self:flex-start"><span class="tag ${st.ok?"success":"danger"}"
            title="${st.missing.length?"Yetishmayapti: "+st.missing.map(m=>m.name).join(", "):"Hujjatlar to'liq"}">📎 hujjat ${st.have}/${st.total}</span></span>`; })()
      : "";
    return `<div class="card emp-card">
      <div class="head" style="cursor:pointer" onclick="viewEmp('${e.id}')" title="Profilni ochish">${avatarHtml(e)}
        <div style="flex:1"><b>${esc(e.name)}</b><span>${esc(e.pos)}</span></div>
        ${d ? `<span class="tag" style="background:${d.color}22;color:${d.color}">${d.name.replace(" bo'limi","")}</span>` : roleTag(e.role)}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${contractWarn}${docWarn}</div>
      <button class="btn ghost sm" style="align-self:flex-start" onclick="viewEmp('${e.id}')">Profilni ochish →</button>
      <div class="emp-mini">
        ${(USER.role==="admin"||USER.role==="rahbar") ? `
          <div><b class="num">${effDetail(e.id).noData?"—":efficiency(e.id)+"%"}</b><span>KPI</span></div>
          <div><b class="num" style="color:var(--success)">+${fmtMoney(earn.bonus)}</b><span>Bonus</span></div>
          <div><b class="num" style="color:var(--danger)">−${fmtMoney(earn.fine)}</b><span>Jarima</span></div>`
        : `
          <div><b class="num">${effDetail(e.id).noData?"—":efficiency(e.id)+"%"}</b><span>KPI</span></div>
          <div><b class="num">${effDetail(e.id).tDone}/${effDetail(e.id).tTotal}</b><span>Vazifa</span></div>
          <div><b class="num" style="color:${effDetail(e.id).days-effDetail(e.id).punct>0?'var(--danger)':'var(--success)'}">${effDetail(e.id).days-effDetail(e.id).punct}</b><span>Kechikish</span></div>`}
      </div>
      ${adminBtns}
    </div>`;
  }).join("");
  return `<div class="filters">${addBtn}<span style="color:var(--muted);font-size:13px">${scope.length} ta xodim</span></div>
          <div class="emp-grid">${cards}</div>`;
}

