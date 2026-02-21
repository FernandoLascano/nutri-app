-- Admin: solo usuarios en esta tabla pueden gestionar invitaciones.
create table if not exists public.app_admin (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.app_admin enable row level security;

-- Solo el propio usuario puede ver si está en app_admin (para saber si es admin).
drop policy if exists "Users can check if admin" on public.app_admin;
create policy "Users can check if admin" on public.app_admin
  for select using (auth.uid() = user_id);

-- Insert manual: agregá tu user_id como admin (desde Supabase > Authentication > Users, copiá el UUID).
-- insert into public.app_admin (user_id) values ('TU_USER_ID_AQUI');

-- Solicitudes de invitación (cualquiera puede pedir).
create table if not exists public.invitation_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references auth.users(id)
);

alter table public.invitation_requests enable row level security;

-- Anónimos pueden insertar (pedir invitación).
drop policy if exists "Anon can request invite" on public.invitation_requests;
create policy "Anon can request invite" on public.invitation_requests
  for insert with check (true);

-- Solo admins pueden ver y actualizar solicitudes.
drop policy if exists "Admin can manage requests" on public.invitation_requests;
create policy "Admin can manage requests" on public.invitation_requests
  for all using (
    exists (select 1 from public.app_admin where user_id = auth.uid())
  ) with check (
    exists (select 1 from public.app_admin where user_id = auth.uid())
  );

-- Invitaciones enviadas (link con token).
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

alter table public.invitations enable row level security;

-- Solo admins pueden ver e insertar invitaciones.
drop policy if exists "Admin can manage invitations" on public.invitations;
create policy "Admin can manage invitations" on public.invitations
  for all using (
    exists (select 1 from public.app_admin where user_id = auth.uid())
  ) with check (
    exists (select 1 from public.app_admin where user_id = auth.uid())
  );

-- Usuario autenticado puede marcar como usada solo la fila con su email (al completar registro).
drop policy if exists "User can mark own invite used" on public.invitations;
create policy "User can mark own invite used" on public.invitations
  for update
  using (email = (auth.jwt() ->> 'email'))
  with check (email = (auth.jwt() ->> 'email'));

-- RPC: devuelve email y si es válida la invitación (solo por token, sin filtrar por RLS).
create or replace function public.get_invite_for_token(t uuid)
returns table(email text, valid boolean)
language sql
security definer
set search_path = public
as $$
  select i.email, true
  from public.invitations i
  where i.token = t and i.used_at is null and i.expires_at > now();
$$;

grant execute on function public.get_invite_for_token(uuid) to anon;
grant execute on function public.get_invite_for_token(uuid) to authenticated;

-- RPC: indica si el usuario actual es admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.app_admin where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to authenticated;
