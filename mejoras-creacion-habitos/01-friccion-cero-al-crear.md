# 01 · Fricción cero al crear

> Cuanto más cuesta crear un hábito, menos hábitos se crean. El formulario actual
> ([`HabitFormModal.jsx`](../src/components/HabitFormModal.jsx)) parte de un campo de texto **vacío**:
> el usuario tiene que pensar el nombre, la categoría, los días, el turno… antes de tener nada.
> Estas mejoras reducen ese coste de minutos a segundos.

---

## M1 — Catálogo de hábitos sugeridos (plantillas) 🔥 · ✅ Implementado (2026-06-06)

> Implementado 100% en frontend en [`HabitFormModal.jsx`](../src/components/HabitFormModal.jsx):
> constante `HABIT_TEMPLATES`, función `applyTemplate()` y fila de chips sobre el campo de
> nombre (solo al crear, `!editingHabit`). Sin migración de BD. Pendiente opcional: fijar
> también el icono cuando se implemente [M3](#m3).

**Qué:** sobre el campo "Nombre del hábito" añadir una fila de chips/tarjetas con hábitos populares pre-configurados: `💧 Beber agua`, `🧘 Meditar`, `📖 Leer`, `🏃 Ejercicio`, `😴 Dormir 8h`, `🚶 10.000 pasos`, `🙏 Gratitud`, `📵 Sin móvil en la cama`… Al tocar uno, se rellena automáticamente nombre, categoría, icono, tipo (contador o sí/no) y un objetivo razonable. El usuario solo confirma.

**Por qué (objetivo):** el "problema de la página en blanco" es la principal fricción para **crear** el primer hábito. Una plantilla convierte la creación en un toque. Es, con diferencia, la mejora con más impacto directo sobre el objetivo principal.

**Cómo:**
- Nuevo array de plantillas en [`HabitFormModal.jsx`](../src/components/HabitFormModal.jsx) (o un `src/data/habitTemplates.js`): `{ name, emoji, category, is_counter, target_count, suggestedDays }`.
- Render encima del `<input>` de nombre (líneas ~110-118). `onClick` → setea los `useState` existentes (`setName`, `setCategory`, `setIsCounter`, `setTargetCount`…). No requiere lógica de guardado nueva.
- Mostrar solo al **crear** (`!editingHabit`).

**Migración BD:** No (salvo que se combine con M3, icono).
**Impacto:** 🔥 Muy alto · **Esfuerzo:** Medio.

---

## M2 — Presets de frecuencia

**Qué:** sobre el selector de días (los botones D-L-M-X-J-V-S, líneas ~242-263) añadir 4 botones rápidos: **Todos los días**, **Entre semana**, **Fines de semana**, **3× / semana** (L-X-V). Rellenan `selectedDays` de un toque.

**Por qué:** hoy hay que tocar día a día. Es la segunda micro-fricción del formulario. El 90% de los hábitos caen en uno de esos 4 patrones.

**Cómo:**
- En [`HabitFormModal.jsx`](../src/components/HabitFormModal.jsx), añadir una fila de botones que llamen a `setSelectedDays([...])` con el patrón. `D=0 … S=6` (coincide con `getDay()`).
- Resaltar el preset activo comparando con `selectedDays`.

**Migración BD:** No.
**Impacto:** Alto · **Esfuerzo:** Bajo.

---

## M3 — Icono / emoji por hábito

**Qué:** permitir asignar un emoji a cada hábito y mostrarlo en las listas ([`Today.jsx`](../src/pages/Today.jsx), [`Habits.jsx`](../src/pages/Habits.jsx)) junto al nombre.

**Por qué:** los hábitos hoy son solo texto + un color de categoría que, además, se repite entre categorías (ver [M15](04-mejoras-de-codigo.md#m15)). Un icono los hace **reconocibles de un vistazo** y refuerza la "identidad" del hábito ("soy alguien que 🏃"), un principio clave de la formación de hábitos. Encaja de forma natural con las plantillas de [M1](#m1).

**Cómo:**
- Migración: `ALTER TABLE habits ADD COLUMN icon text;`
- En el formulario, un pequeño selector de emojis (rejilla curada de ~24, no hace falta un picker completo).
- Persistir en `handleSave` ([`Habits.jsx:153`](../src/pages/Habits.jsx#L153)) y pintarlo donde se renderiza `habit.name`.

**Migración BD:** Sí (1 columna `icon`).
**Impacto:** Medio · **Esfuerzo:** Bajo–Medio.

---

## M4 — Validación robusta del formulario

**Qué:** reforzar la validación al crear/editar:
- **Nombre con longitud mínima/máxima** (evitar nombres de 1 carácter o de 200).
- **`targetCount` válido** cuando es contador (ver bug [M14](04-mejoras-de-codigo.md#m14)): nunca permitir 0, vacío ni `NaN`.
- **`challengeDays`** dentro de rango (2–365) antes de guardar, no solo por el atributo `min/max` del input (que es esquivable escribiendo).

**Por qué:** hoy se puede crear un hábito de contador con objetivo 0 (siempre "completado") o un reto de 0 días. Datos corruptos desde el origen ensucian rachas, retos y estadísticas — justo las métricas que motivan a repetir.

**Cómo:**
- En `handleSubmit` ([`HabitFormModal.jsx:71`](../src/components/HabitFormModal.jsx#L71)) ya hay un guard (`!name.trim() || selectedDays.length === 0`). Ampliarlo:
  ```js
  const target = isCounter ? Number(targetCount) : 1
  if (isCounter && (!Number.isFinite(target) || target < 1)) return  // o mostrar error
  const days = Number(challengeDays)
  if (challengeActive && (!Number.isFinite(days) || days < 2)) return
  ```
- Idealmente, mostrar el motivo bajo el campo (como ya se hace con "Selecciona al menos un día", línea ~260).

**Migración BD:** No.
**Impacto:** Medio · **Esfuerzo:** Bajo.
