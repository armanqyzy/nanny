import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import Icon from '../components/Icon';
import { useLanguage } from '../lib/i18n';

const HOME_COPY = {
  en: {
    faq: [
      { q: 'How does Nanny work?', a: 'You choose a service, find a sitter by rating and location, and book in a few clicks.' },
      { q: 'Are pet sitters verified?', a: 'Yes, every sitter goes through identity verification and review checks before accepting bookings.' },
      { q: 'How do I book a sitter?', a: 'Select a sitter, pick a date, add care instructions, and confirm the booking.' },
      { q: 'Can I communicate before booking?', a: 'Yes, use the in-platform chat to discuss details before confirming.' },
    ],
    ownerReviews: [
      { name: 'Bella', rating: 4.6, text: 'Clear instructions and well-organized.' },
      { name: 'Charlie', rating: 4.6, text: 'Easy to communicate and respectful.' },
      { name: 'Betty', rating: 4.4, text: 'Responsible and responsive.' },
      { name: 'Catty', rating: 4.3, text: 'Friendly owner, smooth experience.' },
    ],
    sitterReviews: [
      { name: 'Anna K.', rating: 4.9, text: 'Sent daily photo updates and followed the feeding schedule exactly.' },
      { name: 'Timur S.', rating: 4.6, text: 'Very responsible and punctual. Highly recommend for home visits.' },
      { name: 'Diana M.', rating: 4.4, text: 'Professional and caring. Gave medication on time and kept me updated.' },
      { name: 'Arman T.', rating: 4.3, text: 'Great experience overall. My dog came back calm and happy.' },
    ],
    heroBadge: 'Trusted pet care in Almaty',
    heroTitle: 'Find a reliable pet sitter without the stress',
    heroText: 'Book verified sitters, manage pet profiles, chat in real time and track bookings in one calm, polished workspace.',
    findSitter: 'Find a sitter',
    searchOnMap: 'Search on map',
    stats: [
      { value: '150+', label: 'Walks and visits managed' },
      { value: '4.8/5', label: 'Average sitter rating' },
      { value: '24/7', label: 'Messages and support' },
    ],
    whyOwnersChoose: 'Why owners choose Nanny',
    verifiedSitters: 'Verified sitters',
    verifiedSittersText: 'Profile review, ratings and service details before booking.',
    clearUpdates: 'Clear updates',
    clearUpdatesText: 'Messages, booking history and live pet updates in one place.',
    perksEyebrow: 'Customer perks',
    perksTitle: 'More value every time you book',
    perksText: 'Nanny perks make repeat care easier: saved sitters, faster rebooking, clear updates and support that already understands your pet history.',
    perksPrimary: 'Create your account',
    perksSecondary: 'Explore sitters',
    perksClubText: 'Care history, perks and support in one profile.',
    perks: [
      { icon: 'heart', title: 'Favorite sitters', text: 'Save trusted sitters and return to them before every trip, walk or home visit.' },
      { icon: 'repeat', title: 'Book again faster', text: 'Repeat a completed booking with fewer steps and keep the same pet notes.' },
      { icon: 'bell', title: 'Smart reminders', text: 'Get booking, message, shop order and care update notifications in one calm place.' },
      { icon: 'wallet', title: 'Priority shop care', text: 'Paid shop orders and delivery details stay visible with support one tap away.' },
    ],
    howItWorksEyebrow: 'How it works',
    howItWorksTitle: 'A calmer booking flow for owners and sitters',
    openMessages: 'Open messages',
    steps: [
      ['Choose a service', 'Walking, boarding, home visits or specialised care for your pet.'],
      ['Compare sitters', 'See ratings, map distance, services and profile details before deciding.'],
      ['Book and follow up', 'Track bookings, message in real time and keep all pet notes together.'],
    ],
    ownerEyebrow: 'Reviews from owners',
    ownerTitle: 'Owners choose sitters faster when trust is visible',
    ownerDescription: 'Clear communication, consistent updates and easy booking details help pet owners feel calm before the service even starts.',
    sitterEyebrow: 'Reviews from sitters',
    sitterTitle: 'Sitters stay because the workflow feels respectful',
    sitterDescription: 'Reliable pet profiles, clear instructions and organized communication make each visit smoother for the sitter too.',
    featuredReview: 'Featured review',
    verifiedPlatformReview: 'Verified platform review',
    trustedReview: 'Trusted review',
    leaveReview: 'Leave a review after completed booking',
    faqTitle: 'FAQ',
    ctaText: 'Choose us, so your pet will be in safe hands!',
    ctaButton: 'Register now',
  },
  ru: {
    faq: [
      { q: 'Как работает Nanny?', a: 'Вы выбираете услугу, находите ситтера по рейтингу и расположению и бронируете всё в несколько кликов.' },
      { q: 'Ситтеры проходят проверку?', a: 'Да, каждый ситтер проходит проверку личности и ручную модерацию перед тем, как принимать бронирования.' },
      { q: 'Как забронировать ситтера?', a: 'Выберите ситтера, укажите дату, добавьте инструкции по уходу и подтвердите бронирование.' },
      { q: 'Можно ли пообщаться до бронирования?', a: 'Да, используйте чат внутри платформы, чтобы обсудить детали до подтверждения.' },
    ],
    ownerReviews: [
      { name: 'Bella', rating: 4.6, text: 'Чёткие инструкции и всё хорошо организовано.' },
      { name: 'Charlie', rating: 4.6, text: 'Легко общаться, всё уважительно и спокойно.' },
      { name: 'Betty', rating: 4.4, text: 'Ответственная и всегда на связи.' },
      { name: 'Catty', rating: 4.3, text: 'Дружелюбный владелец, всё прошло гладко.' },
    ],
    sitterReviews: [
      { name: 'Anna K.', rating: 4.9, text: 'Каждый день присылала фото и точно соблюдала график кормления.' },
      { name: 'Timur S.', rating: 4.6, text: 'Очень ответственный и пунктуальный. Особенно рекомендую для домашних визитов.' },
      { name: 'Diana M.', rating: 4.4, text: 'Профессиональная и заботливая. Давала лекарства вовремя и держала меня в курсе.' },
      { name: 'Arman T.', rating: 4.3, text: 'В целом отличный опыт. Моя собака вернулась спокойной и довольной.' },
    ],
    heroBadge: 'Надёжный pet care в Алматы',
    heroTitle: 'Найдите надёжного пет-ситтера без лишнего стресса',
    heroText: 'Бронируйте проверенных ситтеров, ведите профили питомцев, общайтесь в реальном времени и следите за бронированиями в одном аккуратном пространстве.',
    findSitter: 'Найти ситтера',
    searchOnMap: 'Искать на карте',
    stats: [
      { value: '150+', label: 'Прогулок и визитов проведено' },
      { value: '4.8/5', label: 'Средний рейтинг ситтеров' },
      { value: '24/7', label: 'Сообщения и поддержка' },
    ],
    whyOwnersChoose: 'Почему владельцы выбирают Nanny',
    verifiedSitters: 'Проверенные ситтеры',
    verifiedSittersText: 'Проверка профиля, рейтинги и услуги видны ещё до бронирования.',
    clearUpdates: 'Понятные обновления',
    clearUpdatesText: 'Сообщения, история бронирований и live-обновления по питомцу в одном месте.',
    perksEyebrow: 'Преимущества клиента',
    perksTitle: 'Больше пользы при каждом бронировании',
    perksText: 'Customer perks делают повторный уход проще: избранные ситтеры, быстрое повторное бронирование, понятные уведомления и поддержка, которая уже видит историю вашего питомца.',
    perksPrimary: 'Создать аккаунт',
    perksSecondary: 'Смотреть ситтеров',
    perksClubText: 'История ухода, преимущества и поддержка в одном профиле.',
    perks: [
      { icon: 'heart', title: 'Избранные ситтеры', text: 'Сохраняйте проверенных ситтеров и быстро возвращайтесь к ним перед поездкой, прогулкой или визитом.' },
      { icon: 'repeat', title: 'Повторное бронирование быстрее', text: 'Повторяйте завершённое бронирование в несколько шагов и сохраняйте заметки по питомцу.' },
      { icon: 'bell', title: 'Умные напоминания', text: 'Получайте уведомления о бронированиях, сообщениях, заказах магазина и care updates в одном месте.' },
      { icon: 'wallet', title: 'Приоритет по shop-заказам', text: 'Оплаченные заказы, доставка и контакты поддержки остаются на виду без лишнего поиска.' },
    ],
    howItWorksEyebrow: 'Как это работает',
    howItWorksTitle: 'Спокойный и понятный сценарий бронирования для владельцев и ситтеров',
    openMessages: 'Открыть сообщения',
    steps: [
      ['Выберите услугу', 'Прогулки, передержка, домашние визиты или особый уход для вашего питомца.'],
      ['Сравните ситтеров', 'Смотрите рейтинг, расстояние на карте, услуги и детали профиля перед выбором.'],
      ['Забронируйте и оставайтесь на связи', 'Следите за бронированием, переписывайтесь в реальном времени и храните все заметки о питомце вместе.'],
    ],
    ownerEyebrow: 'Отзывы владельцев',
    ownerTitle: 'Когда доверие видно сразу, владельцы выбирают ситтера быстрее',
    ownerDescription: 'Понятная коммуникация, регулярные обновления и прозрачные детали бронирования помогают чувствовать спокойствие ещё до начала услуги.',
    sitterEyebrow: 'Отзывы ситтеров',
    sitterTitle: 'Ситтеры остаются с платформой, когда процесс выстроен уважительно',
    sitterDescription: 'Подробные профили питомцев, ясные инструкции и аккуратная коммуникация делают каждый визит удобнее и для ситтера.',
    featuredReview: 'Главный отзыв',
    verifiedPlatformReview: 'Проверенный отзыв платформы',
    trustedReview: 'Проверенный отзыв',
    leaveReview: 'Оставить отзыв после завершённого бронирования',
    faqTitle: 'Частые вопросы',
    ctaText: 'Выберите нас, чтобы ваш питомец был в надёжных руках!',
    ctaButton: 'Зарегистрироваться',
  },
  kz: {
    faq: [
      { q: 'Nanny қалай жұмыс істейді?', a: 'Сіз қызметті таңдайсыз, рейтинг пен орналасу бойынша ситтер табасыз және бірнеше қадамда бронь жасайсыз.' },
      { q: 'Ситтерлер тексеріле ме?', a: 'Иә, әр ситтер бронь қабылдамас бұрын жеке басын растаудан және қолмен тексеруден өтеді.' },
      { q: 'Ситтерді қалай броньдаймын?', a: 'Ситтерді таңдаңыз, күнді белгілеңіз, күтім нұсқауларын қосыңыз және броньды растаңыз.' },
      { q: 'Броньға дейін сөйлесуге бола ма?', a: 'Иә, растауға дейін егжей-тегжейлерді талқылау үшін платформа ішіндегі чатты пайдаланыңыз.' },
    ],
    ownerReviews: [
      { name: 'Bella', rating: 4.6, text: 'Нұсқаулар анық, бәрі жақсы ұйымдастырылған.' },
      { name: 'Charlie', rating: 4.6, text: 'Қарым-қатынас жасау жеңіл, өте сыпайы.' },
      { name: 'Betty', rating: 4.4, text: 'Жауапкершілігі жоғары, әрқашан байланыста.' },
      { name: 'Catty', rating: 4.3, text: 'Достық иесі, бәрі өте жайлы өтті.' },
    ],
    sitterReviews: [
      { name: 'Anna K.', rating: 4.9, text: 'Күн сайын фото жіберіп, тамақтандыру кестесін дәл сақтады.' },
      { name: 'Timur S.', rating: 4.6, text: 'Өте жауапты және ұқыпты. Әсіресе үйге бару қызметіне ұсынамын.' },
      { name: 'Diana M.', rating: 4.4, text: 'Кәсіби әрі қамқор. Дәріні уақытында беріп, мені үнемі хабардар етіп отырды.' },
      { name: 'Arman T.', rating: 4.3, text: 'Жалпы тәжірибе өте жақсы болды. Итім тыныш әрі бақытты оралды.' },
    ],
    heroBadge: 'Алматыдағы сенімді pet care',
    heroTitle: 'Сенімді pet sitter-ді артық күйзеліссіз табыңыз',
    heroText: 'Тексерілген ситтерлерді броньдаңыз, үй жануарыңыздың профилін жүргізіңіз, нақты уақытта сөйлесіңіз және броньдарды бір ыңғайлы кеңістікте бақылаңыз.',
    findSitter: 'Ситтер табу',
    searchOnMap: 'Картадан іздеу',
    stats: [
      { value: '150+', label: 'Серуен мен сапар орындалды' },
      { value: '4.8/5', label: 'Ситтерлердің орташа рейтингі' },
      { value: '24/7', label: 'Хабарламалар мен қолдау' },
    ],
    whyOwnersChoose: 'Неге иелер Nanny-ді таңдайды',
    verifiedSitters: 'Тексерілген ситтерлер',
    verifiedSittersText: 'Профиль тексеруі, рейтингтер мен қызметтер броньға дейін-ақ көрінеді.',
    clearUpdates: 'Түсінікті жаңартулар',
    clearUpdatesText: 'Хабарламалар, бронь тарихы және жануар бойынша live жаңартулар бір жерде.',
    perksEyebrow: 'Клиент артықшылықтары',
    perksTitle: 'Әр броньмен көбірек пайда',
    perksText: 'Customer perks қайталама күтімді жеңілдетеді: таңдаулы ситтерлер, жылдам қайта броньдау, түсінікті хабарламалар және жануар тарихын көретін қолдау.',
    perksPrimary: 'Аккаунт жасау',
    perksSecondary: 'Ситтерлерді қарау',
    perksClubText: 'Күтім тарихы, артықшылықтар және қолдау бір профильде.',
    perks: [
      { icon: 'heart', title: 'Таңдаулы ситтерлер', text: 'Сенімді ситтерлерді сақтап, сапар, серуен немесе үйге бару алдында тез оралыңыз.' },
      { icon: 'repeat', title: 'Қайта броньдау жылдамырақ', text: 'Аяқталған броньды аз қадаммен қайталап, жануар жазбаларын сақтаңыз.' },
      { icon: 'bell', title: 'Ақылды ескертулер', text: 'Бронь, хабарлама, дүкен тапсырысы және күтім жаңартуларын бір жерде алыңыз.' },
      { icon: 'wallet', title: 'Shop тапсырыстарына басым күтім', text: 'Төленген тапсырыстар, жеткізу және қолдау байланысы әрқашан көрініп тұрады.' },
    ],
    howItWorksEyebrow: 'Қалай жұмыс істейді',
    howItWorksTitle: 'Иелер мен ситтерлерге арналған жайлы әрі түсінікті бронь ағымы',
    openMessages: 'Хабарламаларды ашу',
    steps: [
      ['Қызметті таңдаңыз', 'Серуен, уақытша күту, үйге бару немесе жануарыңызға арналған ерекше күтім.'],
      ['Ситтерлерді салыстырыңыз', 'Таңдау алдында рейтингті, картадағы қашықтықты, қызметтер мен профиль мәліметтерін қараңыз.'],
      ['Бронь жасап, байланыста болыңыз', 'Броньды бақылаңыз, нақты уақытта хат жазысыңыз және жануар туралы барлық жазбаны бірге сақтаңыз.'],
    ],
    ownerEyebrow: 'Иелердің пікірлері',
    ownerTitle: 'Сенім айқын көрінсе, иелер ситтерді жылдамырақ таңдайды',
    ownerDescription: 'Түсінікті байланыс, тұрақты жаңартулар және бронь туралы анық мәлімет қызмет басталмай тұрып-ақ тыныштық береді.',
    sitterEyebrow: 'Ситтерлердің пікірлері',
    sitterTitle: 'Процесс құрметпен құрылғанда, ситтерлер платформада қалады',
    sitterDescription: 'Жануар профилінің толықтығы, анық нұсқаулар және реттелген байланыс әр сапарды ситтер үшін де жеңілдетеді.',
    featuredReview: 'Негізгі пікір',
    verifiedPlatformReview: 'Платформа тексерген пікір',
    trustedReview: 'Тексерілген пікір',
    leaveReview: 'Аяқталған броньдан кейін пікір қалдыру',
    faqTitle: 'Жиі қойылатын сұрақтар',
    ctaText: 'Жануарыңыз сенімді қолда болуы үшін бізді таңдаңыз!',
    ctaButton: 'Тіркелу',
  },
};

function Stars({ rating, accent = 'orange' }) {
  const filled = Math.round(rating);
  const active = accent === 'blue' ? 'text-nanny-blue' : 'text-nanny-orange';
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={`text-sm ${index < filled ? active : 'text-nanny-orange/20'}`}>★</span>
      ))}
    </div>
  );
}

function ReviewShowcase({
  eyebrow,
  title,
  description,
  reviews,
  avatarOffset = 0,
  accent = 'orange',
  featuredReviewLabel,
  verifiedPlatformReviewLabel,
  trustedReviewLabel,
  leaveReviewLabel,
}) {
  const accentClasses = accent === 'blue'
    ? {
        shell: 'bg-[radial-gradient(circle_at_top_left,rgba(70,108,255,0.12),transparent_32%),linear-gradient(180deg,#ffffff_0%,#fff8ef_100%)]',
        badge: 'bg-nanny-blue text-white',
        line: 'from-nanny-blue/35 via-nanny-orange/15 to-transparent',
        score: 'text-nanny-blue',
        cardGlow: 'shadow-[0_24px_60px_rgba(74,108,255,0.12)]',
      }
    : {
        shell: 'bg-[radial-gradient(circle_at_top_left,rgba(242,154,77,0.18),transparent_32%),linear-gradient(180deg,#ffffff_0%,#fff8ef_100%)]',
        badge: 'bg-nanny-orange text-white',
        line: 'from-nanny-orange/35 via-nanny-yellow/25 to-transparent',
        score: 'text-nanny-deepOrange',
        cardGlow: 'shadow-[0_24px_60px_rgba(242,154,77,0.12)]',
      };

  const marqueeReviews = [...reviews, ...reviews];

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={`relative overflow-hidden rounded-[34px] border border-nanny-orange/15 p-8 ${accentClasses.cardGlow} ${accentClasses.shell}`}>
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClasses.line}`} />
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-nanny-deepOrange/60">{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-nanny-blue">{title}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-nanny-brownish/80">{description}</p>
            <div className="mt-4 flex items-center gap-3">
              <Stars rating={reviews[0].rating} accent={accent} />
              <span className={`text-sm font-semibold ${accentClasses.score}`}>{reviews[0].rating.toFixed(1)}</span>
            </div>

            <div className="mt-8 rounded-[28px] bg-white/92 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accentClasses.badge}`}>
                    {featuredReviewLabel}
                  </div>
                  <p className="mt-4 text-[28px] font-semibold leading-[1.35] text-nanny-brownish">
                    “{reviews[0].text}”
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-extrabold ${accentClasses.score}`}>{reviews[0].rating}</div>
                  <Stars rating={reviews[0].rating} accent={accent} />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <img
                  src={`https://i.pravatar.cc/150?img=${avatarOffset + 1}`}
                  alt={reviews[0].name}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <div>
                  <p className="font-bold text-nanny-deepOrange">{reviews[0].name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] opacity-50">{verifiedPlatformReviewLabel}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/bookings" className="btn-ghost">
                {leaveReviewLabel}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
            {reviews.slice(0, 4).map((review, index) => (
              <article
                key={review.name}
                className="surface-soft flex h-full min-h-[248px] flex-col justify-between rounded-[30px] border border-nanny-orange/15 bg-white p-6 shadow-[0_20px_45px_rgba(130,93,47,0.10)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={`https://i.pravatar.cc/150?img=${avatarOffset + index + 1}`}
                      alt={review.name}
                      className="h-16 w-16 rounded-[22px] object-cover"
                    />
                    <div>
                      <p className="text-xl font-bold text-nanny-deepOrange">{review.name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] opacity-50">{trustedReviewLabel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`rounded-2xl bg-nanny-cream px-3 py-2 text-lg font-bold ${accentClasses.score}`}>
                      {review.rating}
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <Stars rating={review.rating} accent={accent} />
                  <p className="mt-4 text-sm leading-7 text-nanny-brownish/80">{review.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-[30px] border border-nanny-orange/10 bg-white/70 px-4 py-4 shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#fff8ea] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#fff8ea] to-transparent" />
          <div className="marquee-track flex w-max gap-4">
            {marqueeReviews.map((review, index) => (
              <div
                key={`${review.name}-${index}`}
                className="flex min-w-[320px] items-center gap-4 rounded-[24px] border border-nanny-orange/12 bg-white px-5 py-4"
              >
                <img
                  src={`https://i.pravatar.cc/150?img=${avatarOffset + (index % reviews.length) + 1}`}
                  alt={review.name}
                  className="h-12 w-12 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-semibold text-nanny-deepOrange">{review.name}</p>
                    <Stars rating={review.rating} accent={accent} />
                  </div>
                  <p className="mt-1 truncate text-sm opacity-70">{review.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { language } = useLanguage();
  const copy = HOME_COPY[language] || HOME_COPY.en;

  return (
    <>
      <Navbar />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(242,154,77,0.42),transparent_33%),radial-gradient(circle_at_80%_20%,rgba(79,107,237,0.12),transparent_22%),linear-gradient(180deg,#fff6e6_0%,#fffefb_100%)]">
        <div className="pointer-events-none absolute left-[6%] top-24 h-28 w-28 rounded-full bg-nanny-orange/20 blur-3xl" />
        <div className="pointer-events-none absolute right-[14%] top-28 h-36 w-36 rounded-full bg-nanny-blue/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-nanny-deepOrange shadow-[0_14px_28px_rgba(233,122,31,0.12)]">
              <Icon name="map" className="h-4 w-4" />
              {copy.heroBadge}
            </span>
            <h1 className="mt-6 max-w-[720px] text-4xl font-extrabold leading-[0.98] text-nanny-blue md:text-6xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-nanny-brownish/80">
              {copy.heroText}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 fade-up stagger-1">
              <Link href="/sitters" className="btn-secondary">{copy.findSitter}</Link>
              <Link href="/map" className="btn-ghost">{copy.searchOnMap}</Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 fade-up stagger-2">
              {copy.stats.map((stat) => (
                <div key={stat.label} className="rounded-[24px] bg-white p-4 shadow-[0_16px_36px_rgba(122,75,31,0.10)]">
                  <p className="text-2xl font-bold text-nanny-deepOrange">{stat.value}</p>
                  <p className="text-sm opacity-70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative fade-up stagger-3">
            <div className="absolute -left-8 top-8 h-40 w-40 rounded-full bg-nanny-orange/25 blur-3xl float-slow" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-nanny-blue/12 blur-3xl float-slow" />
            <div className="pulse-glow relative overflow-hidden rounded-[36px] border border-white/70 bg-white p-4 shadow-[0_30px_80px_rgba(130,93,47,0.18)]">
              <img
                src="https://images.unsplash.com/photo-1517849845537-4d257902454a?w=1400&auto=format&fit=crop"
                alt="Happy dog with sitter"
                className="h-[420px] w-full rounded-[28px] object-cover"
              />
              <div className="absolute bottom-8 left-8 right-8 rounded-[28px] bg-white/92 p-5 shadow-lg backdrop-blur">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-nanny-deepOrange/70">{copy.whyOwnersChoose}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-nanny-cream/80 p-4">
                    <p className="font-semibold">{copy.verifiedSitters}</p>
                    <p className="mt-1 text-sm opacity-70">{copy.verifiedSittersText}</p>
                  </div>
                  <div className="rounded-2xl bg-nanny-cream/80 p-4">
                    <p className="font-semibold">{copy.clearUpdates}</p>
                    <p className="mt-1 text-sm opacity-70">{copy.clearUpdatesText}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#fff8ea] px-6 py-16">
        <div className="pointer-events-none absolute left-0 top-8 h-48 w-48 rounded-full bg-nanny-yellow/45 blur-3xl" />
        <div className="pointer-events-none absolute right-10 bottom-10 h-52 w-52 rounded-full bg-nanny-orange/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-7 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
          <div className="flex h-full flex-col justify-between rounded-[36px] border border-nanny-orange/15 bg-[linear-gradient(145deg,#ffffff_0%,#fff2d2_100%)] p-8 shadow-[0_26px_70px_rgba(122,75,31,0.12)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-nanny-deepOrange/60">{copy.perksEyebrow}</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight text-nanny-blue">{copy.perksTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-nanny-brownish/78">{copy.perksText}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className="btn-secondary">{copy.perksPrimary}</Link>
                <Link href="/sitters" className="btn-ghost">{copy.perksSecondary}</Link>
              </div>
            </div>
            <div className="mt-8 rounded-[28px] border border-nanny-orange/15 bg-white/75 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nanny-blue text-white">
                  <Icon name="wallet" className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-nanny-deepOrange">Nanny Club</p>
                  <p className="text-sm opacity-70">{copy.perksClubText}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
            {copy.perks.map((perk, index) => (
              <article
                key={perk.title}
                className="flex min-h-[230px] flex-col rounded-[30px] border border-nanny-orange/15 bg-white p-6 shadow-[0_18px_44px_rgba(122,75,31,0.09)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nanny-cream text-nanny-orange">
                  <Icon name={perk.icon} className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-nanny-deepOrange">{perk.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-nanny-brownish/75">{perk.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-nanny-deepOrange/60">{copy.howItWorksEyebrow}</p>
              <h2 className="mt-2 text-3xl font-bold text-nanny-blue">{copy.howItWorksTitle}</h2>
            </div>
            <Link href="/chat" className="btn-ghost">{copy.openMessages}</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {copy.steps.map(([title, text], index) => (
              <div key={title} className="rounded-[28px] border border-nanny-orange/15 bg-nanny-cream/45 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nanny-orange text-white font-bold">{index + 1}</div>
                <h3 className="mt-5 text-xl font-bold text-nanny-deepOrange">{title}</h3>
                <p className="mt-3 text-sm leading-7 opacity-80">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReviewShowcase
        eyebrow={copy.ownerEyebrow}
        title={copy.ownerTitle}
        description={copy.ownerDescription}
        reviews={copy.ownerReviews}
        avatarOffset={30}
        accent="orange"
        featuredReviewLabel={copy.featuredReview}
        verifiedPlatformReviewLabel={copy.verifiedPlatformReview}
        trustedReviewLabel={copy.trustedReview}
        leaveReviewLabel={copy.leaveReview}
      />

      <ReviewShowcase
        eyebrow={copy.sitterEyebrow}
        title={copy.sitterTitle}
        description={copy.sitterDescription}
        reviews={copy.sitterReviews}
        avatarOffset={10}
        accent="blue"
        featuredReviewLabel={copy.featuredReview}
        verifiedPlatformReviewLabel={copy.verifiedPlatformReview}
        trustedReviewLabel={copy.trustedReview}
        leaveReviewLabel={copy.leaveReview}
      />

      {/* FAQ */}
      <section className="bg-gradient-to-b from-[#3a2a22] to-[#2a1f1a] py-16 px-6 text-white">
        <h2 className="text-center text-2xl font-bold text-nanny-yellow mb-8">{copy.faqTitle}</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {copy.faq.map((f, i) => (
            <details key={i} className="bg-white/5 p-4 rounded-xl">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-white/80">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-nanny-yellow py-14 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-6 rounded-2xl bg-white p-8 shadow-card">
          <div className="flex-1">
            <p className="italic font-semibold mb-3">{copy.ctaText}</p>
            <Link href="/register" className="btn-primary">{copy.ctaButton}</Link>
          </div>
          <div className="flex items-center justify-center rounded-[28px] bg-nanny-cream/75 p-2 shadow-[0_16px_32px_rgba(233,122,31,0.12)]">
            <BrandLogo size="lg" />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
