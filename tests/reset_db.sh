#!/usr/bin/env bash
# Deja la base de datos en su estado inicial (solo para ambiente de pruebas).
export PGPASSWORD="${DB_PASSWORD:?Defina DB_PASSWORD}"
psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-atlas_admin}" -d "${DB_NAME:-atlas_db}" -q \
  -c "DROP TABLE IF EXISTS auditoria_logs, contratos, clientes, usuarios, empresas CASCADE;" \
  -f "$(dirname "$0")/../db/init.sql" > /dev/null && echo "BD reiniciada"
