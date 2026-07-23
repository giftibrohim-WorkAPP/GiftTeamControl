-- =====================================================================
-- KPI PANEL — SUPABASE BACKEND (to'liq o'rnatish skripti)
-- Supabase Dashboard → SQL Editor → New query → shu faylni yopishtiring → Run
-- =====================================================================

-- ---------- 1. BO'LIMLAR ----------
create table if not exists public.departments (
  id    text primary key,
  name  text not null,
  color text not null
);

insert into public.departments (id, name, color) values
  ('it',   'IT bo''limi',    '#149E93'),
  ('mkt',  'Marketing',      '#4C82E0'),
  ('sale', 'Savdo bo''limi', '#C98F2B')
on conflict (id) do nothing;

-- ---------- 2. XODIMLAR PROFILI ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  name       text not null,
  role       text not null default 'xodim' check (role in ('admin','rahbar','boshliq','xodim')),
  dept       text references public.departments(id),
  pos        text not null default 'Xodim',
  salary     bigint not null default 0,
  color      text not null default '#149E93',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 3. VAZIFALAR ----------
create table if not exists public.tasks (
  id         bigint generated always as identity primary key,
  title      text not null,
  descr      text not null default '',
  emp        uuid not null references public.profiles(id),
  created_by uuid references public.profiles(id),
  due        date not null,
  status     text not null default 'new' check (status in ('new','progress','review','done')),
  done_at    date,
  created_at timestamptz not null default now()
);

-- ---------- 4. JARIMA / BONUS ----------
create table if not exists public.fine_bonus (
  id         bigint generated always as identity primary key,
  emp        uuid not null references public.profiles(id),
  type       text not null check (type in ('fine','bonus')),
  amount     bigint not null check (amount > 0),
  reason     text not null,
  date       date not null default current_date,
  created_by uuid references public.profiles(id)
);

-- ---------- 5. DAVOMAT (geolokatsiya bilan) ----------
create table if not exists public.attendance (
  id        bigint generated always as identity primary key,
  emp       uuid not null references public.profiles(id),
  date      date not null,
  check_in  time not null,
  check_out time,
  late      boolean not null default false,
  lat       double precision,
  lng       double precision,
  unique (emp, date)
);

-- ---------- 6. ROL ANIQLASH FUNKSIYALARI ----------
-- security definer: RLS ichida rekursiyaga tushmaslik uchun
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_dept() returns text
language sql stable security definer set search_path = public as
$$ select dept from public.profiles where id = auth.uid() $$;

create or replace function public.dept_of(u uuid) returns text
language sql stable security definer set search_path = public as
$$ select dept from public.profiles where id = u $$;

-- ---------- 7. YANGI FOYDALANUVCHI → PROFIL (trigger) ----------
-- Admin ilovadan xodim yaratganda metadata bilan signUp qilinadi,
-- profil avtomatik shu yerda ochiladi.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role, dept, pos, salary, color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'xodim'),
    nullif(new.raw_user_meta_data->>'dept', ''),
    coalesce(new.raw_user_meta_data->>'pos', 'Xodim'),
    coalesce((new.raw_user_meta_data->>'salary')::bigint, 0),
    coalesce(new.raw_user_meta_data->>'color', '#149E93')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 8. RLS (row level security) — ROLLARGA KO'RA KO'RINISH ----------
alter table public.departments enable row level security;
alter table public.profiles    enable row level security;
alter table public.tasks       enable row level security;
alter table public.fine_bonus  enable row level security;
alter table public.attendance  enable row level security;

-- Bo'limlar: hamma o'qiydi
drop policy if exists dep_read on public.departments;
create policy dep_read on public.departments for select to authenticated using (true);

-- Profiles: xodim faqat o'zini; boshliq — o'z bo'limi + o'zi; admin/rahbar — hammani
drop policy if exists prof_read on public.profiles;
create policy prof_read on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.my_role() in ('admin','rahbar')
  or (public.my_role() = 'boshliq' and dept = public.my_dept())
);
drop policy if exists prof_admin_write on public.profiles;
create policy prof_admin_write on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Tasks: ko'rish — o'ziniki / o'z bo'limi (boshliq) / hammasi (admin, rahbar)
drop policy if exists task_read on public.tasks;
create policy task_read on public.tasks for select to authenticated using (
  emp = auth.uid()
  or public.my_role() in ('admin','rahbar')
  or (public.my_role() = 'boshliq' and public.dept_of(emp) = public.my_dept())
);
-- Vazifa berish: admin, rahbar, boshliq
drop policy if exists task_insert on public.tasks;
create policy task_insert on public.tasks for insert to authenticated
  with check (public.my_role() in ('admin','rahbar','boshliq'));
-- Holat o'zgartirish: egasi (boshlash/tasdiqqa yuborish), boshlig'i (tasdiqlash), admin
drop policy if exists task_update on public.tasks;
create policy task_update on public.tasks for update to authenticated using (
  emp = auth.uid()
  or public.my_role() = 'admin'
  or (public.my_role() = 'boshliq' and public.dept_of(emp) = public.my_dept())
);

-- Fine/Bonus: yozish faqat admin; o'qish — o'ziniki / bo'limi / hammasi
drop policy if exists fb_read on public.fine_bonus;
create policy fb_read on public.fine_bonus for select to authenticated using (
  emp = auth.uid()
  or public.my_role() in ('admin','rahbar')
  or (public.my_role() = 'boshliq' and public.dept_of(emp) = public.my_dept())
);
drop policy if exists fb_admin_ins on public.fine_bonus;
create policy fb_admin_ins on public.fine_bonus for insert to authenticated
  with check (public.my_role() = 'admin');
drop policy if exists fb_admin_del on public.fine_bonus;
create policy fb_admin_del on public.fine_bonus for delete to authenticated
  using (public.my_role() = 'admin');

-- Davomat: xodim o'zinikini yozadi/yangilaydi; ko'rish rol doirasida
drop policy if exists att_read on public.attendance;
create policy att_read on public.attendance for select to authenticated using (
  emp = auth.uid()
  or public.my_role() in ('admin','rahbar')
  or (public.my_role() = 'boshliq' and public.dept_of(emp) = public.my_dept())
);
drop policy if exists att_ins on public.attendance;
create policy att_ins on public.attendance for insert to authenticated
  with check (emp = auth.uid() or public.my_role() = 'admin');
drop policy if exists att_upd on public.attendance;
create policy att_upd on public.attendance for update to authenticated
  using (emp = auth.uid() or public.my_role() = 'admin');

-- =====================================================================
-- 9. BIRINCHI ADMINNI YARATISH (bir marta, qo'lda):
--    1) Dashboard → Authentication → Users → "Add user":
--       email: admin@sizningkompaniya.uz, parol kiriting,
--       "Auto Confirm User" ni YOQING.
--    2) So'ng shu so'rovni bajaring (emailni o'zingiznikiga almashtiring):
--
--    update public.profiles set role = 'admin', name = 'Admin'
--    where email = 'admin@sizningkompaniya.uz';
--
-- 10. MUHIM SOZLAMA:
--    Authentication → Providers → Email → "Confirm email" ni O'CHIRING
--    (admin xodim yaratganda email tasdiqlashsiz darhol kirishi uchun).
-- =====================================================================
