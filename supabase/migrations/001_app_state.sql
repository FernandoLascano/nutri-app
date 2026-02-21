-- Tabla para guardar el estado de la app (un registro por ahora; luego se puede usar user_id con auth).
create table if not exists public.app_state (
  id text primary key default 'default',
  state jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Política para que el cliente anónimo pueda leer y escribir (app sin login por ahora).
alter table public.app_state enable row level security;

drop policy if exists "Allow anon read and write app_state" on public.app_state;
create policy "Allow anon read and write app_state" on public.app_state
  for all
  using (true)
  with check (true);

-- Fila inicial para poder hacer upsert.
insert into public.app_state (id, state, updated_at)
values ('default', '{}'::jsonb, now())
on conflict (id) do update set updated_at = now();
