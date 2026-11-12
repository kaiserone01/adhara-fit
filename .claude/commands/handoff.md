---
description: Ejecuta el SESSION CLOSING & HANDOFF PROTOCOL (requisito fundamental)
---
Ejecuta el protocolo de cierre de `CLAUDE.md` §6.

1. Actualiza `handoff.md` con exactamente las 5 secciones. En la sección 4 **solo añades** entradas (fecha, qué se intentó, por qué falló, qué no repetir).
   Sin correos, tokens, rutas del home ni URLs/IDs de sesión. El ítem 1 de "Próximos pasos" es «leer handoff.md y ejecutar /preflight».
2. Ejecuta `node tools/check-handoff.mjs` y pega la salida. Corrige hasta que pase.
3. Commit propio, español, una línea, sin trailers (p. ej. "Actualiza el handoff al cierre de G2"), con la configuración git del entorno
   sin tocarla. Si el hook lo bloquea, repórtalo. Push solo si el pre-flight dio PASS.
4. En modo sin commit, entrega `handoff.md` como archivo y su texto en el chat.
5. Cierra con el resumen de 5 líneas: puerta actual, qué quedó aprobado, qué espera decisión, qué se intentó y falló, primer paso de la próxima sesión.
