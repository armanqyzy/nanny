import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { api, currentUser } from '../../lib/api';
import PetUpdatesFeed from '../../components/PetUpdatesFeed';
import Icon from '../../components/Icon';
import { useLanguage } from '../../lib/i18n';
import { nowTimeInAppTimeZone, todayInAppTimeZone } from '../../lib/date';
import PaymentCardForm from '../../components/PaymentCardForm';
import { EMPTY_CARD, friendlyPaymentError, toPaymentPayload, validateCard } from '../../lib/payment';
import ReportModal from '../../components/ReportModal';
import EmptyState from '../../components/EmptyState';
import CancelBookingModal from '../../components/CancelBookingModal';
import RescheduleModal from '../../components/RescheduleModal';
import { POLICY_TEXT, cancelReasonLabel } from '../../lib/cancellation';
import { localeFor, serviceName } from '../../lib/services';
import { DateInput, TimeInput } from '../../components/FancyInputs';

const EMPTY_PAYMENT = EMPTY_CARD;

// Short inline translations for the booking payment UI.
function payText(language, key) {
  const dict = {
    pay: { en: 'Pay', ru: 'Оплатить', kz: 'Төлеу' },
    paid: { en: 'Paid', ru: 'Оплачено', kz: 'Төленді' },
    unpaid: { en: 'Not paid yet', ru: 'Ещё не оплачено', kz: 'Әлі төленбеген' },
    refunded: { en: 'Refunded', ru: 'Возвращено', kz: 'Қайтарылды' },
    partiallyRefunded: { en: 'Partly refunded', ru: 'Возвращено частично', kz: 'Ішінара қайтарылды' },
    noRefund: { en: 'Paid, no refund', ru: 'Оплачено, без возврата', kz: 'Төленді, қайтарылмайды' },
    payAfterConfirm: { en: 'Payment opens after the sitter confirms', ru: 'Оплата откроется после подтверждения ситтером', kz: 'Ситтер растағаннан кейін төлеуге болады' },
    title: { en: 'Pay for booking', ru: 'Оплата бронирования', kz: 'Брондауды төлеу' },
    demo: {
      en: 'Demo payment: no money is charged. Use the test card 4242 4242 4242 4242, any future date and any 3 digits. Do not enter a real card.',
      ru: 'Демо-оплата: деньги не списываются. Используйте тестовую карту 4242 4242 4242 4242, любую будущую дату и любые 3 цифры. Не вводите настоящую карту.',
      kz: 'Демо төлем: ақша алынбайды. 4242 4242 4242 4242 тест картасын, кез келген болашақ күнді және кез келген 3 цифрды қолданыңыз. Нақты картаны енгізбеңіз.',
    },
    holder: { en: 'Card holder', ru: 'Имя на карте', kz: 'Карта иесі' },
    number: { en: 'Card number', ru: 'Номер карты', kz: 'Карта нөмірі' },
    expiry: { en: 'MM/YY', ru: 'ММ/ГГ', kz: 'АА/ЖЖ' },
    cancel: { en: 'Cancel', ru: 'Отмена', kz: 'Болдырмау' },
    paying: { en: 'Paying...', ru: 'Оплачиваем...', kz: 'Төленуде...' },
  };
  return dict[key]?.[language] || dict[key]?.en || key;
}

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

// Calendar day of a booking date in Almaty, whatever shape the API sends.
function dayOf(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
}

const STATUS_NAMES = {
  ru: { pending: 'Ожидает', confirmed: 'Подтверждено', completed: 'Завершено', cancelled: 'Отменено' },
  kz: { pending: 'Күтуде', confirmed: 'Расталды', completed: 'Аяқталды', cancelled: 'Бас тартылды' },
  en: { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' },
};

function formatDateRange(startDate, endDate, language) {
  const fmt = (value) => new Date(value).toLocaleDateString(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric' });
  const start = fmt(startDate);
  const end = fmt(endDate);
  return start === end ? start : `${start} → ${end}`;
}

export default function Bookings() {
  const { language } = useLanguage();
  const router = useRouter();
  const reviewFromQuery = router.query.review;
  const [data, setData] = useState({ asOwner: [], asSitter: [] });
  const [cancelBooking, setCancelBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [viewerRole, setViewerRole] = useState('');
  useEffect(() => { setViewerRole(currentUser()?.role || ''); }, []);
  const isSitterViewer = viewerRole === 'sitter';
  const [filter, setFilter] = useState('all');
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, body: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [rebookBooking, setRebookBooking] = useState(null);
  const [rebookForm, setRebookForm] = useState({ start_date: '', end_date: '', start_time: '', end_time: '' });
  const [rebookMessage, setRebookMessage] = useState('');
  const [statusError, setStatusError] = useState('');
  const [busyBookingId, setBusyBookingId] = useState(null);
  // Phones show bookings as short cards; a tap opens the details and actions.
  const [expandedIds, setExpandedIds] = useState({});
  const toggleExpanded = (id) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  const [payBooking, setPayBooking] = useState(null);
  const [payForm, setPayForm] = useState(EMPTY_PAYMENT);
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);
  const [payAttempted, setPayAttempted] = useState(false);
  const [reportBooking, setReportBooking] = useState(null);
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
      !item.has_review &&
      dayOf(item.end_date) <= todayInAppTimeZone()
    ));
    if (bookingToReview) {
      setReviewBooking(bookingToReview);
      setReviewMessage('');
    }
  }, [reviewFromQuery, data.asOwner]);

  // Links from notifications (/bookings?rebook=12) open the "Book again" window right away.
  const rebookFromQuery = router.query.rebook;
  useEffect(() => {
    if (!rebookFromQuery || !data.asOwner.length) return;
    const original = data.asOwner.find((item) => Number(item.id) === Number(rebookFromQuery));
    if (!original) return;
    openRebook(original);
    router.replace({ pathname: '/bookings' }, undefined, { shallow: true });
  }, [rebookFromQuery, data.asOwner]);

  function openRebook(b) {
    setRebookBooking(b);
    setRebookForm({
      start_date: '',
      end_date: '',
      start_time: b.start_time ? String(b.start_time).slice(0, 5) : '',
      end_time: b.end_time ? String(b.end_time).slice(0, 5) : '',
    });
    setRebookMessage('');
  }

  async function reload() { setData(await api.get('/api/bookings/mine')); }

  async function changeStatus(id, status) {
    if (busyBookingId) return; // ignore repeated clicks while a change is being saved
    setStatusError('');
    setBusyBookingId(id);
    try {
      await api.put(`/api/bookings/${id}/status`, { status });
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setBusyBookingId(null);
    }
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

  async function submitPayment() {
    if (!payBooking || paying) return;
    setPayAttempted(true);
    if (Object.keys(validateCard(payForm, language)).length) {
      setPayError(language === 'ru' ? 'Проверьте поля, отмеченные красным.' : language === 'kz' ? 'Қызылмен белгіленген өрістерді тексеріңіз.' : 'Check the fields marked in red.');
      return;
    }
    setPaying(true);
    setPayError('');
    try {
      await api.post(`/api/bookings/${payBooking.id}/pay`, { payment: toPaymentPayload(payForm) });
      setPayBooking(null);
      setPayForm(EMPTY_PAYMENT);
      setPayAttempted(false);
      reload();
    } catch (err) {
      setPayError(friendlyPaymentError(err.message, language));
    } finally {
      setPaying(false);
    }
  }

  async function submitRebook() {
    if (!rebookBooking) return;
    const today = todayInAppTimeZone();
    if (!rebookForm.start_date || !rebookForm.end_date) {
      setRebookMessage('Choose start and end dates.');
      return;
    }
    if (rebookForm.start_date < today || rebookForm.end_date < today) {
      setRebookMessage('You cannot book a date in the past.');
      return;
    }
    if (rebookForm.start_date > rebookForm.end_date) {
      setRebookMessage('End date must be the same day or later than the start date.');
      return;
    }
    if (rebookForm.start_date === today && rebookForm.start_time && rebookForm.start_time <= nowTimeInAppTimeZone()) {
      setRebookMessage('This start time has already passed today. Choose a later time.');
      return;
    }
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
    const serviceLabel = serviceName(b.service, language);

    return (
      <div className="overflow-hidden rounded-[30px] border border-nanny-orange/12 bg-white shadow-card">
        <div className="border-b border-nanny-orange/10 bg-gradient-to-r from-white to-[#fff7ee] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-nanny-brownish/45">{contactLabel}</p>
              <div className="mt-2 text-xl font-bold leading-tight text-nanny-brownish md:text-[30px] md:leading-none">{contactName}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-nanny-brownish/70">
                <span className="rounded-full bg-nanny-cream px-3 py-1 capitalize">{serviceLabel}</span>
                <span className="opacity-40">•</span>
                <span>{t.pet || 'Pet'}: {b.pet_name}</span>
              </div>
            </div>
            <span className={`badge shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${STATUS_STYLES[b.status]}`}>{(STATUS_NAMES[language] || STATUS_NAMES.en)[b.status] || b.status}</span>
          </div>
          <div className="mt-3 md:hidden">
            <p className="text-sm font-semibold text-nanny-brownish">
              {formatDateRange(b.start_date, b.end_date, language)}
              {b.start_time ? ` · ${String(b.start_time).slice(0, 5)}` : ''}
              {' · '}{Number(b.total_price).toLocaleString()} ₸
            </p>
            {role === 'sitter' && b.status === 'pending' && (
              <p className="mt-2 inline-flex rounded-full bg-[#fff1cf] px-3 py-1 text-xs font-semibold text-[#8d5c0b]">
                {language === 'ru' ? 'Ждёт вашего ответа' : language === 'kz' ? 'Жауабыңызды күтуде' : 'Waiting for your answer'}
              </p>
            )}
            {role === 'owner' && b.status === 'confirmed' && (!b.payment_status || b.payment_status === 'unpaid') && (
              <p className="mt-2 inline-flex rounded-full bg-nanny-blue/10 px-3 py-1 text-xs font-semibold text-nanny-blue">
                {language === 'ru' ? 'Можно оплатить' : language === 'kz' ? 'Төлеуге болады' : 'Ready to pay'}
              </p>
            )}
            <button
              type="button"
              onClick={() => toggleExpanded(b.id)}
              aria-expanded={Boolean(expandedIds[b.id])}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border border-nanny-orange/20 bg-white py-2 text-sm font-semibold text-nanny-blue"
            >
              {expandedIds[b.id]
                ? (language === 'ru' ? 'Свернуть ▴' : language === 'kz' ? 'Жасыру ▴' : 'Hide ▴')
                : (language === 'ru' ? 'Подробнее и действия ▾' : language === 'kz' ? 'Толығырақ ▾' : 'Details and actions ▾')}
            </button>
          </div>
        </div>
        <div className={`px-6 py-5 ${expandedIds[b.id] ? '' : 'hidden md:block'}`}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-nanny-orange/10 bg-[#fffaf3] p-4">
              <div className="flex items-center gap-2 text-nanny-deepOrange">
                <Icon name="calendar" className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em] font-semibold">{t.dates || 'Dates'}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-nanny-brownish">{formatDateRange(b.start_date, b.end_date, language)}</p>
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

          {b.rescheduled_from_start && b.status !== 'cancelled' && (
            <p className="mt-3 inline-flex rounded-full bg-nanny-blue/10 px-3 py-1 text-xs font-semibold text-nanny-blue">
              {language === 'ru' ? 'Перенесено с ' : language === 'kz' ? 'Ауыстырылды: ' : 'Moved from '}
              {formatDateRange(b.rescheduled_from_start, b.rescheduled_from_end, language)}
              {b.status === 'pending' ? (language === 'ru' ? ' · ждёт подтверждения ситтера' : language === 'kz' ? ' · ситтердің растауын күтуде' : ' · waiting for the sitter') : ''}
            </p>
          )}

          {b.status === 'cancelled' && b.cancel_reason && (
            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 text-sm text-nanny-brownish">
              <p>
                <span className="font-semibold">
                  {b.cancelled_by === 'system'
                    ? (language === 'ru' ? 'Отменено автоматически' : language === 'kz' ? 'Автоматты түрде тоқтатылды' : 'Cancelled automatically')
                    : b.cancelled_by === role
                      ? (language === 'ru' ? 'Вы отменили' : language === 'kz' ? 'Сіз бас тарттыңыз' : 'You cancelled')
                      : b.cancelled_by === 'sitter'
                        ? (language === 'ru' ? 'Отменил ситтер' : language === 'kz' ? 'Ситтер бас тартты' : 'Cancelled by the sitter')
                        : (language === 'ru' ? 'Отменил владелец' : language === 'kz' ? 'Иесі бас тартты' : 'Cancelled by the owner')}
                </span>
                {': '}{cancelReasonLabel(b.cancel_reason, language)}
              </p>
              {b.cancel_comment && <p className="mt-1 opacity-80">«{b.cancel_comment}»</p>}
              {b.refund_percent != null && (
                <p className="mt-1 opacity-80">
                  {language === 'ru' ? 'Возврат' : language === 'kz' ? 'Қайтару' : 'Refund'}: {b.refund_percent}% ({Number(b.refund_amount).toLocaleString()} ₸)
                </p>
              )}
            </div>
          )}

          {b.status !== 'cancelled' || ['refunded', 'partially_refunded', 'paid'].includes(b.payment_status) ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {b.payment_status === 'partially_refunded' && (
                <span className="badge bg-nanny-blue/10 text-nanny-blue">{payText(language, 'partiallyRefunded')}</span>
              )}
              {b.payment_status === 'paid' && b.status === 'cancelled' && (
                <span className="badge bg-red-50 text-red-600">{payText(language, 'noRefund')}</span>
              )}
              {b.payment_status === 'paid' && b.status !== 'cancelled' && (
                <span className="badge bg-green-100 text-green-700">✓ {payText(language, 'paid')}{b.payment_last4 ? ` •••• ${b.payment_last4}` : ''}</span>
              )}
              {b.payment_status === 'refunded' && (
                <span className="badge bg-nanny-blue/10 text-nanny-blue">{payText(language, 'refunded')}</span>
              )}
              {(!b.payment_status || b.payment_status === 'unpaid') && b.status !== 'cancelled' && (
                <span className="badge bg-nanny-yellow/70 text-nanny-brownish">
                  {b.status === 'pending' ? payText(language, 'payAfterConfirm') : payText(language, 'unpaid')}
                </span>
              )}
              {role === 'owner' && b.status === 'confirmed' && (!b.payment_status || b.payment_status === 'unpaid') && (
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => { setPayBooking(b); setPayForm(EMPTY_PAYMENT); setPayError(''); setPayAttempted(false); }}
                >
                  {payText(language, 'pay')} {Number(b.total_price).toLocaleString()} ₸
                </button>
              )}
            </div>
          ) : null}

          {b.notes && (
            <div className="mt-4 rounded-2xl border border-nanny-orange/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-nanny-brownish/45">{t.careNote || 'Care note'}</p>
              <p className="mt-2 text-sm leading-6 text-nanny-brownish/85">{b.notes}</p>
            </div>
          )}


          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/chat?user=${role === 'owner' ? (b.sitter_user_id || b.sitter_id) : b.owner_id}&booking=${b.id}`)}
              className="btn-ghost text-sm"
            >
              {role === 'owner' ? (t.messageSitter || 'Message sitter') : (t.messageOwner || 'Message owner')}
            </button>
            {b.status !== 'pending' && (
              <button
                type="button"
                className="btn-ghost text-sm text-red-600"
                onClick={() => setReportBooking({ id: b.id, name: contactName })}
              >
                {language === 'ru' ? 'Сообщить о проблеме' : language === 'kz' ? 'Мәселе туралы хабарлау' : 'Report a problem'}
              </button>
            )}
            {role === 'sitter' && b.status === 'pending' && (
              <button disabled={busyBookingId === b.id} onClick={() => changeStatus(b.id, 'confirmed')} className="btn-primary text-sm">{t.confirm || 'Confirm'}</button>
            )}
            {role === 'sitter' && b.status === 'confirmed' && (
              <button disabled={busyBookingId === b.id} onClick={() => changeStatus(b.id, 'completed')} className="btn-secondary text-sm">{t.markCompleted || 'Mark completed'}</button>
            )}
            {['pending', 'confirmed'].includes(b.status) && (
              <>
                {role === 'owner' && dayOf(b.start_date) >= todayInAppTimeZone() && (
                  <button type="button" disabled={busyBookingId === b.id} onClick={() => setRescheduleBooking(b)} className="btn-ghost text-sm">
                    {language === 'ru' ? 'Перенести' : language === 'kz' ? 'Ауыстыру' : 'Reschedule'}
                  </button>
                )}
                <button disabled={busyBookingId === b.id} onClick={() => setCancelBooking(b)} className="btn-ghost text-sm text-red-600">{t.cancel || 'Cancel'}</button>
              </>
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
              ) : dayOf(b.end_date) > todayInAppTimeZone() ? (
                <span className="badge bg-nanny-cream px-3 py-1.5 text-nanny-brownish">
                  {language === 'ru' ? 'Отзыв можно оставить после ' : language === 'kz' ? 'Пікірді мына күннен кейін қалдыруға болады: ' : 'You can review after '}
                  {new Date(b.end_date).toLocaleDateString(localeFor(language), { day: 'numeric', month: 'long' })}
                </span>
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
                onClick={() => openRebook(b)}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[500px] xl:shrink-0">
            {[
              isSitterViewer
                ? [t.asSitter || 'As sitter', data.asSitter.length]
                : [t.ownerBookings || 'Owner bookings', data.asOwner.length],
              [t.pending || 'Pending', data.asOwner.filter((item) => item.status === 'pending').length + data.asSitter.filter((item) => item.status === 'pending').length],
              [t.confirmed || 'Confirmed', data.asOwner.filter((item) => item.status === 'confirmed').length + data.asSitter.filter((item) => item.status === 'confirmed').length],
              [t.completed || 'Completed', data.asOwner.filter((item) => item.status === 'completed').length + data.asSitter.filter((item) => item.status === 'completed').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-nanny-orange/10 bg-white px-3 py-4">
                <p className="text-xs font-semibold leading-4 text-nanny-brownish/60">{label}</p>
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

      {statusError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{statusError}</div>
      )}

      {/* Sitters see their own work first; the owner section only appears for them if they booked someone. */}
      <div className="flex flex-col">
      {(!isSitterViewer || data.asOwner.length > 0) && (
      <div className={isSitterViewer ? 'mt-10' : ''}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-nanny-deepOrange">{t.asOwner || 'As owner'}</h2>
          <p className="mt-1 text-sm text-nanny-brownish/70">{t.ownerText || 'Requests you created for your pets.'}</p>
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-5">
        {data.asOwner.filter((b) => filter === 'all' || b.status === filter).length ? data.asOwner.filter((b) => filter === 'all' || b.status === filter).map((b) => <Card key={b.id} b={b} role="owner" />)
          : <div className="xl:col-span-2"><EmptyState
              title={(language === 'ru' ? 'Бронирований пока нет' : language === 'kz' ? 'Брондаулар әлі жоқ' : 'No bookings yet')}
              text={t.noBookings || 'No bookings yet. Start by choosing a sitter and creating your first request.'}
              actionLabel={(language === 'ru' ? 'Найти ситтера' : language === 'kz' ? 'Ситтер табу' : 'Find a sitter')}
              actionHref="/sitters"
            /></div>}
      </div>
      </div>
      )}

      {(isSitterViewer || data.asSitter.filter((b) => filter === 'all' || b.status === filter).length > 0) && (
        <div className={isSitterViewer ? 'order-first' : 'mt-10'}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-nanny-deepOrange">{t.asSitter || 'As sitter'}</h2>
              <p className="mt-1 text-sm text-nanny-brownish/70">{t.sitterText || 'Active care requests where you are the service provider.'}</p>
            </div>
          </div>
          <div className="grid xl:grid-cols-2 gap-5">
            {data.asSitter.filter((b) => filter === 'all' || b.status === filter).length
              ? data.asSitter.filter((b) => filter === 'all' || b.status === filter).map((b) => <Card key={b.id} b={b} role="sitter" />)
              : <div className="xl:col-span-2"><EmptyState
                  title={(language === 'ru' ? 'Заказов пока нет' : language === 'kz' ? 'Тапсырыстар әлі жоқ' : 'No requests yet')}
                  text={(language === 'ru' ? 'Когда владелец забронирует вас, заказ появится здесь. Заполненный профиль и фото помогают получать заказы чаще.' : language === 'kz' ? 'Иесі сізді броньдағанда, тапсырыс осында шығады. Толық профиль тапсырысты жиі алуға көмектеседі.' : 'When an owner books you, the request shows up here. A complete profile helps you get booked more often.')}
                  actionLabel={(language === 'ru' ? 'Мой профиль' : language === 'kz' ? 'Менің профилім' : 'My profile')}
                  actionHref="/dashboard"
                /></div>}
          </div>
        </div>
      )}
      </div>

      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          language={language}
          onClose={() => setRescheduleBooking(null)}
          onDone={() => { setRescheduleBooking(null); reload(); }}
        />
      )}

      {cancelBooking && (
        <CancelBookingModal
          booking={cancelBooking}
          language={language}
          onClose={() => setCancelBooking(null)}
          onCancelled={() => { setCancelBooking(null); reload(); }}
        />
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

      {reportBooking && (
        <ReportModal
          targetName={reportBooking.name}
          bookingId={reportBooking.id}
          defaultReason="no_show"
          language={language}
          onClose={() => setReportBooking(null)}
        />
      )}

      {payBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !paying && setPayBooking(null)}>
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-nanny-deepOrange">{payText(language, 'title')}</h3>
            <p className="mt-1 text-sm opacity-70">
              {payBooking.sitter_name} • {payBooking.pet_name} • {Number(payBooking.total_price).toLocaleString()} ₸
            </p>
            <div className="mt-4">
              <PaymentCardForm value={payForm} onChange={setPayForm} language={language} showAllErrors={payAttempted} />
            </div>
            <details className="mt-4 rounded-2xl border border-nanny-orange/15 bg-nanny-cream/45 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-semibold text-nanny-deepOrange">
                {language === 'ru' ? 'Правила отмены и возврата' : language === 'kz' ? 'Бас тарту және қайтару ережелері' : 'Cancellation and refund rules'}
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 opacity-80">
                {(POLICY_TEXT[language] || POLICY_TEXT.en).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </details>
            {payError && <p className="mt-3 text-sm text-red-600">{payError}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-ghost flex-1" disabled={paying} onClick={() => setPayBooking(null)}>{payText(language, 'cancel')}</button>
              <button type="button" className="btn-primary flex-1" disabled={paying} onClick={submitPayment}>
                {paying ? payText(language, 'paying') : `${payText(language, 'pay')} ${Number(payBooking.total_price).toLocaleString()} ₸`}
              </button>
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
              <DateInput className="input" min={todayInAppTimeZone()} value={rebookForm.start_date} onChange={(e) => setRebookForm((prev) => ({ ...prev, start_date: e.target.value }))} />
              <DateInput className="input" min={rebookForm.start_date || todayInAppTimeZone()} value={rebookForm.end_date} onChange={(e) => setRebookForm((prev) => ({ ...prev, end_date: e.target.value }))} />
              <TimeInput className="input" value={rebookForm.start_time} onChange={(e) => setRebookForm((prev) => ({ ...prev, start_time: e.target.value }))} />
              <TimeInput className="input" value={rebookForm.end_time} onChange={(e) => setRebookForm((prev) => ({ ...prev, end_time: e.target.value }))} />
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
