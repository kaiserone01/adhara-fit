# ADR-005: Estrategia de repositorio, licencia y limpieza de datos

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-11 · P-01 resuelto: el repo es propio (12-nov-2026)

## Contexto
`kaiserone01/gym-app` es **público**, **sin archivo de licencia** y con 732 commits. Contiene: `cookies.txt` versionado; `handoff.md` (273 KB) con nombres y cédulas de personas reales de otro gimnasio; un log JSON de migración de vencimientos; scripts específicos del cliente anterior; credenciales expuestas en chat, según su propio handoff, pendientes de rotar. Su `CLAUDE.md` exige commits en español, de una línea y sin firmas de IA.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- El Repo A es público, sin licencia, con 732 commits que incluyen PII de personas reales y credenciales (doc 11 DI-88).
- Titularidad confirmada: el repo es propio; el tema pasa a ser de higiene.
- Evitar arrastrar historial y secretos.

## Decisión
1. **Titularidad confirmada:** el repo es propio. Se añade aviso de copyright/licencia privativa al repo nuevo. Crear un repo nuevo sin historial deja de ser un tema legal y pasa a ser de higiene (PII y credenciales en el historial).
2. **Repo nuevo y privado** `adhara-fit`, creado como **copia del árbol de trabajo** del commit `b4352a0`, **sin historial**, no como fork. Esto evita arrastrar PII y credenciales históricas.
3. **Lista de exclusión** al copiar (ver tarea 0.3 del plan): `cookies.txt`, `handoff.md`, `packages/db/reset-vencimientos-log-*.json`, `.windsurf/`, `.agents/`, `skills-lock.json`, `docs/xls/`, `packages/db/migracion-excel/`, scripts `zip-gym`, los dos `debug.keystore` (`apps/kiosk-tv/capacitor/android/app/` y `apps/vitrina-tv/capacitor/android/app/`), y todas las migraciones (se rehace baseline). **Todos** los scripts de mantenimiento de `packages/db` salvo schema, seed (reescrito) y migraciones (`limpiarMiembros.ts` borra todo sin confirmación; `limpiarCajaPrueba.ts` está roto). Revisar `.github/workflows` (APK) y el seed de demostración (`admin1234`, `entrenador1234`).
4. Escaneo de secretos (gitleaks) en pre-commit y CI.
5. Credenciales **nuevas** para todo (BD, R2, API keys, sesiones); ninguna del base.
6. **Se mantienen** las reglas de `CLAUDE.md`: commits en español, una línea, sin firmas; cierre de sesión con `handoff.md` (nuevo, estructura de 5 secciones, **sin datos personales**).
7. No seguir el upstream por merges automáticos (divergencia esperada). Si interesa algún fix, se porta a mano con referencia al commit.
8. Renombrado de paquetes `@gym-app/*` → posponer (P-14).

## Alternativas
- **Fork público:** arrastra historial con PII y la ausencia de licencia.
- **Fork privado con historial:** conserva PII en el historial.
- **Submódulo/dependencia:** inviable, es una aplicación, no una librería.

## Consecuencias
- (+) Repo limpio y legalmente trazable.
- (−) Se pierde `git blame` histórico (aceptable; el ADR-001 del origen y los docs preservan el porqué).
- (+) Como el repo original es propio y **público**, se puede hacerlo privado o depurar su historial para retirar la PII de personas reales expuesta: recomendado y urgente.

## Cómo se valida
*(Pase formal F.)*
- **Spec:** S-00.
- **Invariantes a fijar:** ningún archivo de la lista de exclusión (§3) existe en el repo (CI y escaneo de secretos); `.env.example` no contiene secretos.

## Reversibilidad
*(Pase formal F.)* Media: la lista de exclusión se revierte archivo a archivo, pero la historia no copiada (`git blame`) no se recupera.

## Dependencias
*(Pase formal F.)* ADR-001. ADR-014 aclara su §6. Se solapa con ADR-007 y ADR-012 (scripts y secretos). ADR-017 condiciona la decisión de gitleaks (§4). Hallazgos abiertos de la revisión G3 (C1, C3, C4, C5): ver `REVISION-ADR.md` §4, §7 y §8.4.
