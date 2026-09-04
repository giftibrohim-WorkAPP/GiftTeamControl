// GM Pulse server — statik fayllar + Gemini AI proxy
// Kalit (GEMINI_API_KEY) Railway Variables'da turadi, brauzerga hech qachon bormaydi.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// index.html ga Supabase kalitlarini joylash (avvalgi sed o'rniga)
let indexHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8")
  .replace(/__SUPABASE_URL__/g, SUPABASE_URL)
  .replace(/__SUPABASE_ANON_KEY__/g, SUPABASE_ANON_KEY);

const MIME = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".json":"application/json",
  ".png":"image/png", ".ico":"image/x-icon", ".svg":"image/svg+xml", ".css":"text/css", ".webmanifest":"application/manifest+json" };

/* Supabase tokenini tekshirib, foydalanuvchi rolini olish */
async function whoIs(token){
  if (!token || !SUPABASE_URL) return null;
  const h = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + token };
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: h });
  if (!u.ok) return null;
  const user = await u.json();
  const p = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=id,name,role`, { headers: h });
  const rows = p.ok ? await p.json() : [];
  return rows[0] || null;
}

/* Gemini'ga so'rov */
async function askGemini(system, context, history, question){
  const contents = [];
  (history || []).slice(-8).forEach(h => {
    contents.push({ role: "user", parts: [{ text: h.q }] });
    contents.push({ role: "model", parts: [{ text: h.a }] });
  });
  contents.push({ role: "user", parts: [{ text: `MA'LUMOTLAR (JSON):\n${context}\n\nSAVOL: ${question}` }] });
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 1024 } },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  let r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (r.status === 400) { // model thinkingConfig ni qo'llamasa — usiz qayta
    delete body.generationConfig.thinkingConfig;
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || ("Gemini xatosi " + r.status));
  const cand = j.candidates?.[0];
  // "thought" qismlarini tashlab, faqat javob matnini olamiz
  let text = (cand?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("").trim();
  if (!text) text = "Javob olinmadi";
  if (cand?.finishReason === "MAX_TOKENS") text += "\n\n_(javob uzunligi chegarasiga yetdi — savolni qismlarga bo'lib bering)_";
  if (cand?.finishReason === "SAFETY") text = "Javob xavfsizlik filtri tomonidan to'xtatildi — savolni boshqacha bering";
  return text;
}

const SYSTEM = `Sen GM Pulse tizimining rahbar assistentisan. Foydalanuvchi — kompaniya rahbari.
Qoidalar:
1. Faqat berilgan MA'LUMOTLAR (JSON) asosida javob ber. Raqamlarni o'zing o'ylab topma — JSON'da bo'lmasa "bu ma'lumot tizimda yo'q" deb ayt.
2. Hisob-kitobda aniq bo'l: summalarni so'mda, "137 500" ko'rinishida yoz. Yaxlitlama.
3. Savol qaysi sohaga tegishli bo'lsa (kadrlar, moliya, sotuv, ishlab chiqarish, ta'minot, boshqaruv) — o'sha sohaning eng yetuk mutaxassisi sifatida javob ber: faktlarni ayt, keyin qisqa, amaliy maslahat ber.
4. O'zbek tilida (lotin), aniq va qisqa. Kerak bo'lsa ro'yxat yoki jadval ishlat. Salomlashish va ortiqcha muqaddima yozma.
5. Xodimlar haqida gapirganda hurmat bilan, lekin ochiq — kim yaxshi, kim past natijali, sabab nima bo'lishi mumkin.
6. Agar savol tizim ma'lumotiga umuman aloqasiz bo'lsa (umumiy bilim), qisqa javob ber, lekin imkon bo'lsa kompaniya kontekstiga bog'la.`;

http.createServer(async (req, res) => {
  // ---- AI endpoint ----
  if (req.method === "POST" && req.url === "/api/ask") {
    let raw = ""; req.on("data", c => raw += c);
    req.on("end", async () => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      try {
        if (!GEMINI_API_KEY) return res.end(JSON.stringify({ error: "GEMINI_API_KEY Railway Variables'da yo'q" }));
        const { token, question, context, history } = JSON.parse(raw || "{}");
        const me = await whoIs(token);
        if (!me) return res.end(JSON.stringify({ error: "Kirish tasdiqlanmadi" }));
        if (!["admin","rahbar","direktor"].includes(me.role)) return res.end(JSON.stringify({ error: "Assistent faqat rahbariyat uchun" }));
        if (!question) return res.end(JSON.stringify({ error: "Savol bo'sh" }));
        const answer = await askGemini(SYSTEM, (context || "").slice(0, 120000), history, question);
        res.end(JSON.stringify({ answer }));
      } catch (e) { res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }
  if (req.method === "GET" && req.url === "/api/health") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: true, ai: !!GEMINI_API_KEY, model: GEMINI_MODEL }));
  }
  // ---- Statik fayllar ----
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/" || p === "/index.html") { res.setHeader("Content-Type", MIME[".html"]); res.setHeader("Cache-Control", "no-cache"); return res.end(indexHtml); }
  const file = path.join(__dirname, path.normalize(p).replace(/^(\.\.[\/\\])+/, ""));
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.setHeader("Content-Type", MIME[".html"]); return res.end(indexHtml); // SPA fallback
  }
  res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
  if (file.endsWith("sw.js") || file.includes("/js/") || file.includes("/css/")) res.setHeader("Cache-Control", "no-cache");
  // Supabase kalitlari endi js/01-config.js ichida — o'sha faylga ham joylaymiz
  if (file.endsWith(".js") && file.includes(path.sep + "js" + path.sep)) {
    const txt = fs.readFileSync(file, "utf8").replace(/__SUPABASE_URL__/g, SUPABASE_URL).replace(/__SUPABASE_ANON_KEY__/g, SUPABASE_ANON_KEY);
    return res.end(txt);
  }
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log("GM Pulse server :" + PORT + " | AI: " + (GEMINI_API_KEY ? "yoqilgan (" + GEMINI_MODEL + ")" : "kalit yo'q")));
