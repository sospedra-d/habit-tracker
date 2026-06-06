# 03 · Incentivos y gamificación

> La app ya tiene buena base de gamificación: % Overdrive, racha de núcleo, retos de
> consistencia con días de gracia ([`challenge.js`](../src/utils/challenge.js)), mapa de calor y "Legado".
> Estas mejoras la orientan a lo que más importa para el objetivo: que un hábito **recién creado**
> sobreviva las primeras semanas críticas.

---

## M9 — Hitos científicos automáticos (7 / 21 / 30 / 66 días)

**Qué:** además del "Reto de Consistencia" que el usuario configura a mano, reconocer automáticamente para **todo** hábito los hitos de racha clásicos: **7 días** ("una semana"), **21**, **30** y **66** (la media de días que tarda un comportamiento en automatizarse según la investigación). Al alcanzarlos: micro-celebración + insignia en "Legado".

**Por qué:** da metas intermedias y una sensación de progreso a quien **no** activó un reto manual (la mayoría). Convierte cada hábito nuevo en una progresión con recompensas, sin que el usuario configure nada.

**Cómo:**
- La racha por hábito ya se sabe calcular (lógica de [`challenge.js`](../src/utils/challenge.js) y la racha de núcleo en [`Today.jsx:94-182`](../src/pages/Today.jsx#L94)). Reutilizar para detectar cruces de umbral.
- Insertar en `achievements` (tabla ya usada, ver [`Today.jsx:224`](../src/pages/Today.jsx#L224)) con un `type` nuevo, p. ej. `habit_milestone`, y pintarlo en "Legado" ([`Goals.jsx` LegacySection](../src/pages/Goals.jsx#L332)).

**Migración BD:** No (reutiliza `achievements`).
**Impacto:** Alto · **Esfuerzo:** Medio.

---

## M10 — Comodín / congelar racha (streak freeze)

**Qué:** un "comodín" que protege la racha global de núcleo (la que se muestra en [`Today.jsx:608`](../src/pages/Today.jsx#L608)) ante **un** día fallado. Se gana, por ejemplo, 1 cada 7 días de racha, hasta un máximo.

**Por qué:** el modelo que más retención genera (lo usa Duolingo) no es castigar el fallo, sino **amortiguarlo**. Hoy la racha global de núcleo se rompe de golpe al primer día perdido; eso desmotiva justo cuando un hábito aún es frágil. (El sistema de retos ya tiene "días de gracia" en [`challenge.js:5`](../src/utils/challenge.js#L5) — esto traslada esa misma idea, más visible y "ganable", a la racha principal.)

**Cómo:**
- Migración: contador `streak_freezes` por usuario (tabla `user_state` o columna en perfil).
- Al calcular la racha de núcleo ([`Today.jsx:114-175`](../src/pages/Today.jsx#L114)), permitir consumir un comodín cuando un día rompería la racha.
- UI: mostrar comodines disponibles junto al "🔥 N días seguidos".

**Migración BD:** Sí (1 columna/tabla de estado de usuario).
**Impacto:** Alto · **Esfuerzo:** Medio.

---

## M11 — Onboarding "primera semana" del hábito nuevo

**Qué:** mientras un hábito tiene menos de 7 días desde su `created_at`, marcarlo visualmente como **nuevo** y mostrar un micro-progreso de arranque: *"Día 3 de 7 para arrancar 💪"*.

**Por qué:** los primeros 7 días son donde más se abandona. Darles un objetivo propio, visible y a corto plazo aumenta la probabilidad de llegar a la segunda semana. No necesita BD: `created_at` ya existe.

**Cómo:**
- Calcular `daysSinceCreated = (hoy - created_at)` en [`Today.jsx`](../src/pages/Today.jsx) / [`Habits.jsx`](../src/pages/Habits.jsx).
- Si `< 7`, badge "Nuevo" + barra "día X/7" reutilizando el patrón visual de la barra dorada de retos ([`Today.jsx:730`](../src/pages/Today.jsx#L730)).

**Migración BD:** No.
**Impacto:** Alto · **Esfuerzo:** Bajo.

---

## M12 — Nudge anti-abandono (hábito nuevo en riesgo)

**Qué:** si un hábito creado hace poco (p. ej. < 21 días) **no se ha completado en sus últimos 2-3 días programados**, mostrar un aviso suave y empático en "Hoy": *"'Meditar' te está costando arrancar. ¿Lo hacemos más fácil?"* con accesos directos a reducir la meta ([M7](02-ciencia-de-formacion.md#m7)) o ajustar días.

**Por qué:** detectar el abandono **temprano** y reaccionar (en vez de dejar que el hábito muera en silencio) es lo que diferencia a un tracker pasivo de uno que de verdad ayuda a formar hábitos. Los datos para detectarlo (`habit_logs`, `days_of_week`, `created_at`) ya se cargan.

**Cómo:**
- Reutilizar los logs que ya trae [`Today.jsx`](../src/pages/Today.jsx) (`habitLogs` / `challengeLogs`) para calcular "días programados recientes sin completar".
- Render condicional de un banner en la parte superior de "Hoy".

**Migración BD:** No.
**Impacto:** Medio · **Esfuerzo:** Bajo.

---

## M13 — XP / niveles persistentes (largo plazo)

**Qué:** convertir el número de "productividad" diario (hoy efímero, se calcula y se pierde cada día en [`Today.jsx:471`](../src/pages/Today.jsx#L471)) en **XP acumulado** con niveles ("Nivel 4 · Constante"). Cada hábito completado suma XP permanente.

**Por qué:** la app tiene incentivos potentes **dentro del día** (el % Overdrive, las frases), pero pocos a **largo plazo** más allá del "Legado". Un nivel que solo sube da una razón para volver mañana y pasado, que es exactamente cuando un hábito nuevo necesita refuerzo.

**Cómo:**
- Migración: tabla `user_xp` o columna en perfil; sumar XP en cada `upsert` de `habit_logs` ([`Today.jsx:399-417`](../src/pages/Today.jsx#L399)).
- Curva de niveles simple (XP creciente por nivel) + barra de nivel en cabecera de "Hoy".
- Es la mejora de mayor esfuerzo del grupo; tiene sentido **después** de M9–M11.

**Migración BD:** Sí (tabla/columna de XP).
**Impacto:** Medio · **Esfuerzo:** Alto.
