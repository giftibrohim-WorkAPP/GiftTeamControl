/* ===== GM Pulse · 17-tasks.js — Vazifalar (kanban), ovozli kiritish, izohlar ===== */
/* ---------- 4. VAZIFALAR (Kanban) ---------- */
const KCOLS = [
  { id:"new",      title:"Vazifa tushdi",     color:"var(--info)" },
  { id:"progress", title:"Jarayonda",         color:"var(--gold)" },
  { id:"review",   title:"Tasdiq kutilmoqda", color:"var(--danger)" },
  { id:"done",     title:"Bajarildi",         color:"var(--success)" },
];
/* Yopilgan vazifa ham "Bajarildi" ustunida ko'rinadi (belgisi bilan) */
function colOf(t){ return t.status === "closed" ? "done" : t.status; }
// Vazifaning barcha mas'ullari (emps massiv bo'lsa undan, aks holda bitta emp)
/* Muddat o'tganmi (sana + soat bilan) */
function taskOverdue(t){
  if (t.status === "done" || t.status === "closed") return false;
  if (t.due < TODAY) return true;
  if (t.due > TODAY) return false;
  if (!t.dueTime) return false;                   // faqat sana berilgan — kun oxirigacha vaqt bor
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes();
  return nowMin > minutes(t.dueTime);
}
function dueLabel(t){ return uzDate(t.due) + (t.dueTime ? ` ${t.dueTime}` : ""); }
function taskEmps(t){ return (t.emps && t.emps.length) ? t.emps : [t.emp]; }
function isTaskDoer(t, uid){ return taskEmps(t).some(e => String(e) === String(uid)); }

function taskScope(){
  const ids = scopeEmployees().map(e => String(e.id));
  return TASKS.filter(t =>
    taskEmps(t).some(e => ids.includes(String(e)))  // ko'rish doirasidagi mas'ul
    || isTaskDoer(t, USER.id)                         // o'ziga berilgan (mas'ullardan biri)
    || String(t.by) === String(USER.id)              // o'zi bergan
  );
}
function taskActions(t){
  const isOwner = isTaskDoer(t, USER.id);                   // mas'ullardan biri
  const isGiver = t.by && String(t.by) === String(USER.id); // vazifani bergan
  const isAdmin = USER.role === "admin";
  const canApprove = (isGiver || isAdmin) && !isOwner;
  // Kim o'tkaza oladi: ruxsati bor mas'ul, vazifani bergan, rahbariyat, admin
  const canReassignTask = t.status !== "done" && t.status !== "closed" &&
    ((isOwner && USER.canReassign) || isGiver || isAdmin || isExec(USER.role));
  let btns = [];
  if (t.status === "new" && (isOwner || isAdmin))
    btns.push(`<button class="btn primary sm" onclick="moveTask('${t.id}','progress')">Boshlash</button>`);
  if (t.status === "progress" && (isOwner || isAdmin))
    btns.push(`<button class="btn primary sm" onclick="moveTask('${t.id}','review')">Tugatdim — tasdiqqa</button>`);
  if (canReassignTask)
    btns.push(`<button class="btn ghost sm" onclick="openReassign('${t.id}')">↪ O'tkazish</button>`);
  // Takrorlanuvchi vazifani to'xtatish — faqat bergan odam yoki admin
  if (t.rep && t.rep !== "none" && (isGiver || isAdmin))
    btns.push(`<button class="btn ghost sm" onclick="stopRepeat('${t.id}')" title="Hozirgi vazifa qoladi, keyingi nusxa ochilmaydi">⏹ Takrorni to'xtatish</button>`);
  // Vazifani BUTUNLAY yopish — ish umuman tugadi, boshqa kerak emas
  if (t.status !== "done" && t.status !== "closed" && (isGiver || isAdmin))
    btns.push(`<button class="btn ghost sm" style="color:var(--danger)" onclick="closeTask('${t.id}')" title="Vazifa butunlay yopiladi va takrorlanmaydi">✖ Butunlay yopish</button>`);
  if (t.status === "review" && canApprove)
    btns.push(`<button class="btn success sm" onclick="approveTask('${t.id}')">Tasdiqlash</button>
               <button class="btn ghost sm" onclick="openExtend('${t.id}')">📅 Muddatni cho'zish</button>
               <button class="btn ghost sm" onclick="moveTask('${t.id}','progress',true)">Qaytarish</button>`);
  return btns.length ? `<div class="actions">${btns.join("")}</div>` : "";
}
function pgTasks(){
  const list = taskScope();
  const canAssign = USER.role === "admin" || USER.role === "boshliq" || isExec(USER.role);
  const addBtn = canAssign ? `<button class="btn primary" onclick="openTaskModal()">${IC.plus} Vazifa berish</button>` : "";
  const cols = KCOLS.map(c => {
    const items = list.filter(t => colOf(t) === c.id);
    return `<div class="kcol">
      <h4><span class="kdot" style="background:${c.color}"></span>${c.title}<span class="count num">${items.length}</span></h4>
      ${items.map(t => {
        const emps = taskEmps(t).map(id => empById(id)).filter(Boolean);
        const e = emps[0];
        const late = taskOverdue(t);
        const whoHtml = emps.length > 1
          ? `${emps.slice(0,3).map(x=>avatarHtml(x,"sm")).join("")} <span>${emps.length} mas'ul</span>`
          : `${avatarHtml(e,"sm")} <span>${esc(e?.name.split(" ")[0] || "—")}</span>`;
        return `<div class="task-card">
          <div style="cursor:pointer" onclick="openTaskView('${t.id}')" title="Batafsil ochish">
            <div class="ttl">${t.rep && t.rep!=="none" ? `<span title="Takrorlanadi: ${repLabel(t.rep)}">🔁</span> ` : ""}${esc(t.title)} ${(t.voice||t.voiceUrl)?"🎙":""} ${t.extended?'<span title="Muddat uzaytirilgan">📅</span>':""}${t.forAll?'<span title="Hamma xodimlarga">👥</span>':""}${t.status==="closed"?'<span class="tag muted" title="Butunlay yopilgan">✖ yopilgan</span>':""}</div>
            <div class="desc">${esc(t.desc).slice(0,90)}${(t.desc||"").length>90?"…":""}</div>
          </div>
          <div class="foot">${whoHtml}
            <span class="due num ${late?"late":""}">${late?"⚠ ":""}${dueLabel(t)}</span></div>
          ${taskActions(t)}
        </div>`;
      }).join("") || `<div class="empty" style="padding:18px">Bo'sh</div>`}
    </div>`;
  }).join("");
  const note = `<p style="font-size:12.5px;color:var(--muted);margin-bottom:13px">
    Xodim vazifani tugatganda u avtomatik <b>«Tasdiq kutilmoqda»</b> bosqichiga o'tadi — «Bajarildi»ga faqat bo'lim boshlig'i tasdig'idan keyin o'tkaziladi.</p>`;
  return `<div class="filters">${addBtn}</div>${note}<div class="kanban">${cols}</div>`;
}
/* ===== Ovozli kiritish ===== */
let recog = null, mediaRec = null, recChunks = [], voiceBlob = null;
function toggleDictate(targetId, btn){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("Bu brauzerda ovozdan matn ishlamaydi — Chrome tavsiya etiladi");
  if (recog) { recog.stop(); return; }
  recog = new SR();
  recog.lang = "uz-UZ"; recog.continuous = true; recog.interimResults = false;
  btn.classList.add("rec"); btn.textContent = "⏹ To'xtatish";
  recog.onresult = ev => {
    let t = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++)
      if (ev.results[i].isFinal) t += ev.results[i][0].transcript + " ";
    if (t) { const el = $("#" + targetId); el.value = (el.value + " " + t).trim(); }
  };
  recog.onerror = e => { if (e.error !== "no-speech") toast("Ovoz xatosi: " + e.error); };
  recog.onend = () => { recog = null; btn.classList.remove("rec"); btn.textContent = "🎤 Ovozdan matn"; };
  recog.start(); toast("Gapiring — tugatgach tugmani qayta bosing");
}
async function toggleVoiceNote(btn){
  if (mediaRec && mediaRec.state === "recording") { mediaRec.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia) return toast("Bu brauzerda mikrofon ishlamaydi");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRec = new MediaRecorder(stream); recChunks = [];
    mediaRec.ondataavailable = e => recChunks.push(e.data);
    mediaRec.onstop = () => {
      voiceBlob = new Blob(recChunks, { type: mediaRec.mimeType || "audio/webm" });
      stream.getTracks().forEach(t => t.stop());
      const p = document.getElementById("vnPrev");
      if (p) { p.style.display = "block"; p.src = URL.createObjectURL(voiceBlob); }
      btn.classList.remove("rec"); btn.textContent = "🎙 Qayta yozish";
      toast("Ovozli izoh tayyor — vazifa bilan birga saqlanadi");
    };
    mediaRec.start();
    btn.classList.add("rec"); btn.textContent = "⏹ Yozishni to'xtatish";
    toast("Yozilmoqda... tugatgach tugmani bosing");
  } catch(e) { toast("Mikrofonga ruxsat berilmadi"); }
}
async function loadVoice(t){
  const el = document.getElementById("vnPlay"); if (!el) return;
  if (t.voiceUrl) { el.src = t.voiceUrl; return; }
  if (CLOUD && t.voice) {
    const { data } = await sb.storage.from("voice").createSignedUrl(t.voice, 600);
    if (data) el.src = data.signedUrl;
  }
}

/* Vazifa izohlari (demo: xotirada; cloud: task_comments jadvali) */
let COMMENTS = [
  { id: 1, task: 2, author: 3, text: "Log fayllarini ham tekshirib ko'ring", at: "2026-07-21 14:20" },
  { id: 2, task: 2, author: 5, text: "Xato topildi, tuzatib tasdiqqa yubordim", at: "2026-07-22 10:05" },
];
async function loadComments(taskId){
  const el = document.getElementById("cmList"); if (!el) return;
  let list;
  if (CLOUD) {
    const { data, error } = await sb.from("task_comments").select("*").eq("task", taskId).order("created_at");
    if (error) { el.innerHTML = `<div class="empty" style="padding:10px">Izohlar yuklanmadi</div>`; return; }
    list = data.map(c => ({ author: c.author, text: c.text, at: (c.created_at||"").slice(0,16).replace("T"," ") }));
  } else list = COMMENTS.filter(c => String(c.task) === String(taskId));
  el.innerHTML = list.length ? list.map(c => {
    const a = empById(c.author);
    return `<div style="display:flex;gap:8px;margin-top:9px;align-items:flex-start">
      ${a ? avatarHtml(a,"sm") : ""}
      <div style="background:var(--surface2);border-radius:10px;padding:7px 11px;flex:1">
        <b style="font-size:12px">${a ? esc(a.name.split(" ")[0]) : "—"}</b>
        <span style="font-size:10.5px;color:var(--muted)"> · ${c.at || ""}</span>
        <div style="font-size:12.5px;margin-top:2px;white-space:pre-wrap">${esc(c.text)}</div></div></div>`;
  }).join("") : `<div style="font-size:12px;color:var(--muted);padding:6px 0">Hali izoh yo'q</div>`;
}
async function addComment(taskId){
  const inp = document.getElementById("cmInput");
  const text = inp.value.trim(); if (!text) return;
  const now = new Date();
  if (CLOUD) {
    const { error } = await sb.from("task_comments").insert({ task: taskId, author: USER.id, text });
    if (error) return toast("Xatolik: " + error.message);
  } else {
    COMMENTS.push({ id: Date.now(), task: taskId, author: USER.id, text,
      at: TODAY + " " + String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0") });
  }
  inp.value = ""; loadComments(taskId); renderBell();
}

/* Vazifa batafsil oynasi */
function openTaskView(id){
  const t = TASKS.find(x => String(x.id) === String(id));
  if (!t) return;
  const e = empById(t.emp), by = t.by ? empById(t.by) : null;
  const stLbl = { new:"Vazifa tushdi", progress:"Jarayonda", review:"Tasdiq kutilmoqda", done:"Bajarildi", closed:"Yopilgan ✖" };
  const stCls = { new:"info", progress:"gold", review:"danger", done:"success" };
  const late = taskOverdue(t);
  const emps = taskEmps(t).map(id=>empById(id)).filter(Boolean);
  openModal(`
    <h3 style="padding-right:20px">${esc(t.title)}</h3>
    <div style="margin:8px 0 4px"><span class="tag ${stCls[t.status]}">${stLbl[t.status]}</span>
      ${late ? '<span class="tag danger">⚠ muddati o\'tgan</span>' : ""}</div>
    <p style="font-size:13.5px;margin:12px 0;white-space:pre-wrap">${esc(t.desc) || "<i style='color:var(--muted)'>Tavsif yozilmagan</i>"}</p>
    ${(t.voice || t.voiceUrl) ? `<div style="margin:8px 0"><b style="font-size:12.5px">🎙 Ovozli izoh:</b>
      <audio id="vnPlay" controls style="width:100%;margin-top:5px"></audio></div>` : ""}
    <div style="display:grid;gap:9px;font-size:13px;background:var(--surface2);border-radius:12px;padding:13px 14px">
      ${emps.length > 1
        ? `<div><b style="font-size:12.5px">${t.forAll?"👥 Hamma xodimlarga":"Mas'ullar"} (${emps.length}):</b>
             <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">${emps.map(x=>`
               <span style="display:inline-flex;align-items:center;gap:5px;background:var(--surface);border-radius:99px;padding:3px 9px 3px 3px;font-size:12px">
                 ${avatarHtml(x,"sm")}${esc(x.name.split(" ")[0])}</span>`).join("")}</div></div>`
        : `<div style="display:flex;align-items:center;gap:9px">${avatarHtml(e,"sm")}
             <div><b>${esc(e?.name||"—")}</b><br><span style="color:var(--muted);font-size:11.5px">bajaruvchi · ${esc(e?.pos||"")}</span></div></div>`}
      ${by ? `<div style="display:flex;align-items:center;gap:9px">${avatarHtml(by,"sm")}
        <div><b>${esc(by.name)}</b><br><span style="color:var(--muted);font-size:11.5px">vazifani bergan</span></div></div>` : ""}
      ${t.rep && t.rep !== "none" ? `<div><span class="tag info">🔁 Takrorlanadi: ${repLabel(t.rep)}</span>
        <span style="color:var(--muted);font-size:11.5px">tasdiqlangach ${uzDate(nextDue(t.due, t.rep))} ga yangisi ochiladi</span></div>` : ""}
      <div><b class="num" style="${late?"color:var(--danger)":""}">Muddat: ${dueLabel(t)}</b>
        ${t.extended && t.duePrev ? `<span style="color:var(--muted);font-size:11.5px"> (avval ${uzDate(t.duePrev)} edi)</span>` : ""}
        ${t.doneAt ? `<span style="color:var(--muted)"> · bajarildi: ${uzDate(t.doneAt)}</span>` : ""}</div>
    </div>
    <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:11px">
      <b style="font-size:13px">💬 Izohlar</b>
      <div id="cmList"><div style="font-size:12px;color:var(--muted);padding:6px 0">Yuklanmoqda...</div></div>
      <div style="display:flex;gap:7px;margin-top:10px">
        <input id="cmInput" placeholder="Izoh yozing..." onkeydown="if(event.key==='Enter')addComment('${t.id}')">
        <button class="btn primary sm" onclick="addComment('${t.id}')">Yuborish</button></div>
    </div>
    <div class="foot" style="justify-content:space-between">
      <div style="display:flex;gap:7px;flex-wrap:wrap">${taskActions(t).replace('class="actions"','style="display:flex;gap:7px;flex-wrap:wrap"')}</div>
      <button class="btn ghost" onclick="closeModal()">Yopish</button>
    </div>`);
  window.__taskOpen = t.id;
  loadComments(t.id); loadVoice(t);
}
async function moveTask(id, status, returned=false){
  closeModal();
  const t = TASKS.find(x => String(x.id) === String(id));
  if (!t) return;
  const prev = t.status;
  t.status = status; // darhol mahalliy
  if (status === "review") t.submittedAt = TODAY;
  window.__pendingTask = window.__pendingTask || {};
  window.__pendingTask[String(t.id)] = { status, at: Date.now() };
  render();
  await guardWrite(async () => {
    if (CLOUD) {
      const patch = { status }; if (status === "review") patch.submitted_at = TODAY;
      const { data, error } = await sb.from("tasks").update(patch).eq("id", t.id).select();
      if (error) { t.status = prev; render(); return toast("Xatolik: " + error.message); }
      if (!data || !data.length) {
        t.status = prev; delete window.__pendingTask[String(t.id)]; render();
        return toast(permErr("supabase-update-9.sql"));
      }
    }
    if (status === "review") toast("Vazifa tasdiqqa yuborildi");
    else if (returned) toast("Vazifa qayta ishlashga qaytarildi");
    else toast("Vazifa jarayonga o'tdi");
  });
}
const WD_SHORT = ["Yak","Du","Se","Chor","Pay","Ju","Sha"];
function repLabel(r){
  if (!r || r === "none") return "";
  if (r === "daily") return "har kuni";
  if (r === "alt") return "kun ora";
  if (r === "weekly") return "har hafta";
  if (r === "monthly") return "har oy";
  if (r.startsWith("days:")) return r.slice(5).split(",").map(n => WD_SHORT[+n] || "").join(", ");
  return r;
}
/* Keyingi muddat. Yakshanba — dam kuni: hech bir takror unga tushmaydi */
function nextDue(due, rep){
  const d = new Date(due + "T00:00:00");
  const skipSun = () => { while (d.getDay() === 0) d.setDate(d.getDate() + 1); };
  if (rep === "daily") { d.setDate(d.getDate() + 1); skipSun(); }
  else if (rep === "alt") { d.setDate(d.getDate() + 2); skipSun(); }
  else if (rep === "weekly") { d.setDate(d.getDate() + 7); skipSun(); }
  else if (rep === "monthly") { d.setMonth(d.getMonth() + 1); skipSun(); }
  else if (rep.startsWith("days:")) {
    const days = rep.slice(5).split(",").map(Number).filter(x => x >= 1 && x <= 6).sort();
    if (days.length) do { d.setDate(d.getDate() + 1); } while (!days.includes(d.getDay()));
    else { d.setDate(d.getDate() + 7); skipSun(); }
  }
  return isoLocal(d);
}
/* Vazifa muddatini cho'zish (faqat beruvchi/admin) */
function openExtend(id){
  const t = TASKS.find(x => String(x.id) === String(id)); if (!t) return;
  openModal(`
    <h3>📅 Muddatni cho'zish</h3>
    <div class="sub">«${esc(t.title)}» — joriy muddat: ${uzDate(t.due)}</div>
    <label>Yangi muddat (sana va soat)</label>
    <div style="display:flex;gap:8px">
      <input id="exDue" type="date" value="${t.due}" min="${TODAY}" style="flex:2">
      <input id="exDueTime" type="time" value="${t.dueTime||"18:00"}" style="flex:1">
    </div>
    <label>Sabab (ixtiyoriy — izohga yoziladi)</label>
    <input id="exNote" placeholder="masalan: material yetkazib berish kechikdi">
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor</button>
    <button class="btn primary" onclick="doExtend('${t.id}')">Cho'zish</button></div>`);
}
async function doExtend(id){
  const t = TASKS.find(x => String(x.id) === String(id)); if (!t) return;
  const due2 = $("#exDue").value;
  const dueTime2 = $("#exDueTime") ? $("#exDueTime").value || null : null;
  if (!due2 || (due2 === t.due && dueTime2 === t.dueTime)) return toast("Yangi muddatni tanlang");
  const note = $("#exNote").value.trim();
  const prev = t.due;
  if (CLOUD) {
    const { error } = await sb.from("tasks").update({ due: due2, due_time: dueTime2, due_prev: prev, extended: true, status: "progress" }).eq("id", t.id);
    if (error) return toast("Xatolik: " + error.message);
    if (note) await sb.from("task_comments").insert({ task: t.id, author: USER.id, text: `📅 Muddat ${uzDate(prev)} → ${uzDate(due2)}. ${note}` });
  } else if (note) {
    COMMENTS.push({ id: Date.now(), task: t.id, author: USER.id, text: `📅 Muddat ${uzDate(prev)} → ${uzDate(due2)}. ${note}`, at: TODAY });
  }
  t.due = due2; t.dueTime = dueTime2; t.duePrev = prev; t.extended = true; t.status = "progress";
  closeModal(); toast(`Muddat ${uzDate(due2)} gacha cho'zildi — vazifa jarayonга qaytdi`); render();
}

/* Vazifani boshqa xodimga o'tkazish (o'tkazish ruxsati bor xodim) */
function openReassign(id){
  const t = TASKS.find(x => String(x.id) === String(id)); if (!t) return;
  // Kimga o'tkazish mumkin: admin bo'lmagan, o'zi bo'lmagan, hozir mas'ul bo'lmaganlar
  const cur = taskEmps(t).map(String);
  const list = EMPLOYEES.filter(e => e.role !== "admin" && !cur.includes(String(e.id)));
  openModal(`
    <h3>↪ Vazifani o'tkazish</h3>
    <div class="sub">«${esc(t.title)}» — yangi mas'ul avtomatik qabul qiladi</div>
    <label>Yangi mas'ul</label>
    <select id="raEmp">${list.map(e=>`<option value="${e.id}">${esc(e.name)}${e.dept?" · "+deptById(e.dept)?.name.replace(" bo'limi",""):""}</option>`).join("")}</select>
    <label>Izoh (nega o'tkazyapsiz)</label><input id="raNote" placeholder="masalan: men bandman, shu bajaradi">
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor</button>
    <button class="btn primary" onclick="doReassign('${t.id}')">O'tkazish</button></div>`);
}
async function doReassign(id){
  const t = TASKS.find(x => String(x.id) === String(id));
  if (!t) return toast("Vazifa topilmadi");
  const sel = $("#raEmp");
  if (!sel) return toast("Xodim ro'yxati topilmadi — oynani yopib qayta oching");
  if (!sel.value) return toast("Yangi mas'ulni tanlang");
  const to = CLOUD ? sel.value : +sel.value;
  const note = ($("#raNote") ? $("#raNote").value : "").trim();
  toast("O'tkazilmoqda...");
  const fromName = USER.name.split(" ")[0], toName = empById(to)?.name.split(" ")[0] || "";
  const iAmDoer = isTaskDoer(t, USER.id);
  let newEmps;
  if (iAmDoer) {
    // O'z mas'ulligimni yangi odamga topshiraman (boshqa mas'ullar qoladi)
    newEmps = taskEmps(t).map(String).filter(x => x !== String(USER.id));
    newEmps.push(String(to));
  } else {
    // Beruvchi/rahbariyat o'tkazyapti — butun mas'ullik yangi odamga o'tadi
    newEmps = [String(to)];
  }
  newEmps = [...new Set(newEmps)];
  const empsVal = newEmps.length > 1 ? newEmps : null;
  const mainEmp = newEmps[0];
  if (CLOUD) {
    const { data, error } = await sb.from("tasks")
      .update({ emp: mainEmp, emps: empsVal }).eq("id", t.id).select();
    if (error) return toast("Xatolik: " + error.message);
    if (!data || !data.length)
      return toast(permErr("supabase-update-14.sql"));
    await sb.from("task_comments").insert({ task: t.id, author: USER.id, text: `↪ ${fromName} vazifani ${toName}ga o'tkazdi.${note ? " " + note : ""}` });
  } else {
    COMMENTS.push({ id: Date.now(), task: t.id, author: USER.id, text: `↪ ${fromName} vazifani ${toName}ga o'tkazdi.${note ? " " + note : ""}`, at: TODAY });
  }
  t.emp = CLOUD ? mainEmp : +mainEmp;
  t.emps = empsVal ? (CLOUD ? empsVal : empsVal.map(Number)) : null;
  closeModal(); toast(`Vazifa ${toName}ga o'tkazildi ✓`); render();
}

/* Vazifani BUTUNLAY yopish: hozirgisi ham yopiladi, takrorlanish ham to'xtaydi.
   "Bu ish umuman tugadi, boshqa kerak emas" holati uchun. */
async function closeTask(id){
  const t = TASKS.find(x => String(x.id) === String(id)); if (!t) return;
  const isRep = t.rep && t.rep !== "none";
  const msg = isRep
    ? `«${t.title}» butunlay yopilsinmi?\n\n• Hozirgi vazifa yopiladi\n• Takrorlanish to'xtaydi — boshqa hech qachon ochilmaydi`
    : `«${t.title}» butunlay yopilsinmi?\n\nVazifa bajarilmagan holda yopiladi.`;
  if (!confirm(msg)) return;
  const prev = { status: t.status, rep: t.rep };
  t.status = "closed"; t.rep = "none";
  window.__pendingTask = window.__pendingTask || {};
  window.__pendingTask[String(t.id)] = { status: "closed", at: Date.now() };
  render();
  if (CLOUD) {
    const { data, error } = await sb.from("tasks")
      .update({ status: "closed", repeat: "none", done_at: TODAY }).eq("id", t.id).select();
    if (error) { Object.assign(t, prev); render(); return toast("Xatolik: " + error.message); }
    if (!data || !data.length) { Object.assign(t, prev); render();
      return toast(permErr("supabase-update-13.sql")); }
  }
  t.doneAt = TODAY;
  closeModal(); toast(isRep ? "Vazifa butunlay yopildi ✖ takrorlanish ham to'xtatildi" : "Vazifa yopildi ✖");
  render();
}

/* Takrorlanuvchi vazifani to'xtatish — keyingi nusxalar ochilmaydi */
async function stopRepeat(id){
  const t = TASKS.find(x => String(x.id) === String(id)); if (!t) return;
  if (!confirm(`«${t.title}» takrorlanishi to'xtatilsinmi?\n\nHozirgi vazifa qoladi, lekin bajarilgandan keyin yangi nusxa OCHILMAYDI.`)) return;
  const prev = t.rep;
  t.rep = "none";
  if (CLOUD) {
    const { data, error } = await sb.from("tasks").update({ repeat: "none" }).eq("id", t.id).select();
    if (error) { t.rep = prev; return toast("Xatolik: " + error.message); }
    if (!data || !data.length) { t.rep = prev; return toast(permErr("supabase-update-9.sql")); }
  }
  closeModal(); toast("Takrorlanish to'xtatildi ⏹ — bu vazifa oxirgisi"); render();
}
/* Bir xil nomdagi barcha kelgusi takroriy nusxalarni ham to'xtatish */
async function stopRepeatAll(title, by){
  const list = TASKS.filter(t => t.title === title && String(t.by) === String(by) && t.rep && t.rep !== "none");
  for (const t of list) {
    t.rep = "none";
    if (CLOUD) await sb.from("tasks").update({ repeat: "none" }).eq("id", t.id);
  }
  toast(`${list.length} ta takroriy vazifa to'xtatildi`); render();
}

async function approveTask(id){
  closeModal();
  const t = TASKS.find(x => String(x.id) === String(id));
  if (!t) return;
  if (t.status === "done") { toast("Bu vazifa allaqachon tasdiqlangan"); return; }
  t.status = "done"; t.doneAt = TODAY; // darhol mahalliy holat
  window.__pendingTask = window.__pendingTask || {};
  window.__pendingTask[String(t.id)] = { status: "done", at: Date.now() }; // loadAll orqaga qaytarmasin
  render(); // ekranni darhol yangilaymiz
  await guardWrite(async () => {
    if (CLOUD) {
      const { data, error } = await sb.from("tasks")
        .update({ status: "done", done_at: TODAY }).eq("id", t.id).select();
      if (error) { t.status = "review"; t.doneAt = null; render(); return toast("Xatolik: " + error.message); }
      // RLS jimgina rad etsa — 0 qator qaytadi. Buni aniq aytamiz.
      if (!data || !data.length) {
        t.status = "review"; t.doneAt = null;
        delete window.__pendingTask[String(t.id)];
        render();
        return toast(permErr("supabase-update-9.sql"));
      }
    }
    if (t.rep && t.rep !== "none") {
      const due2 = nextDue(t.due, t.rep);
      if (CLOUD) {
        const { data } = await sb.from("tasks")
          .insert({ title: t.title, descr: t.desc, emp: t.emp, emps: t.emps || null, created_by: t.by,
                    due: due2, due_time: t.dueTime || null, for_all: !!t.forAll, status: "new", repeat: t.rep })
          .select().single();
        if (data) TASKS.push({ id: data.id, title: t.title, desc: t.desc, emp: t.emp, emps: t.emps, by: t.by, due: due2, status: "new", rep: t.rep });
      } else {
        TASKS.push({ id: Date.now(), title: t.title, desc: t.desc, emp: t.emp, emps: t.emps, by: t.by, due: due2, status: "new", rep: t.rep });
      }
      toast(`Tasdiqlandi ✓ Takroriy vazifa ${uzDate(due2)} muddat bilan qayta ochildi 🔁`);
    } else toast("Vazifa tasdiqlandi — Bajarildi ✓");
    render();
  });
}

