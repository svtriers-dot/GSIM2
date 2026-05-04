import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';

const palette = {
  bg: '#f0ebe0',
  fg: '#11192d',
  card: '#eae4d6',
  border: '#dcd5c4',
  primary: '#a8a25a',
  muted: '#5a6478',
};

const fontSerif = 'Playfair Display, Georgia, serif';
const fontSans = 'Inter, sans-serif';

export default function About() {
  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.fg, fontFamily: fontSans }}>
      <header className="sticky top-0 z-10 backdrop-blur-sm" style={{ background: `${palette.bg}cc`, borderBottom: `1px solid ${palette.border}` }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-3">
              <img src={tessLogo} alt="Tess Technology" className="h-9 w-auto" />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold">Tess Technology</div>
                <div className="text-xs" style={{ color: palette.muted }}>tesstech.ru</div>
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
        <h1 className="text-3xl sm:text-4xl mb-2" style={{ fontFamily: fontSerif, fontWeight: 700 }}>
          О программе TessTOC
        </h1>
        <p className="text-sm mb-10" style={{ color: palette.muted }}>
          Карточка программного обеспечения · Версия 0.1.0 · 2026
        </p>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSerif, fontWeight: 700 }}>Описание</h2>
          <p className="leading-relaxed" style={{ color: palette.muted }}>
            «TessTOC» — обучающий веб-симулятор Теории ограничений, реализующий классическую задачу Product Mix Problem.
            Игрок управляет виртуальной фабрикой в течение пяти рабочих дней, оптимизирует продуктовый микс и ищет узкое место производственной системы.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSerif, fontWeight: 700 }}>Реквизиты правообладателя</h2>
          <div className="rounded-lg p-6 space-y-2 text-sm" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
            <div><strong>Полное наименование:</strong> Общество с ограниченной ответственностью «ТЕСС ТЕХНОЛОДЖИ»</div>
            <div><strong>ОГРН:</strong> 1177746806181</div>
            <div><strong>ИНН:</strong> 7702421130 · <strong>КПП:</strong> 770201001 · <strong>ОКПО:</strong> 19020784</div>
            <div><strong>Юридический адрес:</strong> 129128, г. Москва, пр. Кадомцева, д. 15, цок. этаж, пом. III, комн. 18а, оф. 3</div>
            <div><strong>Телефон:</strong> +7 (916) 729-07-16</div>
            <div><strong>Электронная почта:</strong> <a href="mailto:mail@tesstech.ru" style={{ color: palette.primary }}>mail@tesstech.ru</a></div>
            <div><strong>Сайт правообладателя:</strong> <a href="https://tesstech.ru" style={{ color: palette.primary }}>tesstech.ru</a></div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSerif, fontWeight: 700 }}>Соответствие требованиям</h2>
          <ul className="space-y-2 text-sm leading-relaxed" style={{ color: palette.muted }}>
            <li>· Класс программного обеспечения по классификатору Минцифры России: <strong>04.13 «Образовательное программное обеспечение»</strong>.</li>
            <li>· Программа полностью разработана на территории Российской Федерации.</li>
            <li>· Размещение: Yandex Cloud (Российская Федерация, зона ru-central1-d).</li>
            <li>· Иностранные языковые модели и сторонние трекеры не используются.</li>
            <li>· Используемые библиотеки распространяются по открытым лицензиям (MIT, Apache 2.0, BSD).</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSerif, fontWeight: 700 }}>Юридические документы</h2>
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
            <a href="https://github.com/svtriers-dot/GSIM2/blob/main/LICENSE" className="rounded-lg p-4 transition-opacity hover:opacity-70" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
              <div className="font-semibold mb-1">Лицензия на исходный код</div>
              <div style={{ color: palette.muted }}>Условия проприетарного лицензирования</div>
            </a>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSerif, fontWeight: 700 }}>Технический стек</h2>
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
          <h2 className="text-xl mb-4" style={{ fontFamily: fontSerif, fontWeight: 700 }}>Контакты</h2>
          <p className="text-sm leading-relaxed" style={{ color: palette.muted }}>
            По вопросам приобретения корпоративных лицензий, проведения мастер-классов и технической поддержки — <a href="mailto:mail@tesstech.ru" style={{ color: palette.primary }}>mail@tesstech.ru</a>.
          </p>
        </section>
      </main>

      <footer className="py-8" style={{ background: palette.card, borderTop: `1px solid ${palette.border}` }}>
        <div className="max-w-4xl mx-auto px-6 text-center text-sm" style={{ color: palette.muted }}>
          © 2026 ООО «ТЕСС ТЕХНОЛОДЖИ» · ОГРН 1177746806181 · <a href="https://tesstech.ru" style={{ color: palette.muted }}>tesstech.ru</a>
        </div>
      </footer>
    </div>
  );
}
