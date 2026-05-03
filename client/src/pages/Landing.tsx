import { Link } from 'wouter';
import {
  Target,
  TrendingUp,
  Factory,
  Brain,
  Users,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Clock,
  Wallet,
  Package,
} from 'lucide-react';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';

// Палитра tesstech.ru
const palette = {
  bg: '#f0ebe0',          // hsl(37 21% 93%)
  fg: '#11192d',          // hsl(210 40% 12%)
  card: '#eae4d6',        // hsl(37 18% 90%)
  border: '#dcd5c4',      // hsl(37 15% 85%)
  primary: '#a8a25a',     // hsl(61 32% 51%) оливковый
  primaryFg: '#ffffff',
  muted: '#5a6478',       // hsl(210 20% 40%)
  sidebar: '#7397b5',     // hsl(203 35% 55%) приглушённый синий
};

const fontSerif = 'Playfair Display, Georgia, serif';
const fontSans = 'Inter, sans-serif';

export default function Landing() {
  return (
    <div
      className="min-h-screen"
      style={{ background: palette.bg, color: palette.fg, fontFamily: fontSans }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{ background: `${palette.bg}cc`, borderBottom: `1px solid ${palette.border}` }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={tessLogo} alt="Tess Technology" className="h-9 w-auto" />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold">Tess Technology</div>
              <div className="text-xs" style={{ color: palette.muted }}>tesstech.ru</div>
            </div>
          </div>
          <Link href="/play">
            <a
              data-testid="header-cta"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: palette.primary, color: palette.primaryFg }}
            >
              Играть
              <ArrowRight className="h-4 w-4" />
            </a>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-8"
            style={{ background: palette.card, color: palette.muted, border: `1px solid ${palette.border}` }}
          >
            <Target className="h-4 w-4" />
            Симулятор Теории Ограничений
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6"
            style={{ fontFamily: fontSerif, fontWeight: 700 }}
          >
            Заработайте максимум за 5 дней
          </h1>
          <p className="text-lg sm:text-xl mb-10 leading-relaxed" style={{ color: palette.muted }}>
            Управляйте виртуальной фабрикой, расставляйте станки, выбирайте
            продуктовый микс. Цель — максимум прибыли при ограниченных ресурсах
            и времени. Учебная игра по методологии Элияху Голдратта.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/play">
              <a
                data-testid="hero-cta"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-base font-medium transition-opacity hover:opacity-90"
                style={{ background: palette.primary, color: palette.primaryFg }}
              >
                Начать игру
                <ArrowRight className="h-5 w-5" />
              </a>
            </Link>
            <button
              onClick={() => document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-base font-medium transition-colors"
              style={{ background: 'transparent', color: palette.fg, border: `1px solid ${palette.border}` }}
            >
              Как играть
            </button>
          </div>
          <p className="text-sm mt-6" style={{ color: palette.muted }}>
            Бесплатно · Регистрация не нужна · 25–40 минут на партию
          </p>
        </div>
      </section>

      {/* Features — Что вы изучите */}
      <section className="py-20" style={{ background: palette.card, borderTop: `1px solid ${palette.border}`, borderBottom: `1px solid ${palette.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl mb-4"
              style={{ fontFamily: fontSerif, fontWeight: 700 }}
            >
              Что вы изучите за одну партию
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: palette.muted }}>
              Пять базовых концепций операционного менеджмента — на практике, а не в учебнике
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Target, title: 'Поиск узкого места', text: 'Производительность системы определяется самым медленным звеном. В игре вы увидите, как очереди скапливаются перед бутылочным горлышком и где теряются деньги' },
              { icon: TrendingUp, title: 'Throughput vs прибыль', text: 'Постоянные расходы 11 000 ₽ в неделю списываются вне зависимости от выпуска. Учитесь считать маржу не на единицу продукта, а на час работы узкого места' },
              { icon: Factory, title: 'Управление переналадкой', text: 'Каждое переключение машины на другой продукт — это потеря времени. От 0 до 120 секунд. Узнаете, когда выгоднее специализировать машину, а когда — переключать' },
              { icon: Package, title: 'Продуктовый микс', text: 'Три продукта с разной ценой, спросом и стоимостью сырья. Какие выпускать в каком объёме? Интуитивный ответ почти всегда ошибочный — игра научит считать' },
              { icon: Brain, title: 'Системное мышление', text: 'Локальная оптимизация не равна глобальной. Загруженная на 100 % машина в неправильном месте только увеличивает запасы и ухудшает итог. Игра показывает это наглядно' },
              { icon: Wallet, title: 'Решения под прессом', text: 'Каждый день нужно докупать сырьё, переставлять машины, реагировать на очереди. Знакомое ощущение — как в реальном операционном управлении' },
            ].map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-lg transition-shadow hover:shadow-md"
                style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: palette.card }}
                >
                  <f.icon className="h-6 w-6" style={{ color: palette.primary }} />
                </div>
                <h3
                  className="text-xl mb-2"
                  style={{ fontFamily: fontSerif, fontWeight: 700 }}
                >
                  {f.title}
                </h3>
                <p className="leading-relaxed" style={{ color: palette.muted }}>
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Для кого */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl mb-4"
              style={{ fontFamily: fontSerif, fontWeight: 700 }}
            >
              Для кого
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: palette.muted }}>
              Игра построена под взрослую аудиторию. Без баллов и левелов — только реальные управленческие задачи
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Briefcase, title: 'Операционные директора и COO', text: 'Проверка интуиции на безопасной модели. Симулятор за час даёт то, что в реальном производстве доступно только годами проб и ошибок' },
              { icon: GraduationCap, title: 'Бизнес-тренеры и преподаватели', text: 'Готовый инструмент для мастер-классов по ТОС, Lean и теории ограничений. Студенты не дочитывают «Цель» — но играют в фабрику с азартом' },
              { icon: Users, title: 'Команды на стратегических сессиях', text: 'Соревнование между командами — кто заработает больше. Идеально для разогрева перед обсуждением своих узких мест в реальной компании' },
            ].map((a, i) => (
              <div
                key={i}
                className="p-7 rounded-lg"
                style={{ background: palette.card, border: `1px solid ${palette.border}` }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: palette.bg }}
                >
                  <a.icon className="h-6 w-6" style={{ color: palette.primary }} />
                </div>
                <h3
                  className="text-lg mb-2"
                  style={{ fontFamily: fontSerif, fontWeight: 700 }}
                >
                  {a.title}
                </h3>
                <p className="leading-relaxed" style={{ color: palette.muted }}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как играть — тёмная плашка */}
      <section
        id="how-to-play"
        className="py-20"
        style={{ background: palette.fg, color: palette.bg }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl mb-4"
              style={{ fontFamily: fontSerif, fontWeight: 700, color: palette.bg }}
            >
              Как играть
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#c8c0a8' }}>
              Четыре шага — и вы у руля собственной фабрики
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: '1', title: 'Расставьте станки', text: '8 машин 5 цветов. Каждая может работать на любой свободной станции, но переналадка требует времени' },
              { num: '2', title: 'Закупите сырьё', text: '4 типа сырья по 20 ₽. Слишком мало — простой. Слишком много — заморозка денег и постоянка съест' },
              { num: '3', title: 'Запустите неделю', text: '5 рабочих дней по 8 минут реального времени. Можно ускорить ×10. Следите за очередями и докупайте сырьё на ходу' },
              { num: '4', title: 'Заработайте максимум', text: 'В пятницу вечером — расчёт. Постоянка 11 000 ₽ списана. Сколько осталось на счёте? Больше — лучше' },
            ].map((s, i) => (
              <div key={i}>
                <div
                  className="text-5xl mb-3"
                  style={{ fontFamily: fontSerif, color: palette.primary, fontWeight: 700 }}
                >
                  {s.num}
                </div>
                <h3
                  className="text-xl mb-2"
                  style={{ fontFamily: fontSerif, fontWeight: 700 }}
                >
                  {s.title}
                </h3>
                <p className="leading-relaxed" style={{ color: '#c8c0a8' }}>{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Clock, value: '5 дней', sub: 'по 8 минут' },
              { icon: Wallet, value: '10 000 ₽', sub: 'старт' },
              { icon: Factory, value: '8 машин', sub: '5 цветов' },
              { icon: Package, value: '3', sub: 'продукта' },
            ].map((s, i) => (
              <div
                key={i}
                className="text-center p-4 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <s.icon className="h-5 w-5 mx-auto mb-2" style={{ color: palette.primary }} />
                <div
                  className="text-2xl"
                  style={{ fontFamily: fontSerif, fontWeight: 700 }}
                >
                  {s.value}
                </div>
                <div className="text-xs mt-1" style={{ color: '#a8a395' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20" style={{ background: palette.bg }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl mb-4"
            style={{ fontFamily: fontSerif, fontWeight: 700 }}
          >
            Готовы попробовать
          </h2>
          <p className="text-lg mb-8" style={{ color: palette.muted }}>
            Партия занимает 25–40 минут. Регистрация не нужна. Результат сохраняется в общем рейтинге
          </p>
          <Link href="/play">
            <a
              data-testid="footer-cta"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-md text-base font-medium transition-opacity hover:opacity-90"
              style={{ background: palette.primary, color: palette.primaryFg }}
            >
              Начать игру
              <ArrowRight className="h-5 w-5" />
            </a>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8"
        style={{ background: palette.card, borderTop: `1px solid ${palette.border}` }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm" style={{ color: palette.muted }}>
          <div className="flex items-center gap-3">
            <img src={tessLogo} alt="Tess Technology" className="h-6 w-auto opacity-70" />
            <span>© 2026 ООО «Тесс Технолоджи»</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://tesstech.ru"
              className="transition-colors"
              style={{ color: palette.muted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = palette.fg)}
              onMouseLeave={(e) => (e.currentTarget.style.color = palette.muted)}
            >
              tesstech.ru
            </a>
            <span style={{ color: palette.border }}>·</span>
            <Link href="/about">
              <a className="transition-colors" style={{ color: palette.muted }}>О программе</a>
            </Link>
            <span style={{ color: palette.border }}>·</span>
            <span>Симулятор ТОС</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
