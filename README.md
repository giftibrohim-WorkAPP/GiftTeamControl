# GM Pulse — Samaradorlik Nazorati (PWA + Supabase)

Xodimlar davomati (geolokatsiya bilan), vazifalar (kanban + boshliq tasdig'i), KPI,
jarima/bonuslar va soatbay maosh hisobi. Supabase sozlanmagan bo'lsa **demo rejimda**
(mock data) ishlaydi — sozlansa to'liq bulutli rejimga o'tadi.

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `index.html` | Butun ilova (UI + mantiq). Tepasida SUPABASE sozlamasi bor |
| `supabase-setup.sql` | Backend: jadvallar, RLS xavfsizlik qoidalari, trigger |
| `manifest.json`, `sw.js`, `icon-*.png` | PWA (o'rnatish + offline) |

## 1. Supabase'ni sozlash (10 daqiqa)

1. https://supabase.com → bepul account → **New project** (parolni saqlab qo'ying).
2. Chapda **SQL Editor** → New query → `supabase-setup.sql` faylining butun matnini
   yopishtiring → **Run**. (Jadvallar, rollar va xavfsizlik qoidalari yaratiladi.)
3. **Authentication → Sign In / Providers → Email** → "Confirm email" ni **O'CHIRING**
   (admin xodim yaratganda email tasdiqlashsiz darhol kirishi uchun).
4. Birinchi adminni yarating: **Authentication → Users → Add user** →
   email + parol kiriting, **Auto Confirm User** ✓. So'ng SQL Editor'da:
   ```sql
   update public.profiles set role='admin', name='Admin'
   where email='SIZNING_EMAIL';
   ```
5. **Project Settings → API** dan `Project URL` va `anon public` kalitni oling.
6. `index.html` tepasidagi ikki qatorga yozing:
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```

Shu bilan tayyor: admin kiradi → "Xodimlar" da yangi xodim qo'shadi (email, parol,
rol, bo'lim, oylik) → xodim o'sha email/parol bilan kiradi.

## 2. Joylashtirish (hosting)

PWA va geolokatsiya **HTTPS** talab qiladi. Eng oson bepul yo'llar:
- **Netlify**: netlify.com → "Deploy manually" → papkani sudrab tashlang
- **Vercel** yoki **GitHub Pages** ham bo'ladi

Lokal sinash: `npx serve .` yoki `python3 -m http.server 8080`
(geolokatsiya `localhost`da ham ishlaydi).

## Rollar (Supabase RLS bilan server darajasida himoyalangan)

| Rol | Huquqlar |
|---|---|
| **admin** | Hammasi: xodim yaratish (email/parol/rol/oylik), jarima/bonus, tasdiqlash |
| **rahbar** | Barcha ko'rsatkichlar va hisob-kitob (texnik boshqaruvsiz) |
| **boshliq** | O'z bo'limi + o'z shaxsiy sahifasi + vazifalarni tasdiqlash |
| **xodim** | Faqat o'ziniki: davomat (Keldim/Ketdim + 📍), balans, vazifalar |

Muhim: cheklovlar faqat interfeysda emas — **RLS qoidalari bazaning o'zida** turadi,
ya'ni xodim texnik yo'l bilan ham boshqalarning maoshini ko'ra olmaydi.

## Hisob formulasi (soatbay)

Reja: 26 kun × 8 soat = **208 soat/oy** (9:00–18:00, obed 13:00–14:00 ayriladi).
**Sof to'lov = (oylik ÷ 208) × real ishlagan soat + bonuslar − jarimalar.**
Ortiqcha soat qo'shiladi, kam ishlangani kamaytiradi.

## Geolokatsiya

"Keldim" bosilganda brauzer joylashuv ruxsatini so'raydi. Koordinata bazaga yoziladi
va davomatda 📍 belgisi ko'rinadi — bosilsa Google Xaritada ochiladi. Ruxsat
berilmasa yoki 6 soniyada aniqlanmasa — vaqt joylashuvsiz qayd etiladi.

## Demo rejim

`SUPABASE_URL` bo'sh qolsa: admin/admin123 · dilshod/1234 · nodira/1234 · jasur/1234


## 2-yangilanish (v3)

- **Qisqa login:** xodim `jasur` deb kiradi (email ko'rinmaydi, kod `@gmpulse.uz` ni o'zi qo'shadi)
- **Geofence 100 m:** admin Davomat sahifasida "Shu yerni ishxona deb belgilash" tugmasi bilan
  nuqtani o'rnatadi (radius 50/80/100/150 m). Radiusdan tashqarida Keldim/Ketdim ishlamaydi
- **Xodim profili:** kartochkani bosganda to'liq sahifa — KPI, soatlar, maosh, vazifalar,
  jarima/bonus, davomat, hujjatlar, shartnoma holati
- **Hujjatlar:** admin PDF yuklaydi/o'chiradi, admin va rahbar yuklab oladi (Supabase Storage);
  shartnoma muddati 30 kundan kam qolsa — ogohlantirish (kartochka + qo'ng'iroq)
- **Davomat:** "Ketdim" unutilsa kun 18:00 bilan avto yopiladi ("avto" belgisi);
  admin istalgan yozuvni ✎ bilan tuzatadi yoki unutilgan kunni qo'lda qo'shadi
- **Bo'limlar:** admin qo'shadi / nomini va rangini o'zgartiradi / bo'shini o'chiradi
- **Mobil:** sahifa yon tomonga cho'zilishi yo'qotildi, Hisob-kitob telefonda kartochka ko'rinishida

MUHIM: Supabase'da `supabase-update-1.sql` faylini bir marta Run qilish shart
(geofence, shartnoma ustuni, hujjatlar ombori, bo'limlar ruxsatlari shu yerda).

## 3-yangilanish (v4)

- **Takrorlanuvchi vazifalar:** har kuni/hafta/oy — tasdiqlangach keyingisi avtomatik ochiladi (🔁)
- **Izohlar:** vazifa oynasida xodim va boshliq yozishmasi
- **Qo'shimcha vaqt tasdig'i:** 9:00 dan oldin / 18:00 dan keyin ishlangan vaqt boshliq/rahbar/admin
  tasdiqlamaguncha maoshga qo'shilmaydi (tasdiq so'rovi avtomatik boradi)
- **Obed nazorati:** "Obeddan qaytdim" tugmasi — 14:00 dan kech bosilsa kechikish yoziladi
  va ortiqcha daqiqalar ish soatidan ayriladi
- **Ochiq reyting:** barcha xodimlar ko'radi, KPI + raqamlar bilan (maosh ko'rsatilmaydi)
- **Dala ishchisi:** admin xodimga "ko'chada ishlaydi" belgisi qo'ysa geofence talab qilinmaydi;
  admin qo'lda kiritgan davomatda qo'shimcha vaqt avtomatik tasdiqlangan hisoblanadi

MUHIM: Supabase'da `supabase-update-2.sql` ni bir marta Run qiling.

## 4-yangilanish (v5)

- **Kunlik tashqarida ishlash ruxsati:** Davomat sahifasida (admin) "🚶 Tashqarida ishlash
  ruxsati" — xodim va sanani tanlab beriladi, faqat o'sha kuni geofence so'ralmaydi.
  Ro'yxatda ko'rinadi, bekor qilish mumkin, jadvalda "tashqarida" belgisi qoladi.
  Supabase'da `supabase-update-3.sql` ni Run qilish kerak.

## 5-yangilanish (v7)

- **Ovozli kiritish:** vazifa oynasida 🎤 (gap → matn, Chrome tavsiya) va 🎙 ovozli izoh
  (audio yoziladi, xodim vazifa ichida eshitadi). Mikrofon HTTPS talab qiladi.
- **Takrorlash kengaydi:** har kuni / kun ora / haftaning tanlangan kunlari (Du–Sha) / har oy.
  Yakshanba — dam: hech bir takror unga tushmaydi.
- **Davomat — bo'limlar kesimida:** kunlar ro'yxati (bugun ochiq), ichida bo'lim qatorlari
  ("IT — 3/3 keldi · 1 kechikish"), bosilganda xodimlar tafsiloti, kelmaganlar ro'yxati.
- **Telefon:** jadvallar kartochkaga, tugmalar ustma-ustga o'tadi — ekran o'lchamiga moslashadi.
- **Jonli sinxron (Realtime):** boshliq vazifa berishi bilan xodim ekranida 1-2 soniyada paydo
  bo'ladi; izoh, tasdiq, davomat ham jonli yangilanadi.

MUHIM: Supabase'da `supabase-update-4.sql` ni bir marta Run qiling.

## 6-yangilanish (v10)

- **Direktor roli qo'shildi:** rahbar bilan bir xil to'liq huquq (barcha bo'limlar, hisob-kitob,
  pul ko'rsatkichlari). Xodim qo'shishda rol ro'yxatidan tanlanadi.
- **Reyting:** rahbar va direktor umumiy reytingda ko'rinmaydi (faqat xodim va bo'lim boshliqlari).

MUHIM: Supabase'da `supabase-update-5.sql` ni bir marta Run qiling.

## 7-yangilanish (v11)

- **Tashqaridan keldim/ketdim (xodim so'raydi → boshliq tasdiqlaydi):**
  Xodim ishxona radiusidan tashqarida "Keldim/Ketdim" bossa — rad etilmaydi, balki
  joylashuvi bilan yoziladi va "tasdiq kutmoqda" bo'ladi. Kelish va ketish alohida
  tasdiqlanadi. Ketishda ishni TUGATGAN joy koordinatasi ham olinadi (ketish 📍).
  Boshliq/rahbar/admin bildirishnoma oladi, davomatda ✓/✗ bilan tasdiqlaydi.
  Davomat hisoblanadi, lekin "tashqarida" deb belgilanadi.
- **Admin oldindan ruxsat tizimi ham saqlanadi:** admin bir kunga ruxsat bergan yoki
  doimiy dala ishchisi bo'lsa — tashqarida deb belgilanmaydi, tasdiq so'ralmaydi.

MUHIM: Supabase'da `supabase-update-6.sql` ni bir marta Run qiling.

## 8-yangilanish (v14)

- **Davomat tasdig'i ierarxiyasi:** oddiy bo'lim xodimining qo'shimcha vaqti va tashqaridan
  kelish/ketishini — o'z bo'lim boshlig'i tasdiqlaydi. Bo'lim boshliqlari va administrativ
  (bo'limsiz) xodimlarni esa — DIREKTOR/RAHBAR (yoki admin) tasdiqlaydi. Boshliq boshqa
  boshliqni yoki administrativ xodimni tasdiqlay olmaydi.

## 9-yangilanish (v15)

- **Jonli sinxron mustahkamlandi:** Realtime uzilib qolса ham, ilova ochiq turганда har
  25 soniyada va ekranga qaytганda jimgina yangilanadi. Davomatda "🔄 Yangilash" tugmasi ham bor.
- **Rad etilgan/tasdiqlangan so'rov barcha qurilmalarda yangilanadi** (avval eski holat qolib ketardi).
- Agar avtomatik yangilanish baribir ishlamasa — `supabase-update-7.sql` ni Run qiling
  (attendance jadvalini Realtime'ga to'liq ulaydi).

## 10-yangilanish (v17)

- **Tasdiqlash bug' tuzatildi:** tasdiqlangan vazifa qayta "tasdiqlash" holatiga qaytmaydi
  (ikki marta tasdiqlash bloklandi, mahalliy holat darhol yangilanadi).
- **Muddatni cho'zish:** tasdiqqa tushган vazifada beruvchi/admin "📅 Muddatni cho'zish"
  tugmasi orqali yangi muddat + sabab kiritadi; vazifa jarayonga qaytadi, izohga yoziladi.
- **Ko'p mas'ul:** bitta vazifaga bir nechta xodim tanlash mumkin (checkbox ro'yxati);
  kimdir bittasi bajarsa yetarli (umumiy vazifa), KPI har bir mas'ulga hisoblanadi.
- **Vazifani o'tkazish:** "o'tkaza oladi" ruxsati (admin xodim kartasida beradi) bor xodim
  vazifani boshqasiga o'tkazadi, yangi mas'ul avtomatik qabul qiladi, izohga yoziladi.
- **Obedga chiqish/qaytish:** ikki bosqichli — "Obedga chiqdim" + "Obeddan qaytdim".
  Haqiqiy davomiylik hisoblanadi; 1 soatdan oshsa ortig'i ish vaqtidan ayriladi.
  Juda erta (obed oynasidan oldin, ~9-10) chiqilsa ogohlantiradi va obed deb hisoblamaydi.

MUHIM: Supabase'da `supabase-update-8.sql` ni bir marta Run qiling.

## 11-yangilanish (v20) — MUHIM TUZATISH

**Muammo:** rahbar/direktor vazifani tasdiqlaganda, bir necha soniyadan keyin vazifa
yana "tasdiqlanmagan" holatiga qaytardi.

**Sabab:** Supabase RLS ruxsatida (`task_update`) rahbar, direktor va vazifa BERUVCHI
yo'q edi — faqat bajaruvchi, admin va bo'lim boshlig'i bor edi. Shuning uchun baza
yozishni jimgina rad etardi (xato ham bermasdan), keyin jonli yangilanish eski
holatni qaytarardi.

**Yechim:**
- `supabase-update-9.sql` — RLS to'g'rilandi: beruvchi, rahbar, direktor va ko'p mas'ulli
  vazifada har bir mas'ul o'zgartira oladi. Davomat va izohlar uchun ham xuddi shunday.
- Frontend endi RLS jimgina rad etganini ANIQLAYDI va "Ruxsat yo'q" deb aniq xabar beradi
  (avval jimgina orqaga qaytardi, sabab ko'rinmasdi).

⚠️ MUHIM: Supabase'da `supabase-update-9.sql` ni albatta Run qiling — busiz tasdiqlash ishlamaydi.

## 12-yangilanish (v21)

1. **Shartnoma toifalari:** yashil (30+ kun), sariq (30 kungacha), qizil (7 kun yoki o'tgan).
   Qolgan kunlar va tugash sanasi ko'rsatiladi — profil va xodimlar kartochkasida.
2. **Xodim o'z ma'lumotlarini ko'radi:** "Mening sahifam"da lavozim, login, oylik,
   shartnoma holati, ruxsatlari va o'z hujjatlari.
3. **Hujjatlar ro'yxati:** admin "Hujjatlar ro'yxati" oynasida talab qilinadigan hujjatlarni
   belgilaydi (majburiy/ixtiyoriy). Yuklashda hujjat turi tanlanadi. Xodimlar kartochkasida
   rahbariyatga "📎 hujjat 3/5" belgisi va yetishmayotganlar ro'yxati ko'rinadi.
4. **Ruxsat bilan kechikish:** xodim kechikkan kuni "Sabab" tugmasi bilan izoh yuboradi,
   boshliq/rahbar tasdiqlasa — reytingga ta'sir qilmaydi va jarima yozilmaydi.
   Obeddan kech qaytishga ham qo'llanadi.
5. **PDF yuklash tuzatildi:** fayl nomidagi o'zbek/rus harflari, bo'shliq va maxsus belgilar
   avtomatik xavfsiz ko'rinishga o'tkaziladi (avval "Invalid key" xatosi berardi).
6. **Kechikish jarimasi:** admin "Kechikish jarimasi" oynasida 1 daqiqa narxini kiritadi,
   jarima avtomatik hisoblanib maoshdan ayriladi (sababli kechikishlarga yozilmaydi).

MUHIM: Supabase'da `supabase-update-10.sql` ni bir marta Run qiling.

## 13-yangilanish (v23)

1. **Bitta PDF ichida bir nechta hujjat:** yuklashda "bu fayl ichida qaysi hujjatlar bor"
   deb bir nechta tur belgilanadi (shartnoma + anketa + tilxat + pasport). To'liqlik shunga
   qarab hisoblanadi. Yuklangan faylga keyin ham 🏷 tugmasi bilan tur qo'shish mumkin.
2. **8 soatlik ruxsat qoidasi:** sabab ish boshlanishidan kamida 8 soat oldin yuborilishi kerak.
   Kech yuborilsa — boshliq/rahbarda tasdiqlash tugmasi CHIQMAYDI, faqat admin to'g'rilay oladi.
   To'g'rilanmaguncha o'sha kun uchun har daqiqasiga jarima hisoblanaveradi.
3. **Jarima alohida hisob:** maosh = ishlagan soat + bonus (jarimasiz). Jarima alohida
   ustunda ko'rsatiladi va alohida undiriladi — hisob-kitobga aralashmaydi.
   CSV eksportda ham ajratilgan (kechikish jarimasi / qo'lda jarima / jami).
4. **"👥 Hammaga" tugmasi:** vazifa berishda bir bosishda barcha xodimlar tanlanadi.
5. **Vazifa muddatiga soat:** sana bilan birga soat ham belgilanadi (masalan 24.07 15:30).
   Muddat o'tgani soat aniqligida tekshiriladi.

MUHIM: Supabase'da `supabase-update-11.sql` ni bir marta Run qiling.

## 14-yangilanish (v25)

1. **Takrorlanishni to'xtatish:** takroriy vazifada "⏹ Takrorni to'xtatish" tugmasi
   (vazifani bergan odam yoki admin). Bosilgach hozirgi vazifa qoladi, lekin bajarilgandan
   keyin yangi nusxa OCHILMAYDI. Vazifa oynasida keyingi nusxa qachon ochilishi ham ko'rsatiladi.

2. **⚠️ MUHIM BUG TUZATILDI — takroriy sanalar siljib ketishi:**
   "Har shanba" qo'yilgan vazifa keyingi safar jumaga, keyin payshanbaga tushib ketardi.
   Sabab: sana hisoblashda `toISOString()` ishlatilgan — u mahalliy yarim tunni UTC'ga
   o'giradi va Toshkentda (UTC+5) sanani BIR KUN ORQAGA suradi. Har takrorlanishda
   bir kundan siljib borardi. Endi mahalliy sana formatlagichi (isoLocal) ishlatiladi.
   Tekshirildi: har shanba 6 marta ketma-ket → hammasi shanba bo'lib qoldi.

## 15-yangilanish (v26) — YAKUNIY TO'PLAM

**Vazifani BUTUNLAY yopish (yangi):** "✖ Butunlay yopish" tugmasi — ish umuman tugagan/bekor
qilingan holat uchun. Hozirgi vazifa yopiladi VA takrorlanish to'xtaydi. Yopilgan vazifa
"Bajarildi" ustunida "✖ yopilgan" belgisi bilan turadi, KPI hisobiga kirmaydi.
Farqi: "⏹ Takrorni to'xtatish" — hozirgi vazifa qoladi, faqat keyingi nusxa ochilmaydi.

**Telefon ekrani tuzatildi:** chetdagi tugmalar endi kesilmaydi — barcha qatorlar (filtrlar,
amallar, davomat qatorlari, modal tugmalari) ekranga sig'maganda pastga o'raladi.
400px va undan tor ekranlar uchun alohida moslashuv qo'shildi.

**Oldingi yangilanishdagi (v24) ishlar ham shu to'plamda:**
- Obedga chiqish tugmasi olib tashlandi — faqat "Obeddan qaytdim" (14:00 dan hisoblanadi)
- Vazifani o'tkazish tuzatildi (RLS rad etardi — `supabase-update-12.sql`)
- Oldindan ruxsat so'rash: kamida 3 soat oldin, boshliq/direktor tasdiqlaydi,
  tasdiqlansa kechikish reytingga ta'sir qilmaydi va jarima yozilmaydi
- Admin har bir kunning jarimasini qo'lda tahrirlashi (💰 tugmasi)

MUHIM: Supabase'da `supabase-update-12.sql` va `supabase-update-13.sql` ni Run qiling.

## 16-yangilanish (v27) — EKRAN VA O'TKAZISH TUZATILDI

**Ekran muammosi — asl sabab topildi:** `overflow-x:hidden` ekrandan chiqqan tugmalarni
KESIB tashlardi va ularga yetib bo'lmasdi. Olib tashlandi; o'rniga har bir element
ekran eniga majburan sig'diriladi (`*{min-width:0}`, `max-width:100%`, flex-wrap).

**Vazifani o'tkazish — ikkita xato tuzatildi:**
1. Baza (RLS): `with check` YANGI qatorni tekshirardi — yangi mas'ul boshqa odam bo'lgani
   uchun yozish rad etilardi. `supabase-update-14.sql` buni tuzatadi.
2. Mantiq: beruvchi/admin o'tkazganda eski mas'ul olib tashlanmasdi. Endi:
   - mas'ulning o'zi o'tkazsa → o'z o'rnini yangi odamga beradi (boshqa mas'ullar qoladi)
   - beruvchi/rahbariyat o'tkazsa → butun mas'ullik yangi odamga o'tadi
3. Huquq kengaytirildi: endi ruxsatli mas'uldan tashqari vazifa BERUVCHI, rahbar,
   direktor va admin ham o'tkaza oladi.

MUHIM: Supabase'da `supabase-update-14.sql` ni Run qiling.

## 17-yangilanish (v28)

1. **Yakshanba — ijobiy:** dam kunida ishga chiqqan xodimda kechikish hisoblanmaydi,
   jarima yozilmaydi, ishlagan butun vaqti qo'shimcha vaqt sifatida boradi va KPI ga
   har yakshanba uchun +2% bonus (jami 10% gacha) qo'shiladi.
2. **Hujjat belgilash tuzatildi:** sabab — checkbox ro'yxati sahifa ochilganda hali bo'sh
   bo'lardi (turlar keyinroq yuklanardi). Endi ro'yxat yuklangandan keyin render qilinadi,
   yuklangach holat darrov yangilanadi va "Belgilandi: Pasport" deb tasdiq beriladi.
3. **Xodim rasmlari:** avatarga 📷 tugmasi — admin har kimga, xodim o'ziga rasm yuklaydi.
   Rasm profil, reyting, davomat, vazifalar — hamma joyda ko'rinadi.
4. **Donabay ish (Karona):** admin "Ishlar va narxlari" ro'yxatini kiritadi va kim donabay
   ishlashini belgilaydi. Xodim har kuni qaysi ishdan nechta qilganini yozadi, summa
   avtomatik yig'ilib maoshiga qo'shiladi. Ko'rinish: faqat xodimning O'ZI, uning bo'lim
   boshlig'i, rahbar/direktor va admin — boshqa xodimlarga ko'rinmaydi.

MUHIM: Supabase'da `supabase-update-15.sql` ni Run qiling.

## 18-yangilanish (v31) — ARXIV

**Oldingi oylar ma'lumoti:** yuqori panelda oy tanlagich (📅 joriy / 📁 oldingi 24 oy).
Oldingi oy tanlansa — davomat, jarima/bonus, hisob-kitob, KPI, reyting, donabay ish
o'sha oy bo'yicha ko'rsatiladi. Arxivda "faqat ko'rish": Keldim/Ketdim, ruxsat so'rash,
donabay yozish, davomat qo'shish tugmalari yashirinadi (admin tahriri va Excel qoladi).
Sariq banner "📁 Arxiv rejimi — Iyun 2026" va "Joriy oyga qaytish" tugmasi.
Ko'rinish huquqlari avvalgidek: xodim o'ziniki, boshliq o'z bo'limi, rahbariyat hammasi.

MUHIM: Supabase'da `supabase-update-16.sql` ni Run qiling (reyting oy bo'yicha ishlashi uchun).

## 19-yangilanish (v35)

1. **Zakazlar:** yangi bo'lim — mijoz, tovar (admin oldindan kiritadi), soni, narxi (har safar
   zakaz qo'shuvchi kiritadi), sana. Savdo summasi, mijozlar soni, o'rtacha zakaz, Excel eksport.
   Xodim o'z zakazlarini, boshliq bo'liminikini, rahbariyat hammasini ko'radi.
2. **Karona / Gift Master kesimi:** Xodimlar → Bo'limlar da har bo'limga kompaniya belgilanadi.
   Dashboard va Reytingda "Hammasi / Karona / Gift Master" tablari. (Yo'qolgan "Bo'limlar"
   oynasi ham qayta tiklandi.)
3. **Assistent (faqat rahbariyat):** dastur ma'lumotlaridan aniq hisoblab javob beradi.
   Savolda davr (bu hafta/bu oy/o'tgan oy/avgust/oylar kesimida), xodim, bo'lim ("... bo'limi"),
   kompaniya nomi tanib olinadi. Mavzular: kechikish, kelmaganlar, vazifalar, zakaz/savdo,
   davomat, jarima, bonus, KPI, donabay. Tez savollar tugmalari bor.

MUHIM: Supabase'da `supabase-update-17.sql` ni Run qiling.

## 20-yangilanish (v38) — SKLAD, SNABJENIYA, DONABAY TASDIG'I

**A. Donabay tasdig'i:** xodim yozgan har bir yozuv "tasdiq kutmoqda" holatida turadi.
Bo'lim boshlig'i (yoki rahbariyat) kechqurun ko'rib har birini ✓/✗ qiladi yoki "Kunni
tasdiqlash" bilan bir kunlik hammasini. Faqat tasdiqlangan yozuvlar maoshga qo'shiladi.

**B. Sklad:** menyuda "Sklad" (admin "🔑 Ruxsatlar" bilan kimga ko'rish/kirim-otgruzka
huquqini beradi). Tablar: Qoldiq (tovar + rang bo'yicha, kam qolganlar qizil), Kirim (nomi,
rangi, soni, narxi, kimdan), Otgruzka (qoldiqdan ko'p chiqarib bo'lmaydi), Tarix, Excel.

**C. Snabjeniya:** admin "🔑 Rollar" da xodimlarga rol beradi: ta'minotchi (snab), kassir,
zavsklad. Kontragentlar ro'yxati → ichiga kirilsa o'sha kontragent bilan barcha oldi-berdi,
zakazlar, balans (+ plyus / − qarz), va postavshik uchun maxsus havola.
Zakaz oqimi: snab zakaz ochadi (SZ-0001) → tovar kiritadi → zavsklad "Qabul qildim" →
snab kassirga to'lov so'raydi → kassir "To'ladim" → postavshik havola orqali "Pul keldi" ✓.
Chat har zakazda; kassir tovar tafsilotini, zavsklad to'lov tafsilotini ko'rmaydi.
"Debit/Kredit" — barcha kontragentlar balansi bir joyda.
**Postavshik havolasi** (?sup=TOKEN): login yo'q, faqat o'z zakazlari, chat, balans.

MUHIM: Supabase'da `supabase-update-19.sql` ni Run qiling.

## 21-yangilanish (v46) — DIZAYNER HISOBI va SOTUV KPI

**Dizayner hisobi:** admin "Donabay → Kim donabay ishlaydi" da xodimni belgilab turini
"Dizayner" qiladi; "Dizayn → 🎨 Brendlar va narxlar" da Karona / Gift Master / Otto
narxini kiritadi. Dizayner kun davomida brend + izoh (qaysi firma, dizayn nomi) yozadi.
KASSIR tasdiqlaydi (har birini yoki kunni). Oy davomida brend bo'yicha nechta / qancha,
jami — dizayner, kassir, rahbariyat ko'radi. Tasdiqlangani maoshga qo'shiladi.

**Sotuv KPI:** admin "Sotuv KPI → 👥 Sotuv menejerlari" da menejerlarni belgilaydi.
KASSIR sotuvlarni yozadi: menejer, brend, tovar, kod, zakaz №, narx, summa.
Oy jami summasiga BOSQICHLI foiz: 0–100 mln 0%, 100–150 1%, 150–300 1.7%,
300–500 2.1%, 500–750 2.4%, 750+ 2.4% + 🎁 sovg'a. Har oraliqdagi qism o'z foizida
(200 mln → 500 000 + 850 000 = 1 350 000). Vizual shkala, sovg'agacha qancha qoldi,
keyingi bosqichga qancha qoldi, bosqich tafsiloti. Foizlarni admin o'zgartira oladi.
KPI summasi menejer maoshiga qo'shiladi. Zakazlar bo'limi bilan bog'lanmagan.

MUHIM: Supabase'da `supabase-update-20.sql` ni Run qiling.

## 22-yangilanish (v49)

- **Avto 18:00 yopish OLIB TASHLANDI:** "Ketdim" bosilmagan kun endi avtomatik yopilmaydi.
  Bu kun uchun soat/pul hisoblanmaydi ("ketdim bosilmagan ⚠️"). Xodimga va adminga
  bildirishnoma keladi; admin ✎ bilan ketish vaqtini qo'lda kiritsa hisoblanadi.
- **Admin obed vaqtini tahrirlaydi:** davomat ✎ oynasida "Obeddan qaytgan vaqt" maydoni.
  14:00 dan kech bo'lsa ortiqcha ayriladi; 14:00 yoki bo'sh qoldirsa — kechirilgan.
- KPI bosqichlari kassirga ko'rinmaydi; kassir dizayner/sotuv menejerlarini ko'radi.

MUHIM: Supabase'da `supabase-update-21-22.sql` ni Run qiling (21 va 22 birlashtirilgan).

## 23-yangilanish (v52) — GEMINI AI ASSISTENT

Assistent endi haqiqiy AI (Google Gemini) bilan ishlaydi. Kalit brauzerga bormaydi —
Railway'dagi `server.js` orqali. Faqat rahbar/direktor/admin so'ray oladi.
AI ga dasturning barcha ma'lumotlari (xodimlar, KPI, davomat, vazifalar, savdo, snabjeniya,
sklad, sotuv KPI — joriy + 2 oldingi oy) yuboriladi; u faqat shu ma'lumot asosida javob
beradi, sohaning mutaxassisi sifatida tahlil va maslahat beradi. AI ulanmagan bo'lsa —
avvalgi mahalliy hisoblovchi ishlayveradi.

SOZLASH: Railway → Variables → GEMINI_API_KEY = (Google AI Studio'dan olingan kalit).
Ixtiyoriy: GEMINI_MODEL (sukut gemini-2.5-flash). package.json va server.js ni yuklang.

## 24-yangilanish (v60) — KOD MODULLARGA BO'LINDI

Bitta 5000 qatorli index.html → 21 ta js fayl + css/app.css + kichik index.html.
KOD MANTIQI O'ZGARMADI — monolit bilan solishtirildi: 15 sahifa HTML'i belgima-belgi
bir xil, barcha hisoblar bir xil. Bazaga tegilmadi, ma'lumotlar o'z joyida.

Tuzilma:
  index.html      — skelet (100 qator)
  css/app.css     — barcha uslublar
  js/01-config.js — Supabase sozlamasi, sana/arxiv
  js/02-data.js   — demo ma'lumot, saqlash, holat
  js/03-helpers.js, 04-notify.js, 05-calc.js, 06-ui-core.js, 07-nav-render.js
  js/08-assistant.js, 09-orders.js, 10-sales.js, 11-design.js, 12-snab.js
  js/13-stock.js, 14-piece.js, 15-rating-payroll.js, 16-me-employees.js
  js/17-tasks.js, 18-attendance.js, 19-finebonus.js, 20-modals.js, 21-boot.js
  server.js, sw.js — mos yangilangan (js/css keshlanadi, no-cache)

YUKLASH: GitHub'ga BUTUN zip mazmunini yuklang (js/ va css/ papkalari bilan).
Eski index.html ni avval zaxira qilib qo'ying. Keyin hamma Ctrl+Shift+R.
KEYINGI YANGILANISHLARDA: faqat o'zgargan js fayl yuklanadi.

## 25-yangilanish (v61) — AUDIT TUZATISHLARI (4 bosqich)

1-BOSQICH (mantiq):
 (3) "Bugun" yarim tunda eskirmaydi — sana o'zgarsa ilova o'zi yangilanadi
 (5) Vazifa "muddatida" — xodim TOPSHIRGAN sana bo'yicha (boshliq kech tasdiqlasa jazolanmaydi)
 (7) Yakshanba soat ikki marta hisoblanmaydi — faqat tasdiqlangan qo'shimcha vaqt
 (9) Keldim/Ketdim ikki marta bosilmaydi (4s qulf + tekshiruv)
 (10) GPS: 12s aniq + 8s tarmoq urinishi (bino ichida ishlaydi)
2-BOSQICH (xavfsizlik):
 (1) MAOSH BAZA DARAJASIDA yopildi — boshliq/xodim brauzer orqali ham ko'ra olmaydi
 (13) Xodim o'z davomatida jarima/kechirish/tasdiq maydonlarini o'zgartira olmaydi (trigger)
3-BOSQICH (hisob):
 (2) OYNI YOPISH — admin "🔒 oyini yopish" bosadi, raqamlar muzlatiladi; keyin oylik/jarima
     narxi o'zgarsa ham arxiv o'zgarmaydi. "↩ Qayta ochish" bor.
 (4) Reyting (server) va KPI (brauzer) endi BIR XIL mantiq (oy bo'yicha, ruxsatlar, ko'p mas'ul)
 (6) KPI vazifalari ham davomat kabi OY bo'yicha
4-BOSQICH (barqarorlik):
 (8) Realtime nishonli — faqat o'zgargan jadval yuklanadi (12 so'rov → 1)
 (14) Bitta jadval xato bersa qolgani ishlaydi, admin xatoni ko'radi
 (15) Sessiya tugasa login ekraniga qaytadi

MUHIM: Supabase'da `supabase-update-24-26.sql` ni Run qiling.
O'ZGARGAN FAYLLAR: js/01-config.js, 05-calc.js, 15-rating-payroll.js, 17-tasks.js, 18-attendance.js, 21-boot.js, sw.js
