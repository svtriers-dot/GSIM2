import { Link } from "wouter";

export default function TrainerLearn() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex gap-4 text-sm">
            <Link href="/trainer/onboarding" className="text-muted-foreground hover:underline">
              ← К онбордингу
            </Link>
            <Link href="/" className="text-muted-foreground hover:underline">
              На главную
            </Link>
          </div>
          <h1 className="text-2xl font-semibold mt-2">Теория ограничений (ТОС) — кратко</h1>
          <p className="text-sm text-muted-foreground mt-1">
            5 минут чтения. Затем сможете пройти квиз.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Главная идея</h2>
          <p className="text-sm leading-relaxed">
            Любая система имеет хотя бы одно <strong>ограничение</strong> (узкое место,
            bottleneck) — ресурс, который определяет максимальную скорость работы всей
            системы. Усиление любого другого звена не повышает производительность; только
            работа с ограничением даёт реальный эффект.
          </p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">5 шагов Голдратта (POOGI)</h2>
          <ol className="text-sm leading-relaxed space-y-2 pl-6 list-decimal">
            <li>
              <strong>Identify</strong> — найти ограничение системы. В производстве — станция
              с самой длинной очередью. В продажах — этап воронки с минимальной конверсией.
            </li>
            <li>
              <strong>Exploit</strong> — максимально использовать ограничение. Никаких
              простоев, перерывов, переналадок впустую. Каждая минута работы узкого места
              превращается в throughput всей системы.
            </li>
            <li>
              <strong>Subordinate</strong> — подчинить остальное решению по ограничению.
              Не-узкие ресурсы должны работать в темпе ограничения, иначе раздуют WIP.
              Локальная эффективность ≠ глобальная.
            </li>
            <li>
              <strong>Elevate</strong> — расширить ограничение, если шагов 2–3 недостаточно
              (купить ещё один станок, нанять людей).
            </li>
            <li>
              <strong>Repeat</strong> — найти новое ограничение и не дать инерции стать
              новым ограничением (например, политика «загрузить всех на 100%»).
            </li>
          </ol>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Три ключевые метрики</h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Throughput (T)</strong> — деньги, которые система генерирует через
              продажи. Формула:{" "}
              <code className="px-1 bg-elevate-1 rounded">T = revenue − raw_material_cost</code>.
              По Голдратту — главная цель максимизации.
            </div>
            <div>
              <strong>Inventory (I)</strong> — деньги, которые система вложила в ресурсы
              для продажи (полуфабрикаты, готовая продукция, материалы). Меньше — лучше.
            </div>
            <div>
              <strong>Operating Expense (OE)</strong> — деньги, которые система тратит для
              превращения inventory в throughput. Снижают{" "}
              <em>после</em> того как throughput максимизирован, не до.
            </div>
            <div className="pt-2">
              <strong>Прибыль = T − OE</strong>. Если cash в минусе на дашборде команды — это
              сигнал: throughput системы меньше операционных расходов.
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Как вести мастер-класс</h2>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              <strong>Сократический метод.</strong> Тренер не даёт готовых ответов. Вопросы:
              «Где сейчас ваше узкое место?», «Что будет если…?», «Почему cash в минусе?».
              Команда должна догадаться сама.
            </p>
            <p>
              <strong>Несколько раундов.</strong> Первый раунд — знакомство (часто все в
              минусе). Дебриф: показать узкие места. Второй раунд — применение знаний.
              Сравнение результатов раундов = главный wow-эффект.
            </p>
            <p>
              <strong>Дебриф важнее игры.</strong> Останавливайтесь на ключевых моментах,
              делайте snapshot, обсуждайте решения. 30 минут игры + 30 минут дебрифа лучше,
              чем 60 минут безостановочной игры.
            </p>
          </div>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Что делать дальше</h2>
          <ol className="text-sm space-y-2 pl-6 list-decimal">
            <li>
              <Link href="/play?practice=1" className="text-primary hover:underline font-medium">
                Сыграть пробный раунд
              </Link>
              {" "}— достичь итогового cash $14k+ за 5 дней.
            </li>
            <li>
              <Link href="/trainer/quiz" className="text-primary hover:underline font-medium">
                Пройти квиз (5/7 минимум)
              </Link>
              {" "}— проверка знаний ТОС.
            </li>
            <li>Дождаться апрува суперадмина — после этого получаете сертификат и можете создавать сессии.</li>
          </ol>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          Полная теория — книга Элияху Голдратта «Цель» (1984) и «Цель-2» (1990).
        </p>
      </main>
    </div>
  );
}
