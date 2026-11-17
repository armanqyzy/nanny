import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { todayInAppTimeZone } from '../lib/date';

const TEXT = {
  en: {
    title: 'Availability', subtitle: 'Mark days you do not work and pause new requests while you are away.',
    vacationOn: 'You are on a break: you are hidden from search and owners cannot book you.',
    vacationOff: 'You are accepting new bookings.',
    pause: 'Pause new bookings', resume: 'Accept bookings again',
    daysOff: 'Days off', addDay: 'Add day off', noDays: 'No days off yet.',
    save: 'Save days off', saved: 'Saved.', remove: 'Remove',
  },
  ru: {
    title: 'Доступность', subtitle: 'Отметьте дни, когда вы не работаете, и приостановите заявки на время отпуска.',
    vacationOn: 'Вы на паузе: вас не видно в поиске и вас нельзя забронировать.',
    vacationOff: 'Вы принимаете новые заявки.',
    pause: 'Не принимать заказы', resume: 'Снова принимать заказы',
    daysOff: 'Выходные дни', addDay: 'Добавить выходной', noDays: 'Выходных пока нет.',
    save: 'Сохранить выходные', saved: 'Сохранено.', remove: 'Убрать',
  },
  kz: {
    title: 'Қолжетімділік', subtitle: 'Жұмыс істемейтін күндерді белгілеп, демалыс кезінде өтінімдерді тоқтатыңыз.',
    vacationOn: 'Сіз үзілістесіз: іздеуде көрінбейсіз және сізді брондауға болмайды.',
    vacationOff: 'Сіз жаңа өтінімдерді қабылдайсыз.',
    pause: 'Тапсырыс қабылдамау', resume: 'Қайта қабылдау',
    daysOff: 'Демалыс күндері', addDay: 'Демалыс қосу', noDays: 'Демалыс күндері әлі жоқ.',
    save: 'Демалысты сақтау', saved: 'Сақталды.', remove: 'Алу',
  },
};

// Sitter-only panel on the dashboard: vacation toggle + list of days off.
export default function SitterAvailabilityPanel({ sitter, language = 'en', onSitterChange }) {
  const t = TEXT[language] || TEXT.en;
  const [days, setDays] = useState([]);
  const [newDay, setNewDay] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const available = sitter?.is_available !== false;

  useEffect(() => {
    if (!sitter?.id) return;
    api.get(`/api/sitters/${sitter.id}/days-off`)
      .then((rows) => setDays(rows.map((row) => row.day)))
      .catch(() => setDays([]));
  }, [sitter?.id]);

  async function toggleVacation() {
    setBusy(true);
    setMessage('');
    try {
      await api.put('/api/sitters/me', { is_available: !available });
      onSitterChange?.({ ...sitter, is_available: !available });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function addDay() {
    if (!newDay || days.includes(newDay)) return;
    setDays([...days, newDay].sort());
    setNewDay('');
    setMessage('');
  }

  async function saveDays() {
    setBusy(true);
    setMessage('');
    try {
      const rows = await api.put('/api/sitters/me/days-off', { days });
      setDays(rows.map((row) => row.day));
      setMessage(t.saved);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-8">
      <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.title}</p>
      <p className="mt-2 text-sm opacity-75">{t.subtitle}</p>

      <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${available ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <p className="text-sm font-semibold">{available ? t.vacationOff : t.vacationOn}</p>
        <button type="button" className={available ? 'btn-ghost text-sm' : 'btn-primary text-sm'} disabled={busy} onClick={toggleVacation}>
          {available ? t.pause : t.resume}
        </button>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-nanny-deepOrange">{t.daysOff}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {days.length === 0 && <p className="text-sm opacity-60">{t.noDays}</p>}
          {days.map((day) => (
            <span key={day} className="inline-flex items-center gap-2 rounded-full border border-nanny-orange/20 bg-white px-3 py-1 text-sm">
              {new Date(`${day}T00:00:00`).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'kz' ? 'kk-KZ' : 'en-US', { day: 'numeric', month: 'short' })}
              <button type="button" className="text-red-600" aria-label={t.remove} onClick={() => setDays(days.filter((d) => d !== day))}>×</button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className="input max-w-[200px]" type="date" min={todayInAppTimeZone()} value={newDay} onChange={(e) => setNewDay(e.target.value)} />
          <button type="button" className="btn-ghost text-sm" onClick={addDay} disabled={!newDay}>{t.addDay}</button>
          <button type="button" className="btn-secondary text-sm" onClick={saveDays} disabled={busy}>{t.save}</button>
        </div>
        {message && <p className="mt-2 text-sm opacity-75">{message}</p>}
      </div>
    </section>
  );
}
