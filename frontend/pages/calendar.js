import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import { api, currentUser } from '../lib/api';
import Icon from '../components/Icon';
import { useLanguage } from '../lib/i18n';
import {
  formatDate,
  formatDateRange,
  getDateInAppTimeZone,
  getWeekdayLabels,
} from '../lib/date';

const STATUS_STYLES = {
  pending: 'bg-[#fff1cf] text-[#8d5c0b] border border-[#f0d27d]',
  confirmed: 'bg-[#eaf1ff] text-[#3158d6] border border-[#cddcff]',
  completed: 'bg-[#e7f8ec] text-[#1c8b49] border border-[#bde8cb]',
  cancelled: 'bg-[#ffe8e8] text-[#c54f4f] border border-[#f4bcbc]',
};

function formatLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatServiceLabel(value) {
  return String(value || '').replace(/_/g, ' ');
}

function sameDay(a, b) {
  return formatLocalDateKey(a) === formatLocalDateKey(b);
}

export default function Calendar() {
  const { language } = useLanguage();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [month, setMonth] = useState(() => getDateInAppTimeZone());
  const [viewerRole, setViewerRole] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => getDateInAppTimeZone());
  const t = {
    en: { careSchedule:'Care schedule', intro:'Track upcoming care days, see what is scheduled for the selected date and quickly understand what is happening today.', thisMonth:'This month', selectedDay:'Selected day', today:'Today', confirmed:'Confirmed', previous:'Previous', next:'Next', monthView:'Month view', more:'more', todaySelected:'Today selected', selectedDate:'Selected date', booking:'booking', bookings:'bookings', noVisits:'There are no scheduled visits on this date.', scheduledCare:'Scheduled care', bookingDetail:'Booking detail', dates:'Dates', time:'Time', timeNotSpecifiedYet:'Time not specified yet', owner:'Owner:', notes:'Notes:', todayOverview:'Today overview', todaySchedule:'Today’s schedule', adminToday:'Who is walking with whom today', nothingToday:'Nothing is scheduled for today.' },
    ru: { careSchedule:'График ухода', intro:'Следите за ближайшими днями ухода, смотрите, что назначено на выбранную дату, и быстро понимайте, что происходит сегодня.', thisMonth:'Этот месяц', selectedDay:'Выбранный день', today:'Сегодня', confirmed:'Подтверждено', previous:'Назад', next:'Вперёд', monthView:'Вид по месяцам', more:'ещё', todaySelected:'Выбрано сегодня', selectedDate:'Выбранная дата', booking:'бронирование', bookings:'бронирований', noVisits:'На эту дату ничего не запланировано.', scheduledCare:'Запланированный уход', bookingDetail:'Детали бронирования', dates:'Даты', time:'Время', timeNotSpecifiedYet:'Время пока не указано', owner:'Владелец:', notes:'Заметки:', todayOverview:'Обзор на сегодня', todaySchedule:'Расписание на сегодня', adminToday:'Кто с кем гуляет сегодня', nothingToday:'На сегодня ничего не запланировано.' },
    kz: { careSchedule:'Күтім кестесі', intro:'Алдағы күтім күндерін бақылаңыз, таңдалған күнге не жоспарланғанын көріңіз және бүгін не болып жатқанын бірден түсініңіз.', thisMonth:'Осы ай', selectedDay:'Таңдалған күн', today:'Бүгін', confirmed:'Расталған', previous:'Артқа', next:'Келесі', monthView:'Ай көрінісі', more:'тағы', todaySelected:'Бүгін таңдалды', selectedDate:'Таңдалған күн', booking:'бронь', bookings:'бронь', noVisits:'Бұл күнге ештеңе жоспарланбаған.', scheduledCare:'Жоспарланған күтім', bookingDetail:'Бронь деректері', dates:'Күндер', time:'Уақыт', timeNotSpecifiedYet:'Уақыт әлі көрсетілмеген', owner:'Иесі:', notes:'Жазбалар:', todayOverview:'Бүгінгі шолу', todaySchedule:'Бүгінгі кесте', adminToday:'Бүгін кім кіммен серуендейді', nothingToday:'Бүгінге ештеңе жоспарланбаған.' },
  }[language] || {};

  useEffect(() => {
    const user = currentUser();
    if (!user) { router.replace('/login'); return; }
    setViewerRole(user.role);
    (async () => {
      if (user.role === 'admin') {
        setEvents(await api.get('/api/admin/bookings'));
      } else {
        const { asOwner, asSitter } = await api.get('/api/bookings/mine');
        setEvents([...asOwner, ...asSitter]);
      }
    })();
  }, [router]);

  const today = getDateInAppTimeZone();
  const todayKey = formatLocalDateKey(today);
  const y = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const weekdayLabels = useMemo(() => getWeekdayLabels(language), [language]);
  const monthLabel = useMemo(
    () => formatDate(new Date(y, m, 1), language, { month: 'long', year: 'numeric' }),
    [language, m, y]
  );

  const allMonthEvents = useMemo(() => {
    return events.filter((event) => {
      const eventStart = event.start_date?.slice(0, 10);
      const eventEnd = event.end_date?.slice(0, 10);
      return eventStart && eventEnd && (
        eventStart.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)
        || eventEnd.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)
        || (eventStart < `${y}-${String(m + 1).padStart(2, '0')}-01`
            && eventEnd > `${y}-${String(m + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`)
      );
    });
  }, [events, y, m, daysInMonth]);

  function eventsOn(date) {
    const d = formatLocalDateKey(new Date(y, m, date));
    return events.filter((e) => d >= e.start_date.slice(0, 10) && d <= e.end_date.slice(0, 10));
  }

  const selectedEvents = events.filter((e) => {
    const d = formatLocalDateKey(selectedDate);
    return d >= e.start_date.slice(0, 10) && d <= e.end_date.slice(0, 10);
  });

  const todayEvents = events.filter((e) => todayKey >= e.start_date.slice(0, 10) && todayKey <= e.end_date.slice(0, 10));
  const selectedIsToday = sameDay(selectedDate, today);

  return (
    <DashboardLayout title="Calendar">
      <section className="mb-6 rounded-[32px] border border-nanny-orange/12 bg-gradient-to-r from-white to-[#fff6e9] px-6 py-6 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-nanny-brownish/45">{t.careSchedule || 'Care schedule'}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-nanny-brownish/75">
              {t.intro || 'Track upcoming care days, see what is scheduled for the selected date and quickly understand what is happening today.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.thisMonth || 'This month', allMonthEvents.length],
              [t.selectedDay || 'Selected day', selectedEvents.length],
              [t.today || 'Today', todayEvents.length],
              [t.confirmed || 'Confirmed', events.filter((item) => item.status === 'confirmed').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-nanny-orange/10 bg-white px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-nanny-brownish/45">{label}</p>
                <p className="mt-2 text-2xl font-bold text-nanny-blue">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <section className="min-w-0 overflow-hidden rounded-[32px] border border-nanny-orange/10 bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-nanny-orange/10 bg-gradient-to-r from-white to-[#fff8ef] px-6 py-5">
            <button className="btn-ghost" onClick={() => setMonth(new Date(y, m - 1, 1))}>
              <span className="inline-flex items-center gap-2">
                <Icon name="calendar" className="h-4 w-4" />
                {t.previous || 'Previous'}
              </span>
            </button>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-nanny-brownish/45">{t.monthView || 'Month view'}</p>
              <h2 className="mt-1 text-2xl font-bold text-nanny-brownish">
                {monthLabel}
              </h2>
            </div>
            <button className="btn-ghost" onClick={() => setMonth(new Date(y, m + 1, 1))}>
              {t.next || 'Next'}
            </button>
          </div>

          <div className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-nanny-brownish/50">
              {weekdayLabels.map((dayLabel) => <div key={dayLabel} className="py-2">{dayLabel}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = i + 1;
                const dayDate = new Date(y, m, date);
                const ev = eventsOn(date);
                const isToday = sameDay(dayDate, today);
                const isSelected = sameDay(dayDate, selectedDate);

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(dayDate)}
                    className={`min-h-[112px] min-w-0 overflow-hidden rounded-[22px] border p-3 text-left transition ${
                      isSelected
                        ? 'border-nanny-orange bg-[#fff7ee] shadow-sm'
                        : isToday
                          ? 'border-nanny-blue/30 bg-[#f7f9ff]'
                          : 'border-nanny-orange/12 bg-white hover:bg-[#fffaf3]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-bold ${isToday ? 'text-nanny-blue' : 'text-nanny-brownish'}`}>{date}</span>
                      {isToday && <span className="h-2.5 w-2.5 rounded-full bg-nanny-blue" />}
                    </div>
                    <div className="mt-3 space-y-2">
                      {ev.slice(0, 1).map((e) => (
                        <div key={e.id} className={`overflow-hidden rounded-xl px-2 py-2 text-[11px] font-semibold leading-4 ${STATUS_STYLES[e.status]}`}>
                          <div className="truncate capitalize">{formatServiceLabel(e.service)}</div>
                          <div className="mt-1 truncate opacity-80">
                            {viewerRole === 'admin'
                              ? `${e.pet_name} • ${e.sitter_name}`
                              : e.pet_name}
                          </div>
                        </div>
                      ))}
                      {ev.length > 1 && (
                        <div className="text-[11px] font-semibold text-nanny-brownish/55">
                          +{ev.length - 1} {t.more || 'more'}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-nanny-orange/10 bg-white shadow-card">
            <div className="border-b border-nanny-orange/10 bg-gradient-to-r from-white to-[#fff8ef] px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-nanny-brownish/45">
                    {selectedIsToday ? (t.todaySelected || 'Today selected') : (t.selectedDate || 'Selected date')}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-nanny-deepOrange">
                    {formatDate(selectedDate, language, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h3>
                </div>
                <span className="badge border border-nanny-orange/15 bg-[#fff8ef] px-3 py-1.5 text-nanny-brownish">
                  {selectedEvents.length} {selectedEvents.length === 1 ? (t.booking || 'booking') : (t.bookings || 'bookings')}
                </span>
              </div>
            </div>

            <div className="px-6 py-5">
              {selectedEvents.length === 0 && (
                <div className="rounded-2xl border border-dashed border-nanny-orange/18 bg-[#fffaf4] p-5 text-sm leading-6 text-nanny-brownish/70">
                  {t.noVisits || 'There are no scheduled visits on this date.'}
                </div>
              )}

              <div className="space-y-4">
                {selectedEvents.map((e) => (
                  <article key={e.id} className="rounded-[24px] border border-nanny-orange/12 bg-[#fffdf9] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-nanny-brownish/45">
                          {viewerRole === 'admin' ? (t.scheduledCare || 'Scheduled care') : (t.bookingDetail || 'Booking detail')}
                        </p>
                        <h4 className="mt-2 text-lg font-bold text-nanny-brownish">
                          {viewerRole === 'admin'
                            ? `${e.sitter_name} with ${e.pet_name}`
                            : `${e.pet_name} with ${e.sitter_name || 'sitter'}`}
                        </h4>
                        <p className="mt-1 text-sm capitalize text-nanny-brownish/70">{formatServiceLabel(e.service)}</p>
                      </div>
                      <span className={`badge px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${STATUS_STYLES[e.status]}`}>
                        {e.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-nanny-orange/10 bg-white p-4">
                        <div className="flex items-center gap-2 text-nanny-deepOrange">
                          <Icon name="calendar" className="h-4 w-4" />
                          <span className="text-xs uppercase tracking-[0.16em] font-semibold">{t.dates || 'Dates'}</span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-nanny-brownish">
                          {formatDateRange(e.start_date, e.end_date, language)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-nanny-orange/10 bg-white p-4">
                        <div className="flex items-center gap-2 text-nanny-deepOrange">
                          <Icon name="clock" className="h-4 w-4" />
                          <span className="text-xs uppercase tracking-[0.16em] font-semibold">{t.time || 'Time'}</span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-nanny-brownish">
                          {e.start_time && e.end_time ? `${String(e.start_time).slice(0, 5)} → ${String(e.end_time).slice(0, 5)}` : (t.timeNotSpecifiedYet || 'Time not specified yet')}
                        </p>
                      </div>
                    </div>

                    {(viewerRole === 'admin' || e.notes) && (
                      <div className="mt-4 space-y-2 text-sm text-nanny-brownish/80">
                        {viewerRole === 'admin' && <p><span className="font-semibold text-nanny-deepOrange">{t.owner || 'Owner:'}</span> {e.owner_name}</p>}
                        {e.notes && <p><span className="font-semibold text-nanny-deepOrange">{t.notes || 'Notes:'}</span> {e.notes}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-nanny-orange/10 bg-white shadow-card">
            <div className="border-b border-nanny-orange/10 bg-gradient-to-r from-white to-[#fff8ef] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nanny-orange/10 text-nanny-deepOrange">
                  <Icon name="calendar" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-nanny-brownish/45">
                    {viewerRole === 'admin' ? (t.todayOverview || 'Today overview') : (t.today || 'Today')}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-nanny-deepOrange">
                    {viewerRole === 'admin' ? (t.adminToday || 'Who is walking with whom today') : (t.todaySchedule || 'Today’s schedule')}
                  </h3>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              {todayEvents.length === 0 && (
                <div className="rounded-2xl border border-dashed border-nanny-orange/18 bg-[#fffaf4] p-5 text-sm leading-6 text-nanny-brownish/70">
                  {t.nothingToday || 'Nothing is scheduled for today.'}
                </div>
              )}

              <div className="space-y-3">
                {todayEvents.map((e) => (
                  <div key={e.id} className="rounded-[22px] border border-nanny-orange/12 bg-[#fffdf9] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-nanny-brownish">
                          {viewerRole === 'admin'
                            ? `${e.sitter_name} → ${e.pet_name}`
                            : `${e.pet_name} — ${formatServiceLabel(e.service)}`}
                        </p>
                        <p className="mt-1 text-sm text-nanny-brownish/70">
                          {formatDateRange(e.start_date, e.end_date)}
                        </p>
                        <p className="mt-1 text-sm text-nanny-brownish/70">
                          {e.start_time && e.end_time ? `${String(e.start_time).slice(0, 5)} → ${String(e.end_time).slice(0, 5)}` : (t.timeNotSpecifiedYet || 'Time not specified yet')}
                        </p>
                        {viewerRole === 'admin' && <p className="mt-1 text-sm text-nanny-brownish/80">{t.owner || 'Owner:'} {e.owner_name}</p>}
                        {e.notes && <p className="mt-2 text-sm text-nanny-brownish/80">{e.notes}</p>}
                      </div>
                      <span className={`badge px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${STATUS_STYLES[e.status]}`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
