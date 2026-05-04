import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  Target, TrendingUp, Factory, Brain, Briefcase, GraduationCap, Users,
  ArrowRight, Clock, Wallet, Package,
} from 'lucide-react';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';

const palette = {
  bg: '#f0ebe0',
  fg: '#11192d',
  card: '#eae4d6',
  border: '#dcd5c4',
  primary: '#a8a25a',
  accent: '#11192d',
  primaryFg: '#ffffff',
  muted: '#5a6478',
};

const fontSerif = 'Playfair Display, Georgia, serif';
const fontSans = 'Inter, sans-serif';

function FactoryIllustration() {
  return (
    <svg viewBox="0 0 520 380" className="w-full h-auto" style={{ maxWidth: 520 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#11192d" floodOpacity="0.08" />
        </filter>
      </defs>
      <rect x="6" y="8" width="508" height="368" rx="14" fill="white" stroke={palette.border} strokeWidth="1" filter="url(#shadow)" />
      <rect x="6" y="8" width="508" height="28" rx="14" fill={palette.card} />
      <rect x="6" y="22" width="508" height="14" fill={palette.card} />
      <circle cx="20" cy="22" r="4" fill="#e8b4b4" />
      <circle cx="34" cy="22" r="4" fill="#e8d4a8" />
      <circle cx="48" cy="22" r="4" fill="#b4d4b4" />
      <rect x="120" y="14" width="180" height="16" rx="8" fill="white" stroke={palette.border} />
      <text x="210" y="25" fontSize="9" textAnchor="middle" fill={palette.muted} fontFamily={fontSans}>toc.tesstech.ru/play</text>
      <g transform="translate(20, 50)">
        <rect width="480" height="44" rx="8" fill={palette.fg} />
        <text x="20" y="18" fontSize="9" fill="#a8a395" fontFamily={fontSans} letterSpacing="1">ДЕНЬ</text>
        <text x="20" y="36" fontSize="16" fill="white" fontWeight="700" fontFamily={fontSans}>3</text>
        <text x="80" y="18" fontSize="9" fill="#a8a395" fontFamily={fontSans} letterSpacing="1">ВРЕМЯ</text>
        <text x="80" y="36" fontSize="16" fill="white" fontWeight="700" fontFamily={fontSans}>04:32</text>
        <text x="180" y="18" fontSize="9" fill="#a8a395" fontFamily={fontSans} letterSpacing="1">×СКОРОСТЬ</text>
        <text x="180" y="36" fontSize="16" fill={palette.primary} fontWeight="700" fontFamily={fontSans}>×10</text>
        <text x="460" y="18" fontSize="9" fill="#a8a395" fontFamily={fontSans} letterSpacing="1" textAnchor="end">КАССА</text>
        <text x="460" y="36" fontSize="16" fill="white" fontWeight="700" fontFamily={fontSans} textAnchor="end">22 480 ₽</text>
      </g>
      <text x="20" y="116" fontSize="9" fill={palette.muted} fontFamily={fontSans} letterSpacing="1">ПРОИЗВОДСТВЕННАЯ ЛИНИЯ</text>
      <g transform="translate(20, 130)">
        <rect width="60" height="56" rx="8" fill="white" stroke={palette.border} strokeWidth="1.5" strokeDasharray="3 2" />
        <text x="30" y="22" fontSize="9" textAnchor="middle" fill={palette.muted}>Сырьё</text>
        <text x="30" y="40" fontSize="13" textAnchor="middle" fill={palette.fg} fontWeight="700" fontFamily={fontSans}>RM</text>
        <line x1="68" y1="28" x2="92" y2="28" stroke={palette.muted} strokeWidth="1.5" />
        <polygon points="92,28 86,25 86,31" fill={palette.muted} />
        <g transform="translate(100, 0)">
          <rect width="80" height="56" rx="8" fill="white" stroke={palette.primary} strokeWidth="2" />
          <circle cx="40" cy="22" r="7" fill={palette.primary} />
          <text x="40" y="44" fontSize="11" textAnchor="middle" fill={palette.fg} fontWeight="700" fontFamily={fontSans}>A1</text>
        </g>
        <line x1="188" y1="28" x2="212" y2="28" stroke={palette.muted} strokeWidth="1.5" />
        <polygon points="212,28 206,25 206,31" fill={palette.muted} />
        <g transform="translate(220, 0)">
          <rect width="80" height="56" rx="8" fill="white" stroke="#c8423a" strokeWidth="2.5" />
          <circle cx="40" cy="22" r="7" fill={palette.fg} />
          <text x="40" y="44" fontSize="11" textAnchor="middle" fill={palette.fg} fontWeight="700" fontFamily={fontSans}>B3</text>
          <g transform="translate(0, 64)">
            {[0,1,2,3,4,5,6].map((i) => (
              <rect key={i} x={6 + i*10} y="0" width="8" height="8" rx="1.5" fill={palette.fg} opacity={1 - i*0.1} />
            ))}
          </g>
          <text x="40" y="-6" fontSize="9" textAnchor="middle" fill="#c8423a" fontWeight="700" fontFamily={fontSans}>УЗКОЕ МЕСТО</text>
        </g>
        <line x1="308" y1="28" x2="332" y2="28" stroke={palette.muted} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.5" />
        <polygon points="332,28 326,25 326,31" fill={palette.muted} opacity="0.5" />
        <g transform="translate(340, 0)">
          <rect width="80" height="56" rx="8" fill={palette.card} stroke={palette.border} strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="40" cy="22" r="7" fill={palette.muted} opacity="0.4" />
          <text x="40" y="44" fontSize="11" textAnchor="middle" fill={palette.muted} fontWeight="700" fontFamily={fontSans}>F3</text>
        </g>
        <line x1="428" y1="28" x2="452" y2="28" stroke={palette.muted} strokeWidth="1.5" />
        <polygon points="452,28 446,25 446,31" fill={palette.muted} />
        <rect x="460" width="20" height="56" rx="6" fill={palette.primary} opacity="0.2" />
      </g>
      <text x="20" y="244" fontSize="9" fill={palette.muted} fontFamily={fontSans} letterSpacing="1">ПРОДУКТЫ</text>
      <g transform="translate(20, 256)">
        {[
          { id: 'A', price: '180 ₽', sold: 12, demand: 40, hl: false },
          { id: 'D', price: '240 ₽', sold: 28, demand: 50, hl: true },
          { id: 'F', price: '180 ₽', sold: 8, demand: 40, hl: false },
        ].map((p, i) => {
          const x = i * 160;
          const pct = p.sold / p.demand;
          return (
            <g key={p.id} transform={`translate(${x}, 0)`}>
              <rect width="150" height="80" rx="8" fill={p.hl ? palette.fg : 'white'} stroke={p.hl ? palette.fg : palette.border} strokeWidth="1" />
              <text x="14" y="22" fontSize="10" fill={p.hl ? '#a8a395' : palette.muted} fontFamily={fontSans}>Продукт {p.id}</text>
              <text x="136" y="22" fontSize="10" fill={p.hl ? '#a8a395' : palette.muted} fontFamily={fontSans} textAnchor="end">{p.price}</text>
              <text x="14" y="50" fontSize="20" fill={p.hl ? 'white' : palette.fg} fontWeight="700" fontFamily={fontSans}>{p.sold}</text>
              <text x={p.sold < 10 ? 32 : 46} y="50" fontSize="12" fill={p.hl ? '#a8a395' : palette.muted} fontFamily={fontSans}>/ {p.demand}</text>
              <rect x="14" y="60" width="122" height="4" rx="2" fill={p.hl ? '#3a4360' : palette.bg} />
              <rect x="14" y="60" width={122 * pct} height="4" rx="2" fill={palette.primary} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

const navItems = [
  { id: 'about-toc', label: 'Что такое ТОС' },
  { id: 'features', label: 'Что отрабатывается' },
  { id: 'audience', label: 'Для кого' },
  { id: 'how-to-play', label: 'Как играть' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.fg, fontFamily: fontSans }}>
      {/* Header — навигация + плавная анимация (#10, #11, #13) */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md transition-all duration-300"
        style={{
          background: scrolled ? `${palette.bg}f0` : `${palette.bg}cc`,
          borderBottom: `1px solid ${palette.border}`,
          boxShadow: scrolled ? '0 2px 8px rgba(17,25,45,0.06)' : 'none',
        }}
      >
        <div
          className="max-w-6xl mx-auto px-6 flex items-center justify-between transition-all duration-300"
          style={{ height: scrolled ? 56 : 72 }}
        >
          <Link href="/">
            <a className="flex items-center gap-3 transition-all">
              <img src={tessLogo} alt="Tess Technology" className="transition-all duration-300" style={{ height: scrolled ? 28 : 36 }} />
              <div
                className="hidden sm:block transition-all duration-300 overflow-hidden"
                style={{ maxHeight: scrolled ? 0 : 40, opacity: scrolled ? 0 : 1 }}
              >
                <div className="text-sm font-semibold leading-tight">Tess Technology</div>
                <div className="text-xs leading-tight" style={{ color: palette.muted }}>tesstech.ru</div>
              </div>
            </a>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: palette.fg }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <Link href="/play">
            <a
              data-testid="header-cta"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: palette.accent, color: palette.primaryFg, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
            >
              Играть
              <ArrowRight className="h-4 w-4" />
            </a>
          </Link>
        </div>
      </header>

      {/* Hero — двухколоночный, SVG на md+ (#1, #2, #4, #5) */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-12 sm:pt-16 lg:pt-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center">
          <div>
            {/* #2 — высокий контраст: dark fg на white background */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 tracking-wider uppercase"
              style={{ background: 'white', color: palette.fg, border: `1px solid ${palette.border}` }}
            >
              <Target className="h-3.5 w-3.5" style={{ color: palette.primary }} />
              По методологии Голдратта
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6"
              style={{ fontFamily: fontSerif, fontWeight: 700 }}
            >
              Освойте Теорию ограничений <span style={{ color: palette.primary }}>на практике</span>
            </h1>
            {/* #4 — короткий подзаголовок */}
            <p className="text-lg sm:text-xl leading-relaxed mb-8" style={{ color: palette.muted }}>
              Партия за 30 минут даёт практический опыт, которого нет ни в одной книге. Управляйте фабрикой, ищите узкое место, считайте throughput.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/play">
                <a
                  data-testid="hero-cta"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-base font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background: palette.accent, color: palette.primaryFg, boxShadow: '0 2px 6px rgba(17,25,45,0.2)' }}
                >
                  Начать игру
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Link>
              {/* #5 — заметная вторая кнопка */}
              <button
                onClick={() => scrollTo('how-to-play')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-base font-semibold transition-colors hover:bg-white/60"
                style={{ background: 'transparent', color: palette.fg, border: `2px solid ${palette.fg}` }}
              >
                Как играть
              </button>
            </div>
            <p className="text-sm mt-6" style={{ color: palette.muted }}>
              Бесплатно · Регистрация не нужна · 25–40 минут на партию
            </p>
          </div>

          {/* #1 — SVG на md+ */}
          <div className="hidden md:block">
            <div className="relative">
              <FactoryIllustration />
              <div
                className="absolute -bottom-3 -right-3 px-3 py-1.5 rounded-md text-xs font-semibold shadow-md"
                style={{ background: palette.fg, color: palette.primaryFg }}
              >
                ▶ интерактив
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip (#7 — упрощено) */}
      <section className="max-w-6xl mx-auto px-6 mb-16">
        <div className="rounded-xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: Clock, value: '5 дней', sub: 'игровая неделя' },
              { icon: Wallet, value: '10 000 ₽', sub: 'стартовый капитал' },
              { icon: Factory, value: '8 машин', sub: '19 станций' },
              { icon: Package, value: '3 продукта', sub: 'разная маржа и спрос' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="h-5 w-5 mx-auto mb-2" style={{ color: palette.primary }} />
                <div className="text-xl sm:text-2xl font-bold" style={{ color: palette.fg, fontFamily: fontSerif }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: palette.muted }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Что такое ТОС (#6 — упрощённый quote) */}
      <section id="about-toc" className="py-20" style={{ background: palette.card, borderTop: `1px solid ${palette.border}`, borderBottom: `1px solid ${palette.border}` }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
              Что такое Теория ограничений
            </h2>
            <p className="text-lg leading-relaxed max-w-3xl mx-auto" style={{ color: palette.muted }}>
              Подход к управлению, разработанный физиком Элияху Голдраттом в 1980-х. Изложен в его книге «Цель» (The Goal, 1984), переведённой на 30 языков и проданной тиражом более 7 миллионов экземпляров. Применяется в производстве, проектном управлении, разработке ПО, медицине и логистике.
            </p>
          </div>

          {/* Чистая типографская кавычка через CSS pseudo-element */}
          <figure
            className="relative rounded-xl p-10 md:p-14 mb-12"
            style={{
              background: palette.fg,
              backgroundImage: `radial-gradient(circle at 20% 0%, rgba(168,162,90,0.08), transparent 60%)`,
            }}
          >
            <span
              aria-hidden="true"
              className="absolute leading-none select-none"
              style={{
                top: 16, left: 24, fontFamily: fontSerif, fontSize: 140, lineHeight: 1,
                color: palette.primary, opacity: 0.3,
              }}
            >“</span>
            <blockquote
              className="relative text-xl md:text-2xl leading-relaxed text-center"
              style={{ color: palette.primaryFg, fontFamily: fontSerif }}
            >
              Производительность системы ограничена производительностью её самого медленного звена. Чтобы улучшить систему, нужно улучшить ограничение. Всё остальное — потеря времени.
            </blockquote>
            <figcaption className="text-center mt-6 text-sm" style={{ color: '#c8c0a8' }}>
              Элияху Голдратт
            </figcaption>
          </figure>

          <h3 className="text-xl font-bold mb-6 text-center tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
            Пять фокусирующих шагов Голдратта
          </h3>
          {/* #9 — на md делаем 3 колонки → 3+2 (вместо 2+2+1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { num: 'I', title: 'Найти ограничение', text: 'Определить, что именно сдерживает производительность всей системы' },
              { num: 'II', title: 'Использовать максимально', text: 'Выжать из узкого места всё, что возможно, без капитальных затрат' },
              { num: 'III', title: 'Подчинить остальное', text: 'Все прочие ресурсы работают в темпе ограничения, не быстрее' },
              { num: 'IV', title: 'Расширить ограничение', text: 'Если шагов II–III недостаточно — инвестировать в расширение узкого места' },
              { num: 'V', title: 'Повторить с начала', text: 'Когда ограничение снято — найти новое и не дать инерции стать ограничением' },
            ].map((step, i) => (
              <div key={i} className="rounded-lg p-5 transition-shadow hover:shadow-md" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
                <div className="text-3xl mb-2" style={{ fontFamily: fontSerif, color: palette.primary, fontWeight: 700 }}>{step.num}</div>
                <div className="font-semibold mb-2 text-sm">{step.title}</div>
                <p className="text-xs leading-relaxed" style={{ color: palette.muted }}>{step.text}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-sm" style={{ color: palette.muted }}>
            Симулятор воспроизводит классическую задачу <strong style={{ color: palette.fg }}>Product Mix Problem</strong> из курсов по ТОС — её решают на тренингах в крупных производственных компаниях с 1990-х годов.
          </p>
        </div>
      </section>

      {/* Что отрабатывается (#7, #10 — 6 features в 2x3 без отдельного flagship) */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
              Что отрабатывается за партию
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: palette.muted }}>
              Шесть концепций ТОС и операционного менеджмента — не в учебнике, а в управленческих решениях по ходу игры
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Target, title: 'Поиск узкого места', text: 'Производительность системы определяется самым медленным звеном. В игре вы видите, как очереди скапливаются перед бутылочным горлышком — и где именно теряются деньги.', flagship: true },
              { icon: TrendingUp, title: 'Throughput vs прибыль', text: 'Постоянные расходы 11 000 ₽ в неделю списываются вне зависимости от выпуска. Учитесь считать маржу не на единицу продукта, а на час работы узкого места.' },
              { icon: Factory, title: 'Управление переналадкой', text: 'Каждое переключение машины на другой продукт — потеря времени от 0 до 120 секунд. Учитесь, когда специализировать машину, а когда переключать.' },
              { icon: Package, title: 'Продуктовый микс', text: 'Три продукта с разной ценой, спросом и стоимостью сырья. Какие выпускать в каком объёме? Интуитивный ответ почти всегда ошибочный.' },
              { icon: Brain, title: 'Системное мышление', text: 'Локальная оптимизация не равна глобальной. Загруженная на 100% машина в неправильном месте только увеличивает запасы и не растит прибыль.' },
              { icon: Wallet, title: 'Решения под прессом', text: 'Каждый день нужно докупать сырьё, переставлять машины, реагировать на очереди. Знакомое ощущение реального операционного управления.' },
            ].map((f, i) => {
              const isFlag = f.flagship;
              return (
                <div
                  key={i}
                  className="p-6 rounded-lg transition-shadow hover:shadow-md relative"
                  style={{
                    background: isFlag ? palette.fg : palette.card,
                    border: `1px solid ${isFlag ? palette.fg : palette.border}`,
                    color: isFlag ? palette.primaryFg : palette.fg,
                  }}
                >
                  {isFlag && (
                    <div className="absolute -top-2 left-6 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                         style={{ background: palette.primary, color: palette.fg }}>
                      ГЛАВНОЕ
                    </div>
                  )}
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: isFlag ? 'rgba(168,162,90,0.18)' : palette.bg }}>
                    <f.icon className="h-5 w-5" style={{ color: palette.primary }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 tracking-tight" style={{ fontFamily: fontSans }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: isFlag ? '#c8c0a8' : palette.muted }}>{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Для кого */}
      <section id="audience" className="py-20" style={{ background: palette.card, borderTop: `1px solid ${palette.border}`, borderBottom: `1px solid ${palette.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
              Для кого
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: palette.muted }}>
              Игра построена под взрослую аудиторию. Без баллов и левелов — только реальные управленческие задачи
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Briefcase, title: 'Операционные директора и COO', text: 'Проверка интуиции на безопасной модели. Симулятор за час даёт то, что в реальном производстве доступно только годами проб и ошибок.' },
              { icon: GraduationCap, title: 'Бизнес-тренеры и преподаватели', text: 'Готовый инструмент для мастер-классов по ТОС, Lean и операционному менеджменту. Студенты не дочитывают «Цель» — но играют в фабрику с азартом.' },
              { icon: Users, title: 'Команды на стратегических сессиях', text: 'Соревнование между командами — кто заработает больше. Идеально для разогрева перед обсуждением своих узких мест в реальной компании.' },
            ].map((a, i) => (
              <div key={i} className="p-7 rounded-lg" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: palette.card }}>
                  <a.icon className="h-6 w-6" style={{ color: palette.primary }} />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>{a.title}</h3>
                <p className="leading-relaxed text-sm" style={{ color: palette.muted }}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как играть */}
      <section id="how-to-play" className="py-20" style={{ background: palette.fg, color: palette.bg }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: fontSans, color: palette.bg }}>
              Как играть
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#c8c0a8' }}>
              Четыре шага — и вы у руля собственной фабрики
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: '1', title: 'Расставьте станки', text: '8 машин 5 цветов. Каждая может работать на любой свободной станции, но переналадка требует времени.' },
              { num: '2', title: 'Закупите сырьё', text: '4 типа сырья по 20 ₽. Слишком мало — простой. Слишком много — заморозка денег.' },
              { num: '3', title: 'Запустите неделю', text: '5 рабочих дней по 8 минут реального времени. Можно ускорить ×10. Следите за очередями.' },
              { num: '4', title: 'Заработайте максимум', text: 'В пятницу — расчёт. Постоянка 11 000 ₽ списана. Сколько осталось? Больше — лучше.' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-5xl mb-3" style={{ fontFamily: fontSerif, color: palette.primary, fontWeight: 700 }}>{s.num}</div>
                <h3 className="text-xl font-bold mb-2 tracking-tight" style={{ fontFamily: fontSans }}>{s.title}</h3>
                <p className="leading-relaxed text-sm" style={{ color: '#c8c0a8' }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA (#11) */}
      <section className="py-20" style={{ background: palette.bg }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
            Готовы попробовать?
          </h2>
          <p className="text-lg mb-8" style={{ color: palette.muted }}>
            Партия занимает 25–40 минут. Регистрация не нужна. Результат сохраняется в общем рейтинге.
          </p>
          <Link href="/play">
            <a
              data-testid="footer-cta"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-md text-base font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: palette.accent, color: palette.primaryFg, boxShadow: '0 4px 12px rgba(17,25,45,0.25)' }}
            >
              Начать игру
              <ArrowRight className="h-5 w-5" />
            </a>
          </Link>
        </div>
      </section>

      {/* Footer (#12 — без операционной строки) */}
      <footer className="py-12" style={{ background: palette.card, borderTop: `1px solid ${palette.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={tessLogo} alt="Tess Technology" className="h-7 w-auto" />
                <div className="text-sm font-bold">Tess Technology</div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: palette.muted }}>
                Аналитика, операционная эффективность и обучающие продукты для российских компаний.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: palette.fg }}>Продукт</h4>
              <ul className="space-y-2 text-sm" style={{ color: palette.muted }}>
                <li><Link href="/"><a className="hover:underline">Главная</a></Link></li>
                <li><Link href="/play"><a className="hover:underline">Играть</a></Link></li>
                <li><Link href="/about"><a className="hover:underline">О программе</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: palette.fg }}>Юридическое</h4>
              <ul className="space-y-2 text-sm" style={{ color: palette.muted }}>
                <li><a href="/legal/eula" className="hover:underline">Лицензия (EULA)</a></li>
                <li><a href="/legal/oferta" className="hover:underline">Публичная оферта</a></li>
                <li><a href="/legal/privacy" className="hover:underline">Политика ПДн</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: palette.fg }}>Связаться</h4>
              <ul className="space-y-2 text-sm" style={{ color: palette.muted }}>
                <li><a href="mailto:mail@tesstech.ru" className="hover:underline">mail@tesstech.ru</a></li>
                <li><a href="tel:+79167290716" className="hover:underline">+7 (916) 729-07-16</a></li>
                <li><a href="https://tesstech.ru" className="hover:underline">tesstech.ru</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ borderColor: palette.border, color: palette.muted }}>
            <div className="text-center sm:text-left">
              © 2026 ООО «ТЕСС ТЕХНОЛОДЖИ» · ОГРН 1177746806181 · ИНН 7702421130
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
