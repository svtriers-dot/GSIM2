#!/usr/bin/env bash
# GSIM2: ежедневный бэкап PostgreSQL.
# Crontab пример: 0 3 * * * /opt/gsim2/deploy/backup.sh
set -euo pipefail

DB_NAME="gsim"
BACKUP_DIR="/var/backups/postgresql/gsim"
RETAIN_DAYS=14

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

DATE=$(date +%Y-%m-%d_%H%M)
FILE="${BACKUP_DIR}/gsim_${DATE}.sql.gz"

sudo -u postgres pg_dump "${DB_NAME}" | gzip > "${FILE}"
chmod 600 "${FILE}"

# Удаляем старые
find "${BACKUP_DIR}" -name '*.sql.gz' -mtime +${RETAIN_DAYS} -delete

# Опционально: загрузка в Yandex Object Storage (если установлен yc CLI)
# yc storage s3 cp "${FILE}" "s3://gsim2-backups/$(basename ${FILE})" 2>/dev/null || true

echo "Backup: ${FILE} ($(du -h ${FILE} | cut -f1))"
