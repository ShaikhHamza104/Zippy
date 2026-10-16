#!/usr/bin/env bash
# scripts/backup-database.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ROOT_DIR}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  echo "[ERROR] .env file not found at ${ENV_FILE}" >&2
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${ROOT_DIR}/backups"
mkdir -p "${BACKUP_DIR}"

echo "========================================="
echo " ZIPPY AUTOMATED DATABASE BACKUP (POSIX)"
echo " Timestamp: ${TIMESTAMP}"
echo " Output:    ${BACKUP_DIR}"
echo "========================================="

# 1. Parse .env
DATABASE_URL=$(grep -E '^DATABASE_URL=' "${ENV_FILE}" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
MONGODB_URI=$(grep -E '^MONGODB_URI=' "${ENV_FILE}" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

# 2. Backup MySQL
if [ -n "${DATABASE_URL:-}" ]; then
  echo -e "\n[1/2] Backing up MySQL database..."
  # Parse mysql://user:pass@host:port/dbname
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

  SQL_FILE="${BACKUP_DIR}/mysql_${DB_NAME}_${TIMESTAMP}.sql"
  GZ_FILE="${SQL_FILE}.gz"

  MYSQL_PWD="${DB_PASS}" mysqldump \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    --no-tablespaces \
    --single-transaction \
    --routines \
    --triggers \
    "${DB_NAME}" | gzip > "${GZ_FILE}"

  echo "✓ Compressed MySQL dump generated: ${GZ_FILE}"
fi

# 3. Backup MongoDB
if [ -n "${MONGODB_URI:-}" ]; then
  echo -e "\n[2/2] Backing up MongoDB database..."
  MONGO_DUMP_FILE="${BACKUP_DIR}/mongo_backup_${TIMESTAMP}.json.gz"
  node "${SCRIPT_DIR}/mongo-backup.js" "${MONGO_DUMP_FILE}"
  echo "✓ Compressed MongoDB dump generated: ${MONGO_DUMP_FILE}"
fi

echo "========================================="
echo " ALL DATABASE BACKUPS COMPLETED SAFELY"
echo "========================================="
