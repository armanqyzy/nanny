// Demo data that makes the site look lived-in: 20 accounts (8 sitters, 12 owners) in Almaty,
// pets, bookings in every state, reviews, chats, care reports, shop orders and support tickets.
//
// Runs once on server start when SEED_DEMO=true (Render > Environment), or by hand:
//   node scripts/seed-demo.js          add the demo data (skips if it is already there)
//   node scripts/seed-demo.js --reset  remove the demo accounts and everything they created, then add again
// Every demo account ends with @demo.nanny.kz and uses the same password as the other test accounts.
const db = require('./db');

const PASSWORD_HASH = '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC'; // same as the seed.sql accounts
const DOMAIN = '@demo.nanny.kz';
const MARKER_EMAIL = `aigerim.sitter${DOMAIN}`;

const DISTRICTS = {
  Almaly: [43.2510, 76.9050], Auezov: [43.2290, 76.8350], Bostandyk: [43.2140, 76.9100], Zhetysu: [43.2900, 76.9300],
  Medeu: [43.2400, 76.9800], Nauryzbay: [43.2000, 76.7900], Turksib: [43.3400, 76.9600], Alatau: [43.2650, 76.7900],
};

const SITTERS = [
  { key: 'aigerim', name: 'Айгерим Нурланова', phone: '+7 701 210 4455', district: 'Bostandyk', exp: 4, price: 5000,
    services: { walking: 2000, home_visit: 3000, daycare: 6000 },
    desc: 'Обожаю собак крупных пород. Гуляю по 1–2 часа, после каждой прогулки присылаю фото и короткий отчёт.',
    area: 'Бостандыкский район, ВДНХ, Ботанический сад', start: '08:00', end: '20:00' },
  { key: 'daniyar', name: 'Данияр Сапаров', phone: '+7 702 345 1122', district: 'Medeu', exp: 6, price: 7000,
    services: { boarding: 7000, walking: 2500 },
    desc: 'Частный дом с огороженным двором у подножия гор. Беру на передержку не больше двух собак, чтобы всем хватало внимания.',
    area: 'Медеуский район, Кок-Тобе, Горный Гигант', start: '07:00', end: '22:00' },
  { key: 'madina', name: 'Мадина Ахметова', phone: '+7 705 987 6543', district: 'Almaly', exp: 3, price: 4500,
    services: { home_visit: 3000, medication_care: 3500, daycare: 5000 },
    desc: 'Специализируюсь на кошках: кормление по графику, лоток, игры и лекарства. По образованию ассистент ветеринара.',
    area: 'Алмалинский район, центр города', start: '09:00', end: '21:00' },
  { key: 'erlan', name: 'Ерлан Жумабаев', phone: '+7 747 120 3344', district: 'Auezov', exp: 2, price: 3500,
    services: { walking: 1800, home_visit: 2500 },
    desc: 'Студент-ветеринар, живу рядом с парком. Утренние и вечерние прогулки, могу заехать покормить.',
    area: 'Ауэзовский район, мкр Аксай, Жетысу', start: '07:00', end: '23:00' },
  { key: 'sofya', name: 'Софья Ким', phone: '+7 708 555 7788', district: 'Zhetysu', exp: 5, price: 5500,
    services: { grooming: 6000, daycare: 5500, walking: 2200 },
    desc: 'Грумер с опытом 5 лет: мытьё, стрижка когтей, вычёсывание. Спокойно работаю с пугливыми питомцами.',
    area: 'Жетысуский район, Райымбек батыра', start: '10:00', end: '19:00' },
  { key: 'aliya', name: 'Алия Бекова', phone: '+7 776 404 5050', district: 'Turksib', exp: 1, price: 3000,
    services: { walking: 1500, home_visit: 2000 },
    desc: 'Начинающий ситтер, очень ответственная. Дома живёт кошка, люблю всех животных.',
    area: 'Турксибский район', start: '09:00', end: '20:00', pending: true },
  { key: 'timur', name: 'Тимур Абдрахманов', phone: '+7 701 777 9900', district: 'Nauryzbay', exp: 7, price: 8000,
    services: { boarding: 8000, daycare: 6500, medication_care: 4000 },
    desc: 'Кинолог. Беру собак с особенностями поведения, работаю с реактивными и тревожными питомцами.',
    area: 'Наурызбайский район, Каменское плато', start: '08:00', end: '21:00' },
  { key: 'karina', name: 'Карина Ли', phone: '+7 700 303 2211', district: 'Alatau', exp: 3, price: 4000,
    services: { daycare: 4500, home_visit: 2800, walking: 2000 },
    desc: 'Работаю удалённо, поэтому могу присматривать за питомцем весь день. Есть опыт с птицами и грызунами.',
    area: 'Алатауский район, Шугыла', start: '08:00', end: '22:00' },
];

const OWNERS = [
  { key: 'asel', name: 'Асель Каримова', phone: '+7 701 100 2030', address: 'ул. Абая 52, Алматы',
    pets: [{ name: 'Ричи', type: 'dog', gender: 'boy', age: 3, size: 'medium', care: 'easy', behavior: 'Корги, обожает мячики и других собак.', health: 'Здоров, привит.' },
      { name: 'Муся', type: 'cat', gender: 'girl', age: 5, size: 'small', care: 'easy', behavior: 'Спокойная, любит сидеть на подоконнике.' }] },
  { key: 'nursultan', name: 'Нурсултан Оспанов', phone: '+7 702 222 3344', address: 'мкр Самал-2, 58, Алматы',
    pets: [{ name: 'Барон', type: 'dog', gender: 'boy', age: 4, size: 'large', care: 'medium', behavior: 'Немецкая овчарка, тянет на поводке, нужна уверенная рука.', health: 'Чувствительный желудок, только свой корм.' }] },
  { key: 'dana', name: 'Дана Мухамедова', phone: '+7 705 333 4455', address: 'пр. Достык 105, Алматы',
    pets: [{ name: 'Пушок', type: 'cat', gender: 'boy', age: 2, size: 'small', care: 'easy', behavior: 'Игривый, прячется от гостей первые 10 минут.' }] },
  { key: 'igor', name: 'Игорь Петров', phone: '+7 707 444 5566', address: 'ул. Розыбакиева 247, Алматы',
    pets: [{ name: 'Лайма', type: 'dog', gender: 'girl', age: 6, size: 'medium', care: 'easy', behavior: 'Лабрадор, дружелюбная со всеми, любит воду.', health: 'Немного лишнего веса, без лакомств.' }] },
  { key: 'zhanna', name: 'Жанна Сейтказы', phone: '+7 708 555 6677', address: 'ул. Толе би 180, Алматы',
    pets: [{ name: 'Сима', type: 'cat', gender: 'girl', age: 9, size: 'small', care: 'difficult', behavior: 'Пожилая, спокойная, не любит громкие звуки.', health: 'Нужны лекарства утром и вечером по графику.' }] },
  { key: 'ruslan', name: 'Руслан Ибраев', phone: '+7 747 666 7788', address: 'мкр Аксай-4, 12, Алматы',
    pets: [{ name: 'Арчи', type: 'dog', gender: 'boy', age: 1, size: 'small', care: 'medium', behavior: 'Джек-рассел, очень много энергии, грызёт обувь.' }] },
  { key: 'alina', name: 'Алина Ковалёва', phone: '+7 771 777 8899', address: 'ул. Жандосова 98, Алматы',
    pets: [{ name: 'Кеша', type: 'other', gender: 'boy', age: 3, size: 'small', care: 'easy', behavior: 'Волнистый попугай, разговаривает, любит свободный полёт по комнате.' }] },
  { key: 'baurzhan', name: 'Бауыржан Тлеуов', phone: '+7 775 888 9900', address: 'Каменское плато, ул. Горная 7, Алматы',
    pets: [{ name: 'Тайсон', type: 'dog', gender: 'boy', age: 5, size: 'large', care: 'difficult', behavior: 'Алабай, насторожен к чужим, нужен опытный ситтер.' }] },
  { key: 'kamila', name: 'Камила Расулова', phone: '+7 700 121 3141', address: 'ул. Сатпаева 30, Алматы',
    pets: [{ name: 'Луна', type: 'cat', gender: 'girl', age: 4, size: 'small', care: 'easy', behavior: 'Британская, любит гладиться.' },
      { name: 'Снежок', type: 'cat', gender: 'boy', age: 1, size: 'small', care: 'medium', behavior: 'Котёнок, носится по ночам.', health: 'Вакцинация в процессе.' }] },
  { key: 'arman', name: 'Арман Есенов', phone: '+7 701 515 1617', address: 'мкр Орбита-3, 21, Алматы',
    pets: [{ name: 'Бублик', type: 'dog', gender: 'boy', age: 7, size: 'small', care: 'medium', behavior: 'Мопс, ленивый, гуляет медленно.', health: 'В жару тяжело дышит, гулять утром и вечером.' }] },
  { key: 'maria', name: 'Мария Смирнова', phone: '+7 702 717 1819', address: 'ул. Гоголя 75, Алматы',
    pets: [{ name: 'Персик', type: 'cat', gender: 'boy', age: 3, size: 'medium', care: 'easy', behavior: 'Рыжий и очень разговорчивый.' }] },
  { key: 'aidos', name: 'Айдос Касымов', phone: '+7 705 919 2021', address: 'мкр Шугыла, 340, Алматы',
    pets: [{ name: 'Джесси', type: 'dog', gender: 'girl', age: 2, size: 'medium', care: 'medium', behavior: 'Бордер-колли, умная, нужны игры и нагрузка.' }] },
];

// Which sitters fit which kind of pet.
const SITTERS_FOR = {
  dog: ['aigerim', 'daniyar', 'erlan', 'sofya', 'timur', 'karina'],
  cat: ['madina', 'sofya', 'karina', 'aigerim'],
  other: ['karina', 'madina'],
};

// [rating, text, which pets it fits]
const REVIEWS = [
  [5, 'Всё прошло отлично: каждый час приходили фото и сообщения. Питомец вернулся довольный и спокойный.', 'any'],
  [5, 'Очень внимательный ситтер, выполнили все наши просьбы по кормлению. Обязательно обратимся ещё.', 'any'],
  [4, 'В целом всё хорошо, единственное, отчёт пришёл чуть позже, чем договаривались. Но уход отличный.', 'any'],
  [5, 'Дали лекарства строго по графику, всё записали в отчёт. Спокойно уехали в командировку.', 'any'],
  [4, 'Хороший ситтер, питомец доволен. Хотелось бы чуть больше фото, но это мелочь.', 'any'],
  [5, 'Очень приятное общение, всё объяснили заранее. Будем бронировать регулярно.', 'any'],
  [5, 'Всё сделали аккуратно и спокойно, питомец даже не нервничал. Очень рекомендую.', 'any'],
  [5, 'Пришли вовремя, оставили чистоту и подробный отчёт. Лучший сервис, которым пользовались.', 'any'],
  [4, 'Всё хорошо, питомец сыт и доволен. В следующий раз попросим прийти чуть раньше.', 'any'],
  [5, 'Третий раз бронируем и ни разу не пожалели. Чувствуется, что человек любит животных.', 'any'],
  [5, 'Ответили на все вопросы ещё до брони, а во время ухода держали в курсе каждые пару часов.', 'any'],
  [5, 'Пунктуальность на высоте, пришли минута в минуту. Собака нагулялась и весь вечер спала.', 'dog'],
  [5, 'Передержка прошла без стресса. Двор большой, собака набегалась и вернулась счастливой.', 'dog'],
  [5, 'Спасибо за терпение с нашим активным псом! Вернулся уставший и довольный.', 'dog'],
  [3, 'Нормально, но пришлось напоминать про время прогулки. Сама прогулка без претензий.', 'dog'],
  [5, 'Справились даже с тем, что он тянет на поводке. Гуляли больше часа, как и договаривались.', 'dog'],
  [5, 'Прислали видео, как собака играет с мячом в парке. Мы растаяли, обязательно повторим.', 'dog'],
  [4, 'Прогулка хорошая, лапы после неё помыли. Немного опоздали, но предупредили заранее.', 'dog'],
  [5, 'Наша кошка обычно прячется от чужих, а тут сама вышла знакомиться. Это лучший показатель!', 'cat'],
  [5, 'Лоток чистый, миски помыты, кошка спокойная. Прислали фото, как она спит на диване.', 'cat'],
  [5, 'Кот капризный в еде, но ситтер нашла подход и всё рассказала в отчёте. Спасибо!', 'cat'],
  [4, 'Кошка довольна, корм по графику. Хотелось бы видео, но и фото было достаточно.', 'cat'],
  [5, 'Приходили два раза в день, играли с котом удочкой. Он даже не заметил, что нас нет.', 'cat'],
];
const REPLIES = [
  'Спасибо большое за отзыв! Буду рада видеть вас снова.',
  'Благодарю! Было приятно работать с вашим питомцем.',
  'Спасибо, учту пожелание и буду присылать больше фото.',
];
const CHAT = [
  ['owner', 'Здравствуйте! Вы свободны в эти даты?'],
  ['sitter', 'Здравствуйте! Да, свободна. Расскажите, пожалуйста, про характер питомца.'],
  ['owner', 'Он дружелюбный, но тянет на поводке. Корм оставлю в прихожей.'],
  ['sitter', 'Отлично, тогда подтверждаю. Пришлю фото после прогулки.'],
  ['owner', 'Спасибо! Ключи оставлю у консьержа.'],
];
const RECENT_CHAT = [
  ['sitter', 'Мы вышли на прогулку, всё хорошо 🐾'],
  ['owner', 'Ура, спасибо! Он поел утром?'],
  ['sitter', 'Да, всю порцию. Воду тоже поменяла.'],
];
const CARE_UPDATES = [
  ['status', 'Прогулка началась', 'Вышли в парк, погода отличная.'],
  ['update', null, 'Покормила, миска чистая, воду поменяла.'],
  ['status', 'Возвращаемся домой', 'Нагулялись, лапы помыли.'],
];
const OWNER_CANCEL = ['plans_changed', 'pet_health', 'found_other_sitter'];
const SERVICE_RU = {
  walking: 'прогулка', daycare: 'дневной присмотр', boarding: 'передержка', grooming: 'груминг',
  home_visit: 'визит на дом', medication_care: 'помощь с лекарствами',
};

// English texts from seed.sql that visitors see; only exact matches are replaced with Russian.
const TRANSLATIONS = {
  sitters: {
    'Experienced dog walker. I love big breeds and long walks.': 'Опытный выгульщик собак. Люблю крупные породы и долгие прогулки.',
    'Home boarding for small and medium dogs. Calm house.': 'Передержка дома для собак мелких и средних пород. Спокойная обстановка.',
    'Cat specialist. Feeding, play, medication on schedule.': 'Специалист по кошкам: кормление, игры, лекарства по графику.',
    'New sitter. Friendly, punctual, ready to help.': 'Новый ситтер. Дружелюбный, пунктуальный, готов помочь.',
  },
  reviews: {
    'Diana was amazing with Mura. Sent photos, followed the feeding schedule exactly. Highly recommend.':
      'Диана прекрасно поладила с Мурой. Присылала фото и кормила строго по графику. Очень рекомендую!',
  },
  updates: {
    'Started the first walk in Panfilov Park.': ['Начали первую прогулку в парке Панфилова.', 'Прогулка началась'],
    'Chopik is happy and active.': ['Чопик весёлый и активный.', null],
    'Water break done. Everything is going well.': ['Попили воды, всё идёт отлично.', null],
  },
  messages: {
    'Hello, I will be your pet sitter': 'Здравствуйте! Я буду ситтером для вашего питомца',
    'Hello there! Okay': 'Здравствуйте! Хорошо',
    "Let's have a call to discuss everything?": 'Созвонимся и всё обсудим?',
    'Sure, calling now': 'Конечно, звоню',
  },
  products: {
    'Premium Dog Food 3kg': ['Премиум-корм для собак 3 кг', 'Сбалансированный сухой корм для взрослых собак'],
    'Cat Food Salmon 2kg': ['Корм для кошек с лососем 2 кг', 'Беззерновой рецепт с лососем'],
    'Leather Collar M': ['Кожаный ошейник M', 'Мягкий кожаный ошейник среднего размера'],
    'Reflective Collar L': ['Светоотражающий ошейник L', 'Ошейник, который видно ночью'],
    'Rope Ball Toy': ['Канат с мячом', 'Прочный канат с мячом для игр и апортировки'],
    'Plush Mouse (cat)': ['Плюшевая мышка для кошек', 'Мягкая игрушка с кошачьей мятой'],
  },
};

// Deterministic "random", so every run tells the same story.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function almatyToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function at(day, time = '10:00') {
  return new Date(`${day}T${time}:00+05:00`);
}

async function translateSeedContent(client) {
  for (const [en, ru] of Object.entries(TRANSLATIONS.sitters)) {
    await client.query('UPDATE sitters SET description = $2 WHERE description = $1', [en, ru]);
  }
  for (const [en, ru] of Object.entries(TRANSLATIONS.reviews)) {
    await client.query('UPDATE reviews SET body = $2 WHERE body = $1', [en, ru]);
  }
  for (const [en, [ru, label]] of Object.entries(TRANSLATIONS.updates)) {
    await client.query('UPDATE booking_updates SET body = $2, status_label = COALESCE($3, status_label) WHERE body = $1', [en, ru, label]);
  }
  for (const [en, ru] of Object.entries(TRANSLATIONS.messages)) {
    await client.query('UPDATE messages SET body = $2 WHERE body = $1', [en, ru]);
  }
  for (const [en, [title, description]] of Object.entries(TRANSLATIONS.products)) {
    await client.query('UPDATE products SET title = $2, description = $3 WHERE title = $1', [en, title, description]);
  }
}

async function resetDemo(client = db) {
  // Deleting the users cascades to their pets, bookings, messages, reviews, orders and notifications.
  await client.query('DELETE FROM users WHERE email LIKE $1', [`%${DOMAIN}`]);
}

async function seedDemo({ force = false, log = console.log } = {}) {
  const client = await db.pool.connect();
  try {
    const { rows: existing } = await client.query('SELECT 1 FROM users WHERE email = $1', [MARKER_EMAIL]);
    if (existing.length && !force) {
      log('[demo] demo data already present, skipped');
      return { skipped: true };
    }
    await client.query('BEGIN');
    if (existing.length) await resetDemo(client);
    await translateSeedContent(client);

    const random = rng(2026);
    const pick = (list) => list[Math.floor(random() * list.length)];
    const today = almatyToday();
    const now = new Date();
    const { rows: adminRows } = await client.query(`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`);
    const adminId = adminRows[0]?.id || null;
    const counters = { bookings: 0, reviews: 0, messages: 0, updates: 0, orders: 0 };

    // Sitters
    const sitters = [];
    for (const [index, s] of SITTERS.entries()) {
      const createdAt = at(addDays(today, -90 + index * 6));
      const { rows: [user] } = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, address, created_at)
         VALUES ($1,$2,$3,$4,'sitter',$5,$6) RETURNING id`,
        [s.name, `${s.key}.sitter${DOMAIN}`, s.phone, PASSWORD_HASH, s.area, createdAt]
      );
      const [lat, lng] = DISTRICTS[s.district];
      const { rows: [sitter] } = await client.query(
        `INSERT INTO sitters (user_id, description, experience_yrs, city, district, latitude, longitude, price_per_day,
                              is_verified, review_status, background_check_status, reviewed_by, reviewed_at, admin_notes,
                              service_area_text, service_radius_km, work_days, work_start, work_end, created_at)
         VALUES ($1,$2,$3,'Almaty',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'Пн–Вс',$16,$17,$18) RETURNING id`,
        [user.id, s.desc, s.exp, s.district, lat + (random() - 0.5) * 0.02, lng + (random() - 0.5) * 0.02, s.price,
          !s.pending, s.pending ? 'in_review' : 'approved', s.pending ? 'submitted' : 'approved',
          s.pending ? null : adminId, s.pending ? null : at(addDays(today, -85 + index * 6)),
          s.pending ? null : 'Документы проверены, профиль одобрен.', s.area, 8 + Math.floor(random() * 8), s.start, s.end, createdAt]
      );
      for (const [service, price] of Object.entries(s.services)) {
        await client.query('INSERT INTO sitter_services (sitter_id, service, price) VALUES ($1,$2,$3)', [sitter.id, service, price]);
      }
      if (s.pending) {
        await client.query(
          `INSERT INTO sitter_review_events (sitter_id, actor_id, action, note, created_at)
           VALUES ($1,$2,'submitted','Документы отправлены на проверку',$3)`,
          [sitter.id, user.id, at(addDays(today, -1), '18:20')]
        );
      } else if (adminId) {
        await client.query(
          `INSERT INTO admin_actions (admin_id, action, target_type, target_id, details, created_at)
           VALUES ($1,'sitter_approved','sitter',$2,$3,$4)`,
          [adminId, sitter.id, JSON.stringify({ name: s.name }), at(addDays(today, -85 + index * 6), '12:00')]
        );
      }
      sitters.push({ ...s, userId: user.id, id: sitter.id });
    }
    const active = sitters.filter((s) => !s.pending);
    const sitterByKey = (key) => sitters.find((s) => s.key === key);

    // Days off, so profiles and the calendar show them
    for (const [key, offsets] of [['daniyar', [5, 6]], ['sofya', [3]], ['timur', [9, 10, 11]]]) {
      for (const off of offsets) {
        await client.query('INSERT INTO sitter_unavailable_days (sitter_id, day, note) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [sitterByKey(key).id, addDays(today, off), 'Выходной']);
      }
    }

    // Owners and pets
    const owners = [];
    for (const [index, o] of OWNERS.entries()) {
      const createdAt = at(addDays(today, -75 + index * 5));
      const { rows: [user] } = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, address, emergency_contact_name, emergency_contact_phone, created_at)
         VALUES ($1,$2,$3,$4,'owner',$5,$6,$7,$8) RETURNING id`,
        [o.name, `${o.key}${DOMAIN}`, o.phone, PASSWORD_HASH, o.address,
          index % 3 === 0 ? 'Сестра' : null, index % 3 === 0 ? '+7 700 000 11 22' : null, createdAt]
      );
      const pets = [];
      for (const p of o.pets) {
        const { rows: [pet] } = await client.query(
          `INSERT INTO pets (owner_id, name, pet_type, gender, age, size, care_type, behavior, health, description, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [user.id, p.name, p.type, p.gender, p.age, p.size, p.care, p.behavior, p.health || null, p.behavior, createdAt]
        );
        if (p.type !== 'other') {
          await client.query(
            'INSERT INTO pet_vaccinations (pet_id, name, given_on, next_due, notes) VALUES ($1,$2,$3,$4,$5)',
            [pet.id, p.type === 'dog' ? 'Комплексная (DHPPi+L)' : 'Комплексная (RCP)', addDays(today, -300 + index * 7),
              addDays(today, 65 - index * 9), 'Ветклиника «Айболит»']
          );
        }
        pets.push({ ...p, id: pet.id });
      }
      owners.push({ ...o, userId: user.id, pets });
    }

    // Helpers that write a whole story around one booking
    const busy = new Set();

    async function notify(userId, type, title, body, meta, createdAt) {
      if (createdAt > now) return;
      await client.query(
        'INSERT INTO notifications (user_id, type, title, body, meta, is_read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [userId, type, title, body, JSON.stringify(meta || {}), createdAt < at(addDays(today, -2)), createdAt]
      );
    }

    async function chat(ownerId, sitterUserId, lines, startAt, stepMinutes = 7) {
      let time = Math.min(startAt.getTime(), now.getTime() - lines.length * stepMinutes * 60 * 1000);
      for (const [who, body] of lines) {
        const [from, to] = who === 'owner' ? [ownerId, sitterUserId] : [sitterUserId, ownerId];
        const createdAt = new Date(time);
        await client.query(
          'INSERT INTO messages (sender_id, receiver_id, body, is_read, is_delivered, created_at) VALUES ($1,$2,$3,$4,TRUE,$5)',
          [from, to, body, createdAt < at(addDays(today, -1), '00:00'), createdAt]
        );
        counters.messages += 1;
        time += stepMinutes * 60 * 1000;
      }
    }

    async function book({ owner, pet, sitter, service, startOffset, days = 1, status, paid, review, updates, cancel, time, chatLines }) {
      const startDate = addDays(today, startOffset);
      const endDate = addDays(startDate, days - 1);
      // A sitter is never double-booked in the demo story.
      const keys = Array.from({ length: days }, (_, i) => `${sitter.id}:${addDays(startDate, i)}:${time ? time[0] : 'day'}`);
      if (status !== 'cancelled' && keys.some((key) => busy.has(key))) return null;
      keys.forEach((key) => busy.add(key));

      const price = (sitter.services[service] || 3000) * days;
      const createdAt = at(addDays(startDate, -3 - Math.floor(random() * 4)), `${10 + Math.floor(random() * 10)}:${random() < 0.5 ? '15' : '40'}`);
      const isPaid = Boolean(paid) && ['confirmed', 'completed', 'cancelled'].includes(status);
      let refund = null;
      if (cancel && isPaid) refund = cancel.by === 'sitter' || cancel.daysBefore >= 2 ? 100 : cancel.daysBefore === 1 ? 50 : 0;
      const cancelledAt = cancel ? at(addDays(startDate, -cancel.daysBefore), '19:05') : null;
      const petName = pet.name;

      const { rows: [booking] } = await client.query(
        `INSERT INTO bookings (owner_id, sitter_id, pet_id, service, start_date, end_date, start_time, end_time, total_price, status, notes,
                               payment_status, payment_reference, payment_last4, paid_at,
                               cancelled_by, cancel_reason, cancelled_at, refund_percent, refund_amount, pending_reminder_sent_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id`,
        [owner.userId, sitter.id, pet.id, service, startDate, endDate, time ? time[0] : null, time ? time[1] : null, price, status,
          random() < 0.5 ? 'Корм в шкафу на кухне, миски у балкона.' : null,
          isPaid ? (refund === 100 ? 'refunded' : refund ? 'partially_refunded' : 'paid') : 'unpaid',
          isPaid ? `demo_${Math.floor(random() * 1e8)}` : null, isPaid ? pick(['4242', '1881', '5100']) : null,
          isPaid ? new Date(createdAt.getTime() + 5 * 3600 * 1000) : null,
          cancel ? cancel.by : null, cancel ? cancel.reason : null, cancelledAt,
          refund, refund != null ? Math.round((price * refund) / 100) : null,
          // Seeded requests should not all trigger reminder messages at once.
          status === 'pending' ? now : null, createdAt]
      );
      counters.bookings += 1;

      await notify(sitter.userId, 'booking_request', 'Новая заявка',
        `${owner.name} просит: ${SERVICE_RU[service]} для ${petName}.`, { booking_id: booking.id }, createdAt);
      if (['confirmed', 'completed'].includes(status) || (cancel && cancel.afterConfirm)) {
        await notify(owner.userId, 'booking_confirmed', 'Бронирование подтверждено',
          `${sitter.name} подтвердил(а) бронирование для ${petName}.`, { booking_id: booking.id }, new Date(createdAt.getTime() + 2 * 3600 * 1000));
      }
      if (chatLines) {
        // Chats about care that is happening now are written on the day itself.
        const chatStart = startOffset <= 0 && startOffset > -days - 1 ? at(startDate, time ? time[0] : '09:00') : new Date(createdAt.getTime() - 30 * 60 * 1000);
        await chat(owner.userId, sitter.userId, chatLines, chatStart);
      }

      if (updates) {
        const base = at(startDate, time ? time[0] : '09:00');
        for (const [i, [type, label, body]] of CARE_UPDATES.slice(0, updates).entries()) {
          const createdUpd = new Date(base.getTime() + i * 40 * 60 * 1000);
          if (createdUpd > now) break;
          await client.query(
            'INSERT INTO booking_updates (booking_id, sender_id, update_type, body, status_label, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [booking.id, sitter.userId, type, body, label, createdUpd]
          );
          await notify(owner.userId, 'pet_update', `Новости о ${petName}`, body, { booking_id: booking.id }, createdUpd);
          counters.updates += 1;
        }
      }

      if (status === 'completed') {
        const doneAt = at(endDate, '20:30');
        await notify(owner.userId, 'booking_completed', 'Уход завершён',
          `${sitter.name} завершил(а) уход за ${petName}. Оцените ситтера или забронируйте снова.`,
          { booking_id: booking.id, action: 'completed' }, doneAt);
        if (review) {
          const [rating, text] = review;
          const reviewAt = new Date(Math.min(doneAt.getTime() + (3 + random() * 30) * 3600 * 1000, now.getTime() - 3600 * 1000));
          const reply = sitter.existing ? null : random() < 0.4 ? pick(REPLIES) : null;
          const { rows: [rev] } = await client.query(
            `INSERT INTO reviews (booking_id, author_id, sitter_id, rating, body, sitter_reply, sitter_replied_at, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [booking.id, owner.userId, sitter.id, rating, text, reply, reply ? new Date(reviewAt.getTime() + 30 * 60 * 1000) : null, reviewAt]
          );
          await notify(sitter.userId, 'review:new', 'Новый отзыв', `Вам оставили отзыв: ${'★'.repeat(rating)} (${rating} из 5).`,
            { review_id: rev.id, booking_id: booking.id }, reviewAt);
          counters.reviews += 1;
        }
      }

      if (cancel) {
        const by = cancel.by === 'sitter' ? sitter : owner;
        const target = cancel.by === 'sitter' ? owner.userId : sitter.userId;
        await notify(target, 'booking_cancelled', cancel.by === 'sitter' ? 'Ситтер отменил бронирование' : 'Владелец отменил бронирование',
          `${by.name} отменил(а) бронирование для ${petName}.`, { booking_id: booking.id }, cancelledAt);
      }
      return booking.id;
    }

    // Each owner: history with reviews, something happening now, plans ahead, sometimes a cancellation.
    // Reviews are spread so the same text rarely repeats and always fits the pet.
    const reviewQueues = {};
    const nextReview = (petType) => {
      const kind = petType === 'dog' || petType === 'cat' ? petType : 'other';
      if (!reviewQueues[kind] || !reviewQueues[kind].length) {
        reviewQueues[kind] = REVIEWS.filter(([, , fits]) => fits === 'any' || fits === kind);
      }
      const queue = reviewQueues[kind];
      return queue.splice(Math.floor(random() * queue.length), 1)[0];
    };
    const slot = (n) => [['08:00', '09:00'], ['18:00', '19:00'], ['12:30', '13:30'], ['09:30', '10:30'], ['19:30', '20:30']][n % 5];

    const hourNow = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Almaty', hour: '2-digit', hourCycle: 'h23' }).format(now));
    const pad = (n) => String(n).padStart(2, '0');
    const liveSlot = hourNow >= 9 && hourNow <= 21
      ? { startOffset: 0, status: 'confirmed', time: [`${pad(hourNow - 1)}:00`, `${pad(hourNow + 1)}:00`] }
      : { startOffset: -1, status: 'completed', time: ['18:00', '19:30'] };

    for (const [i, owner] of owners.entries()) {
      const pet = owner.pets[0];
      const fits = active.filter((s) => SITTERS_FOR[pet.type].includes(s.key));
      const favorite = fits[i % fits.length];
      const second = fits[(i + 1) % fits.length];
      const serviceOf = (s, p = pet) => {
        const list = Object.keys(s.services).filter((svc) => !(p.type !== 'dog' && svc === 'walking'));
        return list[(i + s.key.length) % list.length];
      };

      for (let k = 0; k < 3; k += 1) {
        const s = k === 1 ? second : favorite;
        const svc = serviceOf(s);
        const days = svc === 'boarding' ? 3 : 1;
        await book({ owner, pet, sitter: s, service: svc, startOffset: -38 + k * 11 + (i % 6), days, status: 'completed', paid: true,
          review: random() < 0.85 ? nextReview(pet.type) : null, updates: k === 2 ? 3 : 0,
          time: days === 1 ? slot(i + k) : null, chatLines: k === 0 ? CHAT : null });
      }
      if (i % 2 === 0) {
        const svc = serviceOf(favorite);
        if (i % 4 === 0) {
          // Care that is going on right now; at night it becomes this evening's finished walk.
          await book({ owner, pet, sitter: favorite, service: svc, ...liveSlot, paid: true, updates: 3,
            time: svc === 'boarding' ? null : liveSlot.time, chatLines: RECENT_CHAT });
        } else {
          await book({ owner, pet, sitter: favorite, service: svc, startOffset: 1, status: 'confirmed', paid: true,
            time: svc === 'boarding' ? null : slot(i + 3) });
        }
      }
      const lastPet = owner.pets[owner.pets.length - 1];
      const aheadFits = active.filter((s) => SITTERS_FOR[lastPet.type].includes(s.key));
      const ahead = aheadFits[(i + 1) % aheadFits.length];
      const aheadService = serviceOf(ahead, lastPet);
      await book({ owner, pet: lastPet, sitter: ahead, service: aheadService, startOffset: 3 + (i % 6),
        status: i % 3 === 0 ? 'confirmed' : 'pending', paid: false, time: aheadService === 'boarding' ? null : slot(i + 2) });
      if (i % 4 === 1) {
        const svc = serviceOf(favorite);
        await book({ owner, pet, sitter: favorite, service: svc, startOffset: -5 + (i % 3), status: 'cancelled', paid: true,
          cancel: { by: 'owner', reason: OWNER_CANCEL[i % 3], daysBefore: 3, afterConfirm: true }, time: svc === 'boarding' ? null : slot(i + 4) });
      }
      if (i === 6) {
        const svc = serviceOf(second);
        await book({ owner, pet, sitter: second, service: svc, startOffset: 8, status: 'cancelled', paid: false,
          cancel: { by: 'sitter', reason: 'not_available', daysBefore: 6 }, time: svc === 'boarding' ? null : slot(1) });
      }
      await client.query('INSERT INTO favorite_sitters (owner_id, sitter_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [owner.userId, favorite.id]);
    }

    // The existing test sitter Anna gets real clients too.
    const { rows: annaRows } = await client.query(
      `SELECT u.id AS user_id, u.full_name, s.id FROM users u JOIN sitters s ON s.user_id = u.id WHERE u.email = 'anna@nanny.kz'`
    );
    if (annaRows[0]) {
      const anna = { key: 'anna', name: annaRows[0].full_name, userId: annaRows[0].user_id, id: annaRows[0].id,
        services: { walking: 2000, home_visit: 3000 }, existing: true };
      const dogOwners = owners.filter((o) => o.pets[0].type === 'dog').slice(0, 4);
      for (const [k, owner] of dogOwners.entries()) {
        await book({ owner, pet: owner.pets[0], sitter: anna, service: 'walking', startOffset: [-20, -9, 1, 2][k],
          status: ['completed', 'completed', 'confirmed', 'pending'][k], paid: k < 3,
          review: k < 2 ? nextReview('dog') : null, updates: k === 1 ? 3 : 0,
          time: [['09:00', '10:00'], ['18:00', '19:00'], ['08:00', '09:00'], ['19:00', '20:00']][k],
          chatLines: k === 2 ? CHAT : null });
      }
    }

    // The existing test owner Anara books demo sitters.
    const { rows: anaraRows } = await client.query(
      `SELECT u.id, u.full_name, p.id AS pet_id, p.name AS pet_name
         FROM users u JOIN pets p ON p.owner_id = u.id AND COALESCE(p.is_archived, FALSE) = FALSE
        WHERE u.email = 'anara@nanny.kz' ORDER BY p.id LIMIT 1`
    );
    if (anaraRows[0]) {
      const anara = { name: anaraRows[0].full_name, userId: anaraRows[0].id };
      const pet = { id: anaraRows[0].pet_id, name: anaraRows[0].pet_name };
      await book({ owner: anara, pet, sitter: sitterByKey('aigerim'), service: 'walking', startOffset: -12, status: 'completed', paid: true,
        review: [5, 'Айгерим прислала кучу фото с прогулки, очень приятно. Рекомендую всем!'], updates: 3, time: ['10:00', '11:00'], chatLines: CHAT });
      await book({ owner: anara, pet, sitter: sitterByKey('madina'), service: 'home_visit', startOffset: 4, status: 'confirmed', paid: false,
        time: ['13:00', '14:00'],
        chatLines: [['sitter', 'Здравствуйте! Подтвердила вашу заявку, жду адрес и код от домофона.'], ['owner', 'Спасибо! Напишу накануне вечером.']] });
    }

    // Shop orders
    const { rows: products } = await client.query('SELECT id, price FROM products WHERE is_active = TRUE ORDER BY id LIMIT 6');
    if (products.length) {
      const statuses = ['delivered', 'delivered', 'shipped', 'paid', 'paid', 'new', 'delivered', 'cancelled'];
      for (const [k, owner] of owners.slice(0, 8).entries()) {
        const items = [products[k % products.length], products[(k + 2) % products.length]].slice(0, 1 + (k % 2));
        const total = items.reduce((sum, p, idx) => sum + Number(p.price) * (idx + 1), 0);
        const createdAt = at(addDays(today, -20 + k * 2), '15:10');
        const status = statuses[k];
        const paid = status !== 'new';
        const { rows: [order] } = await client.query(
          `INSERT INTO orders (user_id, total, status, address, customer_email, customer_name, customer_phone, payment_method,
                               payment_status, payment_reference, payment_last4, paid_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'card',$8,$9,$10,$11,$12) RETURNING id`,
          [owner.userId, total, status, k % 3 === 0 ? 'Самовывоз из магазина' : owner.address, `${owner.key}${DOMAIN}`, owner.name, owner.phone,
            paid ? (status === 'cancelled' ? 'refunded' : 'paid') : 'pending', paid ? `demo_order_${k}` : null, paid ? '4242' : null,
            paid ? createdAt : null, createdAt]
        );
        for (const [idx, p] of items.entries()) {
          await client.query('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)', [order.id, p.id, idx + 1, p.price]);
        }
        counters.orders += 1;
      }
    }

    // Support tickets
    const tickets = [
      [owners[1], 'payment_issue', 'high', 'resolved', 'Списали оплату дважды', 'После оплаты бронирования пришло два уведомления из банка. Проверьте, пожалуйста.', 'Проверили: второе списание было предавторизацией и уже отменено банком.'],
      [owners[4], 'booking_issue', 'normal', 'in_progress', 'Как перенести бронирование?', 'Хочу перенести уход за кошкой на неделю позже. Ситтер согласен, как это сделать на сайте?', null],
      [owners[9], 'technical_issue', 'low', 'open', 'Не загружается фото питомца', 'Пробую загрузить фото с iPhone, пишет ошибку формата.', null],
      [owners[7], 'safety_concern', 'urgent', 'resolved', 'Нужен ситтер с опытом крупных пород', 'Подскажите, кто из ситтеров работает с алабаями? Боюсь, что не все справятся.', 'Рекомендовали Тимура Абдрахманова, он кинолог.'],
    ];
    for (const [k, [owner, category, priority, status, subject, body, note]] of tickets.entries()) {
      const createdAt = at(addDays(today, -10 + k * 3), '11:45');
      await client.query(
        `INSERT INTO support_tickets (user_id, category, priority, status, subject, body, assigned_admin_id, resolution_note, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [owner.userId, category, priority, status, subject, body, status === 'open' ? null : adminId, note, createdAt,
          new Date(Math.min(createdAt.getTime() + 6 * 3600 * 1000, now.getTime()))]
      );
    }

    // Ratings follow the reviews that now exist.
    await client.query(
      `UPDATE sitters s
          SET rating = COALESCE(sub.avg_r, 0), rating_count = sub.cnt
         FROM (SELECT s2.id, AVG(r.rating)::numeric(3,2) AS avg_r, COUNT(r.id) AS cnt
                 FROM sitters s2 LEFT JOIN reviews r ON r.sitter_id = s2.id AND r.is_hidden = FALSE
                GROUP BY s2.id) sub
        WHERE sub.id = s.id`
    );

    await client.query('COMMIT');
    log(`[demo] added ${sitters.length + owners.length} accounts, ${counters.bookings} bookings, ${counters.reviews} reviews, `
      + `${counters.messages} messages, ${counters.updates} care updates, ${counters.orders} orders`);
    return { ok: true, ...counters };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log(`[demo] failed: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedDemo, resetDemo, DOMAIN };
