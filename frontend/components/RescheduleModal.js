import { useState } from 'react';
import { api } from '../lib/api';
import { todayInAppTimeZone } from '../lib/date';

const TEXT = {
  title: { en: 'Move booking', ru: 'Перенос бронирования', kz: 'Брондауды ауыстыру' },
  intro: {
    en: 'Choose new dates. The sitter gets a request and confirms the new time.',
    ru: 'Выберите новые даты. Ситтер получит запрос и подтвердит новое время.',
    kz: 'Жаңа күндерді таңдаңыз. Ситтер сұрау алып, жаңа уақытты растайды.',
  },
  paidNote: {
    en: 'The booking is paid, so keep the same number of days: the payment moves with it.',
    ru: 'Бронирование оплачено, поэтому сохраните то же количество дней: оплата переносится вместе с ним.',
    kz: 'Брондау төленген, сондықтан күн санын сақтаңыз: төлем бірге ауысады.',
  },
  confirmedNote: {
    en: 'Until the sitter confirms, the booking will show as “Pending”.',
    ru: 'Пока ситтер не подтвердит перенос, бронирование будет в статусе «Ожидает».',
    kz: 'Ситтер растағанша брондау «Күтуде» күйінде болады.',
  },
  start: { en: 'New start date', ru: 'Новая дата начала', kz: 'Жаңа басталу күні' },
  end: { en: 'New end date', ru: 'Новая дата окончания', kz: 'Жаңа аяқталу күні' },
  from: { en: 'Time from', ru: 'Время с', kz: 'Уақыт' },
  to: { en: 'to', ru: 'до', kz: 'дейін' },
  timeHint: { en: 'Leave the time empty if it does not matter.', ru: 'Оставьте время пустым, если оно не важно.', kz: 'Уақыт маңызды болмаса, бос қалдырыңыз.' },
  keep: { en: 'Keep as is', ru: 'Оставить как есть', kz: 'Өзгертпеу' },
  save: { en: 'Send request', ru: 'Отправить запрос', kz: 'Сұрау жіберу' },
  saving: { en: 'Sending...', ru: 'Отправляем...', kz: 'Жіберілуде...' },
};
const tx = (key, language) => TEXT[key]?.[language] || TEXT[key]?.en || key;

const day = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? value
  : new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' }));

export default function RescheduleModal({ booking, language, onClose, onDone }) {
  const [form, setForm] = useState({
    start_date: day(booking.start_date),
    end_date: day(booking.end_date),
    start_time: booking.start_time ? String(booking.start_time).slice(0, 5) : '',
    end_time: booking.end_time ? String(booking.end_time).slice(0, 5) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const paid = booking.payment_status === 'paid';
  const lengthDays = Math.round((new Date(day(booking.end_date)) - new Date(day(booking.start_date))) / 86400000);

  function setStart(value) {
    // For a paid booking the end date follows the start date, keeping the same length.
    if (paid && value) {
      const end = new Date(`${value}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + lengthDays);
      setForm((prev) => ({ ...prev, start_date: value, end_date: end.toISOString().slice(0, 10) }));
    } else {
      setForm((prev) => ({ ...prev, start_date: value, end_date: prev.end_date < value ? value : prev.end_date }));
    }
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/bookings/${booking.id}/reschedule`, {
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => !saving && onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-nanny-deepOrange">{tx('title', language)}</h3>
        <p className="mt-2 text-sm opacity-75">{tx('intro', language)}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-nanny-brownish">
            {tx('start', language)}
            <input type="date" className="input mt-1" min={todayInAppTimeZone()} value={form.start_date} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="text-sm font-semibold text-nanny-brownish">
            {tx('end', language)}
            <input type="date" className="input mt-1" min={form.start_date} value={form.end_date} disabled={paid}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-nanny-brownish">
            {tx('from', language)}
            <input type="time" className="input mt-1" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-nanny-brownish">
            {tx('to', language)}
            <input type="time" className="input mt-1" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </label>
        </div>
        <p className="mt-2 text-xs opacity-60">{tx('timeHint', language)}</p>

        <div className="mt-4 space-y-2 rounded-2xl border border-nanny-orange/15 bg-nanny-cream/45 px-4 py-3 text-sm">
          {paid && <p>{tx('paidNote', language)}</p>}
          {booking.status === 'confirmed' && <p>{tx('confirmedNote', language)}</p>}
        </div>

        {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" className="btn-ghost flex-1" disabled={saving} onClick={onClose}>{tx('keep', language)}</button>
          <button type="button" className="btn-primary flex-1" disabled={saving || !form.start_date || !form.end_date} onClick={submit}>
            {saving ? tx('saving', language) : tx('save', language)}
          </button>
        </div>
      </div>
    </div>
  );
}
