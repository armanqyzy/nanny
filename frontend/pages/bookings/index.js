import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { api, currentUser } from '../../lib/api';
import PetUpdatesFeed from '../../components/PetUpdatesFeed';
import Icon from '../../components/Icon';
import { useLanguage } from '../../lib/i18n';

const STATUS_STYLES = {
  pending:   'bg-[#fff1cf] text-[#8d5c0b] border border-[#f0d27d]',
  confirmed: 'bg-[#eaf1ff] text-[#3158d6] border border-[#cddcff]',
  completed: 'bg-[#e7f8ec] text-[#1c8b49] border border-[#bde8cb]',
  cancelled: 'bg-[#ffe8e8] text-[#c54f4f] border border-[#f4bcbc]',
};

const STATUS_LABELS = {
  all: 'All',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatServiceLabel(service) {
  return String(service || '').replace(/_/g, ' ');
}

function formatDateRange(startDate, endDate) {
  return `${new Date(startDate).toLocaleDateString()} → ${new Date(endDate).toLocaleDateString()}`;
}

export default function Bookings() {
  const { language } = useLanguage();
  const router = useRouter();
  const reviewFromQuery = router.query.review;
  const [data, setData] = useState({ asOwner: [], asSitter: [] });
  const [filter, setFilter] = useState('all');
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, body: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [rebookBooking, setRebookBooking] = useState(null);
  const [rebookForm, setRebookForm] = useState({ start_date: '', end_date: '', start_time: '', end_time: '' });
  const [rebookMessage, setRebookMessage] = useState('');
  const t = {
    en: {
      all: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
      reviewSubmitted: 'Review submitted successfully.',
      bookingRepeated: 'Booking repeated successfully.',
      sitter: 'Sitter', owner: 'Owner', pet: 'Pet',
      dates: 'Dates', time: 'Time', total: 'Total',
      timeNotSpecified: 'Time not specified', careNote: 'Care note', liveUpdates: 'Live pet updates',
      liveUpdatesText: 'Updates appear here when the sitter sends a note, photo or status from the booking card.',
      messageSitter: 'Message sitter', messageOwner: 'Message owner', confirm: 'Confirm', markCompleted: 'Mark completed', cancel: 'Cancel',
      reviewSent: 'Review sent', leaveReview: 'Leave rating & review', bookAgain: 'Book again',
      workspace: 'Booking workspace',
      workspaceText: 'Track current bookings, open sitter conversations, review finished care and follow live updates in one place.',
      ownerBookings: 'Owner bookings',
      asOwner: 'As owner',
      ownerText: 'Requests you created for your pets.',
      noBookings: 'No bookings yet. Start by choosing a sitter and creating your first request.',
      asSitter: 'As sitter',
      sitterText: 'Active care requests where you are the service provider.',
      leaveReviewTitle: 'Leave a review',
      leaveReviewText: 'Rate',
      forBookingWith: 'for booking with',
      close: 'Close',
      rating: 'Rating',
      reviewPlaceholder: 'Write your review here. Please be specific about communication, punctuality, care and updates.',
      minChars: 'Minimum 30 characters.',
      submitReview: 'Submit review',
      bookAgainTitle: 'Book again',
      repeatBooking: 'Repeat booking with',
      forPet: 'for',
      confirmRepeat: 'Confirm repeat booking',
    },
    ru: {
      all: 'Все', pending: 'Ожидает', confirmed: 'Подтверждено', completed: 'Завершено', cancelled: 'Отменено',
      reviewSubmitted: 'Отзыв успешно отправлен.',
      bookingRepeated: 'Бронирование успешно повторено.',
      sitter: 'Ситтер', owner: 'Владелец', pet: 'Питомец',
      dates: 'Даты', time: 'Время', total: 'Итого',
      timeNotSpecified: 'Время не указано', careNote: 'Заметка по уходу', liveUpdates: 'Live-обновления по питомцу',
      liveUpdatesText: 'Обновления появятся здесь, когда ситтер отправит заметку, фото или статус из карточки бронирования.',
      messageSitter: 'Написать ситтеру', messageOwner: 'Написать владельцу', confirm: 'Подтвердить', markCompleted: 'Отметить завершённым', cancel: 'Отменить',
      reviewSent: 'Отзыв отправлен', leaveReview: 'Оставить рейтинг и отзыв', bookAgain: 'Забронировать снова',
      workspace: 'Пространство бронирований',
      workspaceText: 'Следите за текущими бронированиями, открывайте диалоги с ситтерами, оценивайте завершённый уход и смотрите live-обновления в одном месте.',
      ownerBookings: 'Бронирования владельца',
      asOwner: 'Как владелец',
      ownerText: 'Запросы, которые вы создали для своих питомцев.',
      noBookings: 'Пока нет бронирований. Начните с выбора ситтера и создания первого запроса.',
      asSitter: 'Как ситтер',
      sitterText: 'Активные заявки на уход, где вы выступаете исполнителем услуги.',
      leaveReviewTitle: 'Оставить отзыв',
      leaveReviewText: 'Оцените',
      forBookingWith: 'за бронирование с',
      close: 'Закрыть',
      rating: 'Оценка',
      reviewPlaceholder: 'Напишите отзыв. Лучше указать, как прошли коммуникация, пунктуальность, уход и обновления.',
      minChars: 'Минимум 30 символов.',
      submitReview: 'Отправить отзыв',
      bookAgainTitle: 'Забронировать снова',
      repeatBooking: 'Повторить бронирование с',
      forPet: 'для',
      confirmRepeat: 'Подтвердить повторное бронирование',
    },
    kz: {
      all: 'Барлығы', pending: 'Күтілуде', confirmed: 'Расталды', completed: 'Аяқталды', cancelled: 'Тоқтатылды',
      reviewSubmitted: 'Пікір сәтті жіберілді.',
      bookingRepeated: 'Бронь сәтті қайталанды.',
      sitter: 'Ситтер', owner: 'Иесі', pet: 'Жануар',
      dates: 'Күндер', time: 'Уақыт', total: 'Барлығы',
      timeNotSpecified: 'Уақыт көрсетілмеген', careNote: 'Күтім ескертпесі', liveUpdates: 'Жануар бойынша live жаңартулар',
      liveUpdatesText: 'Ситтер бронь картасынан жазба, фото немесе статус жібергенде жаңартулар осында көрінеді.',
      messageSitter: 'Ситтерге жазу', messageOwner: 'Иесіне жазу', confirm: 'Растау', markCompleted: 'Аяқталды деп белгілеу', cancel: 'Тоқтату',
      reviewSent: 'Пікір жіберілді', leaveReview: 'Рейтинг пен пікір қалдыру', bookAgain: 'Қайта бронь жасау',
      workspace: 'Бронь кеңістігі',
      workspaceText: 'Ағымдағы броньдарды бақылаңыз, ситтерлермен сөйлесіңіз, аяқталған күтімді бағалаңыз және live жаңартуларды бір жерден көріңіз.',
      ownerBookings: 'Ие броньдары',
      asOwner: 'Ие ретінде',
      ownerText: 'Үй жануарларыңыз үшін жасаған сұраныстарыңыз.',
      noBookings: 'Әзірге бронь жоқ. Алдымен ситтер таңдап, алғашқы сұранысты жасаңыз.',
      asSitter: 'Ситтер ретінде',
      sitterText: 'Сіз қызмет көрсетуші болып табылатын белсенді күтім сұраныстары.',
      leaveReviewTitle: 'Пікір қалдыру',
      leaveReviewText: 'Бағалаңыз',
      forBookingWith: 'броні үшін',
      close: 'Жабу',
      rating: 'Рейтинг',
      reviewPlaceholder: 'Пікіріңізді жазыңыз. Байланыс, ұқыптылық, күтім және жаңартулар туралы нақты жазыңыз.',
      minChars: 'Кемінде 30 таңба.',
      submitReview: 'Пікір жіберу',
      bookAgainTitle: 'Қайта бронь жасау',
      repeatBooking: 'Қайта бронь жасау',
      forPet: 'үшін',
      confirmRepeat: 'Қайта броньды растау',
    },
  }[language] || {};

  useEffect(() => {
    if (!currentUser()) { router.replace('/login'); return; }
    reload();
  }, [router]);

  useEffect(() => {
    if (!reviewFromQuery || !data.asOwner.length) return;
    const bookingToReview = data.asOwner.find((item) => (
      Number(item.id) === Number(reviewFromQuery) &&
      item.status === 'completed' &&
      !item.has_review
    ));
    if (bookingToReview) {
      setReviewBooking(bookingToReview);
      setReviewMessage('');
    }
  }, [reviewFromQuery, data.asOwner]);

  async function reload() { setData(await api.get('/api/bookings/mine')); }

  async function changeStatus(id, status) {
    await api.put(`/api/bookings/${id}/status`, { status });
    reload();
  }

  async function submitReview() {
    if (!reviewBooking) return;
    try {
      await api.post('/api/reviews', {
        booking_id: reviewBooking.id,
        rating: reviewForm.rating,
        body: reviewForm.body,
      });
      setReviewMessage(t.reviewSubmitted || 'Review submitted successfully.');
      setReviewForm({ rating: 5, body: '' });
      reload();
      setTimeout(() => {
        setReviewBooking(null);
        setReviewMessage('');
      }, 900);
    } catch (err) {
      setReviewMessage(err.message);
    }
  }

  async function submitRebook() {
    if (!rebookBooking) return;
    try {
      await api.post(`/api/bookings/${rebookBooking.id}/rebook`, rebookForm);
      setRebookMessage(t.bookingRepeated || 'Booking repeated successfully.');
      setTimeout(() => {
        setRebookBooking(null);
        setRebookMessage('');
        reload();
      }, 900);
    } catch (err) {
      setRebookMessage(err.message);
    }
  }

  function Card({ b, role }) {
    const contactName = role === 'owner' ? b.sitter_name : b.owner_name;
    const contactLabel = role === 'owner' ? (t.sitter || 'Sitter') : (t.owner || 'Owner');
    const serviceLabel = formatServiceLabel(b.service);

    return (
      <div className="overflow-hidden rounded-[30px] border border-nanny-orange/12 bg-white shadow-card">
        <div className="border-b border-nanny-orange/10 bg-gradient-to-r from-white to-[#fff7ee] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-nanny-brownish/45">{contactLabel}</p>
              <div className="mt-2 text-[30px] font-bold leading-none text-nanny-brownish">{contactName}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-nanny-brownish/70">
                <span className="rounded-full bg-nanny-cream px-3 py-1 capitalize">{serviceLabel}</span>
                <span className="opacity-40">•</span>
                <span>{t.pet || 'Pet'}: {b.pet_name}</span>
              </div>
            </div>
            <span className={`badge px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${STATUS_STYLES[b.status]}`}>{b.status}</span>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-nanny-orange/10 bg-[#fffaf3] p-4">
              <div className="flex items-center gap-2 text-nanny-deepOrange">
                <Icon name="calendar" className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em] font-semibold">{t.dates || 'Dates'}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-nanny-brownish">{formatDateRange(b.start_date, b.end_date)}</p>
            </div>
            <div className="rounded-2xl border border-nanny-orange/10 bg-[#fffaf3] p-4">
              <div className="flex items-center gap-2 text-nanny-deepOrange">
                <Icon name="clock" className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em] font-semibold">{t.time || 'Time'}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-nanny-brownish">
                {b.start_time && b.end_time ? `${String(b.start_time).slice(0, 5)} → ${String(b.end_time).slice(0, 5)}` : (t.timeNotSpecified || 'Time not specified')}
              </p>
            </div>
            <div className="rounded-2xl border border-nanny-orange/10 bg-[#fffaf3] p-4">
              <div className="flex items-center gap-2 text-nanny-deepOrange">
                <Icon name="wallet" className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em] font-semibold">{t.total || 'Total'}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-nanny-brownish">{Number(b.total_price).toLocaleString()} ₸</p>
            </div>
          </div>

          {b.notes && (
            <div className="mt-4 rounded-2xl border border-nanny-orange/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-nanny-brownish/45">{t.careNote || 'Care note'}</p>
              <p className="mt-2 text-sm leading-6 text-nanny-brownish/85">{b.notes}</p>
            </div>
          )}

          {['confirmed', 'completed'].includes(b.status) && (
            <div className="mt-4 rounded-2xl border border-nanny-orange/10 bg-[#fff8ef] p-4">
              <div className="flex items-center gap-2 text-nanny-deepOrange">
                <Icon name="support" className="h-4 w-4" />
                <p className="text-sm font-semibold">{t.liveUpdates || 'Live pet updates'}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-nanny-brownish/75">
                {t.liveUpdatesText || 'Updates appear here when the sitter sends a note, photo or status from the booking card.'}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/chat?user=${role === 'owner' ? (b.sitter_user_id || b.sitter_id) : b.owner_id}`)}
              className="btn-ghost text-sm"
            >
              {role === 'owner' ? (t.messageSitter || 'Message sitter') : (t.messageOwner || 'Message owner')}
            </button>
            {role === 'sitter' && b.status === 'pending' && (
              <button onClick={() => changeStatus(b.id, 'confirmed')} className="btn-primary text-sm">{t.confirm || 'Confirm'}</button>
            )}
            {role === 'sitter' && b.status === 'confirmed' && (
              <button onClick={() => changeStatus(b.id, 'completed')} className="btn-secondary text-sm">{t.markCompleted || 'Mark completed'}</button>
            )}
            {['pending', 'confirmed'].includes(b.status) && (
              <button onClick={() => changeStatus(b.id, 'cancelled')} className="btn-ghost text-sm text-red-600">{t.cancel || 'Cancel'}</button>
            )}
          </div>

          {['confirmed', 'completed'].includes(b.status) && (
            <div className="mt-5">
              <PetUpdatesFeed bookingId={b.id} role={role === 'sitter' ? 'sitter' : 'owner'} compact />
            </div>
          )}

          {role === 'owner' && b.status === 'completed' && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-nanny-orange/10 pt-4">
              {b.has_review ? (
                <span className="badge border border-[#bde8cb] bg-[#e7f8ec] px-3 py-1.5 text-green-700">{t.reviewSent || 'Review sent'}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setReviewBooking(b);
                    setReviewMessage('');
                  }}
                  className="btn-ghost text-sm"
                >
                  {t.leaveReview || 'Leave rating & review'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setRebookBooking(b);
                  setRebookForm({
                    start_date: '',
                    end_date: '',
                    start_time: b.start_time ? String(b.start_time).slice(0,5) : '',
                    end_time: b.end_time ? String(b.end_time).slice(0,5) : '',
                  });
                  setRebookMessage('');
                }}
                className="btn-ghost text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="repeat" className="h-4 w-4" />
                  {t.bookAgain || 'Book again'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="My bookings">
      <section className="mb-6 rounded-[32px] border border-nanny-orange/12 bg-gradient-to-r from-white to-[#fff6e9] px-6 py-6 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-nanny-brownish/45">{t.workspace || 'Booking workspace'}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-nanny-brownish/75">
              {t.workspaceText || 'Track current bookings, open sitter conversations, review finished care and follow live updates in one place.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.ownerBookings || 'Owner bookings', data.asOwner.length],
              [t.pending || 'Pending', data.asOwner.filter((item) => item.status === 'pending').length + data.asSitter.filter((item) => item.status === 'pending').length],
              [t.confirmed || 'Confirmed', data.asOwner.filter((item) => item.status === 'confirmed').length + data.asSitter.filter((item) => item.status === 'confirmed').length],
              [t.completed || 'Completed', data.asOwner.filter((item) => item.status === 'completed').length + data.asSitter.filter((item) => item.status === 'completed').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-nanny-orange/10 bg-white px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-nanny-brownish/45">{label}</p>
                <p className="mt-2 text-2xl font-bold text-nanny-blue">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
              filter === status
                ? 'bg-nanny-orange text-white shadow-sm'
                : 'border border-nanny-orange/20 bg-white text-nanny-brownish hover:bg-[#fff8ef]'
            }`}
          >
            {t[status] || STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-nanny-deepOrange">{t.asOwner || 'As owner'}</h2>
          <p className="mt-1 text-sm text-nanny-brownish/70">{t.ownerText || 'Requests you created for your pets.'}</p>
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-5">
        {data.asOwner.filter((b) => filter === 'all' || b.status === filter).length ? data.asOwner.filter((b) => filter === 'all' || b.status === filter).map((b) => <Card key={b.id} b={b} role="owner" />)
          : <div className="rounded-[28px] border border-dashed border-nanny-orange/20 bg-white/70 p-6 text-sm leading-6 text-nanny-brownish/70">{t.noBookings || 'No bookings yet. Start by choosing a sitter and creating your first request.'}</div>}
      </div>

      {data.asSitter.filter((b) => filter === 'all' || b.status === filter).length > 0 && (
        <>
          <div className="mb-4 mt-10 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-nanny-deepOrange">{t.asSitter || 'As sitter'}</h2>
              <p className="mt-1 text-sm text-nanny-brownish/70">{t.sitterText || 'Active care requests where you are the service provider.'}</p>
            </div>
          </div>
          <div className="grid xl:grid-cols-2 gap-5">
            {data.asSitter.filter((b) => filter === 'all' || b.status === filter).map((b) => <Card key={b.id} b={b} role="sitter" />)}
          </div>
        </>
      )}

      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setReviewBooking(null)}>
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-nanny-deepOrange">{t.leaveReviewTitle || 'Leave a review'}</h3>
                <p className="mt-1 text-sm opacity-70">
                  {t.leaveReviewText || 'Rate'} {reviewBooking.sitter_name} {t.forBookingWith || 'for booking with'} {reviewBooking.pet_name}.
                </p>
              </div>
              <button className="btn-ghost" onClick={() => setReviewBooking(null)}>{t.close || 'Close'}</button>
            </div>

            <div className="mt-5 rounded-2xl bg-nanny-cream/45 p-5">
              <p className="text-sm font-semibold">{t.rating || 'Rating'}</p>
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                      reviewForm.rating >= value ? 'bg-nanny-orange text-white' : 'bg-white text-nanny-orange border border-nanny-orange/20'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>★</span>
                      {value}
                    </span>
                  </button>
                ))}
              </div>
              <textarea
                className="input mt-4 min-h-[150px]"
                placeholder={t.reviewPlaceholder || 'Write your review here. Please be specific about communication, punctuality, care and updates.'}
                value={reviewForm.body}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, body: e.target.value }))}
              />
              <p className="mt-2 text-xs opacity-60">{t.minChars || 'Minimum 30 characters.'}</p>
              {reviewMessage && (
                <p className={`mt-3 text-sm ${reviewMessage.includes('success') ? 'text-green-700' : 'text-red-600'}`}>
                  {reviewMessage}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setReviewBooking(null)}>{t.cancel || 'Cancel'}</button>
              <button className="btn-primary" onClick={submitReview}>{t.submitReview || 'Submit review'}</button>
            </div>
          </div>
        </div>
      )}

      {rebookBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setRebookBooking(null)}>
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-nanny-deepOrange">{t.bookAgainTitle || 'Book again'}</h3>
                <p className="mt-1 text-sm opacity-70">{t.repeatBooking || 'Repeat booking with'} {rebookBooking.sitter_name} {t.forPet || 'for'} {rebookBooking.pet_name}.</p>
              </div>
              <button className="btn-ghost" onClick={() => setRebookBooking(null)}>{t.close || 'Close'}</button>
            </div>
            <div className="mt-5 grid gap-3 rounded-2xl bg-nanny-cream/45 p-5 md:grid-cols-2">
              <input className="input" type="date" value={rebookForm.start_date} onChange={(e) => setRebookForm((prev) => ({ ...prev, start_date: e.target.value }))} />
              <input className="input" type="date" value={rebookForm.end_date} onChange={(e) => setRebookForm((prev) => ({ ...prev, end_date: e.target.value }))} />
              <input className="input" type="time" value={rebookForm.start_time} onChange={(e) => setRebookForm((prev) => ({ ...prev, start_time: e.target.value }))} />
              <input className="input" type="time" value={rebookForm.end_time} onChange={(e) => setRebookForm((prev) => ({ ...prev, end_time: e.target.value }))} />
              {rebookMessage && (
                <p className={`md:col-span-2 text-sm ${rebookMessage.includes('successfully') ? 'text-green-700' : 'text-red-600'}`}>{rebookMessage}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setRebookBooking(null)}>{t.cancel || 'Cancel'}</button>
              <button className="btn-primary" onClick={submitRebook}>{t.confirmRepeat || 'Confirm repeat booking'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
