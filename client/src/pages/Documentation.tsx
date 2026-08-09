import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import tessLogo from "@assets/tess_logo-final_152_1773757415772.png";

const palette = {
  bg: "#f0ebe0",
  fg: "#11192d",
  card: "#eae4d6",
  border: "#dcd5c4",
  primary: "#78752f",
  muted: "#5a6478",
};

const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 scroll-mt-24">
      <h2 className="text-2xl mb-5" style={{ fontWeight: 700 }}>{title}</h2>
      <div className="space-y-4 leading-relaxed" style={{ color: palette.muted }}>{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: palette.primary }} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Documentation() {
  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.fg, fontFamily: fontSans }}>
      <header className="sticky top-0 z-10 backdrop-blur-sm" style={{ background: `${palette.bg}ee`, borderBottom: `1px solid ${palette.border}` }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/">
            <a className="flex items-center gap-3" aria-label="TessTOC — на главную">
              <img src={tessLogo} alt="Tess Technology" className="h-9 w-auto" />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold">TessTOC</div>
                <div className="text-xs" style={{ color: palette.muted }}>Техническая документация</div>
              </div>
            </a>
          </Link>
          <Link href="/about">
            <a className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-opacity hover:opacity-70" style={{ color: palette.muted }}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              О программе
            </a>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: palette.primary }}>Версия 0.2.0 · редакция 9 августа 2026 года</p>
          <h1 className="text-3xl sm:text-5xl mb-5" style={{ fontWeight: 750, letterSpacing: "-0.025em" }}>Документация TessTOC</h1>
          <p className="text-lg max-w-3xl leading-relaxed" style={{ color: palette.muted }}>
            Описание функциональных характеристик, состава программы и информации, необходимой для установки и эксплуатации программного обеспечения.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-14">
          {[
            ["Наименование", "TessTOC — Симулятор Теории ограничений"],
            ["Основной класс", "12.17 — ПО для решения отраслевых задач в области образования"],
            ["Публичный экземпляр", "https://toc.tesstech.ru"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: palette.muted }}>{label}</div>
              <div className="text-sm font-semibold leading-relaxed">{value}</div>
            </div>
          ))}
        </div>

        <Section title="1. Назначение и функциональные характеристики">
          <p>
            TessTOC — клиент-серверное веб-приложение для практического обучения принципам Теории ограничений на примере производственной симуляции Product Mix Problem. Пользователь управляет виртуальной фабрикой, выявляет системное ограничение, выбирает продуктовый микс и проверяет влияние решений на финансовый результат.
          </p>
          <BulletList items={[
            "Индивидуальный режим: прохождение пятидневной производственной симуляции без регистрации.",
            "Командный режим: подключение участников к учебной сессии по коду, синхронная игра и общий рейтинг.",
            "Кабинет тренера: создание сессий, управление раундами, объявления, снимки состояния, события и разбор результатов.",
            "Онбординг и сертификация тренеров: учебный модуль, квиз, практический раунд, сертификат и публичная проверка по QR-коду.",
            "Административная панель: управление статусами тренеров, просмотр сессий и журнал привилегированных действий.",
            "Экспорт результатов: именные PDF-сертификаты и CSV-выгрузка результатов учебной сессии.",
          ]} />
        </Section>

        <Section title="2. Состав программного обеспечения">
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${palette.border}` }}>
            <table className="w-full min-w-[640px] text-sm" style={{ background: palette.card }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <th className="text-left p-4">Компонент</th>
                  <th className="text-left p-4">Технология</th>
                  <th className="text-left p-4">Назначение</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Клиент", "React 18, TypeScript, Vite 7", "Интерфейс симуляции, кабинеты тренера и администратора"],
                  ["Сервер", "Node.js 20, Express 5", "REST API, WebSocket и управление учебными сессиями"],
                  ["База данных", "PostgreSQL 14, Drizzle ORM", "Учётные записи, сессии, команды, результаты и аудит"],
                  ["Веб-сервер", "nginx", "HTTPS, статические ресурсы и проксирование WebSocket"],
                  ["Эксплуатация", "systemd, GitHub Actions", "Запуск сервиса, автоматизированные проверки и развёртывание"],
                ].map((row) => (
                  <tr key={row[0]} style={{ borderBottom: `1px solid ${palette.border}` }}>
                    {row.map((cell) => <td key={cell} className="p-4 align-top">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Требования к рабочему месту пользователя">
          <BulletList items={[
            "Персональный компьютер или ноутбук с современным браузером, поддерживающим ES2020, WebSocket и TLS 1.2 или выше.",
            "Поддерживаемые браузеры: актуальные версии Яндекс Браузера, Chromium/Google Chrome, Microsoft Edge и Mozilla Firefox.",
            "Минимальное разрешение игрового экрана — 1280×720; ширина окна для игрового режима — не менее 768 пикселей.",
            "Стабильное подключение к интернету от 1 Мбит/с; рекомендуемая скорость — от 5 Мбит/с.",
            "Установка дополнительного программного обеспечения на устройство пользователя не требуется.",
          ]} />
        </Section>

        <Section title="4. Эксплуатация облачного экземпляра">
          <p>
            Основной способ эксплуатации — доступ к действующему SaaS-экземпляру по адресу <a href="https://toc.tesstech.ru" className="underline" style={{ color: palette.primary }}>toc.tesstech.ru</a>. Индивидуальный режим доступен без регистрации. Для проведения групповых сессий тренер создаёт учётную запись, проходит одобрение и получает доступ к кабинету.
          </p>
          <p>
            Промышленная конфигурация размещена в Yandex Cloud в Российской Федерации. Основная база данных находится в российском регионе. В штатной конфигурации не используются внешние шрифтовые CDN, клиентская веб-аналитика и языковые модели.
          </p>
        </Section>

        <Section title="5. Установка серверного экземпляра">
          <p>Для развёртывания на инфраструктуре заказчика требуется сервер со следующей минимальной конфигурацией:</p>
          <BulletList items={[
            "Ubuntu 22.04 LTS, 1 vCPU, 1 ГБ RAM и 2 ГБ swap, 20 ГБ SSD.",
            "Node.js 20 LTS, PostgreSQL 14 или новее, nginx, Git и Certbot.",
            "Публичное доменное имя с A-записью на сервер и открытыми портами 22, 80 и 443.",
            "Переменные окружения DATABASE_URL, JWT_SECRET и SUPER_ADMIN_EMAIL; секреты должны передаваться по защищённому каналу.",
          ]} />
          <ol className="list-decimal pl-6 space-y-3">
            <li>Получить дистрибутив или доступ к репозиторию от правообладателя.</li>
            <li>Установить системные зависимости и PostgreSQL, создать базу данных и отдельного пользователя.</li>
            <li>Установить зависимости командой <code className="px-1.5 py-0.5 rounded" style={{ background: palette.card }}>npm ci</code>, собрать приложение и применить схему базы данных.</li>
            <li>Настроить переменные окружения, системный сервис, nginx и TLS-сертификат.</li>
            <li>Проверить health endpoint, вход супер-администратора и WebSocket-подключения тренера и команды.</li>
            <li>Настроить ежедневное резервное копирование и контроль срока хранения резервных копий.</li>
          </ol>
          <p className="text-sm">
            Полная инструкция с командами установки предоставляется вместе с серверным дистрибутивом и актуализируется под конкретную инфраструктуру заказчика.
          </p>
        </Section>

        <Section title="6. Поддержание жизненного цикла">
          <BulletList items={[
            "Исправления и развитие ведутся в Git с автоматизированными проверками перед выпуском.",
            "Критические обращения принимаются по электронной почте; первичная реакция — в течение 4 часов в рабочее время.",
            "Обычные обращения — до 48 часов, консультационные обращения — до 5 рабочих дней.",
            "Обновления устанавливаются автоматически для SaaS-экземпляра или передаются заказчику для согласованного on-premise обновления.",
            "О плановом прекращении поддержки правообладатель уведомляет клиентов не позднее чем за шесть месяцев.",
          ]} />
        </Section>

        <Section title="7. Связанные материалы">
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ["Карточка программы", "/about"],
              ["Лицензионное соглашение", "/legal/eula"],
              ["Публичная оферта и стоимость", "/legal/oferta"],
              ["Политика обработки ПДн", "/legal/privacy"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="flex items-center justify-between gap-4 rounded-xl p-4 transition-opacity hover:opacity-70" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <span className="font-semibold">{label}</span>
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </div>
        </Section>

        <section className="rounded-xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
          <h2 className="text-xl font-bold mb-3">Техническая поддержка</h2>
          <p style={{ color: palette.muted }}>
            ООО «ТЕСС ТЕХНОЛОДЖИ» · <a href="mailto:mail@tesstech.ru" className="underline" style={{ color: palette.primary }}>mail@tesstech.ru</a> · +7 (916) 729-07-16
          </p>
        </section>
      </main>

      <footer className="py-8 mt-8" style={{ background: palette.card, borderTop: `1px solid ${palette.border}` }}>
        <div className="max-w-5xl mx-auto px-6 text-center text-sm" style={{ color: palette.muted }}>
          © 2026 ООО «ТЕСС ТЕХНОЛОДЖИ» · TessTOC 0.2.0
        </div>
      </footer>
    </div>
  );
}
