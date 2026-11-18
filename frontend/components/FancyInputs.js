import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../lib/i18n';

/*
 * Pretty replacements for the browser's native number / date / time inputs.
 * They accept the same props as <input> (value, onChange, min, max, step,
 * disabled, placeholder, className) and call onChange({ target: { value } }),
 * so existing handlers like (e) => setX(e.target.value) keep working.
 */

const LABELS = {
  en: { pickDate: 'dd.mm.yyyy', pickTime: '--:--', today: 'Today', clear: 'Clear', now: 'Now', hours: 'Hours', minutes: 'Minutes', done: 'Done' },
  ru: { pickDate: 'дд.мм.гггг', pickTime: '--:--', today: 'Сегодня', clear: 'Очистить', now: 'Сейчас', hours: 'Часы', minutes: 'Минуты', done: 'Готово' },
  kz: { pickDate: 'кк.аа.жжжж', pickTime: '--:--', today: 'Бүгін', clear: 'Тазалау', now: 'Қазір', hours: 'Сағат', minutes: 'Минут', done: 'Дайын' },
};

const LOCALES = { en: 'en-US', ru: 'ru-RU', kz: 'kk-KZ' };

function useLabels() {
  let language = 'en';
  try {
    language = useLanguage().language || 'en';
  } catch (_) {
    language = 'en';
  }
  return { language, locale: LOCALES[language] || 'en-US', L: LABELS[language] || LABELS.en };
}

// Width / margin classes belong on the wrapper so the custom buttons line up with the field.
const LAYOUT_CLASS = /^(w-|max-w-|min-w-|m-|mt-|mb-|ml-|mr-|mx-|my-|flex-|basis-|grow|shrink|col-|self-)/;
function splitClasses(className = '') {
  const parts = className.split(/\s+/).filter(Boolean);
  return {
    wrapper: parts.filter((c) => LAYOUT_CLASS.test(c)).join(' '),
    field: parts.filter((c) => !LAYOUT_CLASS.test(c)).join(' '),
  };
}

function fire(onChange, name, value) {
  if (onChange) onChange({ target: { value, name }, currentTarget: { value, name } });
}

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parseISO(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/* ---------- shared popover (rendered in a portal so modals don't clip it) ---------- */

function usePopover(open, setOpen, anchorRef, popRef) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const anchor = anchorRef.current;
      const pop = popRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const h = pop ? pop.offsetHeight : 360;
      const w = pop ? pop.offsetWidth : 320;
      const below = window.innerHeight - r.bottom;
      const top = below < h + 12 && r.top > h + 12 ? r.top - h - 8 : r.bottom + 8;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setPos({ top, left });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, popRef]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, anchorRef, popRef]);

  return pos;
}

function Popover({ open, pos, popRef, children, width = 320 }) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={popRef}
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, zIndex: 1000 }}
      className="fancy-pop rounded-3xl border border-nanny-orange/20 bg-white p-4 text-nanny-brownish shadow-[0_24px_60px_rgba(122,75,31,0.22)]"
    >
      {children}
    </div>,
    document.body
  );
}

function Chevron({ dir = 'down', className = 'h-3.5 w-3.5' }) {
  const d = { up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6' }[dir];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const iconChip = 'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-xl bg-[#fff1e2] text-nanny-deepOrange transition group-hover:bg-nanny-orange group-hover:text-white';

/* ---------------------------------- NUMBER ---------------------------------- */

export function NumberInput({ className = '', value, onChange, min, max, step = 1, disabled, name, ...rest }) {
  const { wrapper, field } = splitClasses(className);
  const stepNum = Number(step) && step !== 'any' ? Number(step) : 1;
  const decimals = (String(stepNum).split('.')[1] || '').length;

  const bump = (dir) => {
    if (disabled) return;
    const current = value === '' || value === null || value === undefined || Number.isNaN(Number(value))
      ? (min !== undefined && min !== '' ? Number(min) - (dir > 0 ? stepNum : 0) : 0)
      : Number(value);
    let next = current + dir * stepNum;
    if (min !== undefined && min !== '' && next < Number(min)) next = Number(min);
    if (max !== undefined && max !== '' && next > Number(max)) next = Number(max);
    fire(onChange, name, next.toFixed(decimals));
  };

  const btn = 'grid h-[18px] w-7 place-items-center rounded-lg bg-[#fff1e2] text-nanny-deepOrange transition hover:bg-nanny-orange hover:text-white active:scale-90 disabled:opacity-40 disabled:hover:bg-[#fff1e2] disabled:hover:text-nanny-deepOrange';

  return (
    <div className={`relative ${wrapper}`}>
      <input
        {...rest}
        name={name}
        type="number"
        inputMode={decimals ? 'decimal' : 'numeric'}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value ?? ''}
        onChange={onChange}
        className={`${field} fancy-number w-full pr-12`}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-0.5">
        <button type="button" tabIndex={-1} aria-label="+" disabled={disabled} onClick={() => bump(1)} className={btn}>
          <Chevron dir="up" className="h-3 w-3" />
        </button>
        <button type="button" tabIndex={-1} aria-label="-" disabled={disabled} onClick={() => bump(-1)} className={btn}>
          <Chevron dir="down" className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------- DATE ----------------------------------- */

export function DateInput({ className = '', value, onChange, min, max, disabled, name, placeholder, required }) {
  const { wrapper, field } = splitClasses(className);
  const { locale, L } = useLabels();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const popRef = useRef(null);
  const pos = usePopover(open, setOpen, anchorRef, popRef);

  const selected = parseISO(value);
  const minD = parseISO(min);
  const maxD = parseISO(max);
  const today = todayISO();

  const [view, setView] = useState(() => {
    const base = selected || parseISO(min) || parseISO(today);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (open) {
      const base = parseISO(value) || parseISO(min) || parseISO(todayISO());
      setView(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => (
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)) // 2024-01-01 is Monday
  )), [locale]);

  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(view);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const shift = (first.getDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, i) => new Date(view.getFullYear(), view.getMonth(), 1 - shift + i));
  }, [view]);

  const isDisabledDay = (d) => (minD && d < minD) || (maxD && d > maxD);
  const pick = (iso) => { fire(onChange, name, iso); setOpen(false); };

  const display = selected
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(selected)
    : '';

  const todayD = parseISO(today);
  const todayAllowed = !isDisabledDay(todayD);

  return (
    <div className={`relative ${wrapper}`}>
      <button
        ref={anchorRef}
        type="button"
        name={name}
        disabled={disabled}
        aria-required={required}
        onClick={() => setOpen((o) => !o)}
        className={`${field} group relative w-full pr-12 text-left disabled:cursor-not-allowed disabled:opacity-60 ${open ? 'border-nanny-blue ring-2 ring-nanny-blue/40' : ''}`}
      >
        <span className={display ? '' : 'opacity-45'}>{display || placeholder || L.pickDate}</span>
        <span className={iconChip}><CalendarIcon /></span>
      </button>

      <Popover open={open} pos={pos} popRef={popRef} width={316}>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                  className="grid h-9 w-9 place-items-center rounded-xl text-nanny-deepOrange transition hover:bg-[#fff1e2]">
            <Chevron dir="left" className="h-4 w-4" />
          </button>
          <p className="font-display text-[15px] font-semibold capitalize">{monthTitle}</p>
          <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                  className="grid h-9 w-9 place-items-center rounded-xl text-nanny-deepOrange transition hover:bg-[#fff1e2]">
            <Chevron dir="right" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((w, i) => (
            <span key={w + i} className={`pb-1 text-[11px] font-semibold uppercase tracking-wide ${i >= 5 ? 'text-nanny-deepOrange/70' : 'opacity-50'}`}>
              {w.replace('.', '')}
            </span>
          ))}
          {days.map((d) => {
            const iso = toISO(d);
            const outside = d.getMonth() !== view.getMonth();
            const off = isDisabledDay(d);
            const isSel = value === iso;
            const isToday = iso === today;
            return (
              <button
                key={iso}
                type="button"
                disabled={off}
                onClick={() => pick(iso)}
                className={[
                  'relative h-9 rounded-xl text-sm font-medium transition',
                  isSel
                    ? 'bg-nanny-orange text-white shadow-[0_8px_18px_rgba(233,122,31,0.35)]'
                    : off
                      ? 'cursor-not-allowed text-nanny-brownish/25'
                      : outside
                        ? 'text-nanny-brownish/40 hover:bg-[#fff1e2]'
                        : 'hover:bg-[#fff1e2] hover:text-nanny-deepOrange',
                  isToday && !isSel ? 'ring-1 ring-inset ring-nanny-orange/60 text-nanny-deepOrange font-semibold' : '',
                ].join(' ')}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-nanny-orange/10 pt-3 text-sm font-semibold">
          <button type="button" onClick={() => pick('')} className="rounded-lg px-2 py-1 text-nanny-brownish/60 transition hover:text-red-500">
            {L.clear}
          </button>
          <button type="button" disabled={!todayAllowed} onClick={() => pick(today)}
                  className="rounded-lg bg-[#fff1e2] px-3 py-1.5 text-nanny-deepOrange transition hover:bg-nanny-orange hover:text-white disabled:opacity-40">
            {L.today}
          </button>
        </div>
      </Popover>
    </div>
  );
}

/* ----------------------------------- TIME ----------------------------------- */

export function TimeInput({ className = '', value, onChange, disabled, name, placeholder, min, max }) {
  const { wrapper, field } = splitClasses(className);
  const { L } = useLabels();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const popRef = useRef(null);
  const pos = usePopover(open, setOpen, anchorRef, popRef);
  const hourCol = useRef(null);
  const minCol = useRef(null);

  const [h, m] = /^\d{2}:\d{2}/.test(value || '') ? value.slice(0, 5).split(':') : [null, null];
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = useMemo(() => {
    const list = Array.from({ length: 12 }, (_, i) => pad(i * 5));
    if (m && !list.includes(m)) list.push(m);
    return list.sort();
  }, [m]);

  const outOfRange = (t) => (min && t < min) || (max && t > max);
  const set = (hh, mm) => fire(onChange, name, `${hh}:${mm}`);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      [hourCol, minCol].forEach((ref) => {
        const active = ref.current?.querySelector('[data-active="true"]');
        if (active) ref.current.scrollTop = active.offsetTop - ref.current.clientHeight / 2 + active.offsetHeight / 2;
      });
    });
  }, [open]);

  const cell = (active, off) => [
    'w-full rounded-xl py-1.5 text-sm font-semibold transition',
    active ? 'bg-nanny-orange text-white shadow-[0_8px_18px_rgba(233,122,31,0.35)]'
      : off ? 'cursor-not-allowed text-nanny-brownish/25' : 'hover:bg-[#fff1e2] hover:text-nanny-deepOrange',
  ].join(' ');

  const nowValue = () => {
    const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    fire(onChange, name, now);
    setOpen(false);
  };

  return (
    <div className={`relative ${wrapper}`}>
      <button
        ref={anchorRef}
        type="button"
        name={name}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${field} group relative w-full pr-12 text-left tabular-nums disabled:cursor-not-allowed disabled:opacity-60 ${open ? 'border-nanny-blue ring-2 ring-nanny-blue/40' : ''}`}
      >
        <span className={value ? '' : 'opacity-45'}>{value ? value.slice(0, 5) : (placeholder || L.pickTime)}</span>
        <span className={iconChip}><ClockIcon /></span>
      </button>

      <Popover open={open} pos={pos} popRef={popRef} width={236}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide opacity-50">{L.hours}</p>
            <div ref={hourCol} className="fancy-scroll relative h-52 space-y-1 overflow-y-auto pr-1">
              {hours.map((hh) => {
                const off = outOfRange(`${hh}:${m || '00'}`) && outOfRange(`${hh}:00`) && outOfRange(`${hh}:55`);
                return (
                  <button key={hh} type="button" data-active={hh === h} disabled={off}
                          onClick={() => set(hh, m || '00')} className={cell(hh === h, off)}>
                    {hh}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide opacity-50">{L.minutes}</p>
            <div ref={minCol} className="fancy-scroll relative h-52 space-y-1 overflow-y-auto pr-1">
              {minutes.map((mm) => {
                const off = outOfRange(`${h || '00'}:${mm}`);
                return (
                  <button key={mm} type="button" data-active={mm === m} disabled={off}
                          onClick={() => set(h || '00', mm)} className={cell(mm === m, off)}>
                    {mm}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-nanny-orange/10 pt-3 text-sm font-semibold">
          <button type="button" onClick={() => { fire(onChange, name, ''); setOpen(false); }}
                  className="rounded-lg px-2 py-1 text-nanny-brownish/60 transition hover:text-red-500">
            {L.clear}
          </button>
          <div className="flex gap-1.5">
            <button type="button" onClick={nowValue} className="rounded-lg px-2 py-1.5 text-nanny-deepOrange transition hover:bg-[#fff1e2]">
              {L.now}
            </button>
            <button type="button" onClick={() => setOpen(false)}
                    className="rounded-lg bg-[#fff1e2] px-3 py-1.5 text-nanny-deepOrange transition hover:bg-nanny-orange hover:text-white">
              {L.done}
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
