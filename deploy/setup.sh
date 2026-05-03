#!/usr/bin/env bash
# GSIM2 production setup script for Yandex Cloud Compute VM (Ubuntu 22.04 LTS)
# Запускать ОДИН РАЗ при первой установке. Идемпотентный.
# Usage:
#   sudo bash setup.sh
set -euo pipefail

DOMAIN="${DOMAIN:-toc.tesstech.ru}"
APP_DIR="/opt/gsim2"
APP_USER="gsim"
DB_NAME="gsim"
DB_USER="gsim"
NODE_VERSION="20"
PG_VERSION="16"
SWAP_SIZE_GB=2

if [[ $EUID -ne 0 ]]; then
    echo "Этот скрипт должен запускаться от root: sudo bash $0"
    exit 1
fi

echo "==> 1/9 apt update + базовые пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release ufw nginx git

echo "==> 2/9 swap-файл ${SWAP_SIZE_GB}G (для Vite build на VM с малым RAM)"
TOTAL_RAM_GB=$(awk '/MemTotal/ {printf "%.0f", $2/1024/1024}' /proc/meminfo)
if [[ $TOTAL_RAM_GB -lt 2 ]] && [[ ! -f /swapfile ]]; then
    echo "    RAM = ${TOTAL_RAM_GB} GB — создаю swap"
    fallocate -l ${SWAP_SIZE_GB}G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    # Снижаем агрессивность swap (по умолчанию 60 = охотно свопит)
    sysctl vm.swappiness=10 >/dev/null
    echo 'vm.swappiness=10' > /etc/sysctl.d/99-gsim2-swappiness.conf
    free -h
elif [[ -f /swapfile ]]; then
    echo "    swap уже существует, пропускаю"
else
    echo "    RAM = ${TOTAL_RAM_GB} GB — swap не нужен"
fi

echo "==> 3/9 Node.js ${NODE_VERSION} (NodeSource)"
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt $NODE_VERSION ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
    apt-get install -y -qq nodejs
fi
node -v
npm -v

echo "==> 4/9 PostgreSQL ${PG_VERSION}"
if ! command -v psql &>/dev/null; then
    apt-get install -y -qq postgresql-${PG_VERSION} postgresql-contrib-${PG_VERSION}
    systemctl enable postgresql
    systemctl start postgresql
fi

echo "==> 5/9 Создать БД и пользователя"
DB_PASS="$(openssl rand -hex 16)"
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
    ELSE
        ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
    END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

echo "==> 6/9 Системный пользователь ${APP_USER}"
if ! id "${APP_USER}" &>/dev/null; then
    useradd --system --create-home --shell /usr/sbin/nologin "${APP_USER}"
fi

mkdir -p "${APP_DIR}"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "==> 7/9 .env"
if [[ ! -f "${APP_DIR}/.env" ]]; then
    cat > "${APP_DIR}/.env" <<ENV
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
NODE_ENV=production
PORT=5000
ENV
    chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env"
    echo "    .env создан с auto-generated паролем"
else
    echo "    .env уже существует — оставляю как есть"
fi

echo "==> 8/9 systemd unit + nginx"
cp "$(dirname "$0")/gsim2.service" /etc/systemd/system/gsim2.service
systemctl daemon-reload

cp "$(dirname "$0")/nginx.conf" /etc/nginx/sites-available/gsim2
sed -i "s/toc.tesstech.ru/${DOMAIN}/g" /etc/nginx/sites-available/gsim2
ln -sf /etc/nginx/sites-available/gsim2 /etc/nginx/sites-enabled/gsim2
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> 9/9 firewall (ufw)"
ufw allow 22/tcp     >/dev/null
ufw allow 80/tcp     >/dev/null
ufw allow 443/tcp    >/dev/null
ufw --force enable   >/dev/null
ufw status

cat <<DONE

============================================================
SETUP DONE.

Дальше (вручную):

1. Положи код приложения в ${APP_DIR}:
   sudo -u ${APP_USER} git clone https://github.com/svtriers-dot/GSIM2.git ${APP_DIR}/src

2. Сборка и миграции:
   cd ${APP_DIR}/src
   sudo -u ${APP_USER} npm ci
   sudo -u ${APP_USER} npm run build       # ~1-2 мин на 1GB+swap
   sudo -u ${APP_USER} npm run db:push     # отвечай 'y' на подтверждение

3. Скопируй dist + node_modules в ${APP_DIR}:
   sudo cp -r ${APP_DIR}/src/dist ${APP_DIR}/dist
   sudo cp -r ${APP_DIR}/src/node_modules ${APP_DIR}/node_modules
   sudo chown -R ${APP_USER}:${APP_USER} ${APP_DIR}

4. Запуск:
   sudo systemctl enable --now gsim2
   sudo systemctl status gsim2

5. SSL (после того как DNS A-запись для ${DOMAIN} ведёт на этот IP):
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d ${DOMAIN} --redirect --agree-tos -m s.v.triers@gmail.com -n

Логи приложения:  sudo journalctl -u gsim2 -f
Логи nginx:       sudo tail -f /var/log/nginx/error.log
Память:           free -h
============================================================
DONE
