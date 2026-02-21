-- Tabla de estado por usuario (solo usuarios autenticados).
-- Cada usuario tiene una fila; RLS garantiza que solo vea la suya.
create table if not exists public.app_state_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.app_state_users enable row level security;

drop policy if exists "Users can manage own app state" on public.app_state_users;
create policy "Users can manage own app state" on public.app_state_users
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- La tabla antigua app_state (id='default') queda para referencia; no la usamos con auth.
-- Los datos actuales del admin se migran al registrarse: la app sube desde localStorage.
