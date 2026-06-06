# 🌱 Mejoras — Objetivo: creación (y arraigo) de nuevos hábitos

> Estudio del **Habit Tracker** centrado en su objetivo principal: que el usuario **cree hábitos nuevos y consiga mantenerlos**.
> Generado el **2026-06-06**. Stack: React 19 + Vite + Supabase + React Router 7 + Recharts (PWA).
> Estas son **propuestas enumeradas para revisar**, todavía **no implementadas**. Cada una indica qué, por qué, cómo, esfuerzo, impacto y si necesita migración de base de datos.

El objetivo "crear un hábito" tiene **dos cuellos de botella** distintos, y las mejoras atacan a ambos:

1. **Crear** el hábito (la fricción del formulario / la página en blanco).
2. **Repetirlo** hasta que se arraigue (el momento donde se abandona).

---

## 📁 Documentos

| Archivo | Tema | A qué cuello de botella ataca |
|---------|------|-------------------------------|
| [01-friccion-cero-al-crear.md](01-friccion-cero-al-crear.md) | Que crear un hábito cueste segundos, no minutos | **Crear** |
| [02-ciencia-de-formacion.md](02-ciencia-de-formacion.md) | Detonantes, recordatorios y "empezar pequeño" (innovación basada en evidencia) | **Repetir** |
| [03-incentivos-y-gamificacion.md](03-incentivos-y-gamificacion.md) | Incentivos reales para no abandonar el hábito nuevo | **Repetir** |
| [04-mejoras-de-codigo.md](04-mejoras-de-codigo.md) | Bugs y refactors del propio flujo de creación | **Crear** (robustez) |

---

## 📋 Índice maestro de mejoras

> **Estado (2026-06-06):** ✅ implementadas **M1**, **M5**, **M14** y **M15**.
> En Supabase: columna `cue` + RLS aplicados (ver [`supabase_rls_y_cue.sql`](../supabase_rls_y_cue.sql)).

| # | Mejora | Grupo | Impacto | Esfuerzo | Migración BD |
|---|--------|-------|---------|----------|--------------|
| **M1** ✅ | Catálogo de hábitos sugeridos (plantillas) | Fricción | 🔥 Muy alto | Medio | No |
| **M2** | Presets de frecuencia (Diario / Entre semana / Findes / 3×) | Fricción | Alto | Bajo | No |
| **M3** | Icono / emoji por hábito | Fricción | Medio | Bajo–Medio | Sí (1 col) |
| **M4** | Validación robusta del formulario | Fricción | Medio | Bajo | No |
| **M5** ✅ | "Detonante" / intención de implementación | Ciencia | 🔥 Muy alto | Medio | Sí (1 col) |
| **M6** | Recordatorios / notificaciones | Ciencia | 🔥 Muy alto | Alto | Sí (1 col) |
| **M7** | "Empieza pequeño" (meta mínima + escalado) | Ciencia | Alto | Medio | Sí (opc.) |
| **M8** | Campo "Mi porqué" + recordarlo en la fricción | Ciencia | Medio | Bajo | Sí (1 col) |
| **M9** | Hitos científicos automáticos (7/21/30/66 días) | Incentivos | Alto | Medio | No |
| **M10** | Comodín / congelar racha (streak freeze) | Incentivos | Alto | Medio | Sí (1 col) |
| **M11** | Onboarding "primera semana" del hábito nuevo | Incentivos | Alto | Bajo | No |
| **M12** | Nudge anti-abandono (hábito nuevo en riesgo) | Incentivos | Medio | Bajo | No |
| **M13** | XP / niveles persistentes | Incentivos | Medio | Alto | Sí (tabla) |
| **M14** ✅ | Bug: `target_count` queda en 0 si vacías el campo | Código | Alto (bug) | Muy bajo | No |
| **M15** ✅ | Bug: colores de categoría duplicados | Código | Medio | Muy bajo | No |
| **M16** | Detección de hábito duplicado | Código | Bajo | Bajo | No |
| **M17** | Guardado optimista + error visible al crear | Código | Medio | Medio | No |

---

## ⭐ Recomendación de secuencia

**Fase 1 — Quick wins (horas, sin tocar BD):** M14, M15, M2, M4, M11, M12.
Arreglan bugs reales del formulario y reducen fricción de inmediato.

**Fase 2 — El gran salto de producto (necesita 1 migración cada una):** M1 (plantillas) + M5 (detonante) + M6 (recordatorios).
Son las tres palancas que más mueven la aguja del objetivo principal. M1 ataca "crear", M5+M6 atacan "repetir".

**Fase 3 — Profundizar el arraigo:** M3, M7, M8, M9, M10. Después M13 si se quiere un sistema de progresión a largo plazo.

> Nota: este estudio es **independiente** de [`known_bugs.md`](../known_bugs.md) (auditoría general de 49 bugs). Aquí solo entran mejoras ligadas al objetivo "crear hábitos". Donde hay solape (p. ej. aislamiento por `user_id`), se enlaza en lugar de duplicar.
