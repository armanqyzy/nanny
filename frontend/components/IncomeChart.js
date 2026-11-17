import { useState } from 'react';

const TITLE = { en: 'Income by month', ru: 'Доход по месяцам', kz: 'Айлар бойынша табыс' };
function bookingsWord(n, language) {
  if (language === 'ru') {
    const m10 = n % 10; const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'бронь';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'брони';
    return 'броней';
  }
  if (language === 'kz') return 'брондау';
  return n === 1 ? 'booking' : 'bookings';
}
const EMPTY = { en: 'No completed bookings in the last 6 months yet.', ru: 'За последние 6 месяцев пока нет выполненных броней.', kz: 'Соңғы 6 айда аяқталған брондау әлі жоқ.' };

// Single-series bar chart of a sitter's completed-booking income for the last 6 months.
export default function IncomeChart({ data = [], language = 'en' }) {
  const [hover, setHover] = useState(null);
  const locale = language === 'ru' ? 'ru-RU' : language === 'kz' ? 'kk-KZ' : 'en-US';
  const max = Math.max(0, ...data.map((row) => Number(row.total) || 0));
  const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString(locale, { month: 'short' });
  const current = data[data.length - 1];
  const shown = hover ?? current;

  return (
    <section className="card mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">{TITLE[language] || TITLE.en}</p>
          {shown && (
            <p className="mt-2 text-2xl font-bold text-nanny-brownish">
              {Number(shown.total).toLocaleString(locale)} ₸
              <span className="ml-2 text-sm font-normal opacity-60">
                {new Date(`${shown.month}-01T00:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })} • {shown.bookings} {bookingsWord(shown.bookings, language)}
              </span>
            </p>
          )}
        </div>
      </div>

      {max === 0 ? (
        <p className="mt-4 text-sm opacity-60">{EMPTY[language] || EMPTY.en}</p>
      ) : (
        <div className="mt-5 grid h-40 grid-cols-6 items-end gap-3 border-b border-nanny-brownish/15" role="img"
             aria-label={data.map((row) => `${monthLabel(row.month)}: ${row.total}`).join(', ')}>
          {data.map((row) => {
            const height = max ? Math.max(row.total > 0 ? 4 : 0, (Number(row.total) / max) * 100) : 0;
            const active = hover?.month === row.month;
            return (
              // The whole column is the hover target, bigger than the bar itself.
              <button key={row.month} type="button" className="flex h-full flex-col justify-end"
                      onMouseEnter={() => setHover(row)} onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(row)} onBlur={() => setHover(null)}
                      aria-label={`${monthLabel(row.month)}: ${Number(row.total).toLocaleString(locale)} ₸`}>
                <span className={`mx-auto block w-full max-w-[40px] rounded-t ${active ? 'bg-nanny-deepOrange' : 'bg-nanny-orange'}`}
                      style={{ height: `${height}%` }} />
              </button>
            );
          })}
        </div>
      )}
      {max > 0 && (
        <div className="mt-2 grid grid-cols-6 gap-3 text-center text-xs opacity-60">
          {data.map((row) => <span key={row.month}>{monthLabel(row.month)}</span>)}
        </div>
      )}
    </section>
  );
}
