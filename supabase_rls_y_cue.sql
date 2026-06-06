-- ============================================================================
-- Migración Habit Tracker — 2026-06-06
--   PARTE 1 · M5: columna "cue" (detonante) en habits
--   PARTE 2 · RLS (Row Level Security): aislamiento de datos por usuario (Crítico 1)
--
-- Seguro de ejecutar: es ADITIVO e IDEMPOTENTE (se puede correr varias veces sin
-- error y sin borrar datos). Pégalo entero en Supabase → SQL Editor → Run.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 1 · M5 — columna "cue" (el "detonante" / cuándo haré el hábito)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.habits add column if not exists cue text;


-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 2 · RLS — cada usuario solo puede ver/crear/editar/borrar SUS filas.
--
-- Al activar RLS + estas policies, se cierra la fuga de datos entre usuarios
-- (Crítico 1 de known_bugs.md). Los datos existentes NO se borran: cada fila
-- sigue perteneciendo a su user_id y queda accesible solo para su dueño.
-- ─────────────────────────────────────────────────────────────────────────

-- ── habits ── (tiene user_id)
alter table public.habits enable row level security;
drop policy if exists "habits_own" on public.habits;
create policy "habits_own" on public.habits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── todos ── (tiene user_id)
alter table public.todos enable row level security;
drop policy if exists "todos_own" on public.todos;
create policy "todos_own" on public.todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── goals ── (tiene user_id)
alter table public.goals enable row level security;
drop policy if exists "goals_own" on public.goals;
create policy "goals_own" on public.goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── milestones ── (tiene user_id)
alter table public.milestones enable row level security;
drop policy if exists "milestones_own" on public.milestones;
create policy "milestones_own" on public.milestones
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── achievements ── (tiene user_id)
alter table public.achievements enable row level security;
drop policy if exists "achievements_own" on public.achievements;
create policy "achievements_own" on public.achievements
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── habit_logs ── (NO tiene user_id → se valida vía el hábito padre)
create index if not exists idx_habit_logs_habit_id on public.habit_logs(habit_id);
alter table public.habit_logs enable row level security;
drop policy if exists "habit_logs_own" on public.habit_logs;
create policy "habit_logs_own" on public.habit_logs
  for all
  using (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN (opcional). Ejecuta por separado para revisar el resultado:
--
--   -- 1) ¿Está la columna cue?
--   select column_name from information_schema.columns
--   where table_name = 'habits' and column_name = 'cue';
--
--   -- 2) ¿RLS activado en todas?
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--     and tablename in ('habits','habit_logs','todos','goals','milestones','achievements');
--
--   -- 3) ¿Hay filas con user_id NULL que quedarían ocultas? (debería dar 0)
--   select 'habits' t, count(*) from habits where user_id is null
--   union all select 'todos', count(*) from todos where user_id is null
--   union all select 'goals', count(*) from goals where user_id is null
--   union all select 'milestones', count(*) from milestones where user_id is null
--   union all select 'achievements', count(*) from achievements where user_id is null;
-- ─────────────────────────────────────────────────────────────────────────
