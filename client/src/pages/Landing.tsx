import { useState, useEffect, Fragment } from 'react';
import { Link } from 'wouter';
import {
  Target, TrendingUp, Factory, Brain, Briefcase, GraduationCap, Users,
  ArrowRight, Clock, Wallet, Package, ChevronRight,
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

// SVG mockup игровой панели — с анимацией значений (#2)
function FactoryIllustration() {
  // #2 — псевдо-анимация: чередуем 2 кадра состояния игры
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % 2), 2400);
    return () => clearInterval(t);
  }, []);

  const states = [
    { day: '3', time: '04:32', cash: '22 480 ₽', a: 12, d: 28, f: 8 },
    { day: '4', time: '02:18', cash: '28 760 ₽', a: 18, d: 35, f: 13 },
  ];
  const s = states[frame];

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
        <text x="20" y="36" fontSize="16" fill="white" fontWeight="700" fontFamily={fontSans} style={{ transition: 'opacity 0.4s' }}>{s.day}</text>
        <text x="80" y="18" fontSize="9" fill="#a8a395" fontFamily={fontSans} letterSpacing="1">ВРЕМЯ</text>
        <text x="80" y="36" fontSize="16" fill="white" fontWeight="700" fontFamily={fontSans}>{s.time}</text>
        <text x="180" y="18" fontSize="9" fill="#a8a395" fontFamily={fontSans} letterSpacing="1">×СКОРОСТЬ</text>
        <text x="180" y="36" fontSize="16" fill={palette.primary} fontWeight="700" fontFamily={fontSans}>×10</text>
        <text x="460" y="18" fontSize="9" fill="#a8a395" fontFamily={fontSans} letterSpacing="1" textAnchor="end">КАССА</text>
        <text x="460" y="36" fontSize="16" fill="white" fontWeight="700" fontFamily={fontSans} textAnchor="end">{s.cash}</text>
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
          { id: 'A', price: '180 ₽', sold: s.a, demand: 40, hl: false },
          { id: 'D', price: '240 ₽', sold: s.d, demand: 50, hl: true },
          { id: 'F', price: '180 ₽', sold: s.f, demand: 40, hl: false },
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
              <rect x="14" y="60" width={122 * pct} height="4" rx="2" fill={palette.primary} style={{ transition: 'width 0.6s' }} />
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
  const [mobileFooter, setMobileFooter] = useState(false); // #9
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
      {/* Header */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md transition-all duration-300"
        style={{
          background: scrolled ? `${palette.bg}f0` : `${palette.bg}cc`,
          borderBottom: `1px solid ${palette.border}`,
          boxShadow: scrolled ? '0 2px 8px rgba(17,25,45,0.06)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between transition-all duration-300" style={{ height: scrolled ? 56 : 72 }}>
          <Link href="/">
            <a className="flex items-center gap-3 transition-all">
              <img src={tessLogo} alt="Tess Technology" className="transition-all duration-300" style={{ height: scrolled ? 28 : 36 }} />
              <div className="hidden sm:block transition-all duration-300 overflow-hidden" style={{ maxHeight: scrolled ? 0 : 40, opacity: scrolled ? 0 : 1 }}>
                <div className="text-sm font-semibold leading-tight">Tess Technology</div>
                <div className="text-xs leading-tight" style={{ color: palette.muted }}>tesstech.ru</div>
              </div>
            </a>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: palette.fg }}>
                {item.label}
              </button>
            ))}
          </nav>

          <Link href="/play">
            <a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all hover:-translate-y-0.5" style={{ background: palette.accent, color: palette.primaryFg, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              Играть <ArrowRight className="h-4 w-4" />
            </a>
          </Link>
        </div>
      </header>

      {/* Hero — двухколоночный (#10 — на md SVG поменьше) */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-10 sm:pt-16 lg:pt-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 tracking-wider uppercase" style={{ background: 'white', color: palette.fg, border: `1px solid ${palette.border}` }}>
              <Target className="h-3.5 w-3.5" style={{ color: palette.primary }} />
              По методологии Голдратта
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6" style={{ fontFamily: fontSerif, fontWeight: 700 }}>
              Освойте Теорию ограничений <span style={{ color: palette.primary }}>на практике</span>
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed mb-8" style={{ color: palette.muted }}>
              Партия за 30 минут даёт практический опыт, которого нет ни в одной книге. Управляйте фабрикой, ищите узкое место, считайте throughput.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/play">
                <a className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-base font-semibold transition-all hover:-translate-y-0.5" style={{ background: palette.accent, color: palette.primaryFg, boxShadow: '0 2px 6px rgba(17,25,45,0.2)' }}>
                  Начать игру <ArrowRight className="h-5 w-5" />
                </a>
              </Link>
              <button onClick={() => scrollTo('how-to-play')} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-md text-base font-semibold transition-colors hover:bg-white/60" style={{ background: 'transparent', color: palette.fg, border: `2px solid ${palette.fg}` }}>
                Как играть
              </button>
            </div>
            <p className="text-sm mt-6" style={{ color: palette.muted }}>
              Бесплатно · Регистрация не нужна · 25–40 минут на партию
            </p>
          </div>

          {/* SVG — на md компактнее (#10), без интерактив-badge (#1) */}
          <div className="hidden md:block">
            <Link href="/play">
              <a className="block transition-transform hover:-translate-y-1" style={{ maxWidth: 480, marginLeft: 'auto' }}>
                <FactoryIllustration />
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Stat-trinity (#4) — горизонтальная линия с разделителями вместо карточек */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <div className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-3 gap-y-3 text-sm sm:text-base" style={{ color: palette.muted }}>
          {[
            { value: '5 дней', label: 'игровая неделя' },
            { value: '10 000 ₽', label: 'старт' },
            { value: '8 машин', label: '19 станций' },
            { value: '3 продукта', label: 'разная маржа' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-1 sm:gap-3">
              {i > 0 && <span className="opacity-40 px-1 sm:px-2">·</span>}
              <span className="font-bold" style={{ color: palette.fg, fontFamily: fontSerif }}>{s.value}</span>
              <span className="opacity-80">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Что такое ТОС */}
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

          {/* #3 Quote — упрощённый: левое выравнивание, без декоративной кавычки, имя справа с чертой */}
          <figure className="rounded-xl p-10 md:p-14 mb-12" style={{ background: palette.fg }}>
            <blockquote className="text-xl md:text-2xl leading-relaxed" style={{ color: palette.primaryFg, fontFamily: fontSerif }}>
              Производительность системы ограничена производительностью её самого медленного звена. Чтобы улучшить систему, нужно улучшить ограничение. Всё остальное — потеря времени.
            </blockquote>
            <figcaption className="flex items-center justify-end gap-3 mt-6 text-sm tracking-wider" style={{ color: '#c8c0a8' }}>
              <span className="h-px w-12" style={{ background: palette.primary }} />
              Элияху Голдратт
            </figcaption>
          </figure>

          <h3 className="text-xl font-bold mb-8 text-center tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
            Пять фокусирующих шагов Голдратта
          </h3>
          {(() => {
            const goldrattSteps = [
              { num: 'I', title: 'Найти ограничение', text: 'Что сдерживает производительность всей системы' },
              { num: 'II', title: 'Использовать максимально', text: 'Выжать из узкого места всё, без капитальных затрат' },
              { num: 'III', title: 'Подчинить остальное', text: 'Все прочие ресурсы работают в темпе ограничения' },
              { num: 'IV', title: 'Расширить ограничение', text: 'Если шагов II–III мало — инвестировать в его расширение' },
              { num: 'V', title: 'Повторить с начала', text: 'Когда ограничение снято — найти новое' },
            ];
            const card = (step: typeof goldrattSteps[number]) => (
              <div className="rounded-lg p-5 h-full flex flex-col" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
                <div className="text-3xl mb-2" style={{ fontFamily: fontSerif, color: palette.primary, fontWeight: 700 }}>{step.num}</div>
                <div className="font-semibold mb-2 text-sm">{step.title}</div>
                <p className="text-xs leading-relaxed" style={{ color: palette.muted }}>{step.text}</p>
              </div>
            );
            return (
              <>
                {/* Desktop: flex с фикс-стрелками между карточками */}
                <div className="hidden lg:flex items-stretch gap-3">
                  {goldrattSteps.map((step, i) => (
                    <Fragment key={i}>
                      <div className="flex-1 min-w-0">{card(step)}</div>
                      {i < 4 && (
                        <div className="flex items-center" style={{ width: 24 }}>
                          <ChevronRight className="h-6 w-6" style={{ color: palette.muted, opacity: 0.5 }} />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
                {/* Mobile/tablet: обычный grid без стрелок */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {goldrattSteps.map((step, i) => (
                    <div key={i}>{card(step)}</div>
                  ))}
                </div>
              </>
            );
          })()}

          <p className="text-center mt-10 text-sm" style={{ color: palette.muted }}>
            Симулятор воспроизводит классическую задачу <strong style={{ color: palette.fg }}>Product Mix Problem</strong> из курсов по ТОС — её решают на тренингах в крупных производственных компаниях с 1990-х годов.
          </p>
        </div>
      </section>

      {/* Что отрабатывается (#8 — number badge вместо ГЛАВНОЕ, #6 — баланс палитры) */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
              Что отрабатывается за партию
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Target, title: 'Поиск узкого места', text: 'Производительность системы определяется самым медленным звеном. В игре вы видите, как очереди скапливаются перед бутылочным горлышком — и где именно теряются деньги.', flagship: true },
              { icon: TrendingUp, title: 'Throughput vs прибыль', text: 'Постоянные расходы 11 000 ₽ в неделю списываются вне зависимости от выпуска. Учитесь считать маржу не на единицу продукта, а на час работы узкого места.' },
              { icon: Factory, title: 'Управление переналадкой', text: 'Каждое переключение машины на другой продукт — потеря времени. Учитесь, когда специализировать машину, а когда переключать.' },
              { icon: Package, title: 'Продуктовый микс', text: 'Три продукта с разной ценой, спросом и стоимостью сырья. Какие выпускать в каком объёме? Интуитивный ответ почти всегда ошибочный.' },
              { icon: Brain, title: 'Системное мышление', text: 'Локальная оптимизация не равна глобальной. Загруженная на 100% машина в неправильном месте только увеличивает запасы и не растит прибыль.' },
              { icon: Wallet, title: 'Решения под прессом', text: 'Каждый день нужно докупать сырьё, переставлять машины, реагировать на очереди. Знакомое ощущение реального операционного управления.' },
            ].map((f, i) => {
              const isFlag = f.flagship;
              return (
                <div key={i} className="p-6 rounded-lg transition-shadow hover:shadow-md relative" style={{
                  background: isFlag ? palette.fg : palette.card,
                  border: `1px solid ${isFlag ? palette.fg : palette.border}`,
                  color: isFlag ? palette.primaryFg : palette.fg,
                }}>
                  {/* #8 — number badge 01 вместо «ГЛАВНОЕ» */}
                  {isFlag && (
                    <div className="absolute -top-3 left-6 px-3 py-1 rounded text-xs font-bold tracking-wider" style={{ background: palette.primary, color: palette.fg, fontFamily: fontSerif }}>
                      01
                    </div>
                  )}
                  {/* #6 — для не-flagship иконки в индиго (не олива) для баланса */}
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: isFlag ? 'rgba(168,162,90,0.18)' : palette.bg }}>
                    <f.icon className="h-5 w-5" style={{ color: isFlag ? palette.primary : palette.fg }} />
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Briefcase, title: 'Операционные директора и COO', text: 'Проверка интуиции на безопасной модели. Симулятор за час даёт то, что в реальном производстве доступно только годами проб и ошибок.' },
              { icon: GraduationCap, title: 'Бизнес-тренеры и преподаватели', text: 'Готовый инструмент для мастер-классов по ТОС, Lean и операционному менеджменту.' },
              { icon: Users, title: 'Команды на стратегических сессиях', text: 'Соревнование между командами — кто заработает больше. Идеально для разогрева перед обсуждением своих ограничений в реальной компании.' },
            ].map((a, i) => (
              <div key={i} className="p-7 rounded-lg" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: palette.card }}>
                  {/* #6 — индиго иконки в audience cards */}
                  <a.icon className="h-6 w-6" style={{ color: palette.fg }} />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>{a.title}</h3>
                <p className="leading-relaxed text-sm" style={{ color: palette.muted }}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как играть — со стрелками между шагами (#5) */}
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
          {(() => {
            const howSteps = [
              { num: '1', title: 'Расставьте станки', text: '8 машин 5 цветов. Каждая может работать на любой свободной станции, но переналадка требует времени.' },
              { num: '2', title: 'Закупите сырьё', text: '4 типа сырья по 20 ₽. Слишком мало — простой. Слишком много — заморозка денег.' },
              { num: '3', title: 'Запустите неделю', text: '5 рабочих дней по 8 минут реального времени. Можно ускорить ×10. Следите за очередями.' },
              { num: '4', title: 'Заработайте максимум', text: 'В пятницу — расчёт. Постоянка 11 000 ₽ списана. Сколько осталось? Больше — лучше.' },
            ];
            const stepCard = (step: typeof howSteps[number]) => (
              <div>
                <div className="text-5xl mb-3" style={{ fontFamily: fontSerif, color: palette.primary, fontWeight: 700 }}>{step.num}</div>
                <h3 className="text-xl font-bold mb-2 tracking-tight" style={{ fontFamily: fontSans }}>{step.title}</h3>
                <p className="leading-relaxed text-sm" style={{ color: '#c8c0a8' }}>{step.text}</p>
              </div>
            );
            return (
              <>
                <div className="hidden lg:flex items-start gap-6">
                  {howSteps.map((step, i) => (
                    <Fragment key={i}>
                      <div className="flex-1 min-w-0">{stepCard(step)}</div>
                      {i < 3 && (
                        <div className="flex items-center pt-7" style={{ width: 24 }}>
                          <ChevronRight className="h-6 w-6" style={{ color: palette.primary, opacity: 0.6 }} />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-8">
                  {howSteps.map((step, i) => (
                    <div key={i}>{stepCard(step)}</div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Final CTA (#7 — новый текст без повторов) */}
      <section className="py-24" style={{ background: palette.bg }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: fontSans, color: palette.fg }}>
            Готовы попробовать?
          </h2>
          <p className="text-lg mb-8" style={{ color: palette.muted }}>
            Один раз сыграешь — и больше не будешь смотреть на работу как раньше.
          </p>
          <Link href="/play">
            <a className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-md text-base font-semibold transition-all hover:-translate-y-0.5" style={{ background: palette.accent, color: palette.primaryFg, boxShadow: '0 4px 12px rgba(17,25,45,0.25)' }}>
              Начать игру <ArrowRight className="h-5 w-5" />
            </a>
          </Link>
        </div>
      </section>

      {/* Footer (#9 — collapsible на mobile) */}
      <footer className="py-12" style={{ background: palette.card, borderTop: `1px solid ${palette.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* На md+ — открытый sitemap, на mobile — collapsible */}
          <div className="md:grid md:grid-cols-4 md:gap-8 mb-8 space-y-4 md:space-y-0">
            <div className="md:block">
              <div className="flex items-center gap-2 mb-4">
                <img src={tessLogo} alt="Tess Technology" className="h-7 w-auto" />
                <div className="text-sm font-bold">Tess Technology</div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: palette.muted }}>
                Аналитика, операционная эффективность и обучающие продукты для российских компаний.
              </p>
            </div>

            {/* Mobile collapsible toggle */}
            <button
              className="md:hidden w-full flex items-center justify-between py-3 border-y text-sm font-bold tracking-wider uppercase"
              style={{ borderColor: palette.border, color: palette.fg }}
              onClick={() => setMobileFooter(v => !v)}
            >
              <span>Навигация и контакты</span>
              <ChevronRight className="h-4 w-4 transition-transform" style={{ transform: mobileFooter ? 'rotate(90deg)' : 'none' }} />
            </button>

            <div className={`${mobileFooter ? 'block' : 'hidden'} md:block`}>
              <h4 className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: palette.fg }}>Продукт</h4>
              <ul className="space-y-2 text-sm" style={{ color: palette.muted }}>
                <li><Link href="/"><a className="hover:underline">Главная</a></Link></li>
                <li><Link href="/play"><a className="hover:underline">Играть</a></Link></li>
                <li><Link href="/about"><a className="hover:underline">О программе</a></Link></li>
              </ul>
            </div>
            <div className={`${mobileFooter ? 'block' : 'hidden'} md:block`}>
              <h4 className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: palette.fg }}>Юридическое</h4>
              <ul className="space-y-2 text-sm" style={{ color: palette.muted }}>
                <li><a href="/legal/eula" className="hover:underline">Лицензия (EULA)</a></li>
                <li><a href="/legal/oferta" className="hover:underline">Публичная оферта</a></li>
                <li><a href="/legal/privacy" className="hover:underline">Политика ПДн</a></li>
              </ul>
            </div>
            <div className={`${mobileFooter ? 'block' : 'hidden'} md:block`}>
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
