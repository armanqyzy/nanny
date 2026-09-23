import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import { absoluteAssetUrl, api, currentUser, uploadFile } from '../lib/api';
import { useLanguage } from '../lib/i18n';

const DEFAULT_SITTER_SERVICES = [
  'walking',
  'daycare',
  'boarding',
  'grooming',
  'medication_care',
];

const WORK_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Dashboard() {
  const { language } = useLanguage();
  const router = useRouter();
  const welcomeMode = router.query.welcome === '1';
  const [user, setUser]   = useState(null);
  const [pets, setPets]   = useState([]);
  const [book, setBook]   = useState({ asOwner: [], asSitter: [] });
  const [edit, setEdit]   = useState(false);
  const [form, setForm]   = useState({
    full_name: '',
    phone: '',
    address: '',
    avatar_url: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_notes: '',
  });
  const [avatarError, setAvatarError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileErrors, setProfileErrors] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationPet, setRecommendationPet] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [verification, setVerification] = useState(null);
  const [sitterDashboard, setSitterDashboard] = useState(null);
  const [sitterForm, setSitterForm] = useState({
    description: '',
    city: 'Almaty',
    district: '',
    price_per_day: '',
    service_area_text: '',
    service_radius_km: 10,
    work_days: '',
    work_start: '',
    work_end: '',
    auto_reply_templates: ['', '', ''],
  });
  const [servicesForm, setServicesForm] = useState(
    DEFAULT_SITTER_SERVICES.map((service) => ({ service, price: '' }))
  );
  const [sitterMessage, setSitterMessage] = useState('');
  const t = {
    en: {
      fullNameError: 'Enter your full name.',
      phoneError: 'Enter your phone number.',
      addressError: 'Enter your address.',
      completeProfile: 'Please complete the highlighted profile fields.',
      profileUpdated: 'Profile updated successfully.',
      profileSaveError: 'Could not save your profile.',
      avatarUploadError: 'Failed to upload avatar.',
      pageTitle: 'My profile',
      ownerJourney: 'Owner journey',
      welcome: (name) => `Welcome, ${name}`,
      completeOwnerSetup: 'Complete your pet owner setup',
      ownerSetupText: 'Registration, pet profile, sitter search, booking, chat and review should feel like one connected flow. These steps keep you moving forward.',
      findSitter: 'Find a sitter',
      addMyPet: 'Add my pet',
      step: 'Step',
      done: 'Done',
      next: 'Next',
      profileContactTitle: 'Complete profile and contact details',
      profileContactActionDone: 'Edit profile',
      profileContactActionTodo: 'Complete profile',
      profileContactDescription: 'Add phone and address so sitters and support can coordinate smoothly.',
      petProfileTitle: 'Add your pet profile',
      petProfileActionDone: 'Manage pets',
      petProfileActionTodo: 'Create pet profile',
      petProfileDescription: 'Pet photos, age, health notes and behavior help sitters prepare properly.',
      bookingTitle: 'Book a sitter and follow updates',
      viewBookings: 'View bookings',
      browseSitters: 'Browse sitters',
      addPetFirst: 'Add pet first',
      bookingDescription: 'Pick a sitter, confirm dates and keep the full care flow in one place.',
      cancel: 'Cancel',
      editProfile: 'Edit profile',
      personalData: 'Personal data',
      addressLabel: 'Address:',
      emailLabel: 'Email:',
      emergencyContact: 'Emergency contact:',
      emergencyPhone: 'Emergency phone:',
      fullName: 'Full name',
      addressPlaceholder: 'Address',
      emergencyContactName: 'Emergency contact name',
      emergencyContactPhone: 'Emergency contact phone',
      emergencyContactNotes: 'Emergency contact notes',
      photoSelected: 'Photo selected from media library',
      chooseProfilePhoto: 'Choose profile photo from media library',
      upload: 'Upload',
      avatarPreview: 'Avatar preview',
      removePhoto: 'Remove photo',
      save: 'Save',
      safety: 'Safety',
      emergencyTitle: 'Emergency and backup contact',
      emergencyText: 'Keep one trusted person on file so support can react faster during a walk, boarding stay or urgent shop delivery issue.',
      name: 'Name:',
      phone: 'Phone:',
      notes: 'Notes:',
      notAdded: 'Not added yet',
      noNotes: 'No notes yet',
      openSupport: 'Open support center',
      safetyGuide: 'View safety guide',
      verificationCenter: 'Verification center',
      trustBadge: 'Trust badge and review history',
      trustBadgeText: 'Upload your documents, follow manual review progress and keep your verified badge visible to pet owners.',
      reviewStatus: 'Review status',
      backgroundCheck: 'Background check',
      adminNote: 'Admin note',
      noAdminNotes: 'No admin notes yet. Submit your document to start the review.',
      openVerification: 'Open verification center',
      trustTools: 'Trust tools',
      confidenceTitle: 'What increases confidence before booking',
      trustBullets: ['Verified badge on sitter cards', 'Manual review history and support escalation', 'Emergency contact saved in your account', 'Dispute flow and clear safety instructions'],
      browseVerified: 'Browse verified sitters',
      howChecksWork: 'How checks work',
      weekIncome: 'Week income',
      monthIncome: 'Month income',
      pendingRequests: 'Pending requests',
      responseRate: 'Response rate',
      reviewsCount: 'Reviews',
      reviewsWord: 'reviews',
      upcomingWork: 'Upcoming work',
      upcomingTitle: 'Upcoming bookings and pending requests',
      openBookings: 'Open bookings',
      timeNotSpecified: 'Time not specified yet',
      noUpcoming: 'No upcoming bookings yet.',
      verifiedProfile: 'Verified profile',
      currentStatus: 'Current sitter status',
      approval: 'Approval',
      badge: 'Badge',
      verifiedSitter: 'Verified sitter',
      awaitingVerification: 'Awaiting verification',
      calendar: 'Calendar',
      upcomingAvailability: 'Upcoming availability',
      openCalendar: 'Open calendar',
      servicesAvailability: 'Services & availability',
      tariffsTitle: 'Tariffs, working hours and zones',
      describeStyle: 'Describe your care style, pet experience and what owners can expect.',
      city: 'City',
      district: 'District',
      basePrice: 'Base price per day',
      serviceRadius: 'Service radius (km)',
      serviceZones: 'Service zones / pickup areas',
      workingDays: 'Working days',
      clientCommunication: 'Client communication',
      autoReplies: 'Auto-replies and message templates',
      template: (index) => `Template ${index + 1}`,
      autoReplyHint: 'Use these for fast replies like availability confirmation, first response and follow-up after a walk.',
      servicePricing: 'Service pricing',
      pricingTitle: 'Walking, daycare, boarding, grooming, medication care',
      price: 'Price',
      saveWorkspace: 'Save sitter workspace',
      myPets: 'My pets',
      managePets: 'Manage pets',
      noPets: 'No pets yet.',
      bookAgainKnown: 'Book again with sitters you know',
      perksEyebrow: 'Customer perks',
      perksTitle: 'Your Nanny Club benefits',
      perksText: 'Use your saved sitters, repeat bookings, notifications and support history to make each next booking faster.',
      perkItems: [
        ['heart', 'Saved sitters', 'Return to trusted sitters without searching again.'],
        ['repeat', 'Book again', 'Repeat completed care with your existing pet notes.'],
        ['bell', 'Care alerts', 'See booking, message, order and support updates in one place.'],
      ],
      perksAction: 'Explore perks',
    },
    ru: {
      fullNameError: 'Укажите полное имя.',
      phoneError: 'Укажите номер телефона.',
      addressError: 'Укажите адрес.',
      completeProfile: 'Пожалуйста, заполните выделенные поля профиля.',
      profileUpdated: 'Профиль успешно обновлён.',
      profileSaveError: 'Не удалось сохранить профиль.',
      avatarUploadError: 'Не удалось загрузить аватар.',
      pageTitle: 'Мой профиль',
      ownerJourney: 'Путь владельца',
      welcome: (name) => `Добро пожаловать, ${name}`,
      completeOwnerSetup: 'Завершите настройку владельца питомца',
      ownerSetupText: 'Регистрация, профиль питомца, поиск ситтера, бронирование, чат и отзыв должны ощущаться как один связанный сценарий. Эти шаги помогут двигаться дальше.',
      findSitter: 'Найти ситтера',
      addMyPet: 'Добавить питомца',
      step: 'Шаг',
      done: 'Готово',
      next: 'Дальше',
      profileContactTitle: 'Заполните профиль и контакты',
      profileContactActionDone: 'Редактировать профиль',
      profileContactActionTodo: 'Заполнить профиль',
      profileContactDescription: 'Добавьте телефон и адрес, чтобы ситтеры и поддержка могли удобно координироваться.',
      petProfileTitle: 'Добавьте профиль питомца',
      petProfileActionDone: 'Управлять питомцами',
      petProfileActionTodo: 'Создать профиль питомца',
      petProfileDescription: 'Фото, возраст, здоровье и поведение питомца помогают ситтеру лучше подготовиться.',
      bookingTitle: 'Забронируйте ситтера и следите за обновлениями',
      viewBookings: 'Открыть бронирования',
      browseSitters: 'Смотреть ситтеров',
      addPetFirst: 'Сначала добавить питомца',
      bookingDescription: 'Выберите ситтера, подтвердите даты и держите весь процесс ухода в одном месте.',
      cancel: 'Отмена',
      editProfile: 'Редактировать профиль',
      personalData: 'Личные данные',
      addressLabel: 'Адрес:',
      emailLabel: 'Email:',
      emergencyContact: 'Экстренный контакт:',
      emergencyPhone: 'Телефон экстренного контакта:',
      fullName: 'Полное имя',
      addressPlaceholder: 'Адрес',
      emergencyContactName: 'Имя экстренного контакта',
      emergencyContactPhone: 'Телефон экстренного контакта',
      emergencyContactNotes: 'Заметки по экстренному контакту',
      photoSelected: 'Фото выбрано из медиатеки',
      chooseProfilePhoto: 'Выберите фото профиля из медиатеки',
      upload: 'Загрузить',
      avatarPreview: 'Предпросмотр аватара',
      removePhoto: 'Удалить фото',
      save: 'Сохранить',
      safety: 'Безопасность',
      emergencyTitle: 'Экстренный и резервный контакт',
      emergencyText: 'Сохраните одного доверенного человека, чтобы поддержка могла быстрее среагировать во время прогулки, передержки или срочного вопроса по доставке из магазина.',
      name: 'Имя:',
      phone: 'Телефон:',
      notes: 'Заметки:',
      notAdded: 'Пока не добавлено',
      noNotes: 'Пока нет заметок',
      openSupport: 'Открыть центр поддержки',
      safetyGuide: 'Открыть гид по безопасности',
      verificationCenter: 'Центр верификации',
      trustBadge: 'Бейдж доверия и история проверки',
      trustBadgeText: 'Загружайте документы, следите за ручной проверкой и показывайте владельцам подтверждённый бейдж.',
      reviewStatus: 'Статус проверки',
      backgroundCheck: 'Проверка благонадёжности',
      adminNote: 'Заметка администратора',
      noAdminNotes: 'Заметок администратора пока нет. Отправьте документ, чтобы начать проверку.',
      openVerification: 'Открыть центр верификации',
      trustTools: 'Инструменты доверия',
      confidenceTitle: 'Что повышает доверие перед бронированием',
      trustBullets: ['Проверенный бейдж на карточках ситтеров', 'История ручной проверки и эскалация в поддержку', 'Экстренный контакт в вашем аккаунте', 'Прозрачный спорный процесс и понятные правила безопасности'],
      browseVerified: 'Смотреть проверенных ситтеров',
      howChecksWork: 'Как работает проверка',
      weekIncome: 'Доход за неделю',
      monthIncome: 'Доход за месяц',
      pendingRequests: 'Ожидающие заявки',
      responseRate: 'Процент ответа',
      reviewsCount: 'Отзывы',
      reviewsWord: 'отзывов',
      upcomingWork: 'Ближайшая работа',
      upcomingTitle: 'Предстоящие бронирования и ожидающие заявки',
      openBookings: 'Открыть бронирования',
      timeNotSpecified: 'Время пока не указано',
      noUpcoming: 'Предстоящих бронирований пока нет.',
      verifiedProfile: 'Проверенный профиль',
      currentStatus: 'Текущий статус ситтера',
      approval: 'Одобрение',
      badge: 'Бейдж',
      verifiedSitter: 'Проверенный ситтер',
      awaitingVerification: 'Ожидает верификацию',
      calendar: 'Календарь',
      upcomingAvailability: 'Ближайшая доступность',
      openCalendar: 'Открыть календарь',
      servicesAvailability: 'Услуги и доступность',
      tariffsTitle: 'Тарифы, рабочие часы и зоны выезда',
      describeStyle: 'Опишите ваш стиль ухода, опыт с питомцами и чего владельцам ждать от работы с вами.',
      city: 'Город',
      district: 'Район',
      basePrice: 'Базовая цена за день',
      serviceRadius: 'Радиус выезда (км)',
      serviceZones: 'Зоны выезда / районы обслуживания',
      workingDays: 'Рабочие дни',
      clientCommunication: 'Коммуникация с клиентом',
      autoReplies: 'Автоответы и шаблоны сообщений',
      template: (index) => `Шаблон ${index + 1}`,
      autoReplyHint: 'Используйте это для быстрых ответов: подтверждение доступности, первый ответ и follow-up после прогулки.',
      servicePricing: 'Цены на услуги',
      pricingTitle: 'Прогулки, daycare, передержка, груминг, помощь с лекарствами',
      price: 'Цена',
      saveWorkspace: 'Сохранить кабинет ситтера',
      myPets: 'Мои питомцы',
      managePets: 'Управлять питомцами',
      noPets: 'Питомцев пока нет.',
      bookAgainKnown: 'Забронировать снова у знакомых ситтеров',
      perksEyebrow: 'Преимущества клиента',
      perksTitle: 'Ваши бонусы Nanny Club',
      perksText: 'Используйте избранных ситтеров, повторные бронирования, уведомления и историю поддержки, чтобы каждое следующее бронирование было быстрее.',
      perkItems: [
        ['heart', 'Избранные ситтеры', 'Возвращайтесь к проверенным ситтерам без повторного поиска.'],
        ['repeat', 'Забронировать снова', 'Повторяйте завершённый уход с уже сохранёнными заметками по питомцу.'],
        ['bell', 'Care-уведомления', 'Видьте бронирования, сообщения, заказы и поддержку в одном месте.'],
      ],
      perksAction: 'Открыть преимущества',
    },
    kz: {
      fullNameError: 'Толық атыңызды енгізіңіз.',
      phoneError: 'Телефон нөмірін енгізіңіз.',
      addressError: 'Мекенжайыңызды енгізіңіз.',
      completeProfile: 'Профильдегі белгіленген өрістерді толтырыңыз.',
      profileUpdated: 'Профиль сәтті жаңартылды.',
      profileSaveError: 'Профильді сақтау сәтсіз аяқталды.',
      avatarUploadError: 'Аватарды жүктеу сәтсіз аяқталды.',
      pageTitle: 'Менің профилім',
      ownerJourney: 'Ие жолы',
      welcome: (name) => `Қош келдіңіз, ${name}`,
      completeOwnerSetup: 'Жануар иесі профилін аяқтаңыз',
      ownerSetupText: 'Тіркелу, жануар профилі, ситтер іздеу, бронь, чат және пікір бір байланысқан сценарий сияқты сезілуі керек. Бұл қадамдар алға жылжуға көмектеседі.',
      findSitter: 'Ситтер табу',
      addMyPet: 'Жануар қосу',
      step: 'Қадам',
      done: 'Дайын',
      next: 'Келесі',
      profileContactTitle: 'Профиль мен байланыс деректерін толтырыңыз',
      profileContactActionDone: 'Профильді өңдеу',
      profileContactActionTodo: 'Профильді толтыру',
      profileContactDescription: 'Ситтерлер мен қолдау ыңғайлы үйлестіруі үшін телефон мен мекенжай қосыңыз.',
      petProfileTitle: 'Жануар профилін қосыңыз',
      petProfileActionDone: 'Жануарларды басқару',
      petProfileActionTodo: 'Жануар профилін жасау',
      petProfileDescription: 'Жануардың фотосы, жасы, денсаулығы және мінезі ситтерге дұрыс дайындалуға көмектеседі.',
      bookingTitle: 'Ситтерді броньдап, жаңартуларды бақылаңыз',
      viewBookings: 'Броньдарды ашу',
      browseSitters: 'Ситтерлерді қарау',
      addPetFirst: 'Алдымен жануар қосу',
      bookingDescription: 'Ситтерді таңдап, күндерді растап, күтім процесін бір жерде ұстаңыз.',
      cancel: 'Болдырмау',
      editProfile: 'Профильді өңдеу',
      personalData: 'Жеке деректер',
      addressLabel: 'Мекенжай:',
      emailLabel: 'Email:',
      emergencyContact: 'Шұғыл контакт:',
      emergencyPhone: 'Шұғыл контакт телефоны:',
      fullName: 'Толық аты',
      addressPlaceholder: 'Мекенжай',
      emergencyContactName: 'Шұғыл контакт аты',
      emergencyContactPhone: 'Шұғыл контакт телефоны',
      emergencyContactNotes: 'Шұғыл контакт жазбалары',
      photoSelected: 'Фото медиатекадан таңдалды',
      chooseProfilePhoto: 'Медиатекадан профиль фотосын таңдаңыз',
      upload: 'Жүктеу',
      avatarPreview: 'Аватар алдын ала көрінісі',
      removePhoto: 'Фотоны өшіру',
      save: 'Сақтау',
      safety: 'Қауіпсіздік',
      emergencyTitle: 'Шұғыл және резервтік байланыс',
      emergencyText: 'Сенімді бір адамды сақтап қойыңыз, сонда қолдау серуен, пансион немесе дүкен жеткізілімі мәселесінде жылдамырақ әрекет ете алады.',
      name: 'Аты:',
      phone: 'Телефон:',
      notes: 'Жазбалар:',
      notAdded: 'Әлі қосылмаған',
      noNotes: 'Жазбалар әлі жоқ',
      openSupport: 'Қолдау орталығын ашу',
      safetyGuide: 'Қауіпсіздік нұсқаулығын ашу',
      verificationCenter: 'Тексеру орталығы',
      trustBadge: 'Сенім белгісі және тексеру тарихы',
      trustBadgeText: 'Құжаттарды жүктеп, қолмен тексеру барысын бақылап, иелерге тексерілген белгіні көрсетіңіз.',
      reviewStatus: 'Тексеру күйі',
      backgroundCheck: 'Қауіпсіздік тексеруі',
      adminNote: 'Әкімші жазбасы',
      noAdminNotes: 'Әкімші жазбалары әлі жоқ. Тексеруді бастау үшін құжат жіберіңіз.',
      openVerification: 'Тексеру орталығын ашу',
      trustTools: 'Сенім құралдары',
      confidenceTitle: 'Бронь алдында сенімді не арттырады',
      trustBullets: ['Ситтер карталарындағы тексерілген белгі', 'Қолмен тексеру тарихы және қолдау эскалациясы', 'Аккаунтта сақталған шұғыл контакт', 'Даулы жағдай ағыны және анық қауіпсіздік ережелері'],
      browseVerified: 'Тексерілген ситтерлерді қарау',
      howChecksWork: 'Тексеру қалай жүреді',
      weekIncome: 'Апталық табыс',
      monthIncome: 'Айлық табыс',
      pendingRequests: 'Күтудегі сұраныстар',
      responseRate: 'Жауап беру пайызы',
      reviewsCount: 'Пікірлер',
      reviewsWord: 'пікір',
      upcomingWork: 'Жақын жұмыс',
      upcomingTitle: 'Алдағы броньдар және күтудегі сұраныстар',
      openBookings: 'Броньдарды ашу',
      timeNotSpecified: 'Уақыт әлі көрсетілмеген',
      noUpcoming: 'Алдағы броньдар әлі жоқ.',
      verifiedProfile: 'Тексерілген профиль',
      currentStatus: 'Ситтердің ағымдағы күйі',
      approval: 'Мақұлдау',
      badge: 'Белгі',
      verifiedSitter: 'Тексерілген ситтер',
      awaitingVerification: 'Тексеруді күтуде',
      calendar: 'Күнтізбе',
      upcomingAvailability: 'Жақын қолжетімділік',
      openCalendar: 'Күнтізбені ашу',
      servicesAvailability: 'Қызметтер мен қолжетімділік',
      tariffsTitle: 'Тарифтер, жұмыс уақыты және қызмет аймақтары',
      describeStyle: 'Күтім стиліңізді, жануарлармен тәжірибеңізді және иелер сізден не күтетінін жазыңыз.',
      city: 'Қала',
      district: 'Аудан',
      basePrice: 'Күніне базалық баға',
      serviceRadius: 'Қызмет радиусы (км)',
      serviceZones: 'Қызмет аймақтары / алып кету аудандары',
      workingDays: 'Жұмыс күндері',
      clientCommunication: 'Клиентпен байланыс',
      autoReplies: 'Авто жауаптар және хабарлама үлгілері',
      template: (index) => `Үлгі ${index + 1}`,
      autoReplyHint: 'Мұны тез жауаптар үшін қолданыңыз: қолжетімділікті растау, алғашқы жауап және серуеннен кейінгі follow-up.',
      servicePricing: 'Қызмет бағалары',
      pricingTitle: 'Серуен, daycare, пансион, груминг, дәрі-дәрмек күтімі',
      price: 'Баға',
      saveWorkspace: 'Ситтер кабинетін сақтау',
      myPets: 'Менің жануарларым',
      managePets: 'Жануарларды басқару',
      noPets: 'Жануарлар әлі жоқ.',
      bookAgainKnown: 'Таныс ситтермен қайта бронь жасау',
      perksEyebrow: 'Клиент артықшылықтары',
      perksTitle: 'Nanny Club артықшылықтарыңыз',
      perksText: 'Таңдаулы ситтерлерді, қайта броньдауды, хабарламаларды және қолдау тарихын пайдаланып, келесі броньды жылдамырақ жасаңыз.',
      perkItems: [
        ['heart', 'Таңдаулы ситтерлер', 'Сенімді ситтерлерге қайта іздемей оралыңыз.'],
        ['repeat', 'Қайта броньдау', 'Сақталған жануар жазбаларымен аяқталған күтімді қайталаңыз.'],
        ['bell', 'Күтім ескертулері', 'Бронь, хабарлама, тапсырыс және қолдау жаңартуларын бір жерде көріңіз.'],
      ],
      perksAction: 'Артықшылықтарды ашу',
    },
  }[language] || {};

  useEffect(() => {
    if (!currentUser()) { router.replace('/login'); return; }
    (async () => {
      try {
        const me = await api.get('/api/auth/me');
        setUser(me); setForm(me);
        const p  = await api.get('/api/pets').catch(() => []);
        setPets(p);
        const b  = await api.get('/api/bookings/mine').catch(() => ({ asOwner: [], asSitter: [] }));
        setBook(b);
        const rec = await api.get('/api/recommendations').catch(() => ({ recommendations: [], pet: null }));
        setRecommendations(rec.recommendations || []);
        setRecommendationPet(rec.pet || null);
        const fav = await api.get('/api/sitters/favorites').catch(() => []);
        setFavorites(fav);
        if (me.role === 'sitter') {
          const dashboardData = await api.get('/api/sitters/me/dashboard').catch(() => null);
          setSitterDashboard(dashboardData);
          const verificationData = await api.get('/api/sitters/me/verification').catch(() => null);
          setVerification(verificationData);
          if (dashboardData?.sitter) {
            setSitterForm({
              description: dashboardData.sitter.description || '',
              city: dashboardData.sitter.city || 'Almaty',
              district: dashboardData.sitter.district || '',
              price_per_day: dashboardData.sitter.price_per_day || '',
              service_area_text: dashboardData.sitter.service_area_text || '',
              service_radius_km: dashboardData.sitter.service_radius_km || 10,
              work_days: dashboardData.sitter.work_days || '',
              work_start: dashboardData.sitter.work_start ? String(dashboardData.sitter.work_start).slice(0, 5) : '',
              work_end: dashboardData.sitter.work_end ? String(dashboardData.sitter.work_end).slice(0, 5) : '',
              auto_reply_templates: Array.isArray(dashboardData.sitter.auto_reply_templates) && dashboardData.sitter.auto_reply_templates.length
                ? [...dashboardData.sitter.auto_reply_templates, '', ''].slice(0, 3)
                : ['', '', ''],
            });
            setServicesForm(
              DEFAULT_SITTER_SERVICES.map((service) => ({
                service,
                price: dashboardData.sitter.services?.find((item) => item.service === service)?.price || '',
              }))
            );
          }
        }
      } catch { router.replace('/login'); }
    })();
  }, [router]);

  async function save() {
    const nextErrors = {};
    if (!String(form.full_name || '').trim()) nextErrors.full_name = t.fullNameError || 'Enter your full name.';
    if (!String(form.phone || '').trim()) nextErrors.phone = t.phoneError || 'Enter your phone number.';
    if (!String(form.address || '').trim()) nextErrors.address = t.addressError || 'Enter your address.';

    if (Object.keys(nextErrors).length) {
      setProfileErrors(nextErrors);
      setProfileMessage(t.completeProfile || 'Please complete the highlighted profile fields.');
      return;
    }

    try {
      const updated = await api.put('/api/users/me', {
        ...form,
        full_name: String(form.full_name || '').trim(),
        phone: String(form.phone || '').trim(),
        address: String(form.address || '').trim(),
      });
      setUser(updated);
      setEdit(false);
      setAvatarError('');
      setProfileErrors({});
      setProfileMessage(t.profileUpdated || 'Profile updated successfully.');
    } catch (err) {
      setProfileMessage(err.message || t.profileSaveError || 'Could not save your profile.');
    }
  }

  function toggleEdit() {
    if (edit) {
      setForm(user);
      setAvatarError('');
      setProfileErrors({});
      setProfileMessage('');
    }
    setEdit(!edit);
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError(language === 'ru' ? 'Пожалуйста, выберите изображение.' : language === 'kz' ? 'Сурет файлын таңдаңыз.' : 'Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(language === 'ru' ? 'Фото должно быть меньше 5 МБ.' : language === 'kz' ? 'Фото 5 МБ-тан кіші болуы керек.' : 'Photo must be smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    try {
      const uploaded = await uploadFile('/api/uploads/document?kind=avatar', file);
      setForm((prev) => ({ ...prev, avatar_url: uploaded.url }));
      setAvatarError('');
    } catch (err) {
      setAvatarError(err.message || t.avatarUploadError || 'Failed to upload avatar.');
    } finally {
      event.target.value = '';
    }
  }

  async function saveSitterSettings() {
    try {
      await api.put('/api/sitters/me', {
        ...sitterForm,
        price_per_day: Number(sitterForm.price_per_day) || 0,
        service_radius_km: Number(sitterForm.service_radius_km) || 10,
        auto_reply_templates: sitterForm.auto_reply_templates.filter(Boolean),
      });
      await api.put('/api/sitters/me/services', {
        services: servicesForm
          .filter((item) => Number(item.price) > 0)
          .map((item) => ({ ...item, price: Number(item.price) })),
      });
      const dashboardData = await api.get('/api/sitters/me/dashboard');
      setSitterDashboard(dashboardData);
      setSitterMessage('Sitter workspace updated.');
    } catch (err) {
      setSitterMessage(err.message || 'Failed to update sitter workspace.');
    }
  }

  function toggleWorkDay(day) {
    const current = sitterForm.work_days ? sitterForm.work_days.split(',').filter(Boolean) : [];
    const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
    setSitterForm((prev) => ({ ...prev, work_days: next.join(',') }));
  }

  if (!user) return null;

  const ownerSetupSteps = [
    {
      key: 'profile',
      title: t.profileContactTitle || 'Finish your profile',
      done: Boolean(user.phone && user.address),
      href: '/dashboard',
      action: user.phone && user.address ? (t.profileContactActionDone || 'Edit profile') : (t.profileContactActionTodo || 'Complete profile'),
      description: t.profileContactDescription || 'Add phone and address so sitters and support can coordinate smoothly.',
    },
    {
      key: 'pet',
      title: t.petProfileTitle || 'Add your first pet',
      done: pets.length > 0,
      href: '/pets',
      action: pets.length ? (t.petProfileActionDone || 'Manage pets') : (t.petProfileActionTodo || 'Create pet profile'),
      description: t.petProfileDescription || 'Bookings and recommendations become much easier once your pet profile is ready.',
    },
    {
      key: 'booking',
      title: t.bookingTitle || 'Make your first booking',
      done: book.asOwner.length > 0,
      href: pets.length ? '/sitters' : '/pets',
      action: book.asOwner.length ? (t.viewBookings || 'View bookings') : (pets.length ? (t.browseSitters || 'Browse sitters') : (t.addPetFirst || 'Add pet first')),
      description: t.bookingDescription || 'Pick a sitter, confirm dates and keep the full care flow in one place.',
    },
  ];

  const completedOwnerBookings = book.asOwner.filter((item) => item.status === 'completed');
  const bookAgainCandidates = completedOwnerBookings.reduce((acc, bookingItem) => {
    if (acc.some((entry) => entry.sitter_user_id === bookingItem.sitter_user_id)) return acc;
    acc.push(bookingItem);
    return acc;
  }, []).slice(0, 3);

  return (
    <DashboardLayout title={t.pageTitle || 'My profile'}>
      {user.role === 'owner' && (welcomeMode || pets.length === 0 || book.asOwner.length === 0) && (
        <section className="mb-8 rounded-[32px] border border-nanny-orange/15 bg-gradient-to-br from-white to-[#fff6ea] p-6 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.ownerJourney || 'Owner journey'}</p>
              <h2 className="mt-2 text-3xl font-bold text-nanny-blue">
                {welcomeMode ? (t.welcome?.(user.full_name.split(' ')[0]) || `Welcome, ${user.full_name.split(' ')[0]}`) : (t.completeOwnerSetup || 'Complete your pet owner setup')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm opacity-75">
                {t.ownerSetupText || 'Registration, pet profile, sitter search, booking, chat and review should feel like one connected flow. These steps keep you moving forward.'}
              </p>
            </div>
            <a href={pets.length ? '/sitters' : '/pets'} className="btn-primary">
              {pets.length ? (t.findSitter || 'Find a sitter') : (t.addMyPet || 'Add my pet')}
            </a>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ownerSetupSteps.map((step, index) => (
              <article key={step.key} className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-nanny-deepOrange">{t.step || 'Step'} {index + 1}</span>
                  <span className={`badge ${step.done ? 'bg-green-100 text-green-700' : 'bg-nanny-yellow/80 text-nanny-brownish'}`}>
                    {step.done ? (t.done || 'Done') : (t.next || 'Next')}
                  </span>
                </div>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm opacity-75">{step.description}</p>
                <a href={step.href} className="btn-ghost mt-4 inline-flex">{step.action}</a>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[36px] border border-nanny-orange/15 bg-[radial-gradient(circle_at_top_left,rgba(242,154,77,0.12),transparent_30%),linear-gradient(145deg,#fffdfa_0%,#fff4e6_100%)] shadow-[0_28px_80px_rgba(130,93,47,0.12)]">
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border-b border-nanny-orange/10 p-7 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-nanny-deepOrange/55">
                  {t.ownerJourney || 'Owner journey'}
                </p>
                <h2 className="mt-3 text-3xl font-bold leading-tight text-nanny-blue">
                  {user.full_name}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-nanny-brownish/75">
                  {user.role === 'sitter'
                    ? (t.trustBadgeText || 'Upload your documents, follow manual review progress and keep your verified badge visible to pet owners.')
                    : (t.ownerSetupText || 'Registration, pet profile, sitter search, booking, chat and review should feel like one connected flow. These steps keep you moving forward.')}
                </p>
              </div>
              <span className="rounded-full border border-nanny-orange/15 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-nanny-deepOrange">
                {user.role}
              </span>
            </div>

            <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-nanny-orange/18 blur-2xl" />
                <img
                  src={(user.avatar_url && absoluteAssetUrl(user.avatar_url)) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=F29A4D&color=fff`}
                  alt={t.avatarPreview || 'avatar'}
                  className="relative h-32 w-32 rounded-full border-[6px] border-white object-cover shadow-[0_18px_40px_rgba(242,154,77,0.22)]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nanny-brownish/45">
                      {String(t.phone || 'Phone').replace(':', '')}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-nanny-brownish">
                      {user.phone || '—'}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nanny-brownish/45">
                      Email
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-nanny-brownish">
                      {user.email || '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-[24px] border border-white/80 bg-white/85 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nanny-brownish/45">
                    {String(t.addressLabel || 'Address:').replace(':', '')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-nanny-brownish">
                    {user.address || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={toggleEdit} className="btn-secondary inline-flex items-center gap-2">
                <Icon name="settings" className="h-4 w-4" />
                {edit ? (t.cancel || 'Cancel') : (t.editProfile || 'Edit profile')}
              </button>
              <a href="/support" className="btn-ghost inline-flex items-center gap-2">
                <Icon name="support" className="h-4 w-4" />
                {t.openSupport || 'Open support center'}
              </a>
            </div>
          </div>

          <div className="p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-nanny-deepOrange/55">
                  {t.personalData || 'Personal data'}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-nanny-deepOrange">
                  {edit ? (t.editProfile || 'Edit profile') : (t.profileContactTitle || 'Complete profile and contact details')}
                </h3>
              </div>
            </div>

            {!edit ? (
              <dl className="mt-6 space-y-3">
                {[
                  [t.phone || 'Phone:', user.phone || '—'],
                  [t.addressLabel || 'Address:', user.address || '—'],
                  [t.emailLabel || 'Email:', user.email || '—'],
                  [t.emergencyContact || 'Emergency contact:', user.emergency_contact_name || '—'],
                  [t.emergencyPhone || 'Emergency phone:', user.emergency_contact_phone || '—'],
                  [t.notes || 'Notes:', user.emergency_contact_notes || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-2 rounded-[22px] border border-nanny-orange/12 bg-white/88 px-4 py-4 sm:grid-cols-[190px_1fr] sm:items-start">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-nanny-brownish/45">
                      {String(label).replace(':', '')}
                    </dt>
                    <dd className="text-sm leading-6 text-nanny-brownish">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <input className={`input ${profileErrors.full_name ? 'border-red-300 ring-2 ring-red-100' : ''}`} placeholder={t.fullName || 'Full name'}
                           value={form.full_name || ''} onChange={(e) => {
                             setForm({ ...form, full_name: e.target.value });
                             setProfileErrors((prev) => ({ ...prev, full_name: '' }));
                           }} />
                    {profileErrors.full_name && <p className="mt-2 text-sm text-red-600">{profileErrors.full_name}</p>}
                  </div>
                  <div>
                    <input className={`input ${profileErrors.phone ? 'border-red-300 ring-2 ring-red-100' : ''}`} placeholder={String(t.phone || 'Phone').replace(':', '')}
                           value={form.phone || ''} onChange={(e) => {
                             setForm({ ...form, phone: e.target.value });
                             setProfileErrors((prev) => ({ ...prev, phone: '' }));
                           }} />
                    {profileErrors.phone && <p className="mt-2 text-sm text-red-600">{profileErrors.phone}</p>}
                  </div>
                  <div>
                    <input className={`input ${profileErrors.address ? 'border-red-300 ring-2 ring-red-100' : ''}`} placeholder={t.addressPlaceholder || 'Address'}
                           value={form.address || ''} onChange={(e) => {
                             setForm({ ...form, address: e.target.value });
                             setProfileErrors((prev) => ({ ...prev, address: '' }));
                           }} />
                    {profileErrors.address && <p className="mt-2 text-sm text-red-600">{profileErrors.address}</p>}
                  </div>
                  <input className="input" placeholder={t.emergencyContactName || 'Emergency contact name'}
                         value={form.emergency_contact_name || ''} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
                  <input className="input" placeholder={t.emergencyContactPhone || 'Emergency contact phone'}
                         value={form.emergency_contact_phone || ''} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
                  <div className="md:col-span-2">
                    <textarea className="input min-h-[110px]" placeholder={t.emergencyContactNotes || 'Emergency contact notes'}
                              value={form.emergency_contact_notes || ''} onChange={(e) => setForm({ ...form, emergency_contact_notes: e.target.value })} />
                  </div>
                </div>

                <div className="rounded-[26px] border border-nanny-orange/12 bg-white/88 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-nanny-orange/12 bg-[#fffaf2] px-4 py-4">
                    <span className="truncate text-sm text-nanny-brownish/75">
                      {form.avatar_url ? (t.photoSelected || 'Photo selected from media library') : (t.chooseProfilePhoto || 'Choose profile photo from media library')}
                    </span>
                    <span className="btn-ghost whitespace-nowrap px-3 py-1 text-sm">{t.upload || 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {avatarError && <p className="mt-3 text-sm text-red-600">{avatarError}</p>}
                  {form.avatar_url && (
                    <div className="mt-4 flex flex-col items-center rounded-2xl border border-nanny-orange/12 bg-white p-4">
                      <img
                        src={absoluteAssetUrl(form.avatar_url)}
                        alt={form.full_name || t.avatarPreview || 'Avatar preview'}
                        className="h-32 w-32 rounded-full border-[5px] border-nanny-orange/20 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, avatar_url: '' })}
                        className="btn-ghost mt-4 text-sm"
                      >
                        {t.removePhoto || 'Remove photo'}
                      </button>
                    </div>
                  )}
                </div>

                {profileMessage && (
                  <p className={`text-sm ${profileMessage.toLowerCase().includes('success') || profileMessage.toLowerCase().includes('updated') ? 'text-green-700' : 'text-red-600'}`}>
                    {profileMessage}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button onClick={save} className="btn-primary inline-flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4" />
                    {t.save || 'Save'}
                  </button>
                  <button onClick={toggleEdit} type="button" className="btn-ghost">
                    {t.cancel || 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {user.role === 'owner' && (
        <section className="mt-8 overflow-hidden rounded-[34px] border border-nanny-orange/15 bg-[radial-gradient(circle_at_top_left,rgba(242,154,77,0.18),transparent_34%),linear-gradient(135deg,#ffffff_0%,#fff3db_100%)] p-6 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.perksEyebrow || 'Customer perks'}</p>
              <h3 className="mt-2 text-2xl font-bold text-nanny-blue">{t.perksTitle || 'Your Nanny Club benefits'}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 opacity-75">{t.perksText || 'Use your saved sitters, repeat bookings, notifications and support history to make each next booking faster.'}</p>
            </div>
            <a href="/sitters" className="btn-secondary">{t.perksAction || 'Explore perks'}</a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(t.perkItems || []).map(([icon, title, text]) => (
              <article key={title} className="rounded-[26px] border border-nanny-orange/15 bg-white/86 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nanny-cream text-nanny-orange">
                  <Icon name={icon} className="h-5 w-5" />
                </div>
                <h4 className="mt-4 font-bold text-nanny-deepOrange">{title}</h4>
                <p className="mt-2 text-sm leading-6 opacity-75">{text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.safety || 'Safety'}</p>
          <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.emergencyTitle || 'Emergency and backup contact'}</h3>
          <p className="mt-2 text-sm opacity-75">
            {t.emergencyText || 'Keep one trusted person on file so support can react faster during a walk, boarding stay or urgent shop delivery issue.'}
          </p>
          <div className="mt-4 rounded-2xl border border-nanny-orange/15 bg-white p-4 text-sm space-y-2">
            <p><span className="font-semibold">{t.name || 'Name:'}</span> {user.emergency_contact_name || t.notAdded || 'Not added yet'}</p>
            <p><span className="font-semibold">{t.phone || 'Phone:'}</span> {user.emergency_contact_phone || t.notAdded || 'Not added yet'}</p>
            <p><span className="font-semibold">{t.notes || 'Notes:'}</span> {user.emergency_contact_notes || t.noNotes || 'No notes yet'}</p>
          </div>
          <div className="mt-4 flex gap-3">
            <a href="/support" className="btn-ghost">{t.openSupport || 'Open support center'}</a>
            <a href="/safety" className="btn-secondary">{t.safetyGuide || 'View safety guide'}</a>
          </div>
        </div>

        {user.role === 'sitter' ? (
          <div className="card">
            <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.verificationCenter || 'Verification center'}</p>
            <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.trustBadge || 'Trust badge and review history'}</h3>
            <p className="mt-2 text-sm opacity-75">
              {t.trustBadgeText || 'Upload your documents, follow manual review progress and keep your verified badge visible to pet owners.'}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.reviewStatus || 'Review status'}</p>
                <p className="mt-2 text-lg font-bold capitalize">{verification?.review_status || 'new'}</p>
              </div>
              <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.backgroundCheck || 'Background check'}</p>
                <p className="mt-2 text-lg font-bold capitalize">{verification?.background_check_status || 'pending'}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-nanny-orange/15 bg-nanny-cream/50 p-4 text-sm">
              <p className="font-semibold">{t.adminNote || 'Admin note'}</p>
              <p className="mt-2 opacity-75">{verification?.admin_notes || t.noAdminNotes || 'No admin notes yet. Submit your document to start the review.'}</p>
            </div>
            <a href="/verification" className="btn-primary mt-4 inline-flex">{t.openVerification || 'Open verification center'}</a>
          </div>
        ) : (
          <div className="card">
            <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.trustTools || 'Trust tools'}</p>
            <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.confidenceTitle || 'What increases confidence before booking'}</h3>
            <div className="mt-4 space-y-3 text-sm opacity-80">
              {(t.trustBullets || []).map((line) => <p key={line}>{line}</p>)}
            </div>
            <div className="mt-4 flex gap-3">
              <a href="/sitters" className="btn-ghost">{t.browseVerified || 'Browse verified sitters'}</a>
              <a href="/safety" className="btn-secondary">{t.howChecksWork || 'How checks work'}</a>
            </div>
          </div>
        )}
      </section>

      {user.role === 'sitter' && (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              [t.weekIncome || 'Week income', `${Number(sitterDashboard?.metrics?.earnings_week || 0).toLocaleString()} ₸`],
              [t.monthIncome || 'Month income', `${Number(sitterDashboard?.metrics?.earnings_month || 0).toLocaleString()} ₸`],
              [t.pendingRequests || 'Pending requests', String(sitterDashboard?.metrics?.pending_requests || 0)],
              [t.responseRate || 'Response rate', `${Number(sitterDashboard?.metrics?.response_rate || 100)}%`],
              [t.reviewsCount || 'Reviews', `${Number(sitterDashboard?.sitter?.review_count || 0)} ${t.reviewsWord || 'reviews'}`],
            ].map(([label, value]) => (
              <div key={label} className="card">
                <p className="text-xs uppercase tracking-[0.2em] opacity-60">{label}</p>
                <p className="mt-3 text-3xl font-bold text-nanny-blue">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.upcomingWork || 'Upcoming work'}</p>
                  <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.upcomingTitle || 'Upcoming bookings and pending requests'}</h3>
                </div>
                <a href="/bookings" className="btn-ghost">{t.openBookings || 'Open bookings'}</a>
              </div>
              <div className="mt-4 space-y-3">
                {sitterDashboard?.upcoming_bookings?.length ? sitterDashboard.upcoming_bookings.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.pet_name} · {item.service}</p>
                        <p className="mt-1 text-sm opacity-70">{item.owner_name}</p>
                      </div>
                      <span className="badge bg-white text-nanny-brownish capitalize">{item.status}</span>
                    </div>
                    <p className="mt-3 text-sm opacity-75">
                      {new Date(item.start_date).toLocaleDateString()} → {new Date(item.end_date).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm opacity-75">
                      {item.start_time && item.end_time ? `${String(item.start_time).slice(0, 5)} → ${String(item.end_time).slice(0, 5)}` : (t.timeNotSpecified || 'Time not specified yet')}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm opacity-60">{t.noUpcoming || 'No upcoming bookings yet.'}</p>
                )}
              </div>
            </div>

            <div className="card">
              <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.verifiedProfile || 'Verified profile'}</p>
              <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.currentStatus || 'Current sitter status'}</h3>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.approval || 'Approval'}</p>
                  <p className="mt-2 text-lg font-bold capitalize">{verification?.review_status || 'new'}</p>
                </div>
                <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.badge || 'Badge'}</p>
                  <p className="mt-2 text-lg font-bold">{verification?.is_verified ? (t.verifiedSitter || 'Verified sitter') : (t.awaitingVerification || 'Awaiting verification')}</p>
                </div>
                <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.backgroundCheck || 'Background check'}</p>
                  <p className="mt-2 text-lg font-bold capitalize">{verification?.background_check_status || 'pending'}</p>
                </div>
                <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.calendar || 'Calendar'}</p>
                  <p className="mt-2 text-lg font-bold">{t.upcomingAvailability || 'Upcoming availability'}</p>
                  <a href="/calendar" className="btn-ghost mt-3 inline-flex text-sm">{t.openCalendar || 'Open calendar'}</a>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="card">
              <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.servicesAvailability || 'Services & availability'}</p>
              <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.tariffsTitle || 'Tariffs, working hours and zones'}</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <textarea
                  className="input min-h-[120px] md:col-span-2"
                  placeholder={t.describeStyle || 'Describe your care style, pet experience and what owners can expect.'}
                  value={sitterForm.description}
                  onChange={(e) => setSitterForm((prev) => ({ ...prev, description: e.target.value }))}
                />
                <input className="input" placeholder={t.city || 'City'} value={sitterForm.city} onChange={(e) => setSitterForm((prev) => ({ ...prev, city: e.target.value }))} />
                <input className="input" placeholder={t.district || 'District'} value={sitterForm.district} onChange={(e) => setSitterForm((prev) => ({ ...prev, district: e.target.value }))} />
                <input className="input" type="number" placeholder={t.basePrice || 'Base price per day'} value={sitterForm.price_per_day} onChange={(e) => setSitterForm((prev) => ({ ...prev, price_per_day: e.target.value }))} />
                <input className="input" type="number" placeholder={t.serviceRadius || 'Service radius (km)'} value={sitterForm.service_radius_km} onChange={(e) => setSitterForm((prev) => ({ ...prev, service_radius_km: e.target.value }))} />
                <input className="input md:col-span-2" placeholder={t.serviceZones || 'Service zones / pickup areas'} value={sitterForm.service_area_text} onChange={(e) => setSitterForm((prev) => ({ ...prev, service_area_text: e.target.value }))} />
                <input className="input" type="time" value={sitterForm.work_start} onChange={(e) => setSitterForm((prev) => ({ ...prev, work_start: e.target.value }))} />
                <input className="input" type="time" value={sitterForm.work_end} onChange={(e) => setSitterForm((prev) => ({ ...prev, work_end: e.target.value }))} />
              </div>

              <div className="mt-4">
                <p className="font-semibold text-sm text-nanny-deepOrange">{t.workingDays || 'Working days'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {WORK_DAY_OPTIONS.map((day) => {
                    const active = sitterForm.work_days.split(',').includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkDay(day)}
                        className={`rounded-2xl px-4 py-2 text-sm ${active ? 'bg-nanny-orange text-white' : 'bg-white border border-nanny-orange/20 text-nanny-brownish'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.clientCommunication || 'Client communication'}</p>
              <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.autoReplies || 'Auto-replies and message templates'}</h3>
              <div className="mt-5 space-y-3">
                {sitterForm.auto_reply_templates.map((template, index) => (
                  <textarea
                    key={index}
                    className="input min-h-[90px]"
                    placeholder={t.template?.(index) || `Template ${index + 1}`}
                    value={template}
                    onChange={(e) => {
                      const next = [...sitterForm.auto_reply_templates];
                      next[index] = e.target.value;
                      setSitterForm((prev) => ({ ...prev, auto_reply_templates: next }));
                    }}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm opacity-70">
                {t.autoReplyHint || 'Use these for fast replies like availability confirmation, first response and follow-up after a walk.'}
              </p>
            </div>
          </section>

          <section className="mt-8 card">
            <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.servicePricing || 'Service pricing'}</p>
            <h3 className="mt-2 font-bold text-nanny-deepOrange">{t.pricingTitle || 'Walking, daycare, boarding, grooming, medication care'}</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {servicesForm.map((item, index) => (
                <div key={item.service} className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                  <p className="font-semibold capitalize">{item.service.replace('_', ' ')}</p>
                  <input
                    className="input mt-3"
                    type="number"
                    placeholder={t.price || 'Price'}
                    value={item.price}
                    onChange={(e) => {
                      const next = [...servicesForm];
                      next[index] = { ...next[index], price: e.target.value };
                      setServicesForm(next);
                    }}
                  />
                </div>
              ))}
            </div>
            {sitterMessage && (
              <p className={`mt-4 text-sm ${sitterMessage.includes('updated') ? 'text-green-700' : 'text-red-600'}`}>
                {sitterMessage}
              </p>
            )}
            <button type="button" onClick={saveSitterSettings} className="btn-primary mt-5">
              {t.saveWorkspace || 'Save sitter workspace'}
            </button>
          </section>
        </>
      )}

      {user.role !== 'sitter' && (
      <section className="mt-8 card">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-nanny-deepOrange">{t.myPets || 'My pets'} ({pets.length})</h3>
          <a href="/pets" className="btn-secondary">{t.managePets || 'Manage pets'}</a>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {pets.map((p) => (
            <div key={p.id} className="border border-nanny-orange/20 rounded-xl overflow-hidden bg-white">
              <img src={p.photo_url || 'https://placedog.net/400/300'} alt={p.name}
                   className="w-full h-32 object-cover" />
              <div className="p-3">
                <div className="font-bold">{p.name}</div>
                <div className="text-xs opacity-70">{p.pet_type}, {p.age}y, {p.size}</div>
              </div>
            </div>
          ))}
          {pets.length === 0 && <p className="text-sm opacity-60">{t.noPets || 'No pets yet.'}</p>}
        </div>
      </section>
      )}

      {user.role !== 'sitter' && bookAgainCandidates.length > 0 && (
      <section className="mt-8 card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-nanny-deepOrange">{t.bookAgainKnown || 'Book again with sitters you know'}</h3>
            <p className="mt-1 text-sm opacity-70">Quick return to sitters who already completed a booking with your pet.</p>
          </div>
          <a href="/bookings" className="btn-ghost">Booking history</a>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {bookAgainCandidates.map((bookingItem) => (
            <article key={bookingItem.id} className="rounded-2xl border border-nanny-orange/20 bg-white p-4">
              <div className="font-bold">{bookingItem.sitter_name}</div>
              <div className="mt-1 text-sm opacity-70">{bookingItem.service} with {bookingItem.pet_name}</div>
              <div className="mt-3 text-sm opacity-70">
                Last booking: {new Date(bookingItem.end_date).toLocaleDateString()}
              </div>
              <div className="mt-4 flex gap-2">
                <a href={`/sitters/${bookingItem.sitter_id}`} className="btn-secondary text-sm">Open sitter</a>
                <a href={`/bookings?review=${bookingItem.id}`} className="btn-ghost text-sm">Review / repeat</a>
              </div>
            </article>
          ))}
        </div>
      </section>
      )}

      {user.role !== 'sitter' && (
      <section className="mt-8 card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-nanny-deepOrange">Recommended sitters for your pet</h3>
            <p className="mt-1 text-sm opacity-70">
              {recommendationPet ? `Based on ${recommendationPet.name}, past bookings, rating and distance.` : 'We will suggest sitters once you add a pet.'}
            </p>
          </div>
          <a href="/map" className="btn-ghost">Open map</a>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {recommendations.map((sitter) => (
            <article key={sitter.id} className="rounded-2xl border border-nanny-orange/20 bg-white p-4">
              <img
                src={sitter.avatar_url || 'https://placedog.net/400/260'}
                alt={sitter.full_name}
                className="h-36 w-full rounded-2xl object-cover"
              />
              <div className="mt-3">
                <div className="font-bold">{sitter.full_name}</div>
                <div className="mt-1 text-sm opacity-70">{sitter.address || 'Almaty'}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="badge bg-blue-100 text-nanny-blue">⭐ {Number(sitter.rating || 0).toFixed(1)}</span>
                  <span className="badge bg-nanny-yellow/80 text-nanny-brownish">{Number(sitter.distance_km || 0).toFixed(1)} km</span>
                </div>
                {sitter.ai_explanation && (
                  <div className="mt-3 rounded-2xl border border-nanny-blue/10 bg-[#f5f7ff] p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-nanny-blue/70">AI match insight</p>
                    <p className="mt-2 text-sm text-nanny-brownish">{sitter.ai_explanation}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/sitters/${sitter.id}`)}
                  className="btn-primary mt-4 w-full"
                >
                  View sitter
                </button>
              </div>
            </article>
          ))}
          {recommendations.length === 0 && (
            <p className="text-sm opacity-60">No recommendations yet. Add a pet profile and bookings to improve suggestions.</p>
          )}
        </div>
      </section>
      )}

      {user.role !== 'sitter' && (
      <section className="mt-8 card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-nanny-deepOrange">Saved sitters</h3>
            <p className="mt-1 text-sm opacity-70">Quick access to sitters you liked.</p>
          </div>
          <a href="/sitters" className="btn-ghost">Browse sitters</a>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {favorites.map((sitter) => (
            <article key={sitter.id} className="rounded-2xl border border-nanny-orange/20 bg-white p-4">
              <img src={sitter.avatar_url || 'https://placedog.net/400/260'} alt={sitter.full_name} className="h-36 w-full rounded-2xl object-cover" />
              <div className="mt-3">
                <div className="font-bold">{sitter.full_name}</div>
                <div className="mt-1 text-sm opacity-70">{sitter.city}, {sitter.district}</div>
                <div className="mt-3 flex gap-2 text-sm">
                  <span className="badge bg-blue-100 text-nanny-blue">⭐ {Number(sitter.rating || 0).toFixed(1)}</span>
                  <span className="badge bg-nanny-yellow/80 text-nanny-brownish">{Number(sitter.price_per_day || 0).toLocaleString()} ₸/day</span>
                </div>
                <button type="button" onClick={() => router.push(`/sitters/${sitter.id}`)} className="btn-primary mt-4 w-full">
                  Open sitter
                </button>
              </div>
            </article>
          ))}
          {favorites.length === 0 && (
            <p className="text-sm opacity-60">No saved sitters yet. Use the heart icon on sitter cards.</p>
          )}
        </div>
      </section>
      )}

      <section className="mt-8 card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nanny-cream text-nanny-deepOrange">
            <Icon name="booking" className="h-5 w-5" />
          </span>
          <h3 className="font-bold text-nanny-deepOrange">My bookings</h3>
        </div>
        <div className="mt-3 text-sm">
          <p className="font-semibold">As owner: {book.asOwner.length}</p>
          <p className="font-semibold">As sitter: {book.asSitter.length}</p>
        </div>
        <a href="/bookings" className="btn-ghost mt-4 inline-flex">See all</a>
      </section>
    </DashboardLayout>
  );
}
