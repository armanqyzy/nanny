import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import { api, currentUser } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { getDateInAppTimeZone } from '../lib/date';
import { localeFor, serviceName } from '../lib/services';

/* ------------------------------------------------------------------ helpers */

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7)); // Monday
const diffDays = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);

// Calendar day of a booking date in Almaty, whatever shape the API sends.
function dayOf(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
}
const minutesOf = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};
const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

// Each pet gets its own colour, so bookings of different pets do not blend together.
const PALETTE = [
  { bg: '#FFE9D6', bd: '#F29A4D', tx: '#8F4308' },
  { bg: '#E3EAFF', bd: '#4F6BED', tx: '#263FA8' },
  { bg: '#DCF4E5', bd: '#2FA463', tx: '#146638' },
  { bg: '#F5E1FA', bd: '#B45CC8', tx: '#722A84' },
  { bg: '#FFF1BF', bd: '#E0A800', tx: '#6E5100' },
  { bg: '#D9F1F6', bd: '#2A9DB5', tx: '#115C70' },
  { bg: '#FFE0E6', bd: '#E05A78', tx: '#8E2440' },
];
function colorFor(e) {
  const key = String(e.pet_id || e.pet_name || e.id);
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const STATUS_STYLES = {
  pending: 'bg-[#fff1cf] text-[#8d5c0b] border border-[#f0d27d]',
  confirmed: 'bg-[#eaf1ff] text-[#3158d6] border border-[#cddcff]',
  completed: 'bg-[#e7f8ec] text-[#1c8b49] border border-[#bde8cb]',
  cancelled: 'bg-[#ffe8e8] text-[#c54f4f] border border-[#f4bcbc]',
};

const COPY = {
  en: {
    title: 'Care schedule', today: 'Today', month: 'Month', week: 'Week', day: 'Day',
    showCancelled: 'Show cancelled', allDay: 'All day', noTime: 'No time set',
    more: (n) => `+${n} more`, nothing: 'Nothing scheduled for this day.',
    bookings: (n) => `${n} ${n === 1 ? 'booking' : 'bookings'}`,
    status: { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' },
    owner: 'Owner', sitter: 'Sitter', you: 'you',
    asSitter: 'You are the sitter', asOwner: 'Your pet',
    confirm: 'Confirm', open: 'Open booking', message: 'Message', checklist: 'Checklist',
    waiting: 'Waiting for your answer', legend: 'Dashed border: waiting for confirmation',
    notes: 'Notes',
  },
  ru: {
    title: 'График ухода', today: 'Сегодня', month: 'Месяц', week: 'Неделя', day: 'День',
    showCancelled: 'Показывать отменённые', allDay: 'Весь день', noTime: 'Без времени',
    more: (n) => `ещё ${n}`, nothing: 'На этот день ничего не запланировано.',
    bookings: (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'бронь' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'брони' : 'броней'}`,
    status: { pending: 'Ожидает', confirmed: 'Подтверждено', completed: 'Завершено', cancelled: 'Отменено' },
    owner: 'Владелец', sitter: 'Ситтер', you: 'вы',
    asSitter: 'Вы ситтер', asOwner: 'Ваш питомец',
    confirm: 'Подтвердить', open: 'Открыть бронь', message: 'Написать', checklist: 'Чек-лист',
    waiting: 'Ждёт вашего ответа', legend: 'Пунктирная рамка: ждёт подтверждения',
    notes: 'Заметка',
  },
  kz: {
    title: 'Күтім кестесі', today: 'Бүгін', month: 'Ай', week: 'Апта', day: 'Күн',
    showCancelled: 'Тоқтатылғандарды көрсету', allDay: 'Күні бойы', noTime: 'Уақытсыз',
    more: (n) => `тағы ${n}`, nothing: 'Бұл күнге ештеңе жоспарланбаған.',
    bookings: (n) => `${n} брондау`,
    status: { pending: 'Күтуде', confirmed: 'Расталды', completed: 'Аяқталды', cancelled: 'Тоқтатылды' },
    owner: 'Иесі', sitter: 'Ситтер', you: 'сіз',
    asSitter: 'Сіз ситтерсіз', asOwner: 'Сіздің жануарыңыз',
    confirm: 'Растау', open: 'Брондауды ашу', message: 'Жазу', checklist: 'Тізім',
    waiting: 'Жауабыңызды күтуде', legend: 'Үзік жиек: растауды күтуде',
    notes: 'Жазба',
  },
};

function Arrow({ dir }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

function eventChipStyle(e) {
  const c = colorFor(e);
  return {
    backgroundColor: c.bg,
    color: c.tx,
    borderColor: c.bd,
    borderStyle: e.status === 'pending' ? 'dashed' : 'solid',
  };
}

/* --------------------------------------------------------------- component */

export default function Calendar() {
  const { language } = useLanguage();
  const t = COPY[language] || COPY.en;
  const locale = localeFor(language);
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [viewerRole, setViewerRole] = useState(null);
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => getDateInAppTimeZone());
  const [selectedKey, setSelectedKey] = useState(() => keyOf(getDateInAppTimeZone()));
  const [showCancelled, setShowCancelled] = useState(false);
  const [checklists, setChecklists] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [nowMinutes, setNowMinutes] = useState(null);

  async function load(role) {
    if (role === 'admin') {
      const rows = await api.get('/api/admin/bookings');
      setEvents(rows.map((e) => ({ ...e, _role: 'admin' })));
    } else {
      const { asOwner, asSitter } = await api.get('/api/bookings/mine');
      setEvents([
        ...asOwner.map((e) => ({ ...e, _role: 'owner' })),
        ...asSitter.map((e) => ({ ...e, _role: 'sitter' })),
      ]);
    }
  }

  useEffect(() => {
    const user = currentUser();
    if (!user) { router.replace('/login'); return; }
    setViewerRole(user.role);
    load(user.role).catch((err) => setActionError(err.message));
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // On phones the week grid is too narrow, start with the day view there.
    if (typeof window !== 'undefined' && window.innerWidth < 640) setView((v) => (v === 'week' ? 'day' : v));
    const tick = () => {
      const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
      setNowMinutes(minutesOf(now));
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const todayKey = keyOf(getDateInAppTimeZone());

  const visible = useMemo(() => events
    .filter((e) => showCancelled || e.status !== 'cancelled')
    .map((e) => ({ ...e, _s: dayOf(e.start_date), _e: dayOf(e.end_date) || dayOf(e.start_date) }))
    .filter((e) => e._s), [events, showCancelled]);

  const eventsOnKey = (k) => visible
    .filter((e) => k >= e._s && k <= e._e)
    .sort((a, b) => (minutesOf(a.start_time) ?? -1) - (minutesOf(b.start_time) ?? -1));

  const selectedEvents = eventsOnKey(selectedKey);

  // Checklist progress for the bookings of the selected day.
  useEffect(() => {
    const need = selectedEvents.filter((e) => e._role !== 'admin' && ['confirmed', 'completed'].includes(e.status) && !(e.id in checklists));
    need.forEach((e) => {
      api.get(`/api/bookings/${e.id}/checklist`)
        .then((items) => setChecklists((prev) => ({ ...prev, [e.id]: items || [] })))
        .catch(() => setChecklists((prev) => ({ ...prev, [e.id]: null })));
    });
  }, [selectedKey, visible.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmBooking(e) {
    if (busyId) return;
    setBusyId(e.id);
    setActionError('');
    try {
      await api.put(`/api/bookings/${e.id}/status`, { status: 'confirmed' });
      await load(viewerRole);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  /* ----- navigation */

  function shift(dir) {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === 'week') setCursor(addDays(cursor, dir * 7));
    else {
      const next = addDays(fromKey(selectedKey), dir);
      setCursor(next);
      setSelectedKey(keyOf(next));
    }
  }
  function goToday() {
    const now = getDateInAppTimeZone();
    setCursor(now);
    setSelectedKey(keyOf(now));
  }
  function openDay(k) {
    setSelectedKey(k);
    setCursor(fromKey(k));
  }

  const title = (() => {
    if (view === 'month') return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor);
    if (view === 'week') {
      const ws = startOfWeek(cursor);
      const we = addDays(ws, 6);
      const f = (d, opts) => new Intl.DateTimeFormat(locale, opts).format(d);
      return ws.getMonth() === we.getMonth()
        ? `${ws.getDate()}–${we.getDate()} ${f(we, { month: 'long', year: 'numeric' })}`
        : `${f(ws, { day: 'numeric', month: 'short' })} – ${f(we, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(fromKey(selectedKey));
  })();

  const weekdayShort = useMemo(() => Array.from({ length: 7 }, (_, i) => (
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)).replace('.', '')
  )), [locale]);

  /* ----- month view: multi-day bookings as bars across the week */

  function MonthView() {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const weeks = [];
    for (let w = 0; w < 6; w += 1) {
      const ws = addDays(gridStart, w * 7);
      if (w > 3 && ws.getMonth() !== cursor.getMonth()) break;
      weeks.push(ws);
    }
    const MAX_LANES = 3;

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-nanny-orange/10 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-nanny-brownish/50">
          {weekdayShort.map((w, i) => <div key={w + i} className={i >= 5 ? 'text-nanny-deepOrange/70' : ''}>{w}</div>)}
        </div>
        {weeks.map((ws) => {
          const wsKey = keyOf(ws);
          const weKey = keyOf(addDays(ws, 6));
          const segs = visible
            .filter((e) => e._s <= weKey && e._e >= wsKey)
            .map((e) => {
              const s = e._s < wsKey ? wsKey : e._s;
              const en = e._e > weKey ? weKey : e._e;
              return { e, col: diffDays(wsKey, s), span: diffDays(s, en) + 1, contL: e._s < wsKey, contR: e._e > weKey };
            })
            .sort((a, b) => a.col - b.col || b.span - a.span || (minutesOf(a.e.start_time) ?? 0) - (minutesOf(b.e.start_time) ?? 0));
          const lanes = [];
          segs.forEach((sg) => {
            let lane = lanes.findIndex((end) => end < sg.col);
            if (lane === -1) { lane = lanes.length; lanes.push(-1); }
            lanes[lane] = sg.col + sg.span - 1;
            sg.lane = lane;
          });
          const hiddenPerDay = Array(7).fill(0);
          segs.filter((sg) => sg.lane >= MAX_LANES).forEach((sg) => {
            for (let c = sg.col; c < sg.col + sg.span; c += 1) hiddenPerDay[c] += 1;
          });

          return (
            <div key={wsKey} className="relative border-b border-nanny-orange/10 last:border-b-0">
              <div className="grid grid-cols-7">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = addDays(ws, i);
                  const k = keyOf(d);
                  const outside = d.getMonth() !== cursor.getMonth();
                  const isToday = k === todayKey;
                  const isSel = k === selectedKey;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedKey(k)}
                      onDoubleClick={() => { openDay(k); setView('day'); }}
                      className={`min-h-[104px] border-r border-nanny-orange/10 p-1.5 text-left align-top transition last:border-r-0 sm:min-h-[118px] sm:p-2 ${
                        isSel ? 'bg-[#fff4e8]' : outside ? 'bg-[#fffcf8]' : 'bg-white hover:bg-[#fffaf3]'
                      }`}
                    >
                      <span className={`inline-grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${
                        isToday ? 'bg-nanny-blue text-white' : isSel ? 'bg-nanny-orange text-white' : outside ? 'text-nanny-brownish/30' : 'text-nanny-brownish'
                      }`}>
                        {d.getDate()}
                      </span>
                      {hiddenPerDay[i] > 0 && (
                        <span className="absolute bottom-1 text-[10px] font-semibold text-nanny-brownish/55" style={{ left: `calc(${(i * 100) / 7}% + 8px)` }}>
                          {t.more(hiddenPerDay[i])}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-9">
                {segs.filter((sg) => sg.lane < MAX_LANES).map((sg) => (
                  <button
                    key={`${sg.e._role}-${sg.e.id}`}
                    type="button"
                    title={`${sg.e.pet_name} · ${serviceName(sg.e.service, language)}${sg.e.start_time ? ` · ${hhmm(sg.e.start_time)}–${hhmm(sg.e.end_time)}` : ''}`}
                    onClick={() => setSelectedKey(sg.e._s < wsKey ? keyOf(addDays(ws, sg.col)) : sg.e._s)}
                    className={`pointer-events-auto absolute flex h-[19px] items-center gap-1 overflow-hidden border px-1.5 text-[10px] font-semibold leading-none sm:text-[11px] ${
                      sg.contL ? 'rounded-l-none border-l-0' : 'rounded-l-md'
                    } ${sg.contR ? 'rounded-r-none border-r-0' : 'rounded-r-md'} ${sg.e.status === 'cancelled' ? 'line-through opacity-45' : ''}`}
                    style={{
                      ...eventChipStyle(sg.e),
                      left: `calc(${(sg.col * 100) / 7}% + 3px)`,
                      width: `calc(${(sg.span * 100) / 7}% - 6px)`,
                      top: `${sg.lane * 21}px`,
                    }}
                  >
                    {sg.e.status === 'completed' && <span aria-hidden="true">✓</span>}
                    {sg.e.start_time && <span className="hidden tabular-nums opacity-75 sm:inline">{hhmm(sg.e.start_time)}</span>}
                    <span className="truncate">{sg.e.pet_name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ----- week / day view: hours on the left, bookings placed by time */

  function TimeGrid({ days }) {
    const HOUR_PX = 52;
    const timed = days.map((k) => eventsOnKey(k).filter((e) => e.start_time));
    const untimed = days.map((k) => eventsOnKey(k).filter((e) => !e.start_time));
    const allMins = timed.flat().flatMap((e) => [minutesOf(e.start_time), minutesOf(e.end_time) ?? minutesOf(e.start_time) + 60]);
    const startH = Math.max(0, Math.min(7, ...allMins.map((x) => Math.floor(x / 60))));
    const endH = Math.min(24, Math.max(21, ...allMins.map((x) => Math.ceil(x / 60))));
    const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
    const single = days.length === 1;
    const anyUntimed = untimed.some((list) => list.length);

    const layout = (list) => {
      const items = list
        .map((e) => {
          const s = minutesOf(e.start_time);
          const en = Math.max(minutesOf(e.end_time) ?? s + 60, s + 30);
          return { e, s, en };
        })
        .sort((a, b) => a.s - b.s);
      const cols = [];
      items.forEach((it) => {
        let c = cols.findIndex((end) => end <= it.s);
        if (c === -1) { c = cols.length; cols.push(0); }
        cols[c] = it.en;
        it.col = c;
      });
      items.forEach((it) => { it.cols = Math.max(1, cols.length); });
      return items;
    };

    return (
      <div className="overflow-x-auto">
        <div className={single ? '' : 'min-w-[720px]'}>
          <div className="grid border-b border-nanny-orange/10" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div />
            {days.map((k) => {
              const d = fromKey(k);
              const isToday = k === todayKey;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { openDay(k); if (!single) setView('day'); }}
                  className={`flex flex-col items-center gap-0.5 py-2 transition hover:bg-[#fffaf3] ${k === selectedKey && !single ? 'bg-[#fff4e8]' : ''}`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-nanny-brownish/50">{weekdayShort[(d.getDay() + 6) % 7]}</span>
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-base font-bold ${isToday ? 'bg-nanny-blue text-white' : 'text-nanny-brownish'}`}>{d.getDate()}</span>
                </button>
              );
            })}
          </div>

          {anyUntimed && (
            <div className="grid border-b border-nanny-orange/10 bg-[#fffcf8]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div className="px-1 py-2 text-right text-[10px] font-semibold uppercase leading-tight text-nanny-brownish/45">{t.noTime}</div>
              {untimed.map((list, i) => (
                <div key={days[i]} className="space-y-1 border-l border-nanny-orange/10 p-1">
                  {list.map((e) => (
                    <button key={`${e._role}-${e.id}`} type="button" onClick={() => setSelectedKey(days[i])}
                            className={`block w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-semibold ${e.status === 'cancelled' ? 'line-through opacity-45' : ''}`}
                            style={eventChipStyle(e)}>
                      {e.pet_name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div>
              {hours.map((h) => (
                <div key={h} className="relative pr-2 text-right text-[11px] tabular-nums text-nanny-brownish/45" style={{ height: HOUR_PX }}>
                  <span className="absolute -top-2 right-2">{pad(h)}:00</span>
                </div>
              ))}
            </div>
            {days.map((k, i) => (
              <div key={k} className="relative border-l border-nanny-orange/10" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h) => (
                  <div key={h} className="border-t border-nanny-orange/10" style={{ height: HOUR_PX }} />
                ))}
                {k === todayKey && nowMinutes != null && nowMinutes >= startH * 60 && nowMinutes <= endH * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMinutes - startH * 60) / 60) * HOUR_PX }}>
                    <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-[2px] flex-1 bg-red-500" />
                  </div>
                )}
                {layout(timed[i]).map(({ e, s, en, col, cols }) => {
                  const height = Math.max(((en - s) / 60) * HOUR_PX - 3, 22);
                  return (
                    <button
                      key={`${e._role}-${e.id}`}
                      type="button"
                      onClick={() => setSelectedKey(k)}
                      className={`absolute overflow-hidden rounded-lg border-l-4 border px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-20 hover:shadow-md ${e.status === 'cancelled' ? 'opacity-45' : ''}`}
                      style={{
                        ...eventChipStyle(e),
                        top: ((s - startH * 60) / 60) * HOUR_PX + 1,
                        height,
                        left: `calc(${(col * 100) / cols}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                      }}
                    >
                      <span className={`block truncate font-bold ${e.status === 'cancelled' ? 'line-through' : ''}`}>{e.pet_name}</span>
                      <span className="block truncate tabular-nums opacity-80">{hhmm(e.start_time)}{e.end_time ? `–${hhmm(e.end_time)}` : ''}</span>
                      {single && height > 50 && (
                        <span className="mt-0.5 block truncate opacity-80">
                          {serviceName(e.service, language)} · {e._role === 'sitter' ? e.owner_name : e._role === 'owner' ? e.sitter_name : `${e.sitter_name} → ${e.owner_name}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ----- side panel: bookings of the selected day with actions */

  function DayPanel() {
    const d = fromKey(selectedKey);
    return (
      <section className="overflow-hidden rounded-[28px] border border-nanny-orange/10 bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-nanny-orange/10 bg-gradient-to-r from-white to-[#fff8ef] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-nanny-brownish/45">{selectedKey === todayKey ? t.today : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d)}</p>
            <h3 className="mt-0.5 text-lg font-bold text-nanny-deepOrange">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d)}</h3>
          </div>
          <span className="badge shrink-0 bg-[#fff1e2] px-3 py-1 text-nanny-deepOrange">{t.bookings(selectedEvents.length)}</span>
        </div>

        <div className="space-y-3 p-4">
          {selectedEvents.length === 0 && (
            <div className="rounded-2xl border border-dashed border-nanny-orange/20 bg-[#fffaf4] p-5 text-center text-sm text-nanny-brownish/65">
              {t.nothing}
            </div>
          )}
          {actionError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>}

          {selectedEvents.map((e) => {
            const c = colorFor(e);
            const items = checklists[e.id];
            const done = items ? items.filter((x) => x.is_done).length : 0;
            const other = e._role === 'sitter' ? e.owner_name : e.sitter_name;
            const otherLabel = e._role === 'sitter' ? t.owner : t.sitter;
            const chatUser = e._role === 'owner' ? (e.sitter_user_id || e.sitter_id) : e.owner_id;
            return (
              <article key={`${e._role}-${e.id}`} className="overflow-hidden rounded-2xl border border-nanny-orange/12 bg-[#fffdf9]">
                <div className="flex">
                  <span className="w-1.5 shrink-0" style={{ backgroundColor: c.bd }} />
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-nanny-brownish">{e.pet_name}</p>
                        <p className="text-sm text-nanny-brownish/65">
                          <span className="capitalize">{serviceName(e.service, language)}</span>
                          {' · '}
                          {e.start_time ? `${hhmm(e.start_time)}–${hhmm(e.end_time)}` : t.noTime}
                        </p>
                      </div>
                      <span className={`badge shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${STATUS_STYLES[e.status]}`}>
                        {t.status[e.status] || e.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-nanny-brownish/80">
                      {e._role === 'admin'
                        ? <>{t.sitter}: <b>{e.sitter_name}</b> · {t.owner}: <b>{e.owner_name}</b></>
                        : <>{otherLabel}: <b>{other}</b> <span className="text-xs opacity-60">({e._role === 'sitter' ? t.asSitter : t.asOwner})</span></>}
                    </p>

                    {e._s !== e._e && (
                      <p className="mt-1 text-xs text-nanny-brownish/55">
                        {new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(fromKey(e._s))}
                        {' → '}
                        {new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(fromKey(e._e))}
                      </p>
                    )}

                    {e._role === 'sitter' && e.status === 'pending' && (
                      <p className="mt-2 inline-flex rounded-full bg-[#fff1cf] px-2.5 py-0.5 text-xs font-semibold text-[#8d5c0b]">{t.waiting}</p>
                    )}

                    {items && items.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-nanny-brownish/60">{t.checklist}</span>
                          <span className={done === items.length ? 'text-green-700' : 'text-nanny-deepOrange'}>{done}/{items.length}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#fff1e2]">
                          <div className={`h-full rounded-full ${done === items.length ? 'bg-green-500' : 'bg-nanny-orange'}`} style={{ width: `${(done / items.length) * 100}%` }} />
                        </div>
                      </div>
                    )}

                    {e.notes && (
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-nanny-brownish/65">{e.notes}</p>
                    )}

                    {e._role !== 'admin' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {e._role === 'sitter' && e.status === 'pending' && (
                          <button type="button" disabled={busyId === e.id} onClick={() => confirmBooking(e)} className="btn-primary px-3 py-1.5 text-sm">
                            {t.confirm}
                          </button>
                        )}
                        <button type="button" onClick={() => router.push(`/bookings?open=${e.id}`)} className="btn-ghost px-3 py-1.5 text-sm">
                          {t.open}
                        </button>
                        {e.status !== 'cancelled' && (
                          <button type="button" onClick={() => router.push(`/chat?user=${chatUser}&booking=${e.id}`)} className="btn-ghost px-3 py-1.5 text-sm">
                            {t.message}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => keyOf(addDays(startOfWeek(cursor), i)));

  return (
    <DashboardLayout title="Calendar">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 overflow-hidden rounded-[28px] border border-nanny-orange/10 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nanny-orange/10 bg-gradient-to-r from-white to-[#fff8ef] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-nanny-orange/20 bg-white text-nanny-deepOrange transition hover:bg-[#fff1e2]">
                <Arrow dir="left" />
              </button>
              <button type="button" onClick={() => shift(1)} aria-label="Next"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-nanny-orange/20 bg-white text-nanny-deepOrange transition hover:bg-[#fff1e2]">
                <Arrow dir="right" />
              </button>
              <button type="button" onClick={goToday}
                      className="rounded-xl border border-nanny-orange/20 bg-white px-3 py-2 text-sm font-semibold text-nanny-brownish transition hover:bg-[#fff1e2]">
                {t.today}
              </button>
              <h2 className="ml-1 text-lg font-bold capitalize text-nanny-brownish sm:text-xl">{title}</h2>
            </div>

            <div className="inline-flex rounded-xl border border-nanny-orange/20 bg-white p-1 text-sm font-semibold">
              {[['month', t.month], ['week', t.week], ['day', t.day]].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setView(v); if (v === 'day') setCursor(fromKey(selectedKey)); }}
                  className={`rounded-lg px-3 py-1.5 transition ${view === v ? 'bg-nanny-orange text-white shadow-sm' : 'text-nanny-brownish hover:bg-[#fff8ef]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 sm:p-4">
            {view === 'month' && <MonthView />}
            {view === 'week' && <TimeGrid days={weekDays} />}
            {view === 'day' && <TimeGrid days={[selectedKey]} />}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-nanny-orange/10 px-4 py-3 text-xs text-nanny-brownish/60 sm:px-5">
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-6 rounded border border-dashed border-nanny-orange bg-[#FFE9D6]" />
              {t.legend}
            </span>
            <label className="flex cursor-pointer items-center gap-2 font-semibold">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="h-4 w-4 accent-nanny-orange" />
              {t.showCancelled}
            </label>
          </div>
        </section>

        <div className="min-w-0">
          <DayPanel />
        </div>
      </div>
    </DashboardLayout>
  );
}
