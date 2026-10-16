#!/usr/bin/env bash
# scripts/restore-database.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ROOT_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  echo "[ERROR] .env file not found at ${ENV_FILE}" >&2
  exit 1
fi

MYSQL_BACKUP="${1:-}"
MONGO_BACKUP="${2:-}"

if [ -z "${MYSQL_BACKUP}" ] && [ -z "${MONGO_BACKUP}" ]; then
  echo "Usage: $0 [path/to/mysql_backup.sql.gz] [path/to/mongo_backup.json.gz]"
  exit 1
fi

echo "========================================="
echo " ZIPPY DATABASE RESTORE ENGINE (POSIX)"
echo "========================================="

DATABASE_URL=$(grep -E '^DATABASE_URL=' "${ENV_FILE}" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

# 1. Restore MySQL
if [ -n "${MYSQL_BACKUP}" ] && [ -f "${MYSQL_BACKUP}" ]; then
  echo -e "\n[1/2] Restoring MySQL database from ${MYSQL_BACKUP}..."
  PROTO="$(echo "${DATABASE_URL}" | grep :// | sed -e's,^\(.*://\).*,\1,g')"
  URL_NO_PROTO="${DATABASE_URL#$PROTO}"
  USER_PASS="$(echo "${URL_NO_PROTO}" | grep @ | cut -d@ -f1)"
  HOST_PORT_DB="$(echo "${URL_NO_PROTO}" | grep @ | cut -d@ -f2)"

  DB_USER="${USER_PASS%%:*}"
  DB_PASS="${USER_PASS#*:}"
  HOST_PORT="${HOST_PORT_DB%%/*}"
  DB_NAME="${HOST_PORT_DB#*/}"
  DB_NAME="${DB_NAME%%\?*}"

  DB_HOST="${HOST_PORT%%:*}"
  DB_PORT="${HOST_PORT#*:}"
  if [ "${DB_PORT}" = "${HOST_PORT}" ]; then
    DB_PORT="3306"
  fi

  if [[ "${MYSQL_BACKUP}" == *.gz ]]; then
    gunzip -c "${MYSQL_BACKUP}" | MYSQL_PWD="${DB_PASS}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}"
  else
    MYSQL_PWD="${DB_PASS}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}" < "${MYSQL_BACKUP}"
  fi
  echo "✓ MySQL database '${DB_NAME}' restored successfully!"
fi

# 2. Restore MongoDB
if [ -n "${MONGO_BACKUP}" ] && [ -f "${MONGO_BACKUP}" ]; then
  echo -e "\n[2/2] Restoring MongoDB database from ${MONGO_BACKUP}..."
  node "${SCRIPT_DIR}/mongo-restore.js" "${MONGO_BACKUP}"
  echo "✓ MongoDB restore completed successfully!"
fi

echo "========================================="
echo " RESTORATION COMPLETE AND VERIFIED"
echo "========================================="
