/* ===== GM Pulse · 20-modals.js — Modallar: xodim, bo'lim, davomat tuzatish ===== */
/* =====================================================
   MODALLAR (admin amallari)
===================================================== */
function openModal(html){ $("#modalBox").innerHTML = html; $("#modalBg").classList.add("open"); }
function closeModal(){ $("#modalBg").classList.remove("open"); window.__taskOpen = null; }
$("#modalBg").addEventListener("click", e => { if (e.target.id === "modalBg") closeModal(); });

function empOptions(sel){
  return EMPLOYEES.filter(e=>e.role!=="admin").map(e =>
    `<option value="${e.id}" ${String(e.id)===String(sel)?"selected":""}>${esc(e.name)} — ${e.dept?deptById(e.dept).name:roleLabel(e.role)}</option>`).join("");
}

function openFBModal(sel){
  openModal(`
    <h3>Jarima / bonus kiritish</h3><div class="sub">Sabab va sana majburiy — xodimga shaffof ko'rinadi</div>
    <label>Xodim</label><select id="fbEmp">${empOptions(sel)}</select>
    <label>Turi</label><select id="fbType"><option value="bonus">Bonus (+)</option><option value="fine">Jarima (−)</option></select>
    <label>Summa (so'm)</label><input id="fbAmount" type="number" min="1000" step="10000" placeholder="masalan, 300000">
    <label>Sabab</label><textarea id="fbReason" rows="2" placeholder="masalan, Reja 115% bajarildi"></textarea>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor qilish</button>
    <button class="btn primary" onclick="saveFB()">Saqlash</button></div>`);
}
async function saveFB(){
  const amount = +$("#fbAmount").value, reason = $("#fbReason").value.trim();
  if (!amount || !reason) return toast("Summa va sababni to'ldiring");
  const empVal = CLOUD ? $("#fbEmp").value : +$("#fbEmp").value;
  const type = $("#fbType").value;
  if (CLOUD) {
    const { data, error } = await sb.from("fine_bonus")
      .insert({ emp: empVal, type, amount, reason, date: TODAY, created_by: USER.id })
      .select().single();
    if (error) return toast("Xatolik: " + error.message);
    FINEBONUS.push({ id: data.id, emp: data.emp, type, amount, reason, date: data.date });
  } else {
    FINEBONUS.push({ id: Date.now(), emp: empVal, type, amount, reason, date: TODAY });
  }
  closeModal(); toast("Yozuv saqlandi"); render();
}

function pickAllEmps(on){
  document.querySelectorAll(".tEmpChk").forEach(i => i.checked = on);
  updPickCount();
  if (on) toast(`Hammaga tanlandi (${document.querySelectorAll(".tEmpChk").length} xodim)`);
}
function updPickCount(){
  const el = document.getElementById("pickCount"); if (!el) return;
  const n = document.querySelectorAll(".tEmpChk:checked").length;
  const all = document.querySelectorAll(".tEmpChk").length;
  el.textContent = n ? (n === all ? `hammasi tanlandi (${n})` : `${n} ta tanlandi`) : "";
}
function openTaskModal(){
  voiceBlob = null;
  // Rahbar/direktor/admin — o'zidan boshqa hammaga; boshliq — o'z bo'limiga
  let assignable;
  if (USER.role === "admin" || isExec(USER.role)) {
    assignable = EMPLOYEES.filter(e => String(e.id) !== String(USER.id) && e.role !== "admin");
  } else {
    assignable = scopeEmployees().filter(e => !isExec(e.role) && String(e.id) !== String(USER.id));
  }
  openModal(`
    <h3>Yangi vazifa</h3><div class="sub">Vazifa «Vazifa tushdi» bosqichiga tushadi</div>
    <label>Mas'ul xodim(lar) — bir nechta tanlash mumkin</label>
    <div style="display:flex;gap:7px;margin-bottom:7px;flex-wrap:wrap">
      <button type="button" class="btn ghost sm" onclick="pickAllEmps(true)">👥 Hammaga</button>
      <button type="button" class="btn ghost sm" onclick="pickAllEmps(false)">Tozalash</button>
      <span id="pickCount" style="font-size:11.5px;color:var(--muted);align-self:center"></span>
    </div>
    <div class="emp-pick">${assignable.map(e=>`
      <label class="pick-chip"><input type="checkbox" class="tEmpChk" value="${e.id}" onchange="updPickCount()"><span>${esc(e.name)}</span></label>`).join("")}</div>
    <div style="font-size:11px;color:var(--muted);margin-top:5px">Bir nechta belgilansa — kimdir bittasi bajarsa vazifa yopiladi (umumiy vazifa)</div>
    <label>Sarlavha</label><input id="tTitle" placeholder="Vazifa nomi">
    <label>Tavsif</label><textarea id="tDesc" rows="2" placeholder="Qisqacha tushuntirish"></textarea>
    <label>Takrorlanishi (yakshanba — dam, hisobga olinmaydi)</label>
    <select id="tRep" onchange="$('#repDays').style.display = this.value==='days' ? 'flex' : 'none'">
      <option value="none">Bir martalik</option>
      <option value="daily">🔁 Har kuni (Du–Sha)</option>
      <option value="alt">🔁 Kun ora</option>
      <option value="days">🔁 Haftaning tanlangan kunlari</option>
      <option value="weekly">🔁 Har hafta (shu kundan)</option>
      <option value="monthly">🔁 Har oy</option></select>
    <div id="repDays" style="display:none;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${[["1","Du"],["2","Se"],["3","Chor"],["4","Pay"],["5","Ju"],["6","Sha"]].map(([v,l]) => `
        <label class="day-chip"><input type="checkbox" value="${v}"><span>${l}</span></label>`).join("")}
      <span style="font-size:11px;color:var(--muted);width:100%">Masalan: shanbalik uchun faqat "Sha"ni belgilang</span>
    </div>
    <label>Muddat (sana va soat)</label>
    <div style="display:flex;gap:8px">
      <input id="tDue" type="date" value="${TODAY}" style="flex:2">
      <input id="tDueTime" type="time" value="18:00" style="flex:1" title="Kun ichidagi muddat">
    </div>
    <div style="display:flex;gap:8px;margin-top:14px;align-items:center;flex-wrap:wrap">
      <button type="button" class="btn ghost sm" id="micBtn" onclick="toggleDictate('tDesc', this)">🎤 Ovozdan matn</button>
      <button type="button" class="btn ghost sm" id="vnBtn" onclick="toggleVoiceNote(this)">🎙 Ovozli izoh yozish</button>
    </div>
    <audio id="vnPrev" controls style="width:100%;margin-top:8px;display:none"></audio>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor qilish</button>
    <button class="btn primary" onclick="saveTask()">Berish</button></div>`);
}
async function saveTask(){
  const title = $("#tTitle").value.trim();
  if (!title) return toast("Sarlavhani kiriting");
  const picked = [...document.querySelectorAll(".tEmpChk:checked")].map(i => CLOUD ? i.value : +i.value);
  if (!picked.length) return toast("Kamida bitta mas'ul xodimni tanlang");
  const desc = $("#tDesc").value.trim(), due = $("#tDue").value;
  const dueTime = $("#tDueTime") ? $("#tDueTime").value || null : null;
  const forAll = picked.length === document.querySelectorAll(".tEmpChk").length && picked.length > 1;
  const empVal = picked[0];                 // asosiy mas'ul (moslik uchun)
  const empsVal = picked.length > 1 ? picked : null; // ko'p bo'lsa massiv
  let trep = $("#tRep") ? $("#tRep").value : "none";
  if (trep === "days") {
    const days = [...document.querySelectorAll("#repDays input:checked")].map(i => i.value);
    if (!days.length) return toast("Hafta kunlaridan kamida bittasini belgilang");
    trep = "days:" + days.join(",");
  }
  if (CLOUD) {
    const { data, error } = await sb.from("tasks")
      .insert({ title, descr: desc, emp: empVal, emps: empsVal, created_by: USER.id, due,
                due_time: dueTime, for_all: forAll, status: "new", repeat: trep })
      .select().single();
    if (error) return toast("Xatolik: " + error.message);
    const nt = { id: data.id, title, desc, emp: data.emp, emps: empsVal, by: USER.id, due,
                 dueTime, forAll, status: "new", rep: trep };
    if (voiceBlob) {
      const path = data.id + ".webm";
      const { error: ve } = await sb.storage.from("voice").upload(path, voiceBlob, { upsert: true, contentType: voiceBlob.type });
      if (!ve) { await sb.from("tasks").update({ voice: path }).eq("id", data.id); nt.voice = path; }
      else toast("Ovoz yuklanmadi: " + ve.message);
    }
    TASKS.push(nt);
  } else {
    const nt = { id: Date.now(), title, desc, emp: empVal, emps: empsVal, by: USER.id, due,
                 dueTime, forAll, status: "new", rep: trep };
    if (voiceBlob) nt.voiceUrl = URL.createObjectURL(voiceBlob);
    TASKS.push(nt);
  }
  voiceBlob = null;
  closeModal(); toast("Vazifa berildi"); go("tasks");
}

function openEmpModal(id){
  id = id || "";
  const e = id ? empById(id) : null;
  openModal(`
    <h3>${e ? "Xodimni tahrirlash" : "Yangi xodim"}</h3>
    <div class="sub">Kirish hisobi, rol va oylik maoshni admin belgilaydi</div>
    <label>Ism familiya</label><input id="eName" value="${e?esc(e.name):""}" placeholder="Ism Familiya">
    <label>Lavozim</label><input id="ePos" value="${e?esc(e.pos):""}" placeholder="masalan, Dizayner">
    <label>Bo'lim</label><select id="eDept">${DEPTS.map(d=>`<option value="${d.id}" ${e?.dept===d.id?"selected":""}>${d.name}</option>`).join("")}</select>
    <label>Rol (kirishdagi huquqlarni belgilaydi)</label><select id="eRole">
      <option value="xodim" ${e?.role==="xodim"?"selected":""}>Xodim — faqat o'zinikini ko'radi</option>
      <option value="boshliq" ${e?.role==="boshliq"?"selected":""}>Bo'lim boshlig'i — o'z bo'limi + tasdiqlash</option>
      <option value="rahbar" ${e?.role==="rahbar"?"selected":""}>Rahbar — barcha ko'rsatkichlar (reytingsiz)</option>
      <option value="direktor" ${e?.role==="direktor"?"selected":""}>Direktor — rahbar bilan bir xil (reytingsiz)</option></select>
    <label>Oylik maosh (so'm) — hisob-kitob shu summadan yuritiladi</label>
    <input id="eSalary" type="number" value="${e?e.salary:5000000}" step="500000">
    <label>Shartnoma muddati (qachongacha)</label>
    <input id="eContract" type="date" value="${e?.contract||""}">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:14px">
      <input type="checkbox" id="eField" style="width:auto" ${e?.fieldWork?"checked":""}>
      Doimiy tashqarida ishlaydi (masalan, haydovchi) — ishxonadan tashqaridan "Keldim/Ketdim" bosa oladi, boshliq tasdiqlaydi</label>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:10px">
      <input type="checkbox" id="eReassign" style="width:auto" ${e?.canReassign?"checked":""}>
      Vazifani boshqa xodimga o'tkaza oladi (topshiriqni boshqasiga yuborish huquqi)</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><label>Login (qisqa, masalan: jasur)</label><input id="eLogin" value="${e?esc(e.login||""):""}" placeholder="jasur" ${CLOUD&&e?"disabled":""}></div>
      <div><label>Parol</label><input id="ePass" type="${CLOUD?"password":"text"}" value="${!CLOUD&&e?esc(e.pass||""):""}" placeholder="parol" ${CLOUD&&e?"disabled":""}></div>
    </div>
    ${CLOUD&&e?'<div style="font-size:11.5px;color:var(--muted);margin-top:6px">Email/parolni o\'zgartirish — Supabase Dashboard → Authentication orqali</div>':""}
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor qilish</button>
    <button class="btn primary" onclick="saveEmp('${id}')">Saqlash</button></div>`);
}
async function saveEmp(id){
  id = id || "";
  const name = $("#eName").value.trim();
  const login = $("#eLogin").value.trim().toLowerCase();
  const pass  = $("#ePass").value;
  if (!name) return toast("Ismni kiriting");
  if (!id && (!login || !pass)) return toast("Login va parolni kiriting");
  if (!id && !/^[a-z0-9._-]+(@[a-z0-9.-]+)?$/.test(login)) return toast("Login faqat lotin harf va raqamlardan iborat bo'lsin");
  if (!id && EMPLOYEES.some(e => e.login === login)) return toast("Bu login band — boshqasini tanlang");
  const role = $("#eRole").value;
  const palette = ["#149E93","#4C82E0","#C98F2B","#7B5BA6","#2E7D6B","#B5762A","#1B8FA6","#5B7BD8"];
  const color = palette[Math.floor(Math.random()*palette.length)];
  const contract = $("#eContract").value || null;
  const fieldWork = !!$("#eField").checked;
  const canReassign = !!$("#eReassign").checked;
  const fields = { name, pos: $("#ePos").value.trim() || "Xodim",
                   dept: isExec(role) ? null : $("#eDept").value,
                   role, salary: +$("#eSalary").value || 0 };
  if (CLOUD) {
    if (id) { // tahrirlash — profil yangilanadi (login/parol Dashboard orqali)
      const { error } = await sb.from("profiles").update({ ...fields, contract_until: contract, field_work: fieldWork, can_reassign: canReassign }).eq("id", id);
      if (error) return toast("Xatolik: " + error.message);
      Object.assign(empById(id), fields, { contract, fieldWork, canReassign });
    } else {  // yangi hisob — alohida klient orqali (admin sessiyasi saqlanadi)
      const { data, error } = await sbSignup.auth.signUp({
        email: toEmail(login), password: pass,
        options: { data: { ...fields, color, salary: String(fields.salary) } }
      });
      if (error) return toast("Xatolik: " + error.message);
      if (!data.user) return toast("Hisob yaratilmadi — Supabase sozlamalarini tekshiring");
      if (contract || fieldWork || canReassign) await sb.from("profiles").update({ contract_until: contract, field_work: fieldWork, can_reassign: canReassign }).eq("id", data.user.id);
      EMPLOYEES.push({ id: data.user.id, color, login, contract, fieldWork, canReassign, ...fields });
    }
  } else {
    if (id) Object.assign(empById(id), { ...fields, contract, fieldWork, canReassign, login, pass });
    else EMPLOYEES.push({ id: Date.now(), color, login, pass, contract, fieldWork, canReassign, ...fields });
  }
  closeModal(); toast(id ? "Ma'lumotlar yangilandi" : "Xodim qo'shildi va hisob ochildi"); render();
}
function removeEmp(id){
  const e = empById(id);
  openModal(`<h3>Xodimni chiqarish</h3>
    <div class="sub" style="margin:8px 0 4px"><b>${esc(e.name)}</b> tizimdan chiqarilsinmi? Uning vazifalari va yozuvlari arxivda qoladi.</div>
    <div class="foot"><button class="btn ghost" onclick="closeModal()">Bekor qilish</button>
    <button class="btn danger" onclick="confirmRemove('${id}')">Chiqarish</button></div>`);
}
async function confirmRemove(id){
  if (CLOUD) { // hisob o'chirilmaydi — faolsizlantiriladi (tarix saqlanadi)
    const { error } = await sb.from("profiles").update({ active: false }).eq("id", id);
    if (error) return toast("Xatolik: " + error.message);
  }
  EMPLOYEES = EMPLOYEES.filter(e => String(e.id) !== String(id));
  closeModal(); toast("Xodim tizimdan chiqarildi"); render();
}

