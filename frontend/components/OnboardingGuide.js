import Link from 'next/link';

const COPY = {
  en: { title: 'Welcome to Nanny!', subtitle: 'Three steps and you are ready.', done: 'Done', go: 'Go', later: 'Later', finish: 'Got it', progress: (a, b) => `${a} of ${b} done` },
  ru: { title: 'Добро пожаловать в Nanny!', subtitle: 'Три шага, и всё готово.', done: 'Готово', go: 'Перейти', later: 'Позже', finish: 'Понятно', progress: (a, b) => `Выполнено ${a} из ${b}` },
  kz: { title: 'Nanny-ге қош келдіңіз!', subtitle: 'Үш қадам, және бәрі дайын.', done: 'Дайын', go: 'Өту', later: 'Кейінірек', finish: 'Түсінікті', progress: (a, b) => `${b} ішінен ${a} орындалды` },
};

// First-visit guide on the dashboard. Steps are ticked from real data (pets, bookings, profile).
export default function OnboardingGuide({ steps, language = 'en', onClose }) {
  const t = COPY[language] || COPY.en;
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <img src="/pet-placeholder.png" alt="" aria-hidden="true" className="h-16 w-16 object-contain" />
          <div>
            <h3 className="text-2xl font-bold text-nanny-blue">{t.title}</h3>
            <p className="text-sm opacity-70">{t.subtitle}</p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-nanny-cream">
          <div className="h-full rounded-full bg-nanny-orange transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs opacity-60">{t.progress(doneCount, steps.length)}</p>

        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className={`flex items-center gap-3 rounded-2xl border p-3 ${step.done ? 'border-green-200 bg-green-50' : 'border-nanny-orange/15 bg-[#fffaf3]'}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? 'bg-green-500 text-white' : 'bg-nanny-orange text-white'}`}>
                {step.done ? '✓' : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{step.title}</p>
                <p className="text-xs opacity-70">{step.text}</p>
              </div>
              {step.done ? (
                <span className="text-xs font-semibold text-green-700">{t.done}</span>
              ) : (
                <Link href={step.href} className="btn-ghost shrink-0 text-xs" onClick={onClose}>{t.go}</Link>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost text-sm" onClick={onClose}>{doneCount === steps.length ? t.finish : t.later}</button>
        </div>
      </div>
    </div>
  );
}
