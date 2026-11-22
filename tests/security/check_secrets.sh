#!/usr/bin/env bash
# Búsqueda simple de secretos escritos en el código (complementa a gitleaks en el pipeline).
# Uso: bash tests/security/check_secrets.sh [carpeta]
DIR="${1:-.}"
echo "== Buscando contraseñas, secretos JWT y archivos .env en $DIR =="
grep -rnE "(PASSWORD|SECRET|JWT_SECRET|api[_-]?key)\s*[:=]\s*['\"]?[A-Za-z0-9!@#\$%^&*_\-]{8,}" "$DIR" \
  --include=*.js --include=*.yml --include=*.yaml --include=.env --include=*.json \
  --exclude-dir=node_modules --exclude-dir=dist | sed 's/\(.\{160\}\).*/\1.../'
echo
echo "== Valores por defecto de secretos en el código (process.env.X || '...') =="
grep -rnE "process\.env\.(JWT_SECRET|DB_PASSWORD)[^|]*\|\|\s*'" "$DIR" --include=*.js --exclude-dir=node_modules
echo
echo "== Archivos .env presentes =="
find "$DIR" -name ".env" -not -path "*/node_modules/*"
