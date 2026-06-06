# 02 · Ciencia de la formación de hábitos

> Crear el hábito es el 10% del trabajo; el 90% es repetirlo hasta que se automatice.
> Estas tres mejoras están basadas en evidencia conocida de formación de hábitos
> (intención de implementación, señales/recordatorios, y "empezar ridículamente pequeño")
> y son las de mayor potencial de **innovación** para la app.

---

## M5 — "Detonante" / intención de implementación 🔥 · ✅ Implementado (2026-06-06)

> Columna `cue` añadida a `habits` (ver [`supabase_rls_y_cue.sql`](../supabase_rls_y_cue.sql)).
> Campo opcional "¿Cuándo lo harás?" en el formulario, persistido en `insert`/`update`
> ([`HabitFormModal.jsx`](../src/components/HabitFormModal.jsx), [`Habits.jsx`](../src/pages/Habits.jsx))
> y mostrado con 🕘 bajo el nombre en **Hoy** y en el detalle de categoría.

**Qué:** añadir un campo opcional al crear el hábito: **"¿Cuándo lo harás?"**, con el formato *"Después de [X], haré [hábito]"* o *"A las [hora], en [lugar]"*. Ej.: *"Después de desayunar, tomaré la pastilla"*. Se muestra como subtítulo del hábito en la lista de hoy.

**Por qué (objetivo):** las "intenciones de implementación" (anclar un hábito nuevo a una señal concreta de tiempo/lugar/acción previa) son una de las intervenciones con mayor efecto medido sobre la adherencia. Hoy el hábito no tiene ningún ancla: el usuario depende de acordarse "a secas". Esto ataca directamente el cuello de botella de **repetir**.

**Cómo:**
- Migración: `ALTER TABLE habits ADD COLUMN cue text;` (o `trigger_text`).
- Campo de texto opcional en [`HabitFormModal.jsx`](../src/components/HabitFormModal.jsx) (junto a Turno/Categoría).
- Persistir en `handleSave` ([`Habits.jsx:153`](../src/pages/Habits.jsx#L153)) y mostrar bajo `habit.name` en [`Today.jsx`](../src/pages/Today.jsx) y en la vista de categoría de [`Habits.jsx`](../src/pages/Habits.jsx).
- Sinergia con [M1](01-friccion-cero-al-crear.md#m1): las plantillas pueden sugerir un detonante por defecto.

**Migración BD:** Sí (1 columna `cue`).
**Impacto:** 🔥 Muy alto · **Esfuerzo:** Medio.

---

## M6 — Recordatorios / notificaciones 🔥

**Qué:** recordatorio opcional por hábito a una hora elegida ("Meditar — 08:00"). La app ya es PWA instalable.

**Por qué (objetivo):** un recordatorio es el disparador externo más potente para que un hábito **nuevo** llegue a repetirse las primeras semanas, antes de que se vuelva automático. Hoy **no existe ningún recordatorio**: si el usuario no abre la app por iniciativa propia, el hábito no ocurre.

**Estado actual del código (importante):**
- [`public/sw.js`](../public/sw.js) está **vacío**: `self.addEventListener('fetch', function(event) {});`. No hay soporte de notificaciones ni caché.
- [`public/manifest.json`](../public/manifest.json) no declara nada relativo a push.

**Cómo (dos niveles, elegir según ambición):**
- **Nivel 1 — Notificaciones locales mientras la PWA está instalada/abierta:** pedir permiso (`Notification.requestPermission()`), guardar `reminder_time` por hábito y programar avisos con la Notifications API + el service worker (`registration.showNotification`). Más simple, sin backend.
- **Nivel 2 — Push reales aunque la app esté cerrada:** requiere Web Push (VAPID) + una función servidor (Supabase Edge Function) que dispare a la hora. Más potente, más trabajo.
- Migración: `ALTER TABLE habits ADD COLUMN reminder_time time;` (+ tabla de suscripciones push si Nivel 2).
- Empezar por Nivel 1 ya aporta el 80% del valor.

**Migración BD:** Sí (`reminder_time`, + tabla si push real).
**Impacto:** 🔥 Muy alto · **Esfuerzo:** Alto.

---

## M7 — "Empieza pequeño" (meta mínima + escalado)

**Qué:** al crear un hábito de contador, sugerir arrancar con una **versión mínima** ("2 minutos", "1 vaso", "1 página") y, opcionalmente, un escalado automático ("+1 cada semana hasta tu objetivo").

**Por qué:** la causa nº1 de abandono de un hábito nuevo es ponerse una meta demasiado alta el día 1. "Empieza tan pequeño que no puedas decir que no" sube mucho la tasa de repetición inicial. Encaja con el campo `target_count` que ya existe.

**Cómo:**
- Versión simple (sin BD): un texto de ayuda + un botón "empezar pequeño" que fija `targetCount` a 1 en [`HabitFormModal.jsx`](../src/components/HabitFormModal.jsx).
- Versión completa (con BD): columnas `start_count` y `goal_count` + lógica de incremento semanal en la lectura de objetivo (`getHabitProgress` en [`Today.jsx:338`](../src/pages/Today.jsx#L338) y [`Habits.jsx:247`](../src/pages/Habits.jsx#L247)).

**Migración BD:** No (versión simple) / Sí (versión con escalado).
**Impacto:** Alto · **Esfuerzo:** Medio.

---

## M8 — Campo "Mi porqué" + recordarlo en la fricción

**Qué:** campo opcional al crear: *"¿Por qué este hábito es importante para ti?"*. Ese texto reaparece en los momentos de fricción (p. ej. cuando un hábito tiene la **✕ de racha rota** que ya pinta [`challenge.js`](../src/utils/challenge.js), o en el modal de reflexión nocturna).

**Por qué:** reconectar con la motivación personal en el momento de flaqueza reduce el abandono. La app ya tiene los puntos de fricción detectados (estado de fallo de reto, reflexión nocturna en [`NightReflectionModal.jsx`](../src/components/NightReflectionModal.jsx)); solo falta darles contenido motivacional propio del usuario.

**Cómo:**
- Migración: `ALTER TABLE habits ADD COLUMN motivation text;`
- Campo en el formulario; mostrarlo en un tooltip/línea cuando `status.showRedX` es true ([`Today.jsx:719`](../src/pages/Today.jsx#L719), [`Habits.jsx:406`](../src/pages/Habits.jsx#L406)).

**Migración BD:** Sí (1 columna `motivation`).
**Impacto:** Medio · **Esfuerzo:** Bajo.
