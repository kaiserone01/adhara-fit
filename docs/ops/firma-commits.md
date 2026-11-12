# Firma de commits y verificación local

Documento operativo para el **propietario**. El agente no configura nada de esto (CLAUDE.md §1).

## Qué exige el arnés
- `commit.gpgsign=true` (lo verifica `pre-commit`).
- `adhara.ownerEmail` = el correo del propietario (lo defines tú; con él, `pre-commit` y `pre-push` verifican que autor y *committer* sean tuyos).
  Sin él, el arnés avisa y sigue en **modo relajado**; con `ADHARA_STRICT=1` falla.
- `core.hooksPath=.githooks`: `bash scripts/setup-hooks.sh` en cada clon (no se versiona).

## Firma SSH (la más simple)
```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/<tu-clave>.pub
git config --global commit.gpgsign true
```
Sube la **misma** clave pública a GitHub como *Signing Key* (Settings → SSH and GPG keys → New SSH key → tipo *Signing Key*).

## Verificación local con SSH (`%G?`)
Git solo puede verificar firmas SSH si conoce las claves permitidas. `pre-push` lee `%G?` y acepta `G` (válida) y `U` (válida, confianza desconocida).
Sin `gpg.ssh.allowedSignersFile`, `git log --show-signature` no puede verificar y `%G?` no será `G`/`U`.
```bash
mkdir -p ~/.config/git
echo "<tu-correo> $(cat ~/.ssh/<tu-clave>.pub)" > ~/.config/git/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.config/git/allowed_signers
git config adhara.ownerEmail <tu-correo>
bash scripts/setup-hooks.sh
```
Comprueba: `git log -1 --format='%G? %GS' --show-signature` debe mostrar `G` y tu correo.

## Firma GPG (alternativa)
`git config --global gpg.format openpgp` y `user.signingkey <ID>`; `pre-push` acepta `G`/`U`. Sube la clave pública a GitHub.

## Si la firma pide passphrase o llave física
El agente no la elude: propone el mensaje (una línea, español) y tú ejecutas el commit con el prefijo `!` en Claude Code.

## Verificación en GitHub (CI)
`politica.yml` comprueba `commit.verification.verified` de cada commit del PR. Para que figuren *Verified* activa *Vigilant mode*
(ver `docs/ops/github-setup.md`, E2).
