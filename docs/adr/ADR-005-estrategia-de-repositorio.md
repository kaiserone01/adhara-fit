# ADR-005: Estrategia de repositorio, licencia y limpieza de datos

Estado: **propuesto** (2026-11-11) · P-01 resuelto: el repo es propio (12-nov-2026)

## Contexto
`kaiserone01/gym-app` es **público**, **sin archivo de licencia** y con 732 commits. Contiene: `cookies.txt` versionado; `handoff.md` (273 KB) con nombres y cédulas de personas reales de otro gimnasio; un log JSON de migración de vencimientos; scripts específicos del cliente anterior; credenciales expuestas en chat, según su propio handoff, pendientes de rotar. Su `CLAUDE.md` exige commits en español, de una línea y sin firmas de IA.

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
