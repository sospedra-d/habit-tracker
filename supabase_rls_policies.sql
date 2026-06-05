-- ============================================================================
-- RLS para las tablas que faltaban (auditoría de seguridad — Bug 1)
-- Tablas: habits, habit_logs, todos, goals, milestones
-- (focus_sessions y daily_reflections ya tienen RLS en sus propias migraciones)
--
-- Pégalo entero en:  Supabase → SQL Editor → New query → Run
-- Es idempotente: usa DROP POLICY IF EXISTS antes de cada CREATE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) HABITS  (tiene columna user_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habits_select_own" ON public.habits;
CREATE POLICY "habits_select_own" ON public.habits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_insert_own" ON public.habits;
CREATE POLICY "habits_insert_own" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_update_own" ON public.habits;
CREATE POLICY "habits_update_own" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "habits_delete_own" ON public.habits;
CREATE POLICY "habits_delete_own" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2) HABIT_LOGS  (NO tiene user_id → se valida por el hábito padre)
-- ---------------------------------------------------------------------------
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habit_logs_select_own" ON public.habit_logs;
CREATE POLICY "habit_logs_select_own" ON public.habit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.habits h
            WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs;
CREATE POLICY "habit_logs_insert_own" ON public.habit_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.habits h
            WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "habit_logs_update_own" ON public.habit_logs;
CREATE POLICY "habit_logs_update_own" ON public.habit_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.habits h
            WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.habits h
            WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "habit_logs_delete_own" ON public.habit_logs;
CREATE POLICY "habit_logs_delete_own" ON public.habit_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.habits h
            WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3) TODOS  (tiene columna user_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "todos_select_own" ON public.todos;
CREATE POLICY "todos_select_own" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "todos_insert_own" ON public.todos;
CREATE POLICY "todos_insert_own" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "todos_update_own" ON public.todos;
CREATE POLICY "todos_update_own" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "todos_delete_own" ON public.todos;
CREATE POLICY "todos_delete_own" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) GOALS  (tiene columna user_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
CREATE POLICY "goals_insert_own" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
CREATE POLICY "goals_update_own" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_delete_own" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5) MILESTONES  (tiene columna user_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestones_select_own" ON public.milestones;
CREATE POLICY "milestones_select_own" ON public.milestones
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "milestones_insert_own" ON public.milestones;
CREATE POLICY "milestones_insert_own" ON public.milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "milestones_update_own" ON public.milestones;
CREATE POLICY "milestones_update_own" ON public.milestones
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "milestones_delete_own" ON public.milestones;
CREATE POLICY "milestones_delete_own" ON public.milestones
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN — debe mostrar rowsecurity = true en las 5 tablas
-- ---------------------------------------------------------------------------
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('habits','habit_logs','todos','goals','milestones');
