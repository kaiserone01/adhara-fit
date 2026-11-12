#!/bin/sh
# Activa los hooks versionados. core.hooksPath no viaja con el repo: ejecutar en cada clon.
# No toca user.*, firma ni credenciales: eso lo configura el propietario (docs/ops/firma-commits.md).
set -eu
top="$(git rev-parse --show-toplevel)"
chmod +x "$top"/.githooks/* "$top"/scripts/*.sh 2>/dev/null || true
git -C "$top" config core.hooksPath .githooks
echo "core.hooksPath = $(git -C "$top" config --get core.hooksPath)"
if [ -z "$(git -C "$top" config --get adhara.ownerEmail || true)" ]; then
  echo "AVISO: adhara.ownerEmail no está definido; lo configura el propietario con: git config adhara.ownerEmail <correo>"
fi
