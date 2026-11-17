import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TEXT = {
  en: {
    title: 'Medical card', subtitle: 'Vaccinations and when the next dose is due.',
    name: 'Vaccine (e.g. rabies)', given: 'Given on', next: 'Next dose', notes: 'Notes (optional)',
    add: 'Add vaccination', empty: 'No vaccinations yet.', close: 'Close', remove: 'Remove',
    overdue: 'Overdue', due: 'Next dose',
  },
  ru: {
    title: 'Медкарта', subtitle: 'Прививки и когда нужна следующая.',
    name: 'Прививка (например, бешенство)', given: 'Сделана', next: 'Следующая', notes: 'Заметка (необязательно)',
    add: 'Добавить прививку', empty: 'Прививок пока нет.', close: 'Закрыть', remove: 'Удалить',
    overdue: 'Просрочена', due: 'Следующая',
  },
  kz: {
    title: 'Медкарта', subtitle: 'Екпелер және келесісі қашан керек.',
    name: 'Екпе (мысалы, құтыру)', given: 'Салынған', next: 'Келесі', notes: 'Ескертпе (міндетті емес)',
    add: 'Екпе қосу', empty: 'Екпелер әлі жоқ.', close: 'Жабу', remove: 'Жою',
    overdue: 'Мерзімі өтті', due: 'Келесі',
  },
};

const EMPTY = { name: '', given_on: '', next_due: '', notes: '' };

// Owner's medical card for one pet: list, add and remove vaccinations.
export default function PetVaccinationsModal({ pet, language = 'en', onClose, onChanged }) {
  const t = TEXT[language] || TEXT.en;
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.get(`/api/pets/${pet.id}/vaccinations`).then(setItems).catch((err) => setError(err.message));
  }, [pet.id]);

  async function add() {
    setBusy(true);
    setError('');
    try {
      const created = await api.post(`/api/pets/${pet.id}/vaccinations`, form);
      setItems((prev) => [...prev, created]);
      setForm(EMPTY);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await api.delete(`/api/pets/${pet.id}/vaccinations/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  const format = (day) => (day ? new Date(`${day}T00:00:00`).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'kz' ? 'kk-KZ' : 'en-US') : '—');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-nanny-deepOrange">{t.title}: {pet.name}</h3>
            <p className="mt-1 text-sm opacity-70">{t.subtitle}</p>
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={onClose}>{t.close}</button>
        </div>

        <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
          {items.length === 0 && <p className="text-sm opacity-60">{t.empty}</p>}
          {items.map((item) => {
            const overdue = item.next_due && item.next_due < today;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-nanny-orange/15 bg-[#fffaf3] px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs opacity-70">
                    {t.given}: {format(item.given_on)} • {overdue ? <span className="font-semibold text-red-600">{t.overdue}: {format(item.next_due)}</span> : <>{t.due}: {format(item.next_due)}</>}
                  </p>
                  {item.notes && <p className="mt-1 text-xs opacity-70">{item.notes}</p>}
                </div>
                <button type="button" className="text-xs font-semibold text-red-600" onClick={() => remove(item.id)}>{t.remove}</button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2">
          <input className="input" placeholder={t.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs opacity-70">{t.given}
              <input className="input mt-1" type="date" max={today} value={form.given_on} onChange={(e) => setForm({ ...form, given_on: e.target.value })} />
            </label>
            <label className="text-xs opacity-70">{t.next}
              <input className="input mt-1" type="date" value={form.next_due} onChange={(e) => setForm({ ...form, next_due: e.target.value })} />
            </label>
          </div>
          <input className="input" placeholder={t.notes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" className="btn-primary" disabled={busy || !form.name.trim()} onClick={add}>{t.add}</button>
        </div>
      </div>
    </div>
  );
}
