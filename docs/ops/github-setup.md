# Configuración de GitHub — pasos para el propietario

Lista de acciones que **solo tú** puedes hacer (el agente no toca credenciales ni configuración de la cuenta).
Los nombres de menús de GitHub cambian: donde dice "no verificado" confírmalo en la interfaz.

## 0. Antes de cualquier push
- [ ] **Hacer el repo privado** (hoy es público; la documentación es interna).
  Settings → General → Danger Zone → *Change repository visibility* → Private.
- [ ] Decidir dónde se empuja: **sesión local** con tus credenciales (recomendado). Desde la nube el entorno firma y empuja con la plataforma,
  y el hook `pre-push` lo rechazará por firma no válida.
- [ ] Los 7+ commits hechos desde la nube con identidad de plataforma deben **rehacerse con tu identidad** (por ejemplo, en local, `git rebase` con
  re-firma de cada commit; `main` aún no existe, así que no hay historia compartida que proteger).

## 1. Identidad y firma local (ver `docs/ops/firma-commits.md`)
- [ ] `user.name` y `user.email` tuyos; `commit.gpgsign=true`; `gpg.format` y `user.signingkey` definidos.
- [ ] `gpg.ssh.allowedSignersFile` si firmas con SSH (necesario para que git verifique localmente).
- [ ] `git config adhara.ownerEmail <tu-correo>` y `bash scripts/setup-hooks.sh` en cada clon.
- [ ] Opcional: `export ADHARA_STRICT=1` para que `pre-commit` falle sin `adhara.ownerEmail`.

## 2. Clave de firma en GitHub
- [ ] Settings (de tu cuenta) → SSH and GPG keys → *New SSH key* → tipo **Signing Key** (misma clave pública que usas para firmar).
- [ ] Activa **Vigilant mode** (en la misma página: *Flag unsigned commits as unverified*). Así los commits sin firma tuya se ven *Unverified*.
- [ ] Comprueba en GitHub que un commit de prueba aparece **Verified**.

## 3. Crear `main`
- [ ] Desde tu clon local, con la historia ya firmada por ti: `git push -u origin <rama>:main` (el primer push crea `main`).
- [ ] Rama de trabajo por tema: `docs/<tema>`, `spec/S-xx-<slug>`, `chore/<tema>`. Nunca `claude/*`.

## 4. Protección de `main` (ruleset o branch protection)
Settings → Rules → Rulesets → *New branch ruleset* (o Branches → Branch protection rule). Objetivo: rama por defecto (`main`).
- [ ] Require a pull request before merging.
- [ ] Require status checks to pass: **`politica`** (job de `.github/workflows/politica.yml`). Requiere haber corrido al menos una vez.
- [ ] **Require signed commits**.
- [ ] Block force pushes y restringir borrado de la rama.
- [ ] Require review from Code Owners (`.github/CODEOWNERS` = `@kaiserone01`). Nota: eres el único autor, GitHub no deja aprobar tu propio PR;
  si lo activas, desmarca *Require approvals* o añade una segunda cuenta. Decisión tuya.
- [ ] Sin *bypass* para nadie (ni administradores) en lo posible.
- [ ] Método de merge: *squash* o *rebase*. Ojo: el *squash* lo firma GitHub (aparece *Verified*, pero el autor de la firma es GitHub); con *rebase*
  GitHub re-firma los commits. Elige según si quieres conservar tu firma individual; no verificado cómo queda `%G?` localmente tras cada método.

## 5. Plan requerido (no verificado: confirmar en la página de planes de GitHub)
- Reglas/protección de ramas en **repos privados** suelen requerir un plan de pago (Pro, Team o Enterprise); en el plan gratuito solo aplican a repos públicos.
- GitHub Actions en repos privados consume minutos incluidos según el plan; `politica.yml` es corto (< 10 min por PR).
- Si no quieres pagar el plan: alternativa es mantener la protección **local** (hooks `pre-push`) y no depender del servidor, asumiendo que el repo privado queda sin
  protección en servidor. Decisión tuya; queda como pregunta abierta para ADR-017.

## 6. Si GitHub rechaza `.github/workflows/`
Algunas credenciales (tokens sin permiso `workflow`, bots) no pueden crear o cambiar archivos bajo `.github/workflows/`. Si el push falla por eso,
sube `.github/workflows/politica.yml` tú mismo con tus credenciales.

## 7. Verificación final
- [ ] Abre un PR de prueba: el check `politica` debe correr y pasar; un commit sin firma tuya o con un trailer debe hacerlo fallar.
- [ ] `node tools/harness-selftest.mjs` en verde en tu máquina.
