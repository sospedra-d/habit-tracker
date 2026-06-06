# 04 · Mejoras de código del flujo de creación

> Bugs y refactors **acotados al flujo de crear/guardar un hábito**. La auditoría general
> de la app está en [`known_bugs.md`](../known_bugs.md); aquí solo lo que afecta a crear hábitos.

---

## M14 — Bug: `target_count` queda en 0 si vacías el campo · ✅ Implementado (2026-06-06)

**Severidad:** 🟠 Bug real de datos.

**Dónde:** [`HabitFormModal.jsx:78`](../src/components/HabitFormModal.jsx#L78)
```js
target_count: isCounter ? Number(targetCount) : 1,
```
El input de objetivo ([`HabitFormModal.jsx:163-167`](../src/components/HabitFormModal.jsx#L163)) guarda el valor como **string**. Si el usuario borra el campo, `targetCount === ''` → `Number('') === 0`.

**Consecuencia:** se crea un hábito de contador con objetivo **0**. En `getHabitProgress`, `Math.min(currentCount / target, 1)` con `target = 0` da `Infinity`/`NaN` → el hábito puede contar como **completado con 0 repeticiones**, corrompiendo % diario, rachas y retos.

**Fix:**
```js
const safeTarget = Math.max(1, Math.floor(Number(targetCount)) || 1)
target_count: isCounter ? safeTarget : 1,
```
(Va de la mano de [M4](01-friccion-cero-al-crear.md#m4): bloquear el submit si el objetivo no es válido.)

**Esfuerzo:** Muy bajo.

---

## M15 — Bug: colores de categoría duplicados · ✅ Implementado (2026-06-06)

**Severidad:** 🟡 Visual / UX.

> **Hallazgo al implementar:** `CATEGORY_COLORS` estaba **importado pero sin usar** en
> [`Habits.jsx`](../src/pages/Habits.jsx) — las tarjetas se coloreaban por núcleo/extra
> (rojo/azul), no por categoría. Cambiar solo las constantes habría sido un *no-op* invisible.
> Por eso el fix hace **dos cosas**: (1) 5 colores distintos y (2) **cablearlos** como un
> punto identificativo junto al nombre de cada tarjeta de categoría. Así `CATEGORY_COLORS`
> deja de ser código muerto y las categorías por fin se distinguen de un vistazo, sin perder
> la señal núcleo/extra/oro de la barra de progreso.

**Dónde:** [`HabitFormModal.jsx:12-18`](../src/components/HabitFormModal.jsx#L12)
```js
const CATEGORY_COLORS = {
  'Salud': '#a1a1aa',          // gris
  'Productividad': '#3b7ef8',  // azul
  'Ejercicio': '#a1a1aa',      // ← mismo gris que Salud
  'Estudios': '#3b7ef8',       // ← mismo azul que Productividad
  'Otro': '#52525b',
}
```
**Salud y Ejercicio** comparten color, y **Productividad y Estudios** también. Como las tarjetas de categoría en [`Habits.jsx`](../src/pages/Habits.jsx) se distinguen sobre todo por color, dos pares de categorías son visualmente ambiguos.

**Fix:** asignar 5 colores distintos (hay paleta de sobra; en [`Goals.jsx:6`](../src/pages/Goals.jsx#L6) ya se usa `['#3b7ef8','#0d9488','#c9963a','#22c55e','#a855f7','#f97316']`). Encaja con [M3](01-friccion-cero-al-crear.md#m3) (iconos) para reforzar la identidad visual del hábito.

**Esfuerzo:** Muy bajo.

---

## M16 — Detección de hábito duplicado

**Qué:** avisar (no bloquear) si ya existe un hábito activo con el mismo nombre antes de crear otro.

**Dónde:** `handleSave` en [`Habits.jsx:153`](../src/pages/Habits.jsx#L153). El array `habits` ya está en memoria; basta comparar `name` normalizado antes del `insert` ([`Habits.jsx:179`](../src/pages/Habits.jsx#L179)).

**Por qué:** evita listas con "Leer", "leer", "Leer 📖" repetidos que fragmentan rachas e historial y ensucian las estadísticas que motivan al usuario.

**Esfuerzo:** Bajo.

---

## M17 — Guardado optimista + error visible al crear

**Qué:** dos cosas en `handleSave` ([`Habits.jsx:153-187`](../src/pages/Habits.jsx#L153)):
1. **Feedback de error real:** hoy un fallo de `insert` se captura y se hace `alert(...)`. Está bien que avise, pero el modal **ya se cerró** (en `HabitFormModal.handleSubmit` se llama `onClose()` justo después de `onSave`, [`HabitFormModal.jsx:86`](../src/components/HabitFormModal.jsx#L86)), así que el usuario pierde lo que escribió si falla. Conviene no cerrar el modal hasta confirmar éxito.
2. **Optimismo:** tras guardar se hace `await fetchData()` (refetch completo de hábitos + logs + retos). Para crear, basta con añadir el hábito devuelto al estado local y refrescar en segundo plano. Hace que crear se sienta instantáneo.

**Por qué:** un guardado lento o que "se traga" el trabajo del usuario al fallar es justo la peor experiencia en el momento de crear. Refuerza la fricción que [M1–M4](01-friccion-cero-al-crear.md) intentan eliminar.

**Cómo:**
- Devolver el resultado de `insert(...).select()` y hacer `setHabits(prev => [...prev, nuevo])`.
- Cambiar el contrato `onSave` para que `HabitFormModal` cierre solo si `onSave` resuelve sin error (devolver un booleano o lanzar excepción).

**Esfuerzo:** Medio.

---

## Nota de seguridad (enlace, no se duplica)

El `insert` de creación **sí** añade `user_id` ([`Habits.jsx:158`](../src/pages/Habits.jsx#L158)), pero muchas **lecturas** de hábitos no filtran por `user_id`. Eso es el **Crítico 1** de [`known_bugs.md`](../known_bugs.md#-crítico-1--aislamiento-de-datos-entre-usuarios-roto) y afecta a la integridad de todo lo que se construya encima de estas mejoras (plantillas, recordatorios, XP…). Recomendado resolverlo (RLS + `.eq('user_id', …)`) antes de invertir en las mejoras grandes.
