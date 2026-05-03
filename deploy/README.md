# GSIM2 — деплой на Yandex Cloud (песочница)

> Архитектура: 1 VM (Compute Cloud) + PostgreSQL 16 локально + nginx + SSL Let's Encrypt
> Стоимость: ~700–1500 ₽/мес (e2-medium 2 vCPU / 2 GB / 20 GB SSD)
> Поддомен: **gsim.tesstech.ru** (поправить в setup.sh при необходимости)

---

## Шаг 1 — Создать VM в Yandex Cloud

Через **YC консоль** (`console.yandex.cloud` → Compute Cloud → Создать ВМ):

| Параметр | Значение |
|---|---|
| Образ | **Ubuntu 22.04 LTS** |
| Платформа | Intel Cascade Lake / Ice Lake |
| Vcpu | 2 (с гарантированной долей 50%) |
| RAM | 2 GB |
| Диск | 20 GB SSD |
| Публичный адрес | **Авто (динамический)** или **Статический** (рекомендую статический ~150 ₽/мес — иначе IP меняется при остановке) |
| Сеть | default-* / любая VPC |
| SSH | ваш публичный ключ (`~/.ssh/id_ed25519.pub`) для пользователя `ubuntu` |

Или через `yc` CLI:

```bash
yc compute instance create \
  --name gsim2-sandbox \
  --zone ru-central1-a \
  --network-interface subnet-name=default-ru-central1-a,nat-ip-version=ipv4 \
  --create-boot-disk image-folder-id=standard-images,image-family=ubuntu-2204-lts,size=20,type=network-ssd \
  --memory 2 --cores 2 --core-fraction 50 \
  --ssh-key ~/.ssh/id_ed25519.pub \
  --metadata-from-file user-data=cloud-init.yaml  # опционально
```

Запиши **публичный IP** VM. Дальше понадобится.

---

## Шаг 2 — Добавить DNS A-запись

В DNS-менеджере домена `tesstech.ru` (Reg.ru / Yandex.Cloud DNS / cloudflare):

```
Type:  A
Name:  gsim
Value: <PUBLIC_IP_VM>
TTL:   300
```

Подождать 5–10 минут, проверить:

```bash
dig +short gsim.tesstech.ru
# должен вернуть IP VM
```

---

## Шаг 3 — Подключиться по SSH и запустить setup.sh

```bash
ssh ubuntu@gsim.tesstech.ru   # или по IP пока DNS не пропагирован

# на VM:
git clone https://github.com/svtriers-dot/GSIM2.git /tmp/gsim2
cd /tmp/gsim2
sudo bash deploy/setup.sh
```

Скрипт идемпотентный, делает:
- ✅ apt update + nginx + ufw + git
- ✅ Node.js 20 (NodeSource)
- ✅ PostgreSQL 16
- ✅ Создаёт БД `gsim` + пользователя `gsim` с auto-generated паролем
- ✅ Создаёт системного пользователя `gsim` и `/opt/gsim2`
- ✅ Создаёт `/opt/gsim2/.env` с DATABASE_URL
- ✅ Регистрирует systemd unit `gsim2.service`
- ✅ Кладёт nginx-конфиг и активирует сайт
- ✅ Открывает 22/80/443 в ufw

В конце выводит дальнейшие шаги (повторены ниже).

---

## Шаг 4 — Сборка приложения

```bash
sudo -u gsim git clone https://github.com/svtriers-dot/GSIM2.git /opt/gsim2/src
cd /opt/gsim2/src

sudo -u gsim npm ci
sudo -u gsim npm run build
sudo -u gsim npm run db:push   # применить Drizzle схему

sudo cp -r /opt/gsim2/src/dist /opt/gsim2/dist
sudo cp -r /opt/gsim2/src/node_modules /opt/gsim2/node_modules
sudo chown -R gsim:gsim /opt/gsim2
```

---

## Шаг 5 — Запустить приложение

```bash
sudo systemctl enable --now gsim2
sudo systemctl status gsim2

# проверить
curl -I http://localhost:5000
sudo journalctl -u gsim2 -f
```

---

## Шаг 6 — SSL через Let's Encrypt

После того как DNS A-запись для `gsim.tesstech.ru` ведёт на IP VM:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gsim.tesstech.ru \
  --redirect --agree-tos -m s.v.triers@gmail.com -n
```

certbot автоматически добавит SSL в nginx-конфиг и поставит cron на автообновление.

Проверить:

```bash
curl -I https://gsim.tesstech.ru
# HTTP/2 200
```

---

## Шаг 7 — Бэкапы PG (опционально, рекомендуется)

```bash
sudo crontab -e
# добавить:
0 3 * * * /opt/gsim2/src/deploy/backup.sh >> /var/log/gsim2-backup.log 2>&1
```

Бэкапы → `/var/backups/postgresql/gsim/`, retention 14 дней.

Если есть Yandex Object Storage bucket — раскомментировать `yc storage s3 cp` в `backup.sh`.

---

## Обновление кода (deploy)

Простой ручной деплой:

```bash
cd /opt/gsim2/src
sudo -u gsim git pull
sudo -u gsim npm ci
sudo -u gsim npm run build
sudo -u gsim npm run db:push   # если поменяли схему

sudo cp -r dist/* /opt/gsim2/dist/
sudo cp -r node_modules /opt/gsim2/

sudo systemctl restart gsim2
```

(GitHub Actions auto-deploy — отдельной итерацией, когда уберёшь риски с экспериментами)

---

## Диагностика

| Проблема | Команда |
|---|---|
| App не стартует | `sudo journalctl -u gsim2 -n 100 --no-pager` |
| nginx 502 | `sudo systemctl status gsim2` + `curl -I http://localhost:5000` |
| nginx errors | `sudo tail -f /var/log/nginx/error.log` |
| DB connection failed | проверить `/opt/gsim2/.env` и `sudo -u postgres psql -l` |
| Порт занят | `sudo ss -ltnp | grep 5000` |

---

## Стоимость в YC (ориентировочно, май 2026)

| Ресурс | ~₽/мес |
|---|---|
| VM e2-medium (2 vCPU 50%, 2 GB, 20 GB SSD) | 600–900 |
| Статический публичный IP | ~150 |
| Object Storage (бэкапы, ~1 GB) | ~5 |
| **Итого** | **~750–1100 ₽/мес** |

(после 60-дневного гранта 4000 ₽)
