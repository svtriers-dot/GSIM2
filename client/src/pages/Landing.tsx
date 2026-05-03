import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  DollarSign,
  Package,
} from 'lucide-react';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={tessLogo} alt="Tess Technology" className="h-9 w-auto" />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">Tess Technology</div>
              <div className="text-xs text-slate-500">tesstech.ru</div>
            </div>
          </div>
          <Link href="/play">
            <Button data-testid="header-cta" size="sm">
              Играть
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
            <Target className="h-4 w-4" />
            Симулятор Теории Ограничений
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
            Найдите узкое место.
            <br />
            <span className="text-blue-600">Заработайте за 5 дней.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed">
            Управляйте виртуальной фабрикой, расставляйте станки, выбирайте
            продуктовый микс. Цель — максимум прибыли при ограниченных ресурсах
            и времени. Учебная игра по методологии Элияху Голдратта.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/play">
              <Button data-testid="hero-cta" size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                Начать игру
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-6"
              onClick={() => document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Как играть
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-6">
            Бесплатно · Регистрация не нужна · 25–40 минут на партию
          </p>
        </div>
      </section>

      {/* Features — Что вы изучите */}
      <section className="bg-white border-y border-slate-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Что вы изучите за одну партию
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              5 базовых концепций операционного менеджмента — на практике, а не в учебнике.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Поиск узкого места</h3>
              <p className="text-slate-600 leading-relaxed">
                Производительность системы определяется самым медленным звеном.
                В игре вы увидите, как очереди скапливаются перед бутылочным
                горлышком и где теряются деньги.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Throughput vs прибыль</h3>
              <p className="text-slate-600 leading-relaxed">
                Постоянные расходы $11 000 в неделю списываются вне зависимости
                от выпуска. Учитесь считать маржу не на единицу продукта,
                а на час работы узкого места.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center mb-4">
                <Factory className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Управление переналадкой</h3>
              <p className="text-slate-600 leading-relaxed">
                Каждое переключение машины на другой продукт — это потеря
                времени. От 0 до 120 секунд. Узнаете, когда выгоднее
                специализировать машину, а когда — переключать.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Продуктовый микс</h3>
              <p className="text-slate-600 leading-relaxed">
                Три продукта с разной ценой, спросом и стоимостью сырья.
                Какие выпускать в каком объёме? Интуитивный ответ почти всегда
                ошибочный — игра научит считать.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Системное мышление</h3>
              <p className="text-slate-600 leading-relaxed">
                Локальная оптимизация ≠ глобальная. Загруженная на 100% машина
                в неправильном месте только увеличивает запасы и ухудшает
                итог. Игра показывает это наглядно.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Решения под прессом</h3>
              <p className="text-slate-600 leading-relaxed">
                Каждый день нужно докупать сырьё, переставлять машины,
                реагировать на очереди. Знакомое ощущение — как в реальном
                операционном управлении.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Для кого */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Для кого</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Игра построена под взрослую аудиторию. Без баллов и левелов —
              только реальные управленческие задачи.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-7">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-slate-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Операционные директора и COO
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Проверка интуиции на безопасной модели. Симулятор за час даёт
                то, что в реальном производстве доступно только годами проб
                и ошибок.
              </p>
            </Card>
            <Card className="p-7">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-slate-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Бизнес-тренеры и преподаватели
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Готовый инструмент для мастер-классов по ТОС, Lean и теории
                ограничений. Студенты не дочитывают «Цель» — но играют
                в фабрику с азартом.
              </p>
            </Card>
            <Card className="p-7">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-slate-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Команды на стратегических сессиях
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Соревнование между командами — кто заработает больше.
                Идеально для разогрева перед обсуждением своих узких мест
                в реальной компании.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Как играть */}
      <section id="how-to-play" className="bg-slate-900 text-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Как играть</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              4 шага — и вы у руля собственной фабрики.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-5xl font-bold text-blue-400 mb-3">1</div>
              <h3 className="text-xl font-semibold mb-2">Расставьте станки</h3>
              <p className="text-slate-400 leading-relaxed">
                8 машин 5 цветов. Каждая может работать на любой свободной
                станции, но переналадка требует времени.
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-400 mb-3">2</div>
              <h3 className="text-xl font-semibold mb-2">Закупите сырьё</h3>
              <p className="text-slate-400 leading-relaxed">
                4 типа сырья по $20. Слишком мало — простой. Слишком много —
                заморозка денег и постоянка съест.
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-400 mb-3">3</div>
              <h3 className="text-xl font-semibold mb-2">Запустите неделю</h3>
              <p className="text-slate-400 leading-relaxed">
                5 рабочих дней по 8 минут реального времени. Можно ускорить ×10.
                Следите за очередями и докупайте сырьё на ходу.
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold text-blue-400 mb-3">4</div>
              <h3 className="text-xl font-semibold mb-2">Заработайте максимум</h3>
              <p className="text-slate-400 leading-relaxed">
                В пятницу вечером — расчёт. Постоянка $11 000 списана.
                Сколько осталось на счёте? Больше — лучше.
              </p>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <Clock className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">5 дней</div>
              <div className="text-xs text-slate-400">по 8 минут</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">$10 000</div>
              <div className="text-xs text-slate-400">старт</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <Factory className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">8 машин</div>
              <div className="text-xs text-slate-400">5 цветов</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <Package className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">3</div>
              <div className="text-xs text-slate-400">продукта</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Готовы попробовать?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Партия занимает 25–40 минут. Регистрация не нужна.
            Результат сохраняется в общем рейтинге.
          </p>
          <Link href="/play">
            <Button
              data-testid="footer-cta"
              size="lg"
              variant="secondary"
              className="text-base px-10 py-6"
            >
              Начать игру
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <img src={tessLogo} alt="Tess Technology" className="h-6 w-auto opacity-70" />
            <span>© 2026 ООО «Тесс Технолоджи»</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://tesstech.ru" className="hover:text-slate-900 transition-colors">
              tesstech.ru
            </a>
            <span className="text-slate-400">·</span>
            <span>Симулятор ТОС</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
