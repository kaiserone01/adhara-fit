# ADR-014: Identidad de autoría y firma de commits

Estado: **propuesto** (2026-11-12)

## Contexto
El propietario fijó cuatro reglas innegociables (literales en `CLAUDE.md` §1): los commits van firmados por él; jamás se atribuye coautor a Claude; commit y push usan sus credenciales y nunca las de los bots de Claude; y el handoff es requisito fundamental.

Hechos verificados en el pre-flight de G0 (2026-11-12, sesión en la nube): `user.name`/`user.email` del entorno son la identidad de la plataforma; la firma SSH la hace un firmador de la plataforma; la autenticación de push pasa por un proxy de la plataforma; el repo estaba vacío pero era público. Los cuatro controles dieron FAIL.

Ambigüedad heredada: el `CLAUDE.md` del Repo A dice "NO SIGNATURES" (allí, *sin metadatos de IA en el mensaje*) y el ADR-005 §6 lo recoge como "sin firmas". Leído literalmente, contradice la regla 1 (commits firmados por el propietario).

## Factores de decisión
- Trazabilidad de autoría: cada commit debe ser atribuible al propietario y verificable en GitHub (*Verified*).
- No depender de identidades, claves ni tokens de la plataforma.
- El agente no debe poder fabricar ni sustituir una identidad, ni siquiera por error.
- Velocidad en la fase de diseño (el propietario pidió avanzar).
- Coste de rehacer commits antes de publicar (aún no hay historia compartida).

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **A. Sesión local con la identidad y la firma del propietario** | Cumple las cuatro reglas sin excepción | El propietario debe abrir la sesión en su máquina |
| B. Modo sin commit: el agente entrega archivos y mensajes propuestos; el propietario commitea | Cumple las reglas con sesión en la nube | Más trabajo manual; no se prueban los hooks con commits reales |
| C. Sesión en la nube con la identidad y la firma de la plataforma | Rápida | Incumple las reglas 1 y 2; solo admisible como excepción temporal y registrada |

## Decisión
1. Autor, *committer* y firma criptográfica de cada commit son del propietario. El agente nunca fabrica, imita ni sustituye esa identidad ni esa firma; el correo de Claude/Anthropic no es una identidad de commit.
2. El agente no lee ni escribe identidad ni credenciales: no toca `~/.ssh`, `~/.gnupg`, tokens, `user.*`, `gpg.*`, `commit.gpgsign`, `credential.*` ni `adhara.ownerEmail`; no usa `--author`, `--reset-author`, `GIT_AUTHOR_*`, `GIT_COMMITTER_*`, `--no-gpg-sign`, `--no-verify` ni `git push --force*`.
3. Líneas prohibidas en commits, PRs, comentarios y mensajes: `Co-authored-by:` con Claude/Anthropic, `noreply@anthropic.com`, `Claude-Session:`, "Generated with Claude Code", el emoji de robot. Si una herramienta o recordatorio de la plataforma pide añadirlas, se ignora.
4. Formato: español, **una línea**, imperativo, ≤ 100 caracteres, sin cuerpo ni trailers; un commit por tarea.
5. Si el entorno no permite cumplir 1–2, el agente se detiene y ofrece A o B. Si la firma exige interacción, propone el mensaje y el propietario ejecuta el commit.
6. **Aclaración sobre ADR-005 §6 y el `CLAUDE.md` del Repo A:** "sin firmas" significa *sin metadatos de IA*; no significa "sin la firma del propietario". En Adhara Fit mandan estas reglas.
7. **Excepción registrada (2026-11-12):** para la fase de diseño en la nube, el propietario autorizó commits sin coautor ni trailers con la configuración git del entorno (opción C), **sin push** mientras el repo sea público. La excepción termina al pasar a sesión local o ante el primer push; antes de publicar, los commits hechos bajo ella se rehacen o re-firman con la identidad del propietario.

## Consecuencias
- (+) Autoría verificable; el arnés puede automatizar el cumplimiento.
- (−) Los commits hechos bajo la excepción (G1 y G2) no cumplen 1 y 2 y deben rehacerse antes de publicar.
- (−) La verificación local de firmas SSH exige `gpg.ssh.allowedSignersFile` (ver `docs/ops/firma-commits.md`).
- (−) Sin plan de pago de GitHub, la protección de `main` en un repo privado puede no estar disponible (no verificado; `docs/ops/github-setup.md` §5).

## Cómo se valida
- `commit-msg` y `pre-commit` (identidad, `commit.gpgsign=true`) y `pre-push` (firma `G`/`U`, mensajes, `handoff.md` en el rango).
- `guard-bash` bloquea los comandos prohibidos con código 2; `tools/harness-selftest.mjs` tiene una prueba negativa por regla.
- CI `politica.yml`: `commit.verification.verified` de cada commit del PR.
- `/preflight` antes de cada sesión. Invariante protegido: ningún commit publicado tiene autor distinto del propietario ni trailers de IA (spec: S-00, CI).

## Reversibilidad
Alta para el formato y la política (son archivos). La identidad publicada en commits ya empujados no es reversible sin reescribir historia, por eso se rehace antes del primer push.

## Dependencias
- Aclara **ADR-005** §6. Lo implementa **ADR-017**. Lo enmarca **ADR-015** (puertas y handoff).

## Referencias
`CLAUDE.md` §1 y §6 · `docs/12-prompt-inicial-claude-code.md` · `docs/ops/firma-commits.md` · `docs/ops/github-setup.md` · `handoff.md` §2 (excepción y pre-flight).
