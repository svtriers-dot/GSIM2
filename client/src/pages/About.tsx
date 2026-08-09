import { Link } from 'wouter';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';
import CorporateBrandBar from '@/components/CorporateBrandBar';
import { COMPANY_REQUISITES_URL, COMPANY_URL, CORPORATE_MASTERCLASS_URL, TOC_SERVICE_URL } from '@/lib/links';

const palette = {
  bg: '#f0ebe0',
  fg: '#11192d',
  card: '#eae4d6',
  border: '#dcd5c4',
  primary: '#a8a25a',
  muted: '#5a6478',
};

const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export default function About() {
  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.fg, fontFamily: fontSans }}>
      <CorporateBrandBar />
      <header className="sticky top-0 z-10 backdrop-blur-sm" style={{ background: `${palette.bg}cc`, borderBottom: `1px solid ${palette.border}` }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-3">
              <img src={tessLogo} alt="TessTOC" className="h-9 w-auto" />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold">TessTOC</div>
                <div className="text-xs" style={{ color: palette.muted }}>О программе</div>
              </div>
            </a>
          </Link>
          <Link href="/">
            <a className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-opacity hover:opacity-70" style={{ color: palette.muted }}>
              <ArrowLeft className="h-4 w-4" />
              На главную
            </a>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl mb-2" style={{ fontFamily: fontSans, fontWeight: 700 }}>
          О программе TessTOC
        </h1>
        <p className="text-sm mb-10" style={{ color: palette.muted }}>
          Карточка программного обеспечения · Версия 2.1 · 2026
        </p>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSans, fontWeight: 700 }}>Описание</h2>
          <p className="leading-relaxed" style={{ color: palette.muted }}>
            «TessTOC» — обучающий веб-симулятор Теории ограничений, реализующий классическую задачу Product Mix Problem.
            Игрок управляет виртуальной фабрикой в течение пяти рабочих дней, оптимизирует продуктовый микс и ищет узкое место производственной системы.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSans, fontWeight: 700 }}>Сведения о правообладателе, заявителе и операторе экземпляра</h2>
          <div className="rounded-lg p-6 space-y-2 text-sm" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
            <div><strong>Полное наименование:</strong> Общество с ограниченной ответственностью «ТЕСС ТЕХНОЛОДЖИ»</div>
            <div><strong>ОГРН:</strong> 1177746806181</div>
            <div><strong>ИНН:</strong> 7702421130 · <strong>КПП:</strong> 771601001 · <strong>ОКПО:</strong> 19020784</div>
            <div><strong>Юридический адрес:</strong> 129128, г. Москва, пр-д Кадомцева, д. 15, помещ. III, комната 18А</div>
            <div><strong>Телефон:</strong> +7 (916) 729-07-16</div>
            <div><strong>Электронная почта:</strong> <a href="mailto:mail@tesstech.ru" style={{ color: palette.primary }}>mail@tesstech.ru</a></div>
            <div><strong>Сайт заявителя:</strong> <a href={COMPANY_URL} style={{ color: palette.primary }}>tesstech.ru</a></div>
            <div><strong>Реквизиты заявителя:</strong> <a href={COMPANY_REQUISITES_URL} style={{ color: palette.primary }}>tesstech.ru/company/requisites/</a></div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSans, fontWeight: 700 }}>TessTOC и Tess Technology</h2>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {[
              ['Сайт компании', COMPANY_URL, 'Проекты, экспертиза и контакты Tess Technology'],
              ['Услуги по ТОС', TOC_SERVICE_URL, 'Консалтинг по операционной эффективности'],
              ['Мастер-класс для команд', CORPORATE_MASTERCLASS_URL, 'Запросить корпоративное проведение TessTOC'],
            ].map(([label, href, description]) => (
              <a key={href} href={href} className="rounded-lg p-4 transition-opacity hover:opacity-70" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
                <div className="font-semibold mb-1 flex items-center gap-1.5">{label}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></div>
                <div style={{ color: palette.muted }}>{description}</div>
              </a>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSans, fontWeight: 700 }}>Соответствие требованиям</h2>
          <ul className="space-y-2 text-sm leading-relaxed" style={{ color: palette.muted }}>
            <li>· Основной класс для подачи заявления в реестр российского ПО: <strong>12.17 «Программное обеспечение для решения отраслевых задач в области образования»</strong>.</li>
            <li>· Правообладатель, заявитель и оператор опубликованного экземпляра: ООО «ТЕСС ТЕХНОЛОДЖИ».</li>
            <li>· Продуктовая инфраструктура размещена в Yandex Cloud (Российская Федерация, зона ru-central1-d).</li>
            <li>· Внешние шрифтовые CDN, языковые модели и клиентская веб-аналитика в штатной конфигурации не используются.</li>
            <li>· Исходный код распространяется по проприетарной лицензии; перечень сторонних компонентов и их лицензий зафиксирован в файлах зависимостей.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSans, fontWeight: 700 }}>Юридические документы</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <a href="/legal/eula" className="rounded-lg p-4 transition-opacity hover:opacity-70" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
              <div className="font-semibold mb-1">Лицензионное соглашение (EULA)</div>
              <div style={{ color: palette.muted }}>Условия использования ПО конечным пользователем</div>
            </a>
            <a href="/legal/oferta" className="rounded-lg p-4 transition-opacity hover:opacity-70" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
              <div className="font-semibold mb-1">Публичная оферта</div>
              <div style={{ color: palette.muted }}>Тарифные планы и порядок приобретения</div>
            </a>
            <a href="/legal/privacy" className="rounded-lg p-4 transition-opacity hover:opacity-70" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
              <div className="font-semibold mb-1">Политика обработки ПДн</div>
              <div style={{ color: palette.muted }}>Соответствие 152-ФЗ</div>
            </a>
            <a href="/docs" className="rounded-lg p-4 transition-opacity hover:opacity-70" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
              <div className="font-semibold mb-1">Техническая документация</div>
              <div style={{ color: palette.muted }}>Функции, состав, установка и эксплуатация</div>
            </a>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSans, fontWeight: 700 }}>Технический стек</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm" style={{ color: palette.muted }}>
            <div><strong style={{ color: palette.fg }}>Клиент:</strong> React 18 · TypeScript · Vite 7</div>
            <div><strong style={{ color: palette.fg }}>UI:</strong> Tailwind CSS · shadcn/ui</div>
            <div><strong style={{ color: palette.fg }}>Сервер:</strong> Node.js 20 · Express 5</div>
            <div><strong style={{ color: palette.fg }}>БД:</strong> PostgreSQL 14 · Drizzle ORM</div>
            <div><strong style={{ color: palette.fg }}>Веб-сервер:</strong> nginx 1.18</div>
            <div><strong style={{ color: palette.fg }}>SSL:</strong> Let’s Encrypt</div>
            <div><strong style={{ color: palette.fg }}>ОС:</strong> Ubuntu 22.04 LTS</div>
            <div><strong style={{ color: palette.fg }}>Хостинг:</strong> Yandex Cloud</div>
          </div>
        </section>

        <section>
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSans, fontWeight: 700 }}>Контакты</h2>
          <p className="text-sm leading-relaxed" style={{ color: palette.muted }}>
            По вопросам приобретения корпоративных лицензий, проведения мастер-классов и технической поддержки — <a href="mailto:mail@tesstech.ru" style={{ color: palette.primary }}>mail@tesstech.ru</a>.
          </p>
          <a href={CORPORATE_MASTERCLASS_URL} className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold hover:underline" style={{ color: palette.primary }}>
            Оставить заявку на корпоративный мастер-класс <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </section>
      </main>

      <footer className="py-8" style={{ background: palette.card, borderTop: `1px solid ${palette.border}` }}>
        <div className="max-w-4xl mx-auto px-6 text-center text-sm" style={{ color: palette.muted }}>
          © 2026 ООО «ТЕСС ТЕХНОЛОДЖИ» · ОГРН 1177746806181 · <a href={COMPANY_URL} style={{ color: palette.muted }}>tesstech.ru</a>
        </div>
      </footer>
    </div>
  );
}
