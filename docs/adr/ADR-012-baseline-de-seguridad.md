# ADR-012: Baseline de seguridad antes de construir funcionalidades

Estado: **aceptado** (confirmado por el propietario, 2026-11-12) · propuesto el 2026-11-12 · Origen: verificación contra el código (doc 09 §4)

## Contexto
El escaneo del fuente encontró fallas que no dependen de Perú ni de la sede única y que se heredarían tal cual: cuentas desactivadas que pueden iniciar sesión y sesiones que sobreviven a la desactivación, ausencia de límite de intentos de login, API key de kiosco en claro y sin rotación, permisos aplicados solo en algunas capas, y secretos/credenciales de demostración versionados.

## Factores de decisión
*Sección añadida en el pase formal F (2026-11-12, autorizado por el propietario). Derivada del texto del ADR y de los docs 09/11; no cambia la decisión ni el estado.*
- Fallas verificadas en el fuente (doc 09 §4, doc 11 DI-10/34/35/39/40) que no dependen de Perú ni de la sede única.
- No construir funcionalidades encima de huecos conocidos.
- Costo: +3 a 5 días en la Fase 0 (doc 09 §6).

## Decisión
Antes de las funcionalidades de Fase 1, se ejecuta una **Fase 0.5** con estos criterios de aceptación, cada uno con test:
1. `IniciarSesion` y `ValidarSesion` rechazan `activo = false`; desactivar un usuario **invalida todas** sus sesiones (nuevo método de repositorio).
2. **Límite de intentos** de login por email+IP (p. ej. 5 en 15 min, ventana deslizante; backoff y registro de auditoría). La tabla puede ser de BD (una instancia) y se documenta cómo moverla a Redis si se escala.
3. **Rotación de la API key del kiosco** (caso de uso `RotarApiKeyKiosco`, permiso de SOCIO) y almacenamiento **hasheado**; la clave se muestra una sola vez.
4. **Autorización en el caso de uso**, no solo en la UI: todo caso de uso que cambia o lista datos recibe el actor y verifica `tienePermiso`. Hoy **no** lo hacen `CrearMiembro`, `ActualizarMiembro` (editar, baja, reactivar, foto), `CrearPlan`, `ActualizarPlan`, `ListarMiembros`, `ListarPagos`, `ObtenerUltimoCierrePorSucursal` ni `RegistrarTasaManual`, y las rutas `api/miembros`, `api/planes`, `api/pagos` (GET), `api/caja/ultimo-cierre` y `api/foto-proxy` solo comprueban sesión (doc 11, DI-10/34/35). Test de contrato que recorre las rutas `app/api/**` y las server actions y falla si alguna no declara permiso.
5. Validar con esquema (p. ej. `zod`) el cuerpo de toda ruta, incluidos ids que hoy se aceptan sin comprobar.
6. Seed de demostración **sin** contraseñas fijas: contraseña aleatoria impresa una vez o variable de entorno.
7. `.env.example`, escaneo de secretos (gitleaks) y retiro de `cookies.txt`, `debug.keystore` y credenciales del árbol copiado.
8. Cabeceras: `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, HSTS en el subdominio; `noindex`.
9. Ningún script de mantenimiento destructivo se copia al repo nuevo (en el base, `limpiarMiembros.ts` ejecuta `deleteMany({})` sin where ni confirmación, doc 11 H-03). Los que se creen exigen `--confirm`, comprueban que `DATABASE_URL` no sea de producción y registran lo que hicieron.
10. CORS: acotar `Access-Control-Allow-Origin` al origen del kiosco cuando sea una PWA en el mismo dominio; si debe seguir siendo `*` (APK), exigir la API key rotable del punto 3.

## Alternativas
- Dejar los arreglos para "endurecimiento" en Fase 2 → se construirían features encima de huecos conocidos.

## Consecuencias
- (+) El sistema sale a producción sin vulnerabilidades heredadas conocidas; (−) +3 a 5 días en Fase 0.

## Cómo se valida
*(Pase formal F.)* Cada criterio 1-10 de la Decisión indica su test (ya en el texto).
- **Spec:** S-01.
- **Invariante a fijar:** toda ruta `app/api/**` y toda server action declara permiso (test de contrato, ADR-016 §3).

## Reversibilidad
*(Pase formal F.)* Alta para reglas y tests; baja para datos (la API key pasa a almacenarse con hash).

## Dependencias
*(Pase formal F.)* ADR-005 (secretos), ADR-007 (scripts), ADR-009 (CORS del kiosco), ADR-002 (API key), ADR-003 (`RegistrarTasaManual`), ADR-016 (contrato de permisos). Hallazgos abiertos de la revisión G3: ver `REVISION-ADR.md` §4, §7 y §8.4.
