/* ===== GM Pulse · 18-attendance.js — Davomat, geofence, ruxsat, jarima tahriri ===== */
/* ---------- 5. DAVOMAT ---------- */
function pgAttendance(){
  const scope = scopeEmployees();
  const isAdmin = USER.role === "admin";
  const grouped = USER.role === "admin" || isExec(USER.role); // bo'limlar kesimida
  const officeCard = isAdmin ? `
    <div class="card" style="padding:14px 16px;margin-bottom:15px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:210px"><b style="font-size:13.5px">📍 Ishxona joylashuvi (geofence)</b><br>
        <span style="font-size:12.5px;color:var(--muted)">${OFFICE
          ? `Belgilangan ✓ — xodimlar faqat ${OFFICE.radius} m radiusda belgilay oladi`
          : `Hali belgilanmagan — hozircha istalgan joydan belgilash mumkin`}</span></div>
      <select id="gfRadius" style="width:110px" onchange="updateRadius()">${[30,50,80,100,150,200,300].map(r=>`<option value="${r}" ${(OFFICE?.radius||100)===r?"selected":""}>${r} m</option>`).join("")}</select>
      <button class="btn primary sm" onclick="setOffice()">Shu yerni ishxona deb belgilash</button>
      <button class="btn ghost sm" onclick="openFieldModal()">🚶 Tashqarida ishlash ruxsati</button>
    </div>` : "";

  const recs = ATTENDANCE.filter(a => scope.some(e => String(e.id) === String(a.emp)));
  const dates = [...new Set(recs.map(a => a.date))].sort((a,b) => b.localeCompare(a)).slice(0, 30);
  if (dates.length && ![...OPEN_ACC].some(k => k.startsWith("d:"))) OPEN_ACC.add("d:" + dates[0]);

  const fieldTag = (fld, appr, emp, date, which) => {
    if (!fld) return "";
    if (appr === "pending" && canApproveOT({ emp })) {
      return `<span class="tag gold">tashqarida?</span>
        <button class="btn success sm" onclick="decideField('${emp}','${date}','${which}','approved')">✓</button>
        <button class="btn ghost sm" onclick="decideField('${emp}','${date}','${which}','rejected')">✗</button>`;
    }
    const m = { pending:["gold","tashqarida · kutmoqda"], approved:["info","tashqarida ✓"], rejected:["danger","tashqarida · rad"], none:["info","tashqarida"] };
    const [c,l] = m[appr] || m.none;
    return `<span class="tag ${c}">${l}</span>`;
  };
  const attRow = a => {
    const e = empById(a.emp);
    const otm = otMinutes(a);
    return `<div class="att-row">
      <div class="att-who">${avatarHtml(e,"sm")}<div><b>${esc(e.name)}</b><br><span class="sub2">${esc(e.pos)}</span></div></div>
      <div class="att-cells">
        <div><span class="sub2">KELDI</span><b class="num">${a.in}</b>
          ${a.geo?`<a href="https://maps.google.com/?q=${a.geo}" target="_blank" rel="noopener" style="text-decoration:none" title="Kelgan joy">📍</a>`:""}
          ${(() => { const lm = Math.max(0, minutes(a.in) - minutes(WORK_START));
            if (!lm) return '<span class="tag success">vaqtida</span>';
            if (a.lateExcused) return `<span class="tag info" title="${esc(a.excuseNote||"")}">kech ${lm} daq · sababli ✓</span>`;
            const f = FINE_PER_MIN ? ` · ${fmtMoney(lm*FINE_PER_MIN)}` : "";
            return `<span class="tag danger">kech ${lm} daq${f}</span>`; })()}
          ${isFieldDay(a.emp,a.date)?'<span class="tag info">ruxsatli tashqarida</span>':""}
          ${fieldTag(a.inField, a.inAppr, a.emp, a.date, "in")}
          ${(() => { const lv = LEAVE_REQS.find(r => String(r.emp)===String(a.emp) && r.date===a.date);
            if (!lv) return "";
            if (lv.status === "pending") return canDecideLeave(lv)
              ? `<span class="tag gold" title="${esc(lv.reason)}">ruxsat so'radi: ${esc(leaveKindLabel(lv.kind))}${lv.fromTime?" "+lv.fromTime:""}</span>
                 <button class="btn success sm" onclick="decideLeave('${lv.id}','approved')">✓</button>
                 <button class="btn ghost sm" onclick="decideLeave('${lv.id}','rejected')">✗</button>`
              : `<span class="tag gold">ruxsat so'ralgan</span>`;
            return lv.status === "approved"
              ? `<span class="tag success" title="${esc(lv.reason)}">ruxsatli ✓</span>`
              : `<span class="tag danger">ruxsat rad etilgan</span>`; })()}
          ${USER.role === "admin" && lateFine(a) > 0
            ? `<button class="btn ghost sm" title="Jarimani tahrirlash" onclick="openFineEdit('${a.emp}','${a.date}')">💰</button>` : ""}</div>
        <div><span class="sub2">KETDI</span><b class="num">${a.out ?? "—"}</b>
          ${a.outGeo?`<a href="https://maps.google.com/?q=${a.outGeo}" target="_blank" rel="noopener" style="text-decoration:none" title="Ishni tugatgan joy">📍</a>`:""}
          ${!a.out ? (a.date === TODAY ? '<span class="tag gold">ishda</span>' : '<span class="tag danger" title="Ketdim bosilmagan — bu kun uchun soat/pul hisoblanmaydi. Admin tuzatishi mumkin">ketdim bosilmagan ⚠️</span>') : ""}
          ${(() => { const llm = a.lunchBack ? Math.max(0, minutes(a.lunchBack) - minutes(LUNCH_END)) : 0;
            if (!llm) return "";
            if (a.lunchExcused) return `<span class="tag info">obed +${llm} daq · sababli ✓</span>`;
            const f = FINE_PER_MIN ? ` · ${fmtMoney(llm*FINE_PER_MIN)}` : "";
            return `<span class="tag danger">obed +${llm} daq${f}</span>`; })()}
          ${fieldTag(a.outField, a.outAppr, a.emp, a.date, "out")}</div>
        <div><span class="sub2">SOAT</span><b class="num">${a.out ? workedHours(a).toFixed(1) : "—"}</b></div>
        ${otm > 0 ? `<div><span class="sub2">QO'SHIMCHA</span>
          ${a.ot === "pending" && canApproveOT(a)
            ? `<span class="tag gold">+${otm} daq</span>
               <button class="btn success sm" onclick="decideOT('${a.emp}','${a.date}','approved')">✓</button>
               <button class="btn ghost sm" onclick="decideOT('${a.emp}','${a.date}','rejected')">✗</button>`
            : `<span class="tag ${ {pending:"gold",approved:"success",rejected:"danger",none:"muted"}[a.ot||"none"] }">+${otm} daq ${ {pending:"kutmoqda",approved:"✓",rejected:"rad",none:""}[a.ot||"none"] }</span>`}</div>` : ""}
      </div>
      ${isAdmin ? `<button class="btn ghost sm" onclick="openAttModal('${a.emp}','${a.date}')">✎</button>` : ""}
    </div>`;
  };

  const days = dates.map(date => {
    const dayRecs = recs.filter(a => a.date === date);
    const dayLate = dayRecs.filter(a => countsLate(a) || countsLunchLate(a)).length;
    let inner;
    if (grouped) {
      const groups = [...DEPTS.map(d => ({ id: d.id, name: d.name, color: d.color })),
                      { id: null, name: "Rahbariyat", color: "#7B5BA6" }];
      inner = groups.map(g => {
        const emps = scope.filter(e => String(e.dept) === String(g.id) || (!e.dept && g.id === null));
        if (!emps.length) return "";
        const dr = dayRecs.filter(a => emps.some(e => String(e.id) === String(a.emp)));
        const came = dr.length;
        const late = dr.filter(a => countsLate(a) || countsLunchLate(a)).length;
        const outg = dr.filter(a => isFieldDay(a.emp, a.date)).length;
        const absent = emps.filter(e => !dr.some(a => String(a.emp) === String(e.id)));
        const key = `d:${date}:${g.id}`;
        return `<details class="acc dept-acc" ${OPEN_ACC.has(key)?"open":""} ontoggle="accToggle(this,'${key}')">
          <summary><span class="kdot" style="background:${g.color}"></span><b>${g.name}</b>
            <span class="sub2" style="margin-left:auto;text-align:right">${came}/${emps.length} keldi${late?` · <span style="color:var(--danger)">${late} kechikish</span>`:""}${outg?` · ${outg} tashqarida`:""}</span></summary>
          <div class="acc-body">
            ${dr.map(attRow).join("") || ""}
            ${absent.length ? `<div class="sub2" style="padding:7px 4px">Belgilamagan: ${absent.map(e=>esc(e.name.split(" ")[0])).join(", ")}</div>` : ""}
          </div>
        </details>`;
      }).join("");
    } else inner = `<div class="acc-body">${dayRecs.map(attRow).join("") || '<div class="empty">Yozuv yo\'q</div>'}</div>`;
    const key = `d:${date}`;
    return `<details class="card acc day-acc" ${OPEN_ACC.has(key)?"open":""} ontoggle="accToggle(this,'${key}')">
      <summary><b>${uzDate(date)}${date===TODAY?" · bugun":""}</b>
        <span class="sub2" style="margin-left:auto">${dayRecs.length} belgilagan${dayLate?` · <span style="color:var(--danger)">${dayLate} kechikish</span>`:""}</span></summary>
      ${inner}
    </details>`;
  }).join("");

  return `${officeCard}
    <div class="filters">
      <span class="tag muted">Ish vaqti: 9:00–18:00 · obed 13:00–14:00 · reja 26 kun × 8 soat</span>
      ${USER.role!=="xodim" ? '<button class="btn ghost sm" onclick="exportAttendance()">⬇ Excel (CSV)</button>' : ""}
      ${isAdmin && !isArchive() ? '<button class="btn ghost sm" onclick="openAttModal()">+ Yozuv qo\'shish</button>' : ""}
      ${CLOUD ? '<button class="btn ghost sm" onclick="refreshNow()">🔄 Yangilash</button>' : ""}
    </div>
    ${days || '<div class="card empty">Davomat yozuvlari yo\'q</div>'}`;
}
let OPEN_ACC = new Set();
function accToggle(el, key){ if (el.open) OPEN_ACC.add(key); else OPEN_ACC.delete(key); }

/* Admin: kunlik tashqarida ishlash ruxsatlari */
function openFieldModal(){
  const upcoming = FIELD_DAYS.filter(f => f.date >= TODAY).sort((a,b)=>a.date.localeCompare(b.date));
  openModal(`
    <h3>🚶 Tashqarida ishlash ruxsati</h3>
    <div class="sub">Belgilangan kunda xodimga geofence talab qilinmaydi — ish yuzasidan ko'chada bo'lsa</div>
    <label>Xodim</label><select id="fdEmp">${scopeEmployees().map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select>
    <label>Sana</label><input id="fdDate" type="date" value="${TODAY}" min="${TODAY}">
    <label>Izoh (ixtiyoriy)</label><input id="fdNote" placeholder="masalan, mijoz obyektida">
    <button class="btn primary sm" style="margin-top:12px" onclick="addFieldDay()">Ruxsat berish</button>
    <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:12px">
      <b style="font-size:13px">Amaldagi ruxsatlar</b>
      ${upcoming.length ? upcoming.map(f => { const e = empById(f.emp); return `
        <div style="display:flex;align-items:center;gap:9px;margin-top:9px;font-size:12.5px">
          ${e?avatarHtml(e,"sm"):""}<div style="flex:1"><b>${e?esc(e.name):"—"}</b> · ${uzDate(f.date)}${f.note?` · <span style="color:var(--muted)">${esc(f.note)}</span>`:""}</div>
          <button class="btn sm" style="color:var(--danger)" onclick="delFieldDay('${f.emp}','${f.date}')">✕</button></div>`; }).join("")
      : `<div style="font-size:12px;color:var(--muted);margin-top:8px">Hozircha ruxsat yo'q</div>`}
    </div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function addFieldDay(){
  const emp = $("#fdEmp").value, date = $("#fdDate").value, note = $("#fdNote").value.trim() || null;
  if (!date) return toast("Sanani tanlang");
  if (isFieldDay(emp, date)) return toast("Bu kunga allaqachon ruxsat berilgan");
  const eo = empById(emp);
  if (CLOUD) {
    const { data, error } = await sb.from("field_days")
      .insert({ emp, date, note, created_by: USER.id }).select().single();
    if (error) return toast("Xatolik: " + error.message);
    FIELD_DAYS.push({ id: data.id, emp: data.emp, date, note });
  } else FIELD_DAYS.push({ id: Date.now(), emp: eo.id, date, note });
  toast(eo.name.split(" ")[0] + "ga " + uzDate(date) + " kuni tashqarida ishlashga ruxsat berildi");
  render(); openFieldModal();
}
async function delFieldDay(emp, date){
  const f = FIELD_DAYS.find(x => String(x.emp) === String(emp) && x.date === date);
  if (!f) return;
  if (CLOUD) {
    const { error } = await sb.from("field_days").delete().eq("id", f.id);
    if (error) return toast("Xatolik: " + error.message);
  }
  FIELD_DAYS = FIELD_DAYS.filter(x => x !== f);
  toast("Ruxsat bekor qilindi"); render(); openFieldModal();
}

function openAttModal(emp, date){
  const fixed = !!(emp && date);
  const a = fixed ? ATTENDANCE.find(x => String(x.emp)===String(emp) && x.date===date) : null;
  openModal(`
    <h3>${fixed ? "Davomatni tuzatish" : "Davomat yozuvi qo'shish"}</h3>
    <div class="sub">${fixed ? esc(empById(emp).name) + " · " + uzDate(date) : "Unutilgan kun uchun qo'lda kiritish"}</div>
    ${fixed ? "" : `<label>Xodim</label><select id="atEmp">${scopeEmployees().map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select>
    <label>Sana</label><input id="atDate" type="date" value="${TODAY}" max="${TODAY}">`}
    <label>Kelgan vaqt</label><input id="atIn" type="time" value="${a ? a.in : "09:00"}">
    <label>Ketgan vaqt (bo'sh = ketish yo'q, soat hisoblanmaydi)</label><input id="atOut" type="time" value="${a && a.out ? a.out : ""}">
    <label>Obeddan qaytgan vaqt (bo'sh = standart 1 soat)</label><input id="atLunch" type="time" value="${a && a.lunchBack ? a.lunchBack : ""}">
    <div style="font-size:11.5px;color:var(--muted);margin-top:4px">14:00 dan kech bo'lsa ortiqcha daqiqalar ish vaqtidan ayriladi. Kechirish uchun 14:00 yoki bo'sh qoldiring.</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor qilish</button>
    <button class="btn primary" onclick="saveAtt('${emp||""}','${date||""}')">Saqlash</button></div>`);
}
async function saveAtt(emp, date){
  if (!emp) { emp = $("#atEmp").value; date = $("#atDate").value; }
  if (!date) return toast("Sanani tanlang");
  const tin = $("#atIn").value, tout = $("#atOut").value || null;
  const tlunch = $("#atLunch") ? ($("#atLunch").value || null) : null;
  const lunchLate = !!(tlunch && minutes(tlunch) > minutes(LUNCH_END));
  if (!tin) return toast("Kelgan vaqtni kiriting");
  const late = minutes(tin) > minutes(WORK_START);
  const eo = empById(emp);
  let a = ATTENDANCE.find(x => String(x.emp)===String(emp) && x.date===date);
  if (CLOUD) {
    if (a && a.id) {
      const { error } = await sb.from("attendance").update({ check_in: tin, check_out: tout, late, lunch_back: tlunch, lunch_late: lunchLate }).eq("id", a.id);
      if (error) return toast("Xatolik: " + error.message);
    } else {
      const { data, error } = await sb.from("attendance")
        .insert({ emp: eo.id, date, check_in: tin, check_out: tout, late, lunch_back: tlunch, lunch_late: lunchLate }).select().single();
      if (error) return toast("Xatolik: " + error.message);
      a = { id: data.id, emp: eo.id, date }; ATTENDANCE.push(a);
    }
  } else if (!a) { a = { emp: eo.id, date }; ATTENDANCE.push(a); }
  a.in = tin; a.out = tout; a.late = late; a.auto = false; a.unclosed = !tout && date < TODAY;
  a.lunchBack = tlunch; a.lunchLate = lunchLate;
  // Admin qo'lda kiritdi — demak vaqt kelishilgan: qo'shimcha vaqt bo'lsa avtomatik tasdiqlanadi
  a.ot = (tout && otMinutes(a) > 0) ? "approved" : "none";
  if (CLOUD && a.id) await sb.from("attendance").update({ ot_status: a.ot }).eq("id", a.id);
  closeModal(); toast("Davomat saqlandi (admin tuzatdi)"); render();
}
// Joylashuvni olish (ruxsat so'raladi; 6 soniyada javob bo'lmasa — joylashuvsiz davom etadi)
function getGeo(){
  if (!navigator.geolocation) return Promise.resolve(null);
  const attempt = (hi, ms) => new Promise(res => navigator.geolocation.getCurrentPosition(
    p => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy || 0 }),
    () => res(null), { enableHighAccuracy: hi, timeout: ms, maximumAge: 30000 }));
  // 1-urinish: aniq GPS 12s; bo'lmasa 2-urinish: tarmoq/Wi-Fi joylashuvi 8s (bino ichida ishlaydi)
  return attempt(true, 12000).then(g => g || attempt(false, 8000));
}
/* Geofence tekshiruvi: ishxonadan tashqarida bo'lsa null qaytaradi */
async function geoGuard(){
  const g = await getGeo();
  if (!g) { toast("Joylashuv aniqlanmadi — brauzerda joylashuvga ruxsat berib, qayta urinib ko'ring"); return null; }
  g.outside = false; // ishxona radiusidan tashqaridami
  if (OFFICE) {
    const d = Math.round(distMeters(g.lat, g.lng, OFFICE.lat, OFFICE.lng));
    const allow = OFFICE.radius + Math.min(Math.round(g.acc || 0), 30);
    if (d > allow) {
      // Tashqaridan belgilash huquqi: doimiy "ko'chada ishlaydi" (haydovchilar)
      // yoki admin o'sha kunga bergan ruxsat. Aks holda — rad etiladi.
      const allowedOutside = USER.fieldWork || isFieldDay(USER.id, TODAY);
      if (!allowedOutside) {
        toast(`Siz ishxonada emassiz — masofa ~${d} m (ruxsat ${OFFICE.radius} m). Tashqaridan belgilash huquqingiz yo'q.`);
        return null;
      }
      // "Doimiy dala ishchisi" (haydovchi) — tashqarida deb belgilanib, tasdiqqa boradi.
      // "Kunlik ruxsat" — admin oldindan ruxsat bergani uchun tasdiqsiz o'tadi.
      if (USER.fieldWork && !isFieldDay(USER.id, TODAY)) { g.outside = true; g.dist = d; }
    }
  }
  return g;
}
let __attBusy = false;
async function checkIn(){
  if (__attBusy) return; __attBusy = true; setTimeout(() => __attBusy = false, 4000);
  if (ATTENDANCE.some(x => String(x.emp) === String(USER.id) && x.date === TODAY)) { __attBusy = false; return toast("Bugun allaqachon belgilangansiz"); }
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  toast("Joylashuv aniqlanmoqda...");
  const g = await geoGuard();
  if (!g) return;
  const late = minutes(t) > minutes(WORK_START);
  const inField = !!g.outside;
  const inAppr = inField ? "pending" : "none";
  const rec = { emp: USER.id, date: TODAY, in: t, out: null, late,
                geo: g.lat.toFixed(5) + "," + g.lng.toFixed(5),
                inField, inAppr };
  if (CLOUD) {
    const { data, error } = await sb.from("attendance")
      .insert({ emp: USER.id, date: TODAY, check_in: t, late, lat: g.lat, lng: g.lng,
                in_field: inField, in_appr: inAppr })
      .select().single();
    if (error) return toast("Xatolik: " + error.message);
    rec.id = data.id;
  }
  ATTENDANCE.push(rec);
  toast(inField
    ? `Tashqaridan kelish belgilandi (${t}) 📍 — boshliq tasdig'iga yuborildi`
    : "Kelish qayd etildi: " + t + " 📍");
  render(); startClock();
}
/* Radiusni nuqtani o'zgartirmasdan saqlash (tanlov o'zgarganda avtomatik) */
async function updateRadius(){
  const radius = +$("#gfRadius").value || 100;
  if (!OFFICE) return; // nuqta hali belgilanmagan — "belgilash" tugmasi bilan birga saqlanadi
  if (CLOUD) {
    const { error } = await sb.from("settings").update({ radius_m: radius, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast("Xatolik: " + error.message);
  }
  OFFICE.radius = radius;
  toast("Radius yangilandi: " + radius + " m (nuqta o'zgarmadi)"); render();
}
async function setOffice(){
  toast("Joylashuv aniqlanmoqda...");
  const g = await getGeo();
  if (!g) return toast("Joylashuv aniqlanmadi — brauzerda ruxsat bering");
  const radius = +($("#gfRadius")?.value) || 100;
  if (CLOUD) {
    const { error } = await sb.from("settings").upsert({ id: 1, office_lat: g.lat, office_lng: g.lng, radius_m: radius, updated_at: new Date().toISOString() });
    if (error) return toast("Xatolik: " + error.message);
  }
  OFFICE = { lat: g.lat, lng: g.lng, radius };
  toast("Ishxona joylashuvi saqlandi ✓ (radius " + radius + " m)"); render();
}
async function checkOut(){
  if (__attBusy) return; __attBusy = true; setTimeout(() => __attBusy = false, 4000);
  const a = ATTENDANCE.find(x => x.emp===USER.id && x.date===TODAY);
  if (!a) { __attBusy = false; return toast("Avval \"Keldim\" ni bosing"); }
  if (a.out) { __attBusy = false; return toast("Ketish allaqachon belgilangan"); }
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  toast("Joylashuv aniqlanmoqda...");
  const g = await geoGuard();
  if (!g) return;
  const outField = !!g.outside;
  const outAppr = outField ? "pending" : "none";
  const otAfter = otMinutes({ in: a.in, out: t });
  const otStatus = otAfter > 0 ? "pending" : "none";
  if (CLOUD) {
    const { error } = await sb.from("attendance").update({
      check_out: t, ot_status: otStatus,
      out_field: outField, out_appr: outAppr, out_lat: g.lat, out_lng: g.lng
    }).eq("id", a.id);
    if (error) return toast("Xatolik: " + error.message);
  }
  a.out = t; a.ot = otStatus;
  a.outField = outField; a.outAppr = outAppr;
  a.outGeo = g.lat.toFixed(5) + "," + g.lng.toFixed(5);
  toast(outField
    ? `Tashqarida ish tugatildi (${t}) 📍 — boshliq tasdig'iga yuborildi`
    : (otAfter > 0
      ? `Ketish qayd etildi: ${t}. Qo'shimcha ${otAfter} daqiqa boshliq tasdig'iga yuborildi`
      : "Ketish vaqti qayd etildi: " + t));
  render(); startClock();
}

/* Obeddan qaytish — 14:00 gacha bosilishi kerak */
const LUNCH_START = "13:00";
async function checkLunch(){
  if (__attBusy) return; __attBusy = true; setTimeout(() => __attBusy = false, 4000);
  const a = ATTENDANCE.find(x => String(x.emp) === String(USER.id) && x.date === TODAY);
  if (!a) { __attBusy = false; return toast("Avval \"Keldim\" ni bosing"); }
  if (a.out) { __attBusy = false; return toast("Bugun allaqachon ketgansiz"); }
  if (a.lunchBack) { __attBusy = false; return toast("Obeddan qaytish allaqachon belgilangan: " + a.lunchBack); }
  if (!a.id && CLOUD) { __attBusy = false; toast("Ma'lumot yangilanmoqda — qayta bosing"); await loadAll(); render(); return; }
  toast("Joylashuv aniqlanmoqda...");
  if (!(await geoGuard())) { __attBusy = false; return; }
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const over = Math.max(0, minutes(t) - minutes(LUNCH_END)); // 14:00 dan keyingi ortiqcha
  const late = over > 0;
  if (CLOUD) {
    const { error } = await sb.from("attendance").update({ lunch_back: t, lunch_late: late }).eq("id", a.id);
    if (error) return toast("Xatolik: " + error.message);
  }
  a.lunchBack = t; a.lunchLate = late;
  toast(late ? `Obeddan kech qaytdingiz (${t}) — ${over} daqiqa ortiqcha, ish vaqtidan ayriladi`
             : `Obeddan qaytish qayd etildi: ${t}`);
  render();
}

/* Qo'shimcha vaqtni tasdiqlash/rad etish (boshliq, rahbar, admin) */
function canApproveOT(a){
  if (String(a.emp) === String(USER.id)) return false; // o'zini tasdiqlay olmaydi
  const emp = empById(a.emp);
  if (!emp) return false;
  // Direktor, rahbar, admin — hammani tasdiqlaydi
  if (USER.role === "admin" || isExec(USER.role)) return true;
  // Bo'lim boshlig'i — faqat O'Z BO'LIMINING ODDIY XODIMINI (boshqa boshliq yoki administrativni emas)
  if (USER.role === "boshliq")
    return emp.role === "xodim" && String(emp.dept) === String(USER.dept);
  return false;
}
async function decideOT(emp, date, status){
  const a = ATTENDANCE.find(x => String(x.emp) === String(emp) && x.date === date);
  if (!a) return;
  if (CLOUD) {
    const { error } = await sb.from("attendance").update({ ot_status: status }).eq("id", a.id);
    if (error) return toast("Xatolik: " + error.message);
  }
  a.ot = status;
  toast(status === "approved" ? "Qo'shimcha vaqt tasdiqlandi — hisobga qo'shildi" : "Qo'shimcha vaqt rad etildi");
  render();
}

/* Yuklangan faylga ichidagi hujjat turlarini belgilash (keyinchalik ham) */
function openDocTag(empId, file){
  const rec = EMP_DOCS.find(d => String(d.emp)===String(empId) && d.file===file);
  const cur = (rec && rec.types || []).map(String);
  openModal(`
    <h3>🏷 Fayl ichidagi hujjatlar</h3>
    <div class="sub">${esc(file)} — ichida qaysi hujjatlar borligini belgilang</div>
    <div class="emp-pick" style="margin-top:10px">${DOC_TYPES.map(d=>`
      <label class="pick-chip"><input type="checkbox" class="tagChk" value="${d.id}" ${cur.includes(String(d.id))?"checked":""}><span>${esc(d.name)}${d.required?" *":""}</span></label>`).join("")}</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor</button>
    <button class="btn primary" onclick="saveDocTag('${empId}','${encodeURIComponent(file)}')">Saqlash</button></div>`);
}
async function saveDocTag(empId, fileEnc){
  const file = decodeURIComponent(fileEnc);
  const picked = [...document.querySelectorAll(".tagChk:checked")].map(i => +i.value);
  const { error } = await sb.from("emp_docs")
    .upsert({ emp: empId, doc_types: picked, doc_type: picked[0] || null, file }, { onConflict: "emp,file" });
  if (error) return toast("Xatolik: " + error.message);
  closeModal(); toast("Belgilandi ✓"); loadDocs(empId);
}

/* Admin: talab qilinadigan hujjatlar ro'yxati */
async function openDocTypes(){
  await loadDocTypes();
  openModal(`
    <h3>📄 Hujjatlar ro'yxati</h3>
    <div class="sub">Har bir xodimda bo'lishi kerak bo'lgan hujjatlar. "Majburiy" belgilanganlari to'liqlik hisobiga kiradi.</div>
    <div id="dtList" style="margin-top:12px">${DOC_TYPES.map(d=>`
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:13px">
        <span style="flex:1">${esc(d.name)}</span>
        <span class="tag ${d.required?"danger":"muted"}">${d.required?"majburiy":"ixtiyoriy"}</span>
        <button class="btn sm" style="color:var(--danger)" onclick="delDocType('${d.id}')">✕</button>
      </div>`).join("") || `<div class="empty" style="padding:10px">Ro'yxat bo'sh</div>`}</div>
    <div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px">
      <label>Yangi hujjat nomi</label><input id="dtName" placeholder="masalan: Haydovchilik guvohnomasi">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:10px">
        <input type="checkbox" id="dtReq" style="width:auto" checked> Majburiy hujjat</label>
      <button class="btn primary sm" style="margin-top:10px" onclick="addDocType()">Qo'shish</button>
    </div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Yopish</button></div>`);
}
async function addDocType(){
  const name = $("#dtName").value.trim();
  if (!name) return toast("Nomini kiriting");
  const required = !!$("#dtReq").checked;
  if (CLOUD) {
    const { error } = await sb.from("doc_types").insert({ name, required, sort: DOC_TYPES.length + 1 });
    if (error) return toast("Xatolik: " + error.message);
  } else DOC_TYPES.push({ id: Date.now(), name, required, sort: DOC_TYPES.length + 1 });
  toast("Qo'shildi ✓"); openDocTypes();
}
async function delDocType(id){
  if (CLOUD) {
    const { error } = await sb.from("doc_types").delete().eq("id", id);
    if (error) return toast("Xatolik: " + error.message);
  } else DOC_TYPES = DOC_TYPES.filter(d => String(d.id) !== String(id));
  toast("O'chirildi"); openDocTypes();
}
/* Admin: kechikish jarimasi (1 daqiqa narxi) */
function openFineSettings(){
  openModal(`
    <h3>⏱ Kechikish jarimasi</h3>
    <div class="sub">Bu <b>umumiy sozlama</b> — barcha xodimlarga bir xil amal qiladi. Bir marta kiritsangiz kifoya.</div>
    <label>1 daqiqa uchun (so'm)</label>
    <input id="fpm" type="number" min="0" step="100" value="${FINE_PER_MIN}">
    <div style="font-size:12px;color:var(--muted);margin-top:8px">
      Misol: 1000 so'm × 15 daqiqa kechikish = ${fmtMoney(15000)} jarima.<br>
      Sababi tasdiqlangan kechikishlarga jarima yozilmaydi.</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor</button>
    <button class="btn primary" onclick="saveFineSettings()">Saqlash</button></div>`);
}
async function saveFineSettings(){
  const v = Math.max(0, +$("#fpm").value || 0);
  if (CLOUD) {
    const { error } = await sb.from("settings").update({ fine_per_min: v }).eq("id", 1);
    if (error) return toast("Xatolik: " + error.message);
  }
  FINE_PER_MIN = v;
  closeModal(); toast(v ? `Jarima: ${fmtMoney(v)}/daqiqa` : "Avtomatik jarima o'chirildi"); render();
}

const LEAVE_MIN_HOURS = 3; // ruxsat kamida shuncha soat OLDIN so'ralishi kerak
let LEAVE_REQS = [];       // oldindan ruxsat so'rovlari

async function loadLeaves(){
  if (!CLOUD) return;
  const from = isArchive() ? viewMonthStart() : isoLocal(new Date(Date.now() - 30*86400000));
  const to = isArchive() ? viewMonthEnd() : isoLocal(new Date(Date.now() + 60*86400000));
  const { data } = await sb.from("leave_requests").select("*").gte("date", from).lte("date", to).order("date", { ascending:false });
  if (data) LEAVE_REQS = data.map(r => ({ id:r.id, emp:r.emp, date:r.date, kind:r.kind,
    fromTime:r.from_time ? String(r.from_time).slice(0,5) : null, reason:r.reason,
    status:r.status, requestedAt:r.requested_at }));
}
function approvedLeave(empId, date){
  return LEAVE_REQS.find(r => String(r.emp)===String(empId) && r.date===date && r.status==="approved");
}
function pendingLeave(empId, date){
  return LEAVE_REQS.find(r => String(r.emp)===String(empId) && r.date===date && r.status==="pending");
}
/* Kamida 3 soat oldin so'ralganmi? */
function leaveInTime(date, fromTime){
  const target = new Date(date + "T" + (fromTime || WORK_START) + ":00");
  return (target - new Date()) / 3600000 >= LEAVE_MIN_HOURS;
}
function canDecideLeave(r){
  if (!r || r.status !== "pending") return false;
  return canApproveOT({ emp: r.emp });
}
function leaveKindLabel(k){ return { late:"kechikib kelish", early:"erta ketish", absent:"kelmaslik" }[k] || k; }

/* XODIM: oldindan ruxsat so'rash */
function openLeave(){
  openModal(`
    <h3>📝 Oldindan ruxsat so'rash</h3>
    <div class="sub">Kamida <b>${LEAVE_MIN_HOURS} soat oldin</b> so'ralishi kerak. Tasdiqlansa — kechikish
      reytingga ta'sir qilmaydi va jarima yozilmaydi.</div>
    <label>Turi</label>
    <select id="lvKind"><option value="late">Kechikib kelaman</option>
      <option value="early">Erta ketaman</option>
      <option value="absent">Umuman kela olmayman</option></select>
    <label>Sana</label><input id="lvDate" type="date" value="${TODAY}" min="${TODAY}">
    <div id="lvTimeRow">
      <label>Soat (kechikish: nechaga kelaman / erta ketish: nechada ketaman)</label>
      <input id="lvTime" type="time" value="10:00">
    </div>
    <label>Sabab</label>
    <textarea id="lvReason" rows="3" placeholder="masalan: shifokorga yozilganman"></textarea>
    <div id="lvWarn" style="font-size:12px;margin-top:8px"></div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor</button>
    <button class="btn primary" onclick="sendLeave()">Yuborish</button></div>`);
  const upd = () => {
    const kind = $("#lvKind").value;
    $("#lvTimeRow").style.display = kind === "absent" ? "none" : "block";
    const d = $("#lvDate").value, t = kind === "absent" ? null : $("#lvTime").value;
    $("#lvWarn").innerHTML = leaveInTime(d, t)
      ? `<span style="color:var(--success)">✓ Muddat yetarli — so'rov tasdiqlashga yuboriladi</span>`
      : `<span style="color:var(--danger)">⚠️ ${LEAVE_MIN_HOURS} soatdan kam qoldi — bu so'rov qabul qilinmaydi. Kamida ${LEAVE_MIN_HOURS} soat keyingi vaqtni tanlang.</span>`;
  };
  ["lvDate","lvTime","lvKind"].forEach(id => { const el = $("#"+id); if (el) el.onchange = upd; });
  upd();
}
async function sendLeave(){
  const kind = $("#lvKind").value, date = $("#lvDate").value;
  const fromTime = kind === "absent" ? null : $("#lvTime").value;
  const reason = $("#lvReason").value.trim();
  if (!reason) return toast("Sababni yozing");
  if (!leaveInTime(date, fromTime))
    return toast(`Kamida ${LEAVE_MIN_HOURS} soat oldin so'rash kerak — keyinroq vaqtni tanlang`);
  if (pendingLeave(USER.id, date)) return toast("Bu kunga so'rov allaqachon yuborilgan");
  const rec = { emp: USER.id, date, kind, fromTime, reason, status:"pending", requestedAt:new Date().toISOString() };
  if (CLOUD) {
    const { data, error } = await sb.from("leave_requests")
      .insert({ emp: USER.id, date, kind, from_time: fromTime, reason }).select().single();
    if (error) return toast("Xatolik: " + error.message);
    rec.id = data.id;
  } else rec.id = Date.now();
  LEAVE_REQS.push(rec);
  closeModal(); toast("So'rov yuborildi — boshliq tasdiqlashini kuting"); render();
}
async function decideLeave(id, status){
  const r = LEAVE_REQS.find(x => String(x.id) === String(id));
  if (!r) return;
  if (!canDecideLeave(r)) return toast("Sizda bu so'rovni tasdiqlash huquqi yo'q");
  if (CLOUD) {
    const { data, error } = await sb.from("leave_requests")
      .update({ status, decided_by: USER.id, decided_at: new Date().toISOString() }).eq("id", r.id).select();
    if (error) return toast("Xatolik: " + error.message);
    if (!data || !data.length) return toast(permErr("supabase-update-12.sql"));
  }
  r.status = status;
  toast(status === "approved" ? "Ruxsat berildi ✓ — kechikish hisobga olinmaydi va jarima yozilmaydi" : "Ruxsat rad etildi");
  render();
}

/* ADMIN: kun jarimasini qo'lda tahrirlash */
function openFineEdit(emp, date){
  const a = ATTENDANCE.find(x => String(x.emp)===String(emp) && x.date===date);
  if (!a) return;
  const auto = lateFine(a);
  openModal(`
    <h3>💰 Jarimani tahrirlash</h3>
    <div class="sub">${esc(empById(emp)?.name||"")} · ${uzDate(date)}</div>
    <div style="background:var(--surface2);border-radius:12px;padding:11px 13px;margin:11px 0;font-size:12.5px">
      Kechikish: <b>${lateMinutes(a)} daq</b>${lunchLateMinutes(a)?` · obed: <b>${lunchLateMinutes(a)} daq</b>`:""}<br>
      Avtomatik hisob: <b>${fmtMoney(auto)}</b> (${fmtMoney(FINE_PER_MIN)}/daqiqa)
    </div>
    <label>Jarima summasi (so'm)</label>
    <input id="feVal" type="number" min="0" step="1000" value="${a.fineOverride != null ? a.fineOverride : auto}">
    <div style="font-size:11.5px;color:var(--muted);margin-top:6px">0 yozsangiz — jarima bekor qilinadi.</div>
    <div class="foot">
      ${a.fineOverride != null ? `<button class="btn ghost" onclick="saveFineEdit('${emp}','${date}', null)">Avtomatikka qaytarish</button>` : ""}
      <button class="btn ghost" onclick="closeModal()">Bekor</button>
      <button class="btn primary" onclick="saveFineEdit('${emp}','${date}')">Saqlash</button></div>`);
}
async function saveFineEdit(emp, date, forceNull){
  const a = ATTENDANCE.find(x => String(x.emp)===String(emp) && x.date===date);
  if (!a) return;
  const val = forceNull === null ? null : Math.max(0, +$("#feVal").value || 0);
  if (CLOUD) {
    const { data, error } = await sb.from("attendance").update({ fine_override: val }).eq("id", a.id).select();
    if (error) return toast("Xatolik: " + error.message);
    if (!data || !data.length) return toast(permErr("supabase-update-12.sql"));
  }
  a.fineOverride = val;
  closeModal();
  toast(val === null ? "Avtomatik hisobga qaytarildi" : (val === 0 ? "Jarima bekor qilindi" : `Jarima: ${fmtMoney(val)}`));
  render();
}

async function decideField(emp, date, which, status){
  const a = ATTENDANCE.find(x => String(x.emp) === String(emp) && x.date === date);
  if (!a) return;
  const col = which === "in" ? "in_appr" : "out_appr";
  if (CLOUD) {
    const { error } = await sb.from("attendance").update({ [col]: status }).eq("id", a.id);
    if (error) return toast("Xatolik: " + error.message);
  }
  if (which === "in") a.inAppr = status; else a.outAppr = status;
  toast(status === "approved"
    ? `Tashqaridan ${which === "in" ? "kelish" : "ketish"} tasdiqlandi ✓`
    : `Tashqaridan ${which === "in" ? "kelish" : "ketish"} rad etildi`);
  render();
}
