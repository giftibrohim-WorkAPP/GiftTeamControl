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
