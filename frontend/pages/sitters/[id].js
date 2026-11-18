import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Icon from '../../components/Icon';
import { absoluteAssetUrl, api, currentUser } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { nowTimeInAppTimeZone, todayInAppTimeZone } from '../../lib/date';
import { petSummaryLine } from '../../lib/pets';
import { serviceName } from '../../lib/services';
import { aiDoneMessage, aiLabel, useAiEnabled } from '../../lib/ai';
import { DateInput, TimeInput } from '../../components/FancyInputs';

const SERVICE_HINTS = {
  en: {
    walking: 'A walk or outdoor activity session', daycare: 'Care during the day without overnight stay',
    boarding: 'Overnight stay and longer care', grooming: 'Basic grooming and hygiene support',
    home_visit: 'A visit to your home for care and check-ins', medication_care: 'Help with medicine and care routine',
  },
  ru: {
    walking: 'Прогулка или активность на улице', daycare: 'Присмотр днём без ночёвки',
    boarding: 'Передержка с ночёвкой и долгий уход', grooming: 'Базовый груминг и гигиена',
    home_visit: 'Визит к вам домой для ухода и проверки', medication_care: 'Помощь с лекарствами и режимом ухода',
  },
  kz: {
    walking: 'Серуен немесе далада белсенділік', daycare: 'Түнемесіз күндізгі күтім',
    boarding: 'Түнеумен ұзақ күтім', grooming: 'Негізгі груминг және гигиена',
    home_visit: 'Күтім мен тексеру үшін үйіңізге келу', medication_care: 'Дәрі-дәрмек пен күтім режиміне көмек',
  },
};

const EMPTY_BOOKING = {
  pet_id: '', extra_pet_ids: [], service: 'walking', start_date: '', end_date: '', start_time: '', end_time: '', notes: '',
  // Weekly schedule: chosen weekdays (0 = Sunday) repeated for a number of weeks.
  repeat_on: false, repeat_weekdays: [], repeat_weeks: 4,
};

const WEEKDAYS = [
  { value: 1, en: 'Mon', ru: 'Пн', kz: 'Дс' }, { value: 2, en: 'Tue', ru: 'Вт', kz: 'Сс' },
  { value: 3, en: 'Wed', ru: 'Ср', kz: 'Ср' }, { value: 4, en: 'Thu', ru: 'Чт', kz: 'Бс' },
  { value: 5, en: 'Fri', ru: 'Пт', kz: 'Жм' }, { value: 6, en: 'Sat', ru: 'Сб', kz: 'Сн' },
  { value: 0, en: 'Sun', ru: 'Вс', kz: 'Жк' },
];

// Same rule as the server: every chosen weekday for N weeks starting from the start date.
function countWeeklyDates(startDate, weekdays, weeks) {
  if (!startDate || !weekdays.length) return 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  let count = 0;
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    if (weekdays.includes(new Date(start.getTime() + offset * 86400000).getUTCDay())) count += 1;
  }
  return count;
}

// Lets the sitter answer (or edit the answer to) a review on their own profile.
function ReviewReplyForm({ review, language, onSaved }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(review.sitter_reply || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const label = (en, ru, kz) => (language === 'ru' ? ru : language === 'kz' ? kz : en);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const saved = await api.put(`/api/reviews/${review.id}/reply`, { reply: text });
      onSaved(saved);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost mt-2 text-xs" onClick={() => setOpen(true)}>
        {review.sitter_reply ? label('Edit reply', 'Изменить ответ', 'Жауапты өзгерту') : label('Reply', 'Ответить', 'Жауап беру')}
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      <textarea className="input min-h-[80px]" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)}
                placeholder={label('Thank the owner or explain politely...', 'Поблагодарите владельца или вежливо поясните...', 'Иесіне алғыс айтыңыз немесе сыпайы түсіндіріңіз...')} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost text-xs" onClick={() => setOpen(false)}>{label('Cancel', 'Отмена', 'Болдырмау')}</button>
        <button type="button" className="btn-primary text-xs" disabled={saving || text.trim().length < 2} onClick={save}>{label('Save reply', 'Сохранить ответ', 'Жауапты сақтау')}</button>
      </div>
    </div>
  );
}

export default function SitterPage() {
  const { language } = useLanguage();
  const aiEnabled = useAiEnabled();
  const router = useRouter();
  const { id } = router.query;
  const [sitter, setSitter] = useState(null);
  const [pets, setPets] = useState([]);
  const [book, setBook] = useState(EMPTY_BOOKING);
  const [msg, setMsg] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [aiNotesLoading, setAiNotesLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [daysOff, setDaysOff] = useState([]);
  const [viewer, setViewer] = useState(null);
  useEffect(() => { setViewer(currentUser()); }, []);
  const isOwnProfile = Boolean(viewer && sitter && viewer.id === sitter.user_id);
  const t = {
    en: {
      verified:'Verified', serviceZone:'Service zone', zoneDefault:'Almaty city areas by request', workingHours:'Working hours', flexible:'Flexible', availableByArrangement:'Available by arrangement', services:'Services', loading:'Loading…', bookThis:'Book this sitter', reviews:'Reviews', noReviews:'No reviews yet.',
      choosePetNeedsCare:'Which pet needs care?', noPetsYet:'No pets yet. Add your pet profile first.', whichService:'Which service do you want?', startDate:'Start date', firstCareDay:'The first day the sitter should begin care.', endDate:'End date', lastCareDay:'The last day included in this booking.', startTime:'Start time', startTimeHint:'Optional. Useful for walks, visits or a specific handoff time.', endTime:'End time', endTimeHint:'Optional. Add it if the booking has a clear finish time.', careNotes:'Care notes for the sitter', careNotesHint:'Share feeding routine, medicine, favorite activities or anything important.', aiPreparing:'AI is preparing notes...', generateAi:'Generate with AI', careNotesPlaceholder:'Care notes…', checkingAvailability:'Checking sitter availability…', availableSlot:'This sitter is available for the selected date and time.', busySlot:'This sitter is busy for the selected slot.', openBookings:'Open bookings', messageSitter:'Message sitter', createBooking:'Create booking', bookingSummary:'Booking summary', sitter:'Sitter', pet:'Pet', choosePet:'Choose a pet', service:'Service', chooseService:'Choose service', dates:'Dates', chooseDates:'Choose start and end date', time:'Time', optional:'Optional', duration:'Duration', notSelectedYet:'Not selected yet', day:'day', days:'days', estimatedTotal:'Estimated total', finalTotalHint:'Final total is confirmed by the booking rules and sitter pricing. This card shows a quick estimate for the selected dates.', availabilityStatus:'Availability status', availability:'Available', busy:'Busy', checking:'Checking...', chooseDatesStatus:'Choose dates', chooseDatesHint:'Once you choose dates, we will automatically check whether the sitter is free for this slot.', checkingHint:'We are checking confirmed bookings for this sitter right now.', availableHint:'The current selection looks free and ready for booking.', busyHint:'This slot overlaps with another confirmed booking. Try different dates or times.', choosePetServiceDates:'Choose your pet, service, the first day care starts and the last day it ends. Time is optional and helps for walks or visits.', howDatesWork:'How dates work', howDatesHint:'Start date = first care day. End date = last care day.', addPetBeforeBooking:'Add a pet profile before booking', addPetBeforeBookingHint:'Owners need at least one pet profile so sitters can understand who they will care for.', createPetProfile:'Create pet profile',
    },
    ru: {
      verified:'Проверен', serviceZone:'Зона обслуживания', zoneDefault:'Районы Алматы по запросу', workingHours:'Часы работы', flexible:'Гибко', availableByArrangement:'Доступно по договорённости', services:'Услуги', loading:'Загрузка…', bookThis:'Забронировать этого ситтера', reviews:'Отзывы', noReviews:'Пока нет отзывов.',
      choosePetNeedsCare:'Какому питомцу нужен уход?', noPetsYet:'Питомцев пока нет. Сначала добавьте профиль питомца.', whichService:'Какую услугу вы хотите?', startDate:'Дата начала', firstCareDay:'Первый день, когда ситтер должен начать уход.', endDate:'Дата окончания', lastCareDay:'Последний день, входящий в это бронирование.', startTime:'Время начала', startTimeHint:'Необязательно. Полезно для прогулок, визитов или точного времени передачи.', endTime:'Время окончания', endTimeHint:'Необязательно. Добавьте, если у бронирования есть точное время завершения.', careNotes:'Заметки для ситтера', careNotesHint:'Укажите режим кормления, лекарства, любимые занятия и всё важное.', aiPreparing:'ИИ готовит заметки...', generateAi:'Сгенерировать с ИИ', careNotesPlaceholder:'Заметки по уходу…', checkingAvailability:'Проверяем доступность ситтера…', availableSlot:'Ситтер свободен на выбранные дату и время.', busySlot:'Ситтер занят в выбранный слот.', openBookings:'Открыть бронирования', messageSitter:'Написать ситтеру', createBooking:'Создать бронирование', bookingSummary:'Сводка бронирования', sitter:'Ситтер', pet:'Питомец', choosePet:'Выберите питомца', service:'Услуга', chooseService:'Выберите услугу', dates:'Даты', chooseDates:'Выберите дату начала и окончания', time:'Время', optional:'Необязательно', duration:'Длительность', notSelectedYet:'Пока не выбрано', day:'день', days:'дней', estimatedTotal:'Примерная сумма', finalTotalHint:'Итоговая сумма подтверждается правилами бронирования и тарифами ситтера. Здесь показана быстрая оценка для выбранных дат.', availabilityStatus:'Статус доступности', availability:'Свободен', busy:'Занят', checking:'Проверяем...', chooseDatesStatus:'Выберите даты', chooseDatesHint:'Как только вы выберете даты, мы автоматически проверим, свободен ли ситтер в этот слот.', checkingHint:'Сейчас мы проверяем подтверждённые бронирования этого ситтера.', availableHint:'Текущий выбор выглядит свободным и готовым к бронированию.', busyHint:'Этот слот пересекается с другим подтверждённым бронированием. Попробуйте другие даты или время.', choosePetServiceDates:'Выберите питомца, услугу, первый день начала ухода и последний день окончания. Время необязательно и помогает для прогулок или визитов.', howDatesWork:'Как работают даты', howDatesHint:'Дата начала = первый день ухода. Дата окончания = последний день ухода.', addPetBeforeBooking:'Добавьте профиль питомца перед бронированием', addPetBeforeBookingHint:'Владельцу нужен хотя бы один профиль питомца, чтобы ситтер понимал, за кем будет ухаживать.', createPetProfile:'Создать профиль питомца',
    },
    kz: {
      verified:'Тексерілген', serviceZone:'Қызмет аймағы', zoneDefault:'Алматы аудандары сұраныс бойынша', workingHours:'Жұмыс уақыты', flexible:'Икемді', availableByArrangement:'Келісім бойынша қолжетімді', services:'Қызметтер', loading:'Жүктелуде…', bookThis:'Осы ситтерді броньдау', reviews:'Пікірлер', noReviews:'Әзірге пікір жоқ.',
      choosePetNeedsCare:'Қай жануарға күтім керек?', noPetsYet:'Жануарлар әлі жоқ. Алдымен жануар профилін қосыңыз.', whichService:'Қай қызметті қалайсыз?', startDate:'Басталу күні', firstCareDay:'Ситтер күтімді бастайтын алғашқы күн.', endDate:'Аяқталу күні', lastCareDay:'Осы броньға кіретін соңғы күн.', startTime:'Басталу уақыты', startTimeHint:'Міндетті емес. Серуен, бару немесе нақты тапсыру уақыты үшін ыңғайлы.', endTime:'Аяқталу уақыты', endTimeHint:'Міндетті емес. Егер броньдың нақты аяқталу уақыты болса, қосыңыз.', careNotes:'Ситтерге арналған жазбалар', careNotesHint:'Тамақтану режимін, дәрілерді, сүйікті істерін және маңыздының бәрін жазыңыз.', aiPreparing:'ЖИ жазбаларды дайындап жатыр...', generateAi:'ЖИ көмегімен жасау', careNotesPlaceholder:'Күтім жазбалары…', checkingAvailability:'Ситтердің қолжетімділігін тексеріп жатырмыз…', availableSlot:'Ситтер таңдалған күн мен уақытқа бос.', busySlot:'Ситтер таңдалған уақыт аралығында бос емес.', openBookings:'Броньдарды ашу', messageSitter:'Ситтерге жазу', createBooking:'Бронь жасау', bookingSummary:'Бронь қорытындысы', sitter:'Ситтер', pet:'Жануар', choosePet:'Жануарды таңдаңыз', service:'Қызмет', chooseService:'Қызметті таңдаңыз', dates:'Күндер', chooseDates:'Басталу және аяқталу күнін таңдаңыз', time:'Уақыт', optional:'Міндетті емес', duration:'Ұзақтығы', notSelectedYet:'Әлі таңдалмаған', day:'күн', days:'күн', estimatedTotal:'Болжамды сома', finalTotalHint:'Соңғы сома бронь ережелері мен ситтер бағасына сай нақтыланады. Бұл карта таңдалған күндер үшін жылдам есепті көрсетеді.', availabilityStatus:'Қолжетімділік күйі', availability:'Бос', busy:'Бос емес', checking:'Тексеріп жатырмыз...', chooseDatesStatus:'Күндерді таңдаңыз', chooseDatesHint:'Күндерді таңдағаннан кейін, біз ситтердің осы уақытқа бос екенін автоматты түрде тексереміз.', checkingHint:'Қазір осы ситтердің расталған броньдарын тексеріп жатырмыз.', availableHint:'Ағымдағы таңдау бос көрінеді және бронь жасауға дайын.', busyHint:'Бұл уақыт аралығы басқа расталған броньмен қиылысады. Басқа күнді немесе уақытты көріңіз.', choosePetServiceDates:'Жануарыңызды, қызметті, күтім басталатын алғашқы күнді және аяқталатын соңғы күнді таңдаңыз. Уақыт міндетті емес, бірақ серуен мен баруға пайдалы.', howDatesWork:'Күндер қалай жұмыс істейді', howDatesHint:'Басталу күні = күтімнің алғашқы күні. Аяқталу күні = күтімнің соңғы күні.', addPetBeforeBooking:'Бронь алдында жануар профилін қосыңыз', addPetBeforeBookingHint:'Ситтер кімге күтім жасайтынын түсінуі үшін иеде кемінде бір жануар профилі болуы керек.', createPetProfile:'Жануар профилін жасау',
    },
  }[language] || {};

  const serviceOptions = sitter?.services?.map((service) => service.service) || [];
  const selectedPet = pets.find((pet) => String(pet.id) === String(book.pet_id)) || null;
  const selectedService = sitter?.services?.find((service) => service.service === book.service) || null;
  const parsedStart = book.start_date ? new Date(`${book.start_date}T00:00:00`) : null;
  const parsedEnd = book.end_date ? new Date(`${book.end_date}T00:00:00`) : null;
  const bookingDays = parsedStart && parsedEnd && parsedEnd >= parsedStart
    ? Math.max(1, Math.ceil((parsedEnd - parsedStart) / 86400000) + 1)
    : 0;
  const selectedPetIds = [book.pet_id, ...(book.extra_pet_ids || [])].filter(Boolean).map(String);
  const repeatCount = book.repeat_on ? countWeeklyDates(book.start_date, book.repeat_weekdays, Number(book.repeat_weeks)) : 0;
  const billedDays = book.repeat_on ? repeatCount : bookingDays;
  const estimatedTotal = billedDays
    ? Number((selectedService?.price ?? sitter?.price_per_day ?? 0)) * billedDays * Math.max(1, selectedPetIds.length)
    : 0;
  const L = (en, ru, kz) => (language === 'ru' ? ru : language === 'kz' ? kz : en);

  function togglePet(petId) {
    const id = String(petId);
    const next = selectedPetIds.includes(id) ? selectedPetIds.filter((x) => x !== id) : [...selectedPetIds, id];
    setBook((prev) => ({ ...prev, pet_id: next[0] || '', extra_pet_ids: next.slice(1) }));
  }
  const availabilityTone = checkingAvailability
    ? 'checking'
    : availability?.available
      ? 'available'
      : availability
        ? 'busy'
        : 'idle';

  function clearFieldError(name) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      const s = await api.get(`/api/sitters/${id}`);
      api.get(`/api/sitters/${id}/days-off`).then((rows) => setDaysOff(rows.map((row) => row.day))).catch(() => setDaysOff([]));
      setSitter(s);
      if (s.services?.[0]) setBook((b) => ({ ...b, service: s.services[0].service }));
      if (currentUser()) {
        try { setPets(await api.get('/api/pets')); } catch {}
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id || !book.start_date || !book.end_date) {
      setAvailability(null);
      return;
    }

    const handle = setTimeout(async () => {
      setCheckingAvailability(true);
      const qs = new URLSearchParams({
        start_date: book.start_date,
        end_date: book.end_date,
        ...(book.start_time ? { start_time: book.start_time } : {}),
        ...(book.end_time ? { end_time: book.end_time } : {}),
      }).toString();
      const data = await api.get(`/api/sitters/${id}/availability?${qs}`).catch(() => null);
      setAvailability(data);
      setCheckingAvailability(false);
    }, 250);

    return () => clearTimeout(handle);
  }, [id, book.start_date, book.end_date, book.start_time, book.end_time]);

  async function toggleFavorite() {
    if (!currentUser()) { router.push('/login'); return; }
    if (sitter.is_favorite) {
      await api.delete(`/api/sitters/${id}/favorite`);
      setSitter((prev) => ({ ...prev, is_favorite: false }));
      return;
    }
    await api.post(`/api/sitters/${id}/favorite`, {});
    setSitter((prev) => ({ ...prev, is_favorite: true }));
  }

  function openSitterChat() {
    if (!currentUser()) {
      router.push('/login');
      return;
    }

    const targetUserId = sitter?.user_id || sitter?.sitter_user_id;
    if (!targetUserId) return;
    router.push(`/chat?user=${targetUserId}`);
  }

  async function makeBooking(e) {
    e.preventDefault();
    // A second click while the first request is running used to create a duplicate booking.
    if (submittingBooking) return;
    setMsg(null);
    if (!currentUser()) { router.push('/login'); return; }
    if (!pets.length) {
      router.push('/pets');
      return;
    }
    const nextErrors = {};

    if (!book.pet_id) nextErrors.pet_id = 'Choose which pet needs care.';
    if (!book.service) nextErrors.service = 'Choose the service you want to book.';
    if (!book.start_date) nextErrors.start_date = 'Choose the first care day.';
    if (!book.end_date && !book.repeat_on) nextErrors.end_date = 'Choose the last care day.';
    if (book.repeat_on && !book.repeat_weekdays.length) nextErrors.start_date = L('Choose at least one weekday for the schedule.', 'Выберите хотя бы один день недели для расписания.', 'Кестеге кемінде бір апта күнін таңдаңыз.');
    if (book.repeat_on && book.repeat_weekdays.length && !repeatCount) nextErrors.start_date = L('No dates match this schedule.', 'Под это расписание не попадает ни одной даты.', 'Бұл кестеге бірде-бір күн сәйкес келмейді.');
    const today = todayInAppTimeZone();
    if (book.start_date && book.start_date < today) nextErrors.start_date = 'You cannot book a date in the past.';
    if (book.end_date && book.end_date < today) nextErrors.end_date = 'You cannot book a date in the past.';
    if (book.start_date === today && book.start_time && book.start_time <= nowTimeInAppTimeZone()) {
      nextErrors.time = 'This start time has already passed today. Choose a later time.';
    }
    if (book.start_date && book.end_date && book.start_date > book.end_date) nextErrors.end_date = 'End date must be the same day or later than the start date.';
    if ((book.start_time && !book.end_time) || (!book.start_time && book.end_time)) {
      nextErrors.time = 'Choose both start and end time, or leave both empty.';
    }
    if (book.start_time && book.end_time && book.start_time >= book.end_time) {
      nextErrors.time = 'End time should be later than the start time.';
    }
    if (availability && !availability.available) {
      nextErrors.availability = 'This sitter is not available for the selected slot.';
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setMsg({ type: 'err', text: 'Please complete the highlighted booking details.' });
      return;
    }

    setFieldErrors({});
    setSubmittingBooking(true);
    try {
      const created = await api.post('/api/bookings', {
        sitter_id: Number(id),
        service: book.service,
        start_date: book.start_date,
        end_date: book.repeat_on ? book.start_date : book.end_date,
        pet_id: Number(book.pet_id),
        pet_ids: (book.extra_pet_ids || []).map(Number),
        repeat: book.repeat_on ? { weekdays: book.repeat_weekdays, weeks: Number(book.repeat_weeks) } : null,
        start_time: book.start_time || null,
        end_time: book.end_time || null,
        notes: book.notes || null,
      });
      const createdCount = created?.bookings?.length || 1;
      // Reset the form so the same booking is not submitted twice by accident.
      setBook({ ...EMPTY_BOOKING, service: sitter?.services?.[0]?.service || EMPTY_BOOKING.service });
      setAvailability(null);
      setFieldErrors({});
      setMsg({
        type: 'ok',
        text: createdCount > 1
          ? L(`${createdCount} bookings created! Check your bookings page.`, `Создано бронирований: ${createdCount}. Смотрите страницу бронирований.`, `${createdCount} брондау жасалды! Брондаулар бетін қараңыз.`)
          : 'Booking created! Check your bookings page.',
      });
    } catch (e) {
      setMsg({ type: 'err', text: e?.message || 'We could not create the booking yet. Please review the selected dates, times and required fields.' });
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function generateAiNotes() {
    const selectedPet = pets.find((pet) => Number(pet.id) === Number(book.pet_id));
    try {
      setAiNotesLoading(true);
      setMsg(null);
      const draft = await api.post('/api/ai/booking-notes', {
        petName: selectedPet?.name,
        petType: selectedPet?.pet_type,
        service: book.service,
        behavior: selectedPet?.behavior,
        health: selectedPet?.health,
        existingNotes: book.notes,
      });
      setBook((prev) => ({ ...prev, notes: draft.notes || prev.notes }));
      setMsg({ type: 'ok', text: aiDoneMessage(draft.source, language) });
    } catch (error) {
      setMsg({ type: 'err', text: error.message || 'Could not generate AI care notes.' });
    } finally {
      setAiNotesLoading(false);
    }
  }

  if (!sitter) return <><Navbar /><p className="p-10 text-center">{t.loading || 'Loading…'}</p></>;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="card flex flex-col md:flex-row gap-6 items-start">
          <img onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/pet-placeholder.png'; }} src={(sitter.avatar_url && absoluteAssetUrl(sitter.avatar_url)) || '/pet-placeholder.png'} alt={sitter.full_name}
               className="w-40 h-40 rounded-2xl object-cover" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{sitter.full_name}</h1>
              {sitter.is_verified && <span className="badge bg-green-100 text-green-700">✓ {t.verified || 'Verified'}</span>}
              {currentUser()?.role === 'owner' && (
                <>
                  <button type="button" onClick={toggleFavorite} className={`rounded-full p-2 ${sitter.is_favorite ? 'bg-red-50 text-red-500' : 'bg-nanny-cream text-nanny-brownish/60'}`} aria-label={sitter.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                    <Icon name="heart" className="h-5 w-5" solid={sitter.is_favorite} />
                  </button>
                  <button type="button" onClick={openSitterChat} className="btn-secondary inline-flex items-center gap-2 text-sm">
                    <Icon name="chat" className="h-4 w-4" />
                    {t.messageSitter || 'Message sitter'}
                  </button>
                </>
              )}
            </div>
            <p className="text-sm opacity-70 mt-1">{sitter.city} • {sitter.district}</p>
            <p className="mt-3 leading-7">{sitter.description}</p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="badge bg-nanny-yellow">⭐ {Number(sitter.reviews?.length ?? sitter.rating_count) > 0 ? `${Number(sitter.rating).toFixed(1)} (${sitter.reviews?.length ?? sitter.rating_count})` : (language === 'ru' ? 'Новый' : language === 'kz' ? 'Жаңа' : 'New')}</span>
              <span className="badge bg-nanny-orange text-white">{language === 'ru' ? `Опыт ${sitter.experience_yrs} г.` : language === 'kz' ? `Тәжірибе ${sitter.experience_yrs} жыл` : `${sitter.experience_yrs}y experience`}</span>
              <span className="badge bg-nanny-blue text-white">{Number(sitter.price_per_day).toLocaleString()} ₸ / {language === 'ru' ? 'день' : language === 'kz' ? 'күн' : 'day'}</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
              <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.serviceZone || 'Service zone'}</p>
                <p className="mt-2">{sitter.service_area_text || t.zoneDefault || 'Almaty city areas by request'}</p>
              </div>
              <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.workingHours || 'Working hours'}</p>
                <p className="mt-2">
                  {sitter.work_start ? String(sitter.work_start).slice(0, 5) : (t.flexible || 'Flexible')} {sitter.work_end ? `- ${String(sitter.work_end).slice(0, 5)}` : ''}
                </p>
                <p className="mt-1 opacity-70">{sitter.work_days || t.availableByArrangement || 'Available by arrangement'}</p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-bold text-nanny-deepOrange">{t.services || 'Services'}</h3>
              <ul className="text-sm mt-1 space-y-1">
                {sitter.services?.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>{serviceName(s.service, language)}</span>
                    <span className="font-semibold">{Number(s.price).toLocaleString()} ₸</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {viewer && viewer.role !== 'owner' ? (
          <section className="card mt-6">
            {isOwnProfile ? (
              <>
                <h2 className="text-lg font-bold text-nanny-deepOrange">
                  {language === 'ru' ? 'Это ваш публичный профиль' : language === 'kz' ? 'Бұл сіздің ашық профиліңіз' : 'This is your public profile'}
                </h2>
                <p className="mt-1 text-sm opacity-75">
                  {language === 'ru' ? 'Так вас видят владельцы. Цены, описание и выходные меняются в личном кабинете.' : language === 'kz' ? 'Иелер сізді осылай көреді. Баға, сипаттама және демалыс күндері жеке кабинетте өзгереді.' : 'This is how owners see you. Prices, description and days off are edited in your dashboard.'}
                </p>
                <button type="button" onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
                  {language === 'ru' ? 'Редактировать профиль' : language === 'kz' ? 'Профильді өңдеу' : 'Edit profile'}
                </button>
              </>
            ) : (
              <p className="text-sm opacity-75">
                {language === 'ru' ? 'Бронировать могут только аккаунты владельцев питомцев.' : language === 'kz' ? 'Тек үй жануарлары иелерінің аккаунттары броньдай алады.' : 'Only pet owner accounts can make bookings.'}
              </p>
            )}
          </section>
        ) : (
        <section className="card mt-6">
          {sitter.is_available === false && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {language === 'ru' ? 'Ситтер сейчас на паузе и не принимает новые заказы.' : language === 'kz' ? 'Ситтер қазір үзілісте, жаңа тапсырыс қабылдамайды.' : 'This sitter is on a break and is not taking new bookings right now.'}
            </div>
          )}
          {daysOff.length > 0 && (
            <div className="mb-4 rounded-2xl border border-nanny-orange/15 bg-[#fffaf3] px-4 py-3 text-sm">
              <span className="font-semibold text-nanny-deepOrange">
                {language === 'ru' ? 'Выходные ситтера' : language === 'kz' ? 'Ситтердің демалыс күндері' : 'Sitter days off'}:
              </span>{' '}
              {daysOff.slice(0, 20).map((day) => new Date(`${day}T00:00:00`).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'kz' ? 'kk-KZ' : 'en-US', { day: 'numeric', month: 'short' })).join(', ')}
            </div>
          )}
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-nanny-deepOrange">{t.bookThis || 'Book this sitter'}</h2>
              <p className="text-sm opacity-70 mt-1">
                {t.choosePetServiceDates || 'Choose your pet, service, the first day care starts and the last day it ends. Time is optional and helps for walks or visits.'}
              </p>
            </div>
            <div className="rounded-2xl border border-nanny-orange/15 bg-nanny-cream/45 px-4 py-3 text-sm">
              <p className="font-semibold text-nanny-deepOrange">{t.howDatesWork || 'How dates work'}</p>
              <p className="mt-1 opacity-75">{t.howDatesHint || 'Start date = first care day. End date = last care day.'}</p>
            </div>
          </div>
          {currentUser()?.role === 'owner' && pets.length === 0 && (
            <div className="mb-4 rounded-2xl border border-nanny-orange/15 bg-nanny-cream/45 p-4">
              <p className="font-semibold text-nanny-deepOrange">{t.addPetBeforeBooking || 'Add a pet profile before booking'}</p>
              <p className="mt-1 text-sm opacity-75">{t.addPetBeforeBookingHint || 'Owners need at least one pet profile so sitters can understand who they will care for.'}</p>
              <button type="button" onClick={() => router.push('/pets')} className="btn-secondary mt-3">{t.createPetProfile || 'Create pet profile'}</button>
            </div>
          )}
          <form onSubmit={makeBooking} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
            <div className={`rounded-[26px] border p-4 transition ${fieldErrors.pet_id ? 'border-red-300 bg-red-50/40 ring-2 ring-red-100' : 'border-transparent'}`}>
              <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.choosePetNeedsCare || 'Which pet needs care?'}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {pets.map((p) => {
                  const active = selectedPetIds.includes(String(p.id));
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        togglePet(p.id);
                        clearFieldError('pet_id');
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? 'border-nanny-orange bg-[#fff1e2] shadow-sm'
                          : 'border-nanny-orange/20 bg-white hover:bg-[#fff8ef]'
                      }`}
                    >
                      <div className="font-semibold">{p.name}</div>
                      <div className="mt-1 text-sm opacity-70">{petSummaryLine(p, language)}</div>
                    </button>
                  );
                })}
                {pets.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-nanny-orange/25 bg-white p-4 text-sm opacity-70">
                    {currentUser()
                      ? (t.noPetsYet || 'No pets yet. Add your pet profile first.')
                      : (language === 'ru' ? 'Войдите, чтобы выбрать питомца и забронировать.' : language === 'kz' ? 'Жануарды таңдап, брондау үшін кіріңіз.' : 'Sign in to choose your pet and book this sitter.')}
                  </div>
                )}
              </div>
              {fieldErrors.pet_id && <p className="mt-3 text-sm text-red-600">{fieldErrors.pet_id}</p>}
            </div>

            <div className={`rounded-[26px] border p-4 transition ${fieldErrors.service ? 'border-red-300 bg-red-50/40 ring-2 ring-red-100' : 'border-transparent'}`}>
              <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.whichService || 'Which service do you want?'}</p>
              <div className="grid gap-2 md:grid-cols-3">
                {serviceOptions.map((service) => {
                  const active = book.service === service;
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => {
                        setBook({ ...book, service });
                        clearFieldError('service');
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left capitalize transition ${
                        active
                          ? 'border-nanny-orange bg-[#fff1e2] text-nanny-deepOrange shadow-sm'
                          : 'border-nanny-orange/20 bg-white text-nanny-brownish hover:bg-[#fff8ef]'
                      }`}
                    >
                      <div className="font-semibold">{serviceName(service, language)}</div>
                      <div className="mt-1 text-sm normal-case opacity-70">
                        {(SERVICE_HINTS[language] || SERVICE_HINTS.en)[service] || ''}
                      </div>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.service && <p className="mt-3 text-sm text-red-600">{fieldErrors.service}</p>}
            </div>

            <div className="rounded-[26px] border border-nanny-orange/15 bg-white p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-nanny-deepOrange">
                <input type="checkbox" checked={book.repeat_on}
                       onChange={(e) => { setBook({ ...book, repeat_on: e.target.checked }); clearFieldError('start_date'); clearFieldError('end_date'); }} />
                {L('Repeat every week (for regular walks or visits)', 'Повторять каждую неделю (для регулярных прогулок и визитов)', 'Әр апта сайын қайталау (тұрақты серуендер үшін)')}
              </label>
              {book.repeat_on && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const on = book.repeat_weekdays.includes(day.value);
                      return (
                        <button key={day.value} type="button"
                                onClick={() => setBook({ ...book, repeat_weekdays: on ? book.repeat_weekdays.filter((d) => d !== day.value) : [...book.repeat_weekdays, day.value] })}
                                className={`rounded-full border px-3 py-1.5 text-sm ${on ? 'border-nanny-orange bg-nanny-orange text-white' : 'border-nanny-orange/20 bg-white'}`}>
                          {day[language] || day.en}
                        </button>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    {L('For', 'В течение', 'Ұзақтығы')}
                    <select className="input max-w-[110px]" value={book.repeat_weeks} onChange={(e) => setBook({ ...book, repeat_weeks: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    {L('weeks', 'нед.', 'апта')}
                    {repeatCount > 0 && <span className="opacity-70">• {L(`${repeatCount} visits`, `визитов: ${repeatCount}`, `${repeatCount} рет`)}</span>}
                  </label>
                  <p className="text-xs opacity-65">{L('The start date is the first week of the schedule. Each visit is a separate booking.', 'Дата начала — первая неделя расписания. Каждый визит станет отдельной бронью.', 'Басталу күні — кестенің бірінші аптасы. Әр келу жеке брондау болады.')}</p>
                </div>
              )}
            </div>

            <div className={`grid gap-4 rounded-[26px] border p-4 md:grid-cols-2 transition ${fieldErrors.start_date || fieldErrors.end_date || fieldErrors.time || fieldErrors.availability ? 'border-red-300 bg-red-50/30 ring-2 ring-red-100' : 'border-transparent'}`}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{t.startDate || 'Start date'}</label>
                <p className="mb-2 text-xs opacity-65">{t.firstCareDay || 'The first day the sitter should begin care.'}</p>
                <DateInput className={`input ${fieldErrors.start_date ? 'border-red-300 ring-2 ring-red-100' : ''}`} value={book.start_date} min={todayInAppTimeZone()}
                       onChange={(e) => {
                         setBook({ ...book, start_date: e.target.value });
                         clearFieldError('start_date');
                         clearFieldError('availability');
                       }} />
                {fieldErrors.start_date && <p className="mt-2 text-sm text-red-600">{fieldErrors.start_date}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{t.endDate || 'End date'}</label>
                <p className="mb-2 text-xs opacity-65">{t.lastCareDay || 'The last day included in this booking.'}</p>
                <DateInput className={`input ${fieldErrors.end_date ? 'border-red-300 ring-2 ring-red-100' : ''}`} value={book.repeat_on ? book.start_date : book.end_date} disabled={book.repeat_on} min={book.start_date || todayInAppTimeZone()}
                       onChange={(e) => {
                         setBook({ ...book, end_date: e.target.value });
                         clearFieldError('end_date');
                         clearFieldError('availability');
                       }} />
                {fieldErrors.end_date && <p className="mt-2 text-sm text-red-600">{fieldErrors.end_date}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{t.startTime || 'Start time'}</label>
                <p className="mb-2 text-xs opacity-65">{t.startTimeHint || 'Optional. Useful for walks, visits or a specific handoff time.'}</p>
                <TimeInput className={`input ${fieldErrors.time ? 'border-red-300 ring-2 ring-red-100' : ''}`} value={book.start_time}
                       onChange={(e) => {
                         setBook({ ...book, start_time: e.target.value });
                         clearFieldError('time');
                         clearFieldError('availability');
                       }} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{t.endTime || 'End time'}</label>
                <p className="mb-2 text-xs opacity-65">{t.endTimeHint || 'Optional. Add it if the booking has a clear finish time.'}</p>
                <TimeInput className={`input ${fieldErrors.time ? 'border-red-300 ring-2 ring-red-100' : ''}`} value={book.end_time}
                       onChange={(e) => {
                         setBook({ ...book, end_time: e.target.value });
                         clearFieldError('time');
                         clearFieldError('availability');
                       }} />
              </div>
              {(fieldErrors.time || fieldErrors.availability) && (
                <div className="md:col-span-2">
                  <p className="text-sm text-red-600">{fieldErrors.time || fieldErrors.availability}</p>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-nanny-deepOrange">{t.careNotes || 'Care notes for the sitter'}</p>
                  <p className="text-xs opacity-65 mt-1">{t.careNotesHint || 'Share feeding routine, medicine, favorite activities or anything important.'}</p>
                </div>
                <button
                  type="button"
                  onClick={generateAiNotes}
                  className="btn-ghost text-sm"
                  disabled={!book.pet_id || aiNotesLoading}
                >
                  {aiNotesLoading ? (aiEnabled ? (t.aiPreparing || 'AI is preparing notes...') : '…') : aiLabel('careNotes', aiEnabled, language)}
                </button>
              </div>
              <textarea className="input" rows={3} placeholder={t.careNotesPlaceholder || 'Care notes…'}
                        value={book.notes}
                        onChange={(e) => setBook({ ...book, notes: e.target.value })} />
            </div>
            {(checkingAvailability || availability) && (
              <div className="rounded-2xl border border-nanny-orange/15 bg-nanny-cream/45 p-4 text-sm">
                {checkingAvailability ? (
                  <p>{t.checkingAvailability || 'Checking sitter availability…'}</p>
                ) : availability?.available ? (
                  <p className="text-green-700 font-semibold">{t.availableSlot || 'This sitter is available for the selected date and time.'}</p>
                ) : (
                  <>
                    <p className="font-semibold text-red-600">{t.busySlot || 'This sitter is busy for the selected slot.'}</p>
                    {availability?.conflicts?.length > 0 && (
                      <ul className="mt-2 space-y-1 text-nanny-brownish/75">
                        {availability.conflicts.map((conflict) => (
                          <li key={conflict.id}>
                            {new Date(conflict.start_date).toLocaleDateString()} → {new Date(conflict.end_date).toLocaleDateString()}
                            {conflict.start_time && conflict.end_time ? ` • ${String(conflict.start_time).slice(0,5)} - ${String(conflict.end_time).slice(0,5)}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
            {msg && (
              <div>
                <p className={`text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
                {msg.type === 'ok' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => router.push('/bookings')} className="btn-ghost text-sm">{t.openBookings || 'Open bookings'}</button>
                    <button type="button" onClick={openSitterChat} className="btn-secondary text-sm">{t.messageSitter || 'Message sitter'}</button>
                  </div>
                )}
              </div>
            )}
            <button className="btn-primary w-full" disabled={submittingBooking || checkingAvailability || (availability && !availability.available)}>{submittingBooking ? (language === 'ru' ? 'Создаём...' : language === 'kz' ? 'Жасалуда...' : 'Creating...') : (t.createBooking || 'Create booking')}</button>
            </div>

            <aside className="xl:sticky xl:top-24 h-fit">
              <div className="rounded-[28px] border border-nanny-orange/15 bg-gradient-to-b from-white to-[#fff7ee] p-5 shadow-card">
                <p className="text-xs uppercase tracking-[0.22em] opacity-55">{t.bookingSummary || 'Booking summary'}</p>
                <div className="mt-4 rounded-3xl border border-nanny-orange/15 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm opacity-60">{t.sitter || 'Sitter'}</p>
                      <p className="text-lg font-bold">{sitter.full_name}</p>
                    </div>
                    <span className="badge bg-nanny-blue text-white">
                      {Number(sitter.price_per_day || 0).toLocaleString()} ₸/day
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="opacity-60">{t.pet || 'Pet'}</span>
                      <span className="text-right font-medium">
                        {selectedPetIds.length
                          ? pets.filter((pet) => selectedPetIds.includes(String(pet.id))).map((pet) => pet.name).join(', ')
                          : (t.choosePet || 'Choose a pet')}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="opacity-60">{t.service || 'Service'}</span>
                      <span className="text-right font-medium capitalize">
                        {book.service ? book.service.replace('_', ' ') : (t.chooseService || 'Choose service')}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="opacity-60">{t.dates || 'Dates'}</span>
                      <span className="text-right font-medium">
                        {book.repeat_on && book.start_date
                          ? `${L('from', 'с', 'бастап')} ${new Date(`${book.start_date}T00:00:00`).toLocaleDateString()} • ${WEEKDAYS.filter((d) => book.repeat_weekdays.includes(d.value)).map((d) => d[language] || d.en).join(', ') || '—'} • ${book.repeat_weeks} ${L('wk', 'нед.', 'апта')}`
                          : book.start_date && book.end_date
                          ? `${new Date(`${book.start_date}T00:00:00`).toLocaleDateString()} → ${new Date(`${book.end_date}T00:00:00`).toLocaleDateString()}`
                          : (t.chooseDates || 'Choose start and end date')}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="opacity-60">{t.time || 'Time'}</span>
                      <span className="text-right font-medium">
                        {book.start_time && book.end_time ? `${book.start_time} - ${book.end_time}` : (t.optional || 'Optional')}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="opacity-60">{t.duration || 'Duration'}</span>
                      <span className="text-right font-medium">
                        {billedDays ? `${billedDays} ${billedDays === 1 ? (t.day || 'day') : (t.days || 'days')}${selectedPetIds.length > 1 ? ` × ${selectedPetIds.length}` : ''}` : (t.notSelectedYet || 'Not selected yet')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-nanny-orange/15 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm opacity-60">{t.estimatedTotal || 'Estimated total'}</p>
                      <p className="mt-1 text-3xl font-bold text-nanny-blue">
                        {estimatedTotal ? `${estimatedTotal.toLocaleString()} ₸` : '—'}
                      </p>
                    </div>
                    {selectedService?.price && (
                      <span className="badge bg-nanny-yellow text-nanny-brownish">
                        {Number(selectedService.price).toLocaleString()} ₸ / day
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs opacity-65">
                    {t.finalTotalHint || 'Final total is confirmed by the booking rules and sitter pricing. This card shows a quick estimate for the selected dates.'}
                  </p>
                </div>

                <div className="mt-4 rounded-3xl border border-nanny-orange/15 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-nanny-deepOrange">{t.availabilityStatus || 'Availability status'}</p>
                    <span className={`badge ${
                      availabilityTone === 'available'
                        ? 'bg-green-100 text-green-700'
                        : availabilityTone === 'busy'
                          ? 'bg-red-100 text-red-600'
                          : availabilityTone === 'checking'
                            ? 'bg-blue-100 text-nanny-blue'
                            : 'bg-nanny-cream text-nanny-brownish'
                    }`}>
                      {availabilityTone === 'available' && (t.availability || 'Available')}
                      {availabilityTone === 'busy' && (t.busy || 'Busy')}
                      {availabilityTone === 'checking' && (t.checking || 'Checking...')}
                      {availabilityTone === 'idle' && (t.chooseDatesStatus || 'Choose dates')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm opacity-75">
                    {availabilityTone === 'idle' && (t.chooseDatesHint || 'Once you choose dates, we will automatically check whether the sitter is free for this slot.')}
                    {availabilityTone === 'checking' && (t.checkingHint || 'We are checking confirmed bookings for this sitter right now.')}
                    {availabilityTone === 'available' && (t.availableHint || 'The current selection looks free and ready for booking.')}
                    {availabilityTone === 'busy' && (availability?.days_off?.length
                      ? `${language === 'ru' ? 'Ситтер не работает в эти дни' : language === 'kz' ? 'Ситтер бұл күндері жұмыс істемейді' : 'The sitter does not work on'}: ${availability.days_off.join(', ')}`
                      : (t.busyHint || 'This slot overlaps with another confirmed booking. Try different dates or times.'))}
                  </p>
                </div>
              </div>
            </aside>
          </form>
        </section>
        )}

        <section className="card mt-6">
          <h2 className="text-lg font-bold text-nanny-deepOrange mb-4">{t.reviews || 'Reviews'} ({sitter.reviews?.length || 0})</h2>
          {sitter.reviews?.length ? (
            <ul className="space-y-4">
              {sitter.reviews.map((r, i) => (
                <li key={i} className="border-b border-nanny-orange/10 pb-3 last:border-0">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{r.author}</span>
                    <span className="text-nanny-orange">⭐ {r.rating}</span>
                  </div>
                  <p className="text-sm mt-1">{r.body}</p>
                  {r.sitter_reply && (
                    <div className="mt-2 rounded-2xl border-l-4 border-nanny-orange/40 bg-[#fffaf3] px-3 py-2 text-sm">
                      <p className="text-xs font-semibold text-nanny-deepOrange">
                        {language === 'ru' ? 'Ответ ситтера' : language === 'kz' ? 'Ситтердің жауабы' : 'Sitter reply'}
                      </p>
                      <p className="mt-1">{r.sitter_reply}</p>
                    </div>
                  )}
                  {isOwnProfile && (
                    <ReviewReplyForm review={r} language={language} onSaved={(saved) => setSitter((prev) => ({
                      ...prev,
                      reviews: prev.reviews.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)),
                    }))} />
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm opacity-70">{t.noReviews || 'No reviews yet.'}</p>}
        </section>
      </main>
      <Footer />
    </>
  );
}
