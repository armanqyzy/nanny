import { useEffect, useState } from 'react';
import { acquireSocket, releaseSocket } from '../lib/socket';
import useVisible from '../lib/useVisible';
import { api } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { TimeInput } from './FancyInputs';


const COPY = {
  en: {
    title: 'Care checklist',
    ownerPending: 'What should the sitter do? The sitter will tick tasks off once the booking is confirmed.',
    ownerConfirmed: 'The sitter ticks tasks off during the booking, you see it here right away.',
    sitterHint: 'Tap a task when it is done. The owner sees it right away.',
    sitterWait: 'You can tick tasks off once you confirm the booking.',
    readOnly: 'Tasks for this booking.',
    placeholder: 'What should the sitter do?',
    time: 'Time',
    add: 'Add',
    adding: 'Adding...',
    addTask: 'Add a task',
    cancel: 'Cancel',
    quick: 'Quick add:',
    empty: 'No tasks yet.',
    tasks: (n) => `${n} ${n === 1 ? 'task' : 'tasks'}`,
    progress: (d, n) => `${d} of ${n} done`,
    waiting: 'Not done yet',
    doneAt: (t) => `Done ${t}`,
    suggestions: ['Feed', 'Walk 30 min', 'Fresh water', 'Give medicine', 'Clean the litter box', 'Play time'],
    remove: 'Remove',
    loading: 'Loading...',
  },
  ru: {
    title: 'Чек-лист ухода',
    ownerPending: 'Что должен сделать ситтер? Он будет отмечать задачи после подтверждения брони.',
    ownerConfirmed: 'Ситтер отмечает задачи во время брони, вы сразу видите это здесь.',
    sitterHint: 'Нажмите на задачу, когда она выполнена. Владелец сразу это увидит.',
    sitterWait: 'Отмечать задачи можно после того, как вы подтвердите бронь.',
    readOnly: 'Задачи этой брони.',
    placeholder: 'Что нужно сделать?',
    time: 'Время',
    add: 'Добавить',
    adding: 'Добавляем...',
    addTask: 'Добавить задачу',
    cancel: 'Отмена',
    quick: 'Быстро добавить:',
    empty: 'Задач пока нет.',
    tasks: (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'задача' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'задачи' : 'задач'}`,
    progress: (d, n) => `${d} из ${n} готово`,
    waiting: 'Ещё не сделано',
    doneAt: (t) => `Готово в ${t}`,
    suggestions: ['Покормить', 'Прогулка 30 мин', 'Свежая вода', 'Дать лекарство', 'Убрать лоток', 'Поиграть'],
    remove: 'Удалить',
    loading: 'Загрузка...',
  },
  kz: {
    title: 'Күтім тізімі',
    ownerPending: 'Ситтер не істеуі керек? Брондау расталғаннан кейін ол белгілеп отырады.',
    ownerConfirmed: 'Ситтер брондау кезінде белгілейді, сіз мұнда бірден көресіз.',
    sitterHint: 'Тапсырма орындалғанда басыңыз. Иесі бірден көреді.',
    sitterWait: 'Брондауды растағаннан кейін белгілеуге болады.',
    readOnly: 'Осы брондаудың тапсырмалары.',
    placeholder: 'Не істеу керек?',
    time: 'Уақыт',
    add: 'Қосу',
    adding: 'Қосылуда...',
    addTask: 'Тапсырма қосу',
    cancel: 'Болдырмау',
    quick: 'Жылдам қосу:',
    empty: 'Әзірге тапсырма жоқ.',
    tasks: (n) => `${n} тапсырма`,
    progress: (d, n) => `${d} / ${n} дайын`,
    waiting: 'Әлі орындалмады',
    doneAt: (t) => `${t} орындалды`,
    suggestions: ['Тамақтандыру', 'Серуен 30 мин', 'Таза су', 'Дәрі беру', 'Науаны тазалау', 'Ойнау'],
    remove: 'Жою',
    loading: 'Жүктелуде...',
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
  // Loads only when the card scrolls into view (the bookings page can have dozens of cards).
  const [rootRef, visible] = useVisible(false);
  const [form, setForm] = useState({ title: '', due_time: '' });
  const [adding, setAdding] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const isOwner = role === 'owner';
  const canEdit = isOwner && ['pending', 'confirmed'].includes(status);
  const canTick = role === 'sitter' && status === 'confirmed';
  const showProgress = status !== 'pending';

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    api.get(`/api/bookings/${bookingId}/checklist`)
      .then((data) => { if (active) setItems(data || []); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    const socket = acquireSocket();
    if (!socket) return () => { active = false; };
    const onUpdate = (payload) => {
      if (Number(payload?.booking_id) === Number(bookingId)) setItems(payload.items || []);
    };
    socket.on('checklist:update', onUpdate);

    return () => {
      active = false;
      socket.off('checklist:update', onUpdate);
      releaseSocket();
    };
  }, [bookingId, visible]);

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
    if (!canTick || busyId) return;
    setBusyId(item.id);
    setError('');
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_done: !x.is_done, done_at: !x.is_done ? new Date().toISOString() : null } : x)));
    try {
      const data = await api.put(`/api/bookings/${bookingId}/checklist/${item.id}`, { is_done: !item.is_done });
      setItems(data || []);
    } catch (err) {
      setError(err.message);
      setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
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

  // Nothing to show to the sitter or on finished bookings without tasks.
  if (!loading && items.length === 0 && !canEdit) return null;

  const hint = canEdit
    ? (status === 'pending' ? t.ownerPending : t.ownerConfirmed)
    : canTick ? t.sitterHint
      : role === 'sitter' && status === 'pending' ? t.sitterWait : t.readOnly;
  const unusedSuggestions = t.suggestions.filter(
    (s) => !items.some((item) => item.title.toLowerCase() === s.toLowerCase())
  );
  const formVisible = canEdit && (formOpen || (!loading && items.length === 0));

  return (
    <section ref={rootRef} className="mt-4 rounded-2xl border border-nanny-orange/20 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="flex items-center gap-2 font-bold text-nanny-deepOrange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M9 11l3 3 8-8" />
              <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
            </svg>
            {t.title}
          </h4>
          <p className="mt-0.5 text-xs leading-5 opacity-70">{hint}</p>
        </div>
        {items.length > 0 && (
          showProgress ? (
            <span className={`badge shrink-0 px-3 py-1 ${allDone ? 'border border-[#bde8cb] bg-[#e7f8ec] text-green-700' : 'bg-[#fff1e2] text-nanny-deepOrange'}`}>
              {t.progress(doneCount, items.length)}
            </span>
          ) : (
            <span className="badge shrink-0 bg-nanny-cream px-3 py-1 text-nanny-brownish">{t.tasks(items.length)}</span>
          )
        )}
      </div>

      {showProgress && items.length > 0 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#fff1e2]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-nanny-orange'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {loading && <p className="mt-4 text-sm opacity-60">{t.loading}</p>}

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-nanny-orange/10 overflow-hidden rounded-2xl border border-nanny-orange/15">
          {items.map((item) => {
            const Row = canTick ? 'button' : 'div';
            return (
              <li key={item.id} className={`group transition ${item.is_done ? 'bg-[#f3fbf5]' : 'bg-white'}`}>
                <Row
                  {...(canTick ? { type: 'button', onClick: () => toggleItem(item), disabled: !!busyId, 'aria-pressed': item.is_done } : {})}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left ${canTick ? 'cursor-pointer hover:bg-[#fffaf4] active:bg-[#fff1e2]' : ''}`}
                >
                  {canTick ? (
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition ${
                      item.is_done ? 'border-green-500 bg-green-500 text-white' : 'border-nanny-orange/50 bg-white group-hover:border-nanny-orange'
                    }`}>
                      {item.is_done && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${item.is_done ? 'bg-green-500 text-white' : 'bg-nanny-orange/15'}`}>
                      {item.is_done
                        ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        )
                        : <span className="h-2 w-2 rounded-full bg-nanny-orange" />}
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className={`block break-words text-sm ${item.is_done ? 'text-nanny-brownish/55 line-through' : 'font-semibold'}`}>
                      {item.title}
                    </span>
                    {showProgress && (
                      <span className={`mt-0.5 block text-xs ${item.is_done ? 'text-green-700' : 'opacity-50'}`}>
                        {item.is_done && item.done_at ? t.doneAt(timeOf(item.done_at, language)) : t.waiting}
                      </span>
                    )}
                  </span>

                  {item.due_time && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#fff1e2] px-2.5 py-1 text-xs font-semibold tabular-nums text-nanny-deepOrange">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-3 w-3" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                      </svg>
                      {item.due_time}
                    </span>
                  )}

                  {canEdit && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => busyId !== item.id && removeItem(item)}
                      onKeyDown={(e) => { if (e.key === 'Enter') removeItem(item); }}
                      aria-label={t.remove}
                      title={t.remove}
                      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-nanny-brownish/35 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                      </svg>
                    </span>
                  )}
                </Row>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && !formVisible && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-nanny-orange/30 px-4 py-3 text-sm font-semibold text-nanny-deepOrange transition hover:border-nanny-orange hover:bg-[#fffaf4]"
        >
          <span className="text-lg leading-none">+</span> {t.addTask}
        </button>
      )}

      {formVisible && (
        <div className="mt-4 rounded-2xl bg-[#fffaf4] p-3 sm:p-4">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
          >
            <input
              autoFocus={formOpen}
              className="input flex-1"
              maxLength={160}
              placeholder={t.placeholder}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <TimeInput
              className="input sm:w-32"
              placeholder={t.time}
              value={form.due_time}
              onChange={(e) => setForm((prev) => ({ ...prev, due_time: e.target.value }))}
            />
            <button type="submit" disabled={adding || !form.title.trim()} className="btn-secondary whitespace-nowrap">
              {adding ? t.adding : t.add}
            </button>
          </form>

          {unusedSuggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold opacity-60">{t.quick}</span>
              {unusedSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={adding}
                  onClick={() => addItem(s, form.due_time)}
                  className="rounded-full border border-nanny-orange/25 bg-white px-3 py-1 text-xs font-semibold text-nanny-brownish transition hover:border-nanny-orange hover:bg-[#fff1e2] hover:text-nanny-deepOrange"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-3 text-right">
              <button type="button" onClick={() => { setFormOpen(false); setForm({ title: '', due_time: '' }); }}
                      className="text-xs font-semibold text-nanny-brownish/60 transition hover:text-nanny-deepOrange">
                {t.cancel}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
