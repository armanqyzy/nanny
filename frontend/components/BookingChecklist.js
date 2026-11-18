import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { TimeInput } from './FancyInputs';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const COPY = {
  en: {
    title: 'Care checklist',
    ownerHint: 'List what the sitter should do. The sitter ticks items off during the booking.',
    sitterHint: 'Tick items off as you go, the owner sees it right away.',
    sitterWait: 'You can tick items off once the booking is confirmed.',
    readOnly: 'Checklist for this booking.',
    placeholder: 'For example: feed, 1 cup of dry food',
    time: 'Time',
    add: 'Add',
    adding: 'Adding...',
    empty: 'No items yet.',
    emptyOwner: 'No items yet. Add the first one or pick a suggestion below.',
    suggestions: ['Feed', 'Walk 30 min', 'Fresh water', 'Give medicine', 'Clean the litter box', 'Play time'],
    done: 'done',
    of: 'of',
    remove: 'Remove',
    loading: 'Loading checklist...',
    doneAt: 'done at',
  },
  ru: {
    title: 'Чек-лист ухода',
    ownerHint: 'Напишите, что нужно сделать. Ситтер отмечает пункты во время брони.',
    sitterHint: 'Отмечайте пункты по ходу, владелец сразу это видит.',
    sitterWait: 'Отмечать пункты можно после подтверждения брони.',
    readOnly: 'Чек-лист этой брони.',
    placeholder: 'Например: покормить, 1 стакан сухого корма',
    time: 'Время',
    add: 'Добавить',
    adding: 'Добавляем...',
    empty: 'Пунктов пока нет.',
    emptyOwner: 'Пунктов пока нет. Добавьте первый или выберите подсказку ниже.',
    suggestions: ['Покормить', 'Прогулка 30 мин', 'Свежая вода', 'Дать лекарство', 'Убрать лоток', 'Поиграть'],
    done: 'готово',
    of: 'из',
    remove: 'Удалить',
    loading: 'Загружаем чек-лист...',
    doneAt: 'в',
  },
  kz: {
    title: 'Күтім тізімі',
    ownerHint: 'Не істеу керегін жазыңыз. Ситтер брондау кезінде белгілеп отырады.',
    sitterHint: 'Орындаған сайын белгілеңіз, иесі бірден көреді.',
    sitterWait: 'Брондау расталғаннан кейін белгілеуге болады.',
    readOnly: 'Осы брондаудың тізімі.',
    placeholder: 'Мысалы: тамақтандыру, 1 стақан құрғақ жем',
    time: 'Уақыт',
    add: 'Қосу',
    adding: 'Қосылуда...',
    empty: 'Әзірге пункт жоқ.',
    emptyOwner: 'Әзірге пункт жоқ. Біріншісін қосыңыз немесе төмендегі ұсынысты таңдаңыз.',
    suggestions: ['Тамақтандыру', 'Серуен 30 мин', 'Таза су', 'Дәрі беру', 'Науаны тазалау', 'Ойнау'],
    done: 'дайын',
    of: '/',
    remove: 'Жою',
    loading: 'Тізім жүктелуде...',
    doneAt: '',
  },
};

function timeOf(value, language) {
  if (!value) return '';
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : language === 'kz' ? 'kk-KZ' : 'en-GB', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function BookingChecklist({ bookingId, role, status }) {
  const { language } = useLanguage();
  const t = COPY[language] || COPY.en;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', due_time: '' });
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const isOwner = role === 'owner';
  const canEdit = isOwner && ['pending', 'confirmed'].includes(status);
  const canTick = role === 'sitter' && status === 'confirmed';

  useEffect(() => {
    let active = true;
    api.get(`/api/bookings/${bookingId}/checklist`)
      .then((data) => { if (active) setItems(data || []); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    const token = typeof window !== 'undefined' ? localStorage.getItem('nanny_token') : null;
    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on('checklist:update', (payload) => {
      if (Number(payload?.booking_id) === Number(bookingId)) setItems(payload.items || []);
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [bookingId]);

  async function addItem(title = form.title, dueTime = form.due_time) {
    if (!title.trim()) return;
    setError('');
    setAdding(true);
    try {
      const data = await api.post(`/api/bookings/${bookingId}/checklist`, { title: title.trim(), due_time: dueTime || null });
      setItems(data || []);
      setForm({ title: '', due_time: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function toggleItem(item) {
    if (!canTick) return;
    setBusyId(item.id);
    setError('');
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_done: !x.is_done } : x)));
    try {
      const data = await api.put(`/api/bookings/${bookingId}/checklist/${item.id}`, { is_done: !item.is_done });
      setItems(data || []);
    } catch (err) {
      setError(err.message);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_done: item.is_done } : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item) {
    setBusyId(item.id);
    setError('');
    try {
      const data = await api.delete(`/api/bookings/${bookingId}/checklist/${item.id}`);
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const doneCount = items.filter((item) => item.is_done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const allDone = items.length > 0 && doneCount === items.length;

  // Hide the block for the sitter / finished bookings when there is nothing to show.
  if (!loading && items.length === 0 && !canEdit) return null;

  const hint = canEdit ? t.ownerHint : canTick ? t.sitterHint : role === 'sitter' && status === 'pending' ? t.sitterWait : t.readOnly;
  const unusedSuggestions = t.suggestions.filter(
    (s) => !items.some((item) => item.title.toLowerCase() === s.toLowerCase())
  );

  return (
    <section className="mt-4 rounded-2xl border border-nanny-orange/20 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 font-bold text-nanny-deepOrange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M9 11l3 3 8-8" />
              <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
            </svg>
            {t.title}
          </h4>
          <p className="mt-0.5 text-xs opacity-70">{hint}</p>
        </div>
        {items.length > 0 && (
          <span className={`badge px-3 py-1 ${allDone ? 'border border-[#bde8cb] bg-[#e7f8ec] text-green-700' : 'bg-[#fff1e2] text-nanny-deepOrange'}`}>
            {doneCount} {t.of} {items.length} {t.done}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#fff1e2]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-nanny-orange'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm opacity-60">{t.loading}</p>}
        {!loading && items.length === 0 && <p className="text-sm opacity-60">{canEdit ? t.emptyOwner : t.empty}</p>}

        {items.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
              item.is_done ? 'border-[#bde8cb] bg-[#f3fbf5]' : 'border-nanny-orange/15 bg-[#fffaf4]'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleItem(item)}
              disabled={!canTick || busyId === item.id}
              aria-pressed={item.is_done}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition ${
                item.is_done
                  ? 'border-green-500 bg-green-500 text-white'
                  : canTick
                    ? 'border-nanny-orange/50 bg-white hover:border-nanny-orange hover:bg-[#fff1e2]'
                    : 'border-nanny-orange/30 bg-white'
              } ${canTick ? 'cursor-pointer active:scale-90' : 'cursor-default'}`}
            >
              {item.is_done && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </button>

            {item.due_time && (
              <span className="shrink-0 rounded-lg bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-nanny-deepOrange shadow-sm">
                {item.due_time}
              </span>
            )}

            <span className={`min-w-0 flex-1 break-words text-sm ${item.is_done ? 'text-nanny-brownish/50 line-through' : 'font-medium'}`}>
              {item.title}
            </span>

            {item.is_done && item.done_at && (
              <span className="hidden shrink-0 text-xs text-green-700 sm:inline">
                {t.doneAt} {timeOf(item.done_at, language)}
              </span>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => removeItem(item)}
                disabled={busyId === item.id}
                aria-label={t.remove}
                title={t.remove}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-nanny-brownish/40 transition hover:bg-red-50 hover:text-red-500"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-4 space-y-3">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
          >
            <input
              className="input flex-1"
              maxLength={160}
              placeholder={t.placeholder}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <TimeInput
              className="input sm:w-36"
              placeholder={t.time}
              value={form.due_time}
              onChange={(e) => setForm((prev) => ({ ...prev, due_time: e.target.value }))}
            />
            <button type="submit" disabled={adding || !form.title.trim()} className="btn-secondary whitespace-nowrap">
              {adding ? t.adding : `+ ${t.add}`}
            </button>
          </form>

          {unusedSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {unusedSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={adding}
                  onClick={() => addItem(s, '')}
                  className="rounded-full border border-nanny-orange/25 bg-[#fffaf4] px-3 py-1 text-xs font-semibold text-nanny-brownish transition hover:border-nanny-orange hover:bg-[#fff1e2] hover:text-nanny-deepOrange"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
