const db = require('../src/config/db');
const { recalculateSitterFraudScore } = require('../src/utils/fraud');

const PASSWORD_HASH = '$2b$12$R2KTGi6pzwLHSmHDW8rlWeILENCzdUPYip6dDR.AJ5VmvU3QgTThC';
const DOCUMENT_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

function timestampFromNow(dayOffset, hour = 12, minute = 0) {
  const value = new Date();
  value.setSeconds(0, 0);
  value.setHours(hour, minute, 0, 0);
  value.setDate(value.getDate() + dayOffset);
  return value.toISOString();
}

function dateFromNow(dayOffset) {
  return timestampFromNow(dayOffset, 12, 0).slice(0, 10);
}

function buildCheckoutAddress({ recipient, email, phone, delivery, address, notes = '' }) {
  const lines = [
    `Recipient: ${recipient}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Delivery: ${delivery}`,
    `Address: ${address}`,
  ];

  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n');
}

const USERS = [
  {
    email: 'admin@nanny.kz',
    full_name: 'Admin Root',
    phone: '+7 777 000 0001',
    role: 'admin',
    avatar_url: null,
    address: 'Nanny HQ, Abylai Khan Avenue 55, Almaty',
    emergency_contact_name: 'Operations desk',
    emergency_contact_phone: '+7 777 555 1122',
    emergency_contact_notes: 'Primary admin account for support, moderation and sitter review.',
    created_at: timestampFromNow(-320, 10, 15),
  },
  {
    email: 'anara@nanny.kz',
    full_name: 'Anara Armankyzy',
    phone: '+7 777 029 6982',
    role: 'owner',
    avatar_url: 'https://i.pravatar.cc/150?img=47',
    address: 'Nusupbekov 188, Almaty',
    emergency_contact_name: 'Aigul Armankyzy',
    emergency_contact_phone: '+7 701 000 8811',
    emergency_contact_notes: 'Can take over evening pickup if the owner is delayed after work.',
    created_at: timestampFromNow(-220, 9, 10),
  },
  {
    email: 'zarina@nanny.kz',
    full_name: 'Zarina K.',
    phone: '+7 777 111 2233',
    role: 'owner',
    avatar_url: 'https://i.pravatar.cc/150?img=32',
    address: 'Abay 52, Almaty',
    emergency_contact_name: 'Olzhas K.',
    emergency_contact_phone: '+7 701 221 3344',
    emergency_contact_notes: 'Has spare keys and can help with late evening feedings.',
    created_at: timestampFromNow(-210, 11, 0),
  },
  {
    email: 'aida@nanny.kz',
    full_name: 'Aida Zh.',
    phone: '+7 777 612 4401',
    role: 'owner',
    avatar_url: 'https://i.pravatar.cc/150?img=60',
    address: 'Samal-2 67, Almaty',
    emergency_contact_name: 'Maksat Zh.',
    emergency_contact_phone: '+7 705 112 2200',
    emergency_contact_notes: 'Can provide transport crate and backup food if a booking is extended.',
    created_at: timestampFromNow(-180, 15, 20),
  },
  {
    email: 'nursultan@nanny.kz',
    full_name: 'Nursultan A.',
    phone: '+7 777 843 1205',
    role: 'owner',
    avatar_url: 'https://i.pravatar.cc/150?img=66',
    address: 'Koktem-1 14, Almaty',
    emergency_contact_name: 'Aliya A.',
    emergency_contact_phone: '+7 702 710 0042',
    emergency_contact_notes: 'Usually online after 18:00 and replies quickly in chat.',
    created_at: timestampFromNow(-155, 13, 35),
  },
  {
    email: 'madina@nanny.kz',
    full_name: 'Madina S.',
    phone: '+7 777 921 3011',
    role: 'owner',
    avatar_url: 'https://i.pravatar.cc/150?img=41',
    address: 'Al-Farabi Avenue 77/2, Almaty',
    emergency_contact_name: 'Samat S.',
    emergency_contact_phone: '+7 705 890 3344',
    emergency_contact_notes: 'Prefers written updates with feeding and litter notes.',
    created_at: timestampFromNow(-142, 16, 45),
  },
  {
    email: 'erlan@nanny.kz',
    full_name: 'Erlan K.',
    phone: '+7 777 552 1119',
    role: 'owner',
    avatar_url: 'https://i.pravatar.cc/150?img=15',
    address: 'Tole Bi 181, Almaty',
    emergency_contact_name: 'Dana K.',
    emergency_contact_phone: '+7 701 334 8818',
    emergency_contact_notes: 'Often books early morning walks before office hours.',
    created_at: timestampFromNow(-120, 10, 25),
  },
  {
    email: 'dana@nanny.kz',
    full_name: 'Dana T.',
    phone: '+7 777 310 7744',
    role: 'owner',
    avatar_url: 'https://i.pravatar.cc/150?img=50',
    address: 'Navoi 208/6, Almaty',
    emergency_contact_name: 'Timur T.',
    emergency_contact_phone: '+7 707 112 9485',
    emergency_contact_notes: 'Uses pickup option in the shop and usually confirms by chat.',
    created_at: timestampFromNow(-98, 14, 5),
  },
  {
    email: 'anna@nanny.kz',
    full_name: 'Anna K.',
    phone: '+7 777 222 3344',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=25',
    address: 'Bostandyk, Almaty',
    emergency_contact_name: 'Marina K.',
    emergency_contact_phone: '+7 701 431 7788',
    emergency_contact_notes: 'Backup contact for apartment access during long boarding stays.',
    created_at: timestampFromNow(-240, 9, 0),
  },
  {
    email: 'timur@nanny.kz',
    full_name: 'Timur S.',
    phone: '+7 777 333 4455',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=12',
    address: 'Medeu, Almaty',
    emergency_contact_name: 'Saniya S.',
    emergency_contact_phone: '+7 701 994 2004',
    emergency_contact_notes: 'Helps with handoff during holiday boarding check-ins.',
    created_at: timestampFromNow(-225, 10, 30),
  },
  {
    email: 'diana@nanny.kz',
    full_name: 'Diana M.',
    phone: '+7 777 444 5566',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=49',
    address: 'Almaly, Almaty',
    emergency_contact_name: 'Asem M.',
    emergency_contact_phone: '+7 705 333 2911',
    emergency_contact_notes: 'Keeps backup medication reminders for multi-visit cat care.',
    created_at: timestampFromNow(-210, 11, 15),
  },
  {
    email: 'arman@nanny.kz',
    full_name: 'Arman T.',
    phone: '+7 777 555 6677',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=15',
    address: 'Auezov, Almaty',
    emergency_contact_name: 'Rauan T.',
    emergency_contact_phone: '+7 707 555 6742',
    emergency_contact_notes: 'Needs a clearer working schedule in the sitter profile.',
    created_at: timestampFromNow(-95, 12, 10),
  },
  {
    email: 'saule@nanny.kz',
    full_name: 'Saule A.',
    phone: '+7 777 640 8810',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=68',
    address: 'Medeu hills, Almaty',
    emergency_contact_name: 'Aidar A.',
    emergency_contact_phone: '+7 701 662 1902',
    emergency_contact_notes: 'Helps with pick-up and drop-off for long boarding stays.',
    created_at: timestampFromNow(-165, 8, 40),
  },
  {
    email: 'kamila@nanny.kz',
    full_name: 'Kamila N.',
    phone: '+7 777 510 2288',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=23',
    address: 'Samal, Almaty',
    emergency_contact_name: 'Nazym N.',
    emergency_contact_phone: '+7 705 448 2299',
    emergency_contact_notes: 'Supports cat owners who need medication and routine tracking.',
    created_at: timestampFromNow(-150, 10, 50),
  },
  {
    email: 'ruslan@nanny.kz',
    full_name: 'Ruslan B.',
    phone: '+7 777 118 7740',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=58',
    address: 'Bostandyk, Almaty',
    emergency_contact_name: 'Zhan B.',
    emergency_contact_phone: '+7 701 872 1115',
    emergency_contact_notes: 'Handles grooming handoffs and keeps extra cleaning supplies.',
    created_at: timestampFromNow(-145, 9, 20),
  },
  {
    email: 'olga@nanny.kz',
    full_name: 'Olga V.',
    phone: '+7 777 230 7717',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=45',
    address: 'Nauryzbay, Almaty',
    emergency_contact_name: 'Vera V.',
    emergency_contact_phone: '+7 707 551 6632',
    emergency_contact_notes: 'Can support longer cat and dog home-visit schedules in west Almaty.',
    created_at: timestampFromNow(-132, 14, 20),
  },
  {
    email: 'yerkebulan@nanny.kz',
    full_name: 'Yerkebulan D.',
    phone: '+7 777 909 1120',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=11',
    address: 'Turksib, Almaty',
    emergency_contact_name: 'Dinara D.',
    emergency_contact_phone: '+7 705 100 9220',
    emergency_contact_notes: 'Profile is under review while documents are checked.',
    created_at: timestampFromNow(-84, 15, 30),
  },
  {
    email: 'assel@nanny.kz',
    full_name: 'Assel P.',
    phone: '+7 777 880 4431',
    role: 'sitter',
    avatar_url: 'https://i.pravatar.cc/150?img=34',
    address: 'Auezov, Almaty',
    emergency_contact_name: 'Perizat P.',
    emergency_contact_phone: '+7 701 880 4411',
    emergency_contact_notes: 'Waiting to resubmit clearer ID pages and workday details.',
    created_at: timestampFromNow(-72, 17, 5),
  },
];

const PETS = [
  {
    owner: 'anara@nanny.kz',
    name: 'Chopik',
    pet_type: 'dog',
    gender: 'boy',
    age: 3,
    size: 'medium',
    care_type: 'easy',
    behavior: 'friendly, playful, loves tennis balls',
    health: 'vaccinated, no chronic issues',
    description: 'Golden retriever who settles quickly after a long morning walk.',
    photo_url: 'https://placedog.net/400/300?id=1',
    created_at: timestampFromNow(-210, 13, 0),
  },
  {
    owner: 'anara@nanny.kz',
    name: 'Bobik',
    pet_type: 'dog',
    gender: 'boy',
    age: 5,
    size: 'large',
    care_type: 'medium',
    behavior: 'calm indoors, slow eater, gentle with people',
    health: 'vaccinated, sensitive stomach',
    description: 'Labrador who needs measured meals and a quiet sleeping corner.',
    photo_url: 'https://placedog.net/400/300?id=2',
    created_at: timestampFromNow(-205, 13, 30),
  },
  {
    owner: 'zarina@nanny.kz',
    name: 'Mura',
    pet_type: 'cat',
    gender: 'girl',
    age: 2,
    size: 'small',
    care_type: 'easy',
    behavior: 'calm, independent, shy with strangers at first',
    health: 'sterilized',
    description: 'Domestic shorthair who likes a fixed feeding routine and quiet afternoons.',
    photo_url: 'https://placekitten.com/400/300',
    created_at: timestampFromNow(-190, 15, 10),
  },
  {
    owner: 'aida@nanny.kz',
    name: 'Luna',
    pet_type: 'cat',
    gender: 'girl',
    age: 4,
    size: 'small',
    care_type: 'easy',
    behavior: 'indoor cat, affectionate after she gets familiar',
    health: 'vaccinated, grain-free diet',
    description: 'British shorthair who likes short play sessions before dinner.',
    photo_url: 'https://placekitten.com/401/300',
    created_at: timestampFromNow(-170, 16, 0),
  },
  {
    owner: 'aida@nanny.kz',
    name: 'Richie',
    pet_type: 'dog',
    gender: 'boy',
    age: 6,
    size: 'medium',
    care_type: 'medium',
    behavior: 'friendly, energetic outside, sleeps deeply after walks',
    health: 'vaccinated, joint supplement at breakfast',
    description: 'Mixed breed rescue who responds well to calm handling.',
    photo_url: 'https://placedog.net/401/300?id=3',
    created_at: timestampFromNow(-168, 16, 20),
  },
  {
    owner: 'nursultan@nanny.kz',
    name: 'Archie',
    pet_type: 'dog',
    gender: 'boy',
    age: 2,
    size: 'small',
    care_type: 'easy',
    behavior: 'smart, food-motivated, may bark during handoff',
    health: 'vaccinated',
    description: 'Corgi with a playful morning routine and fixed nap time after lunch.',
    photo_url: 'https://placedog.net/402/300?id=4',
    created_at: timestampFromNow(-150, 12, 10),
  },
  {
    owner: 'madina@nanny.kz',
    name: 'Persik',
    pet_type: 'cat',
    gender: 'boy',
    age: 7,
    size: 'medium',
    care_type: 'medium',
    behavior: 'quiet, hides under the chair for the first hour',
    health: 'renal diet, needs fresh water changed twice a day',
    description: 'Older cat who is happiest when the apartment stays calm and predictable.',
    photo_url: 'https://placekitten.com/402/300',
    created_at: timestampFromNow(-135, 11, 45),
  },
  {
    owner: 'erlan@nanny.kz',
    name: 'Jerry',
    pet_type: 'dog',
    gender: 'boy',
    age: 4,
    size: 'medium',
    care_type: 'easy',
    behavior: 'beagle nose, pulls at first and then settles into pace',
    health: 'vaccinated',
    description: 'Needs one structured walk before work and another in the evening.',
    photo_url: 'https://placedog.net/403/300?id=5',
    created_at: timestampFromNow(-118, 9, 55),
  },
  {
    owner: 'dana@nanny.kz',
    name: 'Uma',
    pet_type: 'dog',
    gender: 'girl',
    age: 1,
    size: 'small',
    care_type: 'easy',
    behavior: 'young poodle, alert but friendly, still learning calm greetings',
    health: 'vaccinated',
    description: 'Toy poodle puppy with a short grooming routine and midday nap.',
    photo_url: 'https://placedog.net/404/300?id=6',
    created_at: timestampFromNow(-94, 14, 40),
  },
];

const SITTERS = [
  {
    email: 'anna@nanny.kz',
    description: 'Structured dog care with long walks before the city gets busy. I share calm, detailed updates and I am comfortable with large breeds.',
    experience_yrs: 6,
    city: 'Almaty',
    district: 'Bostandyk',
    latitude: 43.238949,
    longitude: 76.889709,
    price_per_day: 6500,
    is_verified: true,
    review_status: 'approved',
    admin_notes: 'Profile, services and working hours verified. Strong experience with active dogs.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-150, 10, 0),
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'approved',
    service_area_text: 'Bostandyk, Koktem and Atakent neighborhoods',
    service_radius_km: 12,
    work_days: 'Mon, Tue, Wed, Thu, Fri, Sat',
    work_start: '07:00',
    work_end: '21:00',
    auto_reply_templates: [
      'I usually reply within 15 minutes during the day.',
      'Please share feeding times and any medicine details before arrival.',
      'I send one short text update after every walk or visit.',
    ],
    is_available: true,
    created_at: timestampFromNow(-235, 9, 45),
  },
  {
    email: 'timur@nanny.kz',
    description: 'Quiet home boarding for small and medium dogs. I keep routines close to home life and limit boarding to one family at a time.',
    experience_yrs: 4,
    city: 'Almaty',
    district: 'Medeu',
    latitude: 43.25667,
    longitude: 76.928611,
    price_per_day: 7200,
    is_verified: true,
    review_status: 'approved',
    admin_notes: 'Boarding setup checked. Good owner communication and safe handoff plan.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-144, 11, 20),
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'approved',
    service_area_text: 'Medeu, Samal and Dostyk corridor',
    service_radius_km: 14,
    work_days: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun',
    work_start: '09:00',
    work_end: '20:00',
    auto_reply_templates: [
      'Drop-off and pickup are easiest after 09:30.',
      'I can keep owners updated twice a day during boarding stays.',
      'Please bring the pet bed or blanket if your dog sleeps better with familiar items.',
    ],
    is_available: true,
    created_at: timestampFromNow(-220, 10, 20),
  },
  {
    email: 'diana@nanny.kz',
    description: 'Cat specialist for home visits, feeding schedules and medication support. I am patient with shy indoor cats and seniors.',
    experience_yrs: 5,
    city: 'Almaty',
    district: 'Almaly',
    latitude: 43.245521,
    longitude: 76.945465,
    price_per_day: 5400,
    is_verified: true,
    review_status: 'approved',
    admin_notes: 'Cat-care experience confirmed. Strong communication and visit summaries.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-138, 14, 0),
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'approved',
    service_area_text: 'Almaly, Golden Square and nearby central districts',
    service_radius_km: 10,
    work_days: 'Mon, Tue, Wed, Thu, Fri, Sat',
    work_start: '08:00',
    work_end: '19:00',
    auto_reply_templates: [
      'I can track litter, appetite and medication in every update.',
      'Please leave the carrier accessible if your cat may need a clinic visit.',
      'Senior cats usually do best with a quiet approach and consistent timing.',
    ],
    is_available: true,
    created_at: timestampFromNow(-215, 12, 0),
  },
  {
    email: 'arman@nanny.kz',
    description: 'Friendly beginner sitter available for walks and short home visits. I am building experience and want a clear routine from owners.',
    experience_yrs: 1,
    city: 'Almaty',
    district: 'Auezov',
    latitude: 43.222015,
    longitude: 76.851248,
    price_per_day: 3800,
    is_verified: false,
    review_status: 'changes_requested',
    admin_notes: 'Please add a clearer ID scan, exact working hours and service area details before approval.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-8, 12, 40),
    rejection_reason: 'Document scan is blurry and the service schedule is still incomplete.',
    id_document_url: DOCUMENT_URL,
    background_check_status: 'submitted',
    service_area_text: 'Auezov and microdistrict 8',
    service_radius_km: 8,
    work_days: 'Tue, Thu, Sat',
    work_start: '10:00',
    work_end: '18:00',
    auto_reply_templates: [
      'I am happy to follow a detailed walk checklist from the owner.',
      'Please send any trigger notes before the first booking.',
    ],
    is_available: false,
    created_at: timestampFromNow(-95, 12, 20),
  },
  {
    email: 'saule@nanny.kz',
    description: 'Premium home boarding with a calm routine, secure yard and one-family-at-a-time policy. Best fit for dogs who need a quiet environment.',
    experience_yrs: 7,
    city: 'Almaty',
    district: 'Medeu',
    latitude: 43.250781,
    longitude: 76.932144,
    price_per_day: 7800,
    is_verified: true,
    review_status: 'approved',
    admin_notes: 'Strong boarding setup and excellent owner communication.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-121, 9, 30),
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'approved',
    service_area_text: 'Medeu hills, Kok-Tobe and Dostyk area',
    service_radius_km: 15,
    work_days: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun',
    work_start: '08:00',
    work_end: '21:30',
    auto_reply_templates: [
      'I send morning and evening photos during boarding stays.',
      'Owners can drop off food, treats and one comfort item.',
      'I keep a written checklist for appetite, water and walk breaks.',
    ],
    is_available: true,
    created_at: timestampFromNow(-160, 8, 55),
  },
  {
    email: 'kamila@nanny.kz',
    description: 'Thoughtful cat and apartment-pet sitter for home visits, feeding routines and gentle companionship. I am especially comfortable with shy cats.',
    experience_yrs: 5,
    city: 'Almaty',
    district: 'Samal',
    latitude: 43.2331,
    longitude: 76.9569,
    price_per_day: 5600,
    is_verified: true,
    review_status: 'approved',
    admin_notes: 'Good medication routines and strong repeat-owner feedback.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-118, 15, 10),
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'approved',
    service_area_text: 'Samal, Dostyk and central apartment districts',
    service_radius_km: 10,
    work_days: 'Mon, Tue, Wed, Thu, Fri, Sun',
    work_start: '09:00',
    work_end: '20:00',
    auto_reply_templates: [
      'I can send food and litter notes after every visit.',
      'Please mark any medicine on the counter with timing instructions.',
      'Quiet cats usually warm up after the second visit once the routine is clear.',
    ],
    is_available: true,
    created_at: timestampFromNow(-148, 13, 5),
  },
  {
    email: 'ruslan@nanny.kz',
    description: 'Walking and light grooming support for active small and medium dogs. I focus on clean handoffs, calm handling and owner notes that are easy to follow.',
    experience_yrs: 4,
    city: 'Almaty',
    district: 'Bostandyk',
    latitude: 43.2107,
    longitude: 76.8974,
    price_per_day: 6100,
    is_verified: true,
    review_status: 'approved',
    admin_notes: 'Approved after grooming portfolio and safe handoff review.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-110, 11, 50),
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'approved',
    service_area_text: 'Bostandyk, Orbita and Mega district',
    service_radius_km: 12,
    work_days: 'Mon, Wed, Thu, Fri, Sat, Sun',
    work_start: '08:30',
    work_end: '19:30',
    auto_reply_templates: [
      'Please mention if your dog has sensitive paws or dislikes dryers.',
      'I usually confirm pickup readiness 20 minutes before handoff.',
      'For grooming, I can send one photo before and after the session.',
    ],
    is_available: true,
    created_at: timestampFromNow(-137, 10, 40),
  },
  {
    email: 'olga@nanny.kz',
    description: 'Reliable home-visit sitter for cats and calm dogs in west Almaty. I keep tidy notes and can cover early evening routines consistently.',
    experience_yrs: 6,
    city: 'Almaty',
    district: 'Nauryzbay',
    latitude: 43.1839,
    longitude: 76.8398,
    price_per_day: 5900,
    is_verified: true,
    review_status: 'approved',
    admin_notes: 'Excellent repeat-owner feedback and dependable schedule coverage.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-106, 13, 35),
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'approved',
    service_area_text: 'Nauryzbay, Shanyrak and western residential districts',
    service_radius_km: 16,
    work_days: 'Tue, Wed, Thu, Fri, Sat, Sun',
    work_start: '09:30',
    work_end: '20:30',
    auto_reply_templates: [
      'I can combine feeding, litter cleaning and a short play session in one visit.',
      'Please share door, intercom and parking instructions before the first day.',
      'I leave the home tidy and send a quick departure note after each visit.',
    ],
    is_available: true,
    created_at: timestampFromNow(-129, 16, 10),
  },
  {
    email: 'yerkebulan@nanny.kz',
    description: 'Weekend walker for small dogs and short home visits in east Almaty. I prefer clear routines and nearby service zones while I build my client base.',
    experience_yrs: 2,
    city: 'Almaty',
    district: 'Turksib',
    latitude: 43.2871,
    longitude: 76.9502,
    price_per_day: 4800,
    is_verified: false,
    review_status: 'in_review',
    admin_notes: 'Documents received. Waiting for final background review and service-area confirmation.',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    id_document_url: DOCUMENT_URL,
    background_check_status: 'submitted',
    service_area_text: 'Turksib and Sainakhmetov area',
    service_radius_km: 9,
    work_days: 'Fri, Sat, Sun',
    work_start: '10:00',
    work_end: '19:00',
    auto_reply_templates: [
      'I can cover weekend walks with 24-hour notice.',
      'Please share leash habits and known triggers before booking.',
    ],
    is_available: false,
    created_at: timestampFromNow(-83, 17, 20),
  },
  {
    email: 'assel@nanny.kz',
    description: 'Calm apartment sitter for home visits and short boarding stays. Best fit for cats and small dogs with a predictable routine.',
    experience_yrs: 3,
    city: 'Almaty',
    district: 'Auezov',
    latitude: 43.2264,
    longitude: 76.9311,
    price_per_day: 5300,
    is_verified: false,
    review_status: 'changes_requested',
    admin_notes: 'Please replace the incomplete PDF and clarify Monday-Friday working hours.',
    reviewed_by: 'admin@nanny.kz',
    reviewed_at: timestampFromNow(-6, 15, 5),
    rejection_reason: 'Identity document needs a clearer full-page scan.',
    id_document_url: DOCUMENT_URL,
    background_check_status: 'manual_review',
    service_area_text: 'Auezov, Tastak and nearby blocks',
    service_radius_km: 11,
    work_days: 'Mon, Tue, Wed, Thu, Fri',
    work_start: '11:00',
    work_end: '18:30',
    auto_reply_templates: [
      'I am comfortable with quiet homes and detailed care notes.',
      'Please send feeding and medicine instructions before the visit.',
    ],
    is_available: false,
    created_at: timestampFromNow(-70, 14, 45),
  },
];

const SITTER_SERVICES = {
  'anna@nanny.kz': [
    { service: 'walking', price: 2500 },
    { service: 'home_visit', price: 3800 },
    { service: 'boarding', price: 6500 },
  ],
  'timur@nanny.kz': [
    { service: 'boarding', price: 7200 },
    { service: 'walking', price: 2700 },
  ],
  'diana@nanny.kz': [
    { service: 'home_visit', price: 3500 },
    { service: 'grooming', price: 4500 },
  ],
  'arman@nanny.kz': [
    { service: 'walking', price: 1800 },
    { service: 'home_visit', price: 2500 },
  ],
  'saule@nanny.kz': [
    { service: 'boarding', price: 7800 },
    { service: 'walking', price: 3200 },
    { service: 'home_visit', price: 4000 },
  ],
  'kamila@nanny.kz': [
    { service: 'home_visit', price: 3600 },
    { service: 'boarding', price: 5600 },
  ],
  'ruslan@nanny.kz': [
    { service: 'walking', price: 2800 },
    { service: 'grooming', price: 5000 },
  ],
  'olga@nanny.kz': [
    { service: 'boarding', price: 5900 },
    { service: 'home_visit', price: 3400 },
    { service: 'walking', price: 2400 },
  ],
  'yerkebulan@nanny.kz': [
    { service: 'walking', price: 2200 },
    { service: 'home_visit', price: 3000 },
  ],
  'assel@nanny.kz': [
    { service: 'boarding', price: 5300 },
    { service: 'home_visit', price: 3100 },
  ],
};

const FAVORITES = [
  { owner: 'anara@nanny.kz', sitter: 'anna@nanny.kz', created_at: timestampFromNow(-14, 18, 0) },
  { owner: 'anara@nanny.kz', sitter: 'saule@nanny.kz', created_at: timestampFromNow(-4, 10, 15) },
  { owner: 'anara@nanny.kz', sitter: 'kamila@nanny.kz', created_at: timestampFromNow(-2, 9, 35) },
  { owner: 'zarina@nanny.kz', sitter: 'diana@nanny.kz', created_at: timestampFromNow(-11, 12, 20) },
  { owner: 'zarina@nanny.kz', sitter: 'kamila@nanny.kz', created_at: timestampFromNow(-3, 17, 30) },
  { owner: 'aida@nanny.kz', sitter: 'timur@nanny.kz', created_at: timestampFromNow(-26, 14, 20) },
  { owner: 'aida@nanny.kz', sitter: 'olga@nanny.kz', created_at: timestampFromNow(-5, 11, 10) },
  { owner: 'nursultan@nanny.kz', sitter: 'ruslan@nanny.kz', created_at: timestampFromNow(-7, 19, 10) },
  { owner: 'nursultan@nanny.kz', sitter: 'anna@nanny.kz', created_at: timestampFromNow(-1, 20, 5) },
  { owner: 'madina@nanny.kz', sitter: 'diana@nanny.kz', created_at: timestampFromNow(-20, 16, 30) },
  { owner: 'madina@nanny.kz', sitter: 'olga@nanny.kz', created_at: timestampFromNow(-18, 16, 55) },
  { owner: 'dana@nanny.kz', sitter: 'saule@nanny.kz', created_at: timestampFromNow(-36, 13, 45) },
];

const BOOKINGS = [
  {
    key: 'anara-anna-chopik-completed',
    owner: 'anara@nanny.kz',
    sitter: 'anna@nanny.kz',
    pet: 'Chopik',
    service: 'walking',
    start_date: dateFromNow(-18),
    end_date: dateFromNow(-16),
    start_time: '08:30',
    end_time: '09:30',
    status: 'completed',
    notes: 'Two calm morning walks. Chopik settles best after a short fetch session in the yard.',
    created_at: timestampFromNow(-22, 19, 10),
  },
  {
    key: 'anara-saule-bobik-confirmed',
    owner: 'anara@nanny.kz',
    sitter: 'saule@nanny.kz',
    pet: 'Bobik',
    service: 'boarding',
    start_date: dateFromNow(-1),
    end_date: dateFromNow(1),
    start_time: null,
    end_time: null,
    status: 'confirmed',
    notes: 'Bobik is on a sensitive-stomach routine. Breakfast at 08:00, dinner at 18:00, no extra treats.',
    created_at: timestampFromNow(-5, 18, 40),
  },
  {
    key: 'anara-ruslan-chopik-pending',
    owner: 'anara@nanny.kz',
    sitter: 'ruslan@nanny.kz',
    pet: 'Chopik',
    service: 'grooming',
    start_date: dateFromNow(8),
    end_date: dateFromNow(8),
    start_time: '11:00',
    end_time: '13:00',
    status: 'pending',
    notes: 'Light trim and brush only. Chopik gets restless around noisy dryers.',
    created_at: timestampFromNow(-1, 15, 35),
  },
  {
    key: 'anara-timur-bobik-cancelled',
    owner: 'anara@nanny.kz',
    sitter: 'timur@nanny.kz',
    pet: 'Bobik',
    service: 'boarding',
    start_date: dateFromNow(-35),
    end_date: dateFromNow(-33),
    start_time: null,
    end_time: null,
    status: 'cancelled',
    notes: 'Trip moved to the next month, so this booking was cancelled in advance.',
    created_at: timestampFromNow(-41, 12, 15),
  },
  {
    key: 'zarina-diana-mura-completed',
    owner: 'zarina@nanny.kz',
    sitter: 'diana@nanny.kz',
    pet: 'Mura',
    service: 'home_visit',
    start_date: dateFromNow(-14),
    end_date: dateFromNow(-14),
    start_time: '18:00',
    end_time: '19:00',
    status: 'completed',
    notes: 'Please keep the light on in the corridor and leave fresh water in the blue bowl.',
    created_at: timestampFromNow(-18, 9, 50),
  },
  {
    key: 'zarina-kamila-mura-confirmed',
    owner: 'zarina@nanny.kz',
    sitter: 'kamila@nanny.kz',
    pet: 'Mura',
    service: 'boarding',
    start_date: dateFromNow(4),
    end_date: dateFromNow(6),
    start_time: null,
    end_time: null,
    status: 'confirmed',
    notes: 'Mura hides for the first hour, then comes out for food and wand play.',
    created_at: timestampFromNow(-3, 18, 5),
  },
  {
    key: 'aida-timur-richie-completed',
    owner: 'aida@nanny.kz',
    sitter: 'timur@nanny.kz',
    pet: 'Richie',
    service: 'boarding',
    start_date: dateFromNow(-28),
    end_date: dateFromNow(-24),
    start_time: null,
    end_time: null,
    status: 'completed',
    notes: 'Richie takes one joint supplement tablet with breakfast and sleeps best after a long evening walk.',
    created_at: timestampFromNow(-33, 14, 30),
  },
  {
    key: 'aida-olga-luna-pending',
    owner: 'aida@nanny.kz',
    sitter: 'olga@nanny.kz',
    pet: 'Luna',
    service: 'home_visit',
    start_date: dateFromNow(6),
    end_date: dateFromNow(6),
    start_time: '10:00',
    end_time: '11:00',
    status: 'pending',
    notes: 'Luna likes the laser toy for five minutes after breakfast and then goes back to the window seat.',
    created_at: timestampFromNow(-2, 10, 25),
  },
  {
    key: 'nursultan-ruslan-archie-completed',
    owner: 'nursultan@nanny.kz',
    sitter: 'ruslan@nanny.kz',
    pet: 'Archie',
    service: 'walking',
    start_date: dateFromNow(-9),
    end_date: dateFromNow(-7),
    start_time: '07:30',
    end_time: '08:30',
    status: 'completed',
    notes: 'Archie pulls at first, then settles after the first ten minutes. Please avoid the construction corner near the school.',
    created_at: timestampFromNow(-14, 20, 10),
  },
  {
    key: 'nursultan-anna-archie-confirmed',
    owner: 'nursultan@nanny.kz',
    sitter: 'anna@nanny.kz',
    pet: 'Archie',
    service: 'walking',
    start_date: dateFromNow(1),
    end_date: dateFromNow(3),
    start_time: '07:30',
    end_time: '08:30',
    status: 'confirmed',
    notes: 'Morning office-week walks. Archie is friendly but very food motivated.',
    created_at: timestampFromNow(-1, 19, 25),
  },
  {
    key: 'madina-olga-persik-completed',
    owner: 'madina@nanny.kz',
    sitter: 'olga@nanny.kz',
    pet: 'Persik',
    service: 'home_visit',
    start_date: dateFromNow(-22),
    end_date: dateFromNow(-20),
    start_time: '19:00',
    end_time: '19:40',
    status: 'completed',
    notes: 'Please leave the bedroom door open. Persik hides under the chair for the first few minutes of every visit.',
    created_at: timestampFromNow(-27, 11, 5),
  },
  {
    key: 'erlan-saule-jerry-cancelled',
    owner: 'erlan@nanny.kz',
    sitter: 'saule@nanny.kz',
    pet: 'Jerry',
    service: 'walking',
    start_date: dateFromNow(-6),
    end_date: dateFromNow(-6),
    start_time: '06:45',
    end_time: '07:30',
    status: 'cancelled',
    notes: 'Morning walk was cancelled after a schedule change at work.',
    created_at: timestampFromNow(-8, 17, 40),
  },
  {
    key: 'dana-anna-uma-completed',
    owner: 'dana@nanny.kz',
    sitter: 'anna@nanny.kz',
    pet: 'Uma',
    service: 'boarding',
    start_date: dateFromNow(-40),
    end_date: dateFromNow(-37),
    start_time: null,
    end_time: null,
    status: 'completed',
    notes: 'Uma is still a puppy, so she needs one short potty break before bedtime.',
    created_at: timestampFromNow(-46, 13, 35),
  },
];

const BOOKING_UPDATES = [
  {
    booking: 'anara-anna-chopik-completed',
    sender: 'anna@nanny.kz',
    update_type: 'status',
    body: 'We started the first walk at the small park near Koktem.',
    photo_url: null,
    status_label: 'Walk started',
    created_at: timestampFromNow(-18, 8, 45),
  },
  {
    booking: 'anara-anna-chopik-completed',
    sender: 'anna@nanny.kz',
    update_type: 'photo',
    body: 'Chopik was calm after fetch and drank water right away.',
    photo_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=900&auto=format&fit=crop',
    status_label: null,
    created_at: timestampFromNow(-17, 9, 5),
  },
  {
    booking: 'anara-saule-bobik-confirmed',
    sender: 'saule@nanny.kz',
    update_type: 'status',
    body: 'Bobik settled in after the morning yard walk and ate breakfast well.',
    photo_url: null,
    status_label: 'Morning update',
    created_at: timestampFromNow(0, 9, 15),
  },
  {
    booking: 'anara-saule-bobik-confirmed',
    sender: 'saule@nanny.kz',
    update_type: 'photo',
    body: 'Quiet rest time after lunch. Bobik is relaxed and watching the yard.',
    photo_url: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=900&auto=format&fit=crop',
    status_label: null,
    created_at: timestampFromNow(0, 14, 10),
  },
  {
    booking: 'zarina-diana-mura-completed',
    sender: 'diana@nanny.kz',
    update_type: 'update',
    body: 'Mura ate both portions and played with the wand toy for twelve minutes.',
    photo_url: null,
    status_label: null,
    created_at: timestampFromNow(-14, 18, 25),
  },
  {
    booking: 'aida-timur-richie-completed',
    sender: 'timur@nanny.kz',
    update_type: 'photo',
    body: 'Evening walk done. Richie was calm after the long route around the block.',
    photo_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&auto=format&fit=crop',
    status_label: null,
    created_at: timestampFromNow(-26, 20, 15),
  },
  {
    booking: 'nursultan-ruslan-archie-completed',
    sender: 'ruslan@nanny.kz',
    update_type: 'status',
    body: 'Archie did much better with the harness after the second day and walked calmly past the school corner.',
    photo_url: null,
    status_label: 'Route update',
    created_at: timestampFromNow(-8, 8, 20),
  },
  {
    booking: 'madina-olga-persik-completed',
    sender: 'olga@nanny.kz',
    update_type: 'update',
    body: 'Persik came out for treats quickly tonight and finished the renal food bowl.',
    photo_url: null,
    status_label: null,
    created_at: timestampFromNow(-21, 19, 20),
  },
];

const REVIEWS = [
  {
    booking: 'anara-anna-chopik-completed',
    author: 'anara@nanny.kz',
    sitter: 'anna@nanny.kz',
    rating: 5,
    body: 'Anna kept Chopik on his exact routine, sent calm updates after every walk, and handled his energy really well. I would happily book her again.',
    created_at: timestampFromNow(-15, 20, 10),
  },
  {
    booking: 'zarina-diana-mura-completed',
    author: 'zarina@nanny.kz',
    sitter: 'diana@nanny.kz',
    rating: 5,
    body: 'Diana was wonderful with Mura, especially during the first shy minutes. The updates were precise, reassuring and clearly based on real observation.',
    created_at: timestampFromNow(-13, 21, 5),
  },
  {
    booking: 'aida-timur-richie-completed',
    author: 'aida@nanny.kz',
    sitter: 'timur@nanny.kz',
    rating: 4,
    body: 'Timur kept Richie comfortable during boarding and was very easy to coordinate with. I especially appreciated the evening photos and pickup flexibility.',
    created_at: timestampFromNow(-23, 18, 45),
  },
  {
    booking: 'nursultan-ruslan-archie-completed',
    author: 'nursultan@nanny.kz',
    sitter: 'ruslan@nanny.kz',
    rating: 5,
    body: 'Ruslan understood Archie quickly and adjusted the route when he noticed the construction noise. The communication felt practical and very reliable.',
    created_at: timestampFromNow(-6, 20, 55),
  },
  {
    booking: 'madina-olga-persik-completed',
    author: 'madina@nanny.kz',
    sitter: 'olga@nanny.kz',
    rating: 5,
    body: 'Olga followed every feeding and water note exactly, and Persik looked calm in every update. The apartment was also left perfectly tidy.',
    created_at: timestampFromNow(-19, 20, 40),
  },
  {
    booking: 'dana-anna-uma-completed',
    author: 'dana@nanny.kz',
    sitter: 'anna@nanny.kz',
    rating: 4,
    body: 'Uma came back happy, clean and not overstimulated, which is not always easy with a young poodle. Anna clearly kept the routine structured.',
    created_at: timestampFromNow(-35, 19, 25),
  },
];

const REVIEW_EVENTS = [
  {
    sitter: 'arman@nanny.kz',
    actor: 'arman@nanny.kz',
    action: 'verification_submitted',
    note: 'Initial ID document and profile details submitted by sitter.',
    created_at: timestampFromNow(-20, 10, 0),
  },
  {
    sitter: 'arman@nanny.kz',
    actor: 'admin@nanny.kz',
    action: 'changes_requested',
    note: 'Please upload a clearer document scan and define working hours.',
    created_at: timestampFromNow(-8, 12, 45),
  },
  {
    sitter: 'yerkebulan@nanny.kz',
    actor: 'yerkebulan@nanny.kz',
    action: 'verification_submitted',
    note: 'Weekend walker profile and document package submitted.',
    created_at: timestampFromNow(-9, 14, 15),
  },
  {
    sitter: 'assel@nanny.kz',
    actor: 'assel@nanny.kz',
    action: 'verification_submitted',
    note: 'Initial boarding profile submitted with partial workday details.',
    created_at: timestampFromNow(-12, 16, 20),
  },
  {
    sitter: 'assel@nanny.kz',
    actor: 'admin@nanny.kz',
    action: 'changes_requested',
    note: 'Need a full-page ID document and exact Monday-Friday availability.',
    created_at: timestampFromNow(-6, 15, 10),
  },
];

const MESSAGE_THREADS = [
  [
    {
      sender: 'anara@nanny.kz',
      receiver: 'saule@nanny.kz',
      body: 'Hi Saule, I would like to confirm Bobik arrival for tomorrow morning. He usually relaxes faster if I leave his blanket with him.',
      created_at: timestampFromNow(-2, 18, 15),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'saule@nanny.kz',
      receiver: 'anara@nanny.kz',
      body: 'That works perfectly. Please bring the blanket and his dry food, and I will keep him on the same breakfast time.',
      created_at: timestampFromNow(-2, 18, 22),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'anara@nanny.kz',
      receiver: 'saule@nanny.kz',
      body: 'Great, breakfast is at 08:00 and dinner at 18:00. He is gentle indoors, just a little slow eater.',
      created_at: timestampFromNow(-2, 18, 28),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'saule@nanny.kz',
      receiver: 'anara@nanny.kz',
      body: 'Noted. I will send a text after the first walk so you know he settled in.',
      created_at: timestampFromNow(-2, 18, 34),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'anara@nanny.kz',
      receiver: 'saule@nanny.kz',
      body: 'Thank you, that would help a lot. I can drop him off around 09:15.',
      created_at: timestampFromNow(-1, 20, 5),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'saule@nanny.kz',
      receiver: 'anara@nanny.kz',
      body: 'Perfect. I already prepared a quiet corner for him, and the gate walk will be the first thing after handoff.',
      created_at: timestampFromNow(0, 8, 5),
      is_read: false,
      is_delivered: true,
    },
  ],
  [
    {
      sender: 'anara@nanny.kz',
      receiver: 'ruslan@nanny.kz',
      body: 'Hi Ruslan, is next Thursday still open for a light grooming session for Chopik? He only needs a trim and brush, not a full cut.',
      created_at: timestampFromNow(-1, 14, 10),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'ruslan@nanny.kz',
      receiver: 'anara@nanny.kz',
      body: 'Yes, Thursday at 11:00 is still free. Light grooming is actually the best format for dogs who dislike the dryer.',
      created_at: timestampFromNow(-1, 14, 26),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'anara@nanny.kz',
      receiver: 'ruslan@nanny.kz',
      body: 'That sounds good. He is calm with brushing but gets nervous if the room is loud.',
      created_at: timestampFromNow(-1, 14, 35),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'ruslan@nanny.kz',
      receiver: 'anara@nanny.kz',
      body: 'Understood. I can keep the session short and message you as soon as he is ready for pickup.',
      created_at: timestampFromNow(-1, 14, 44),
      is_read: true,
      is_delivered: true,
    },
  ],
  [
    {
      sender: 'anara@nanny.kz',
      receiver: 'admin@nanny.kz',
      body: 'Hello support, could you confirm whether order seed-ord-anara-2 can be switched to self-pickup if the courier slot changes again?',
      created_at: timestampFromNow(-2, 11, 5),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'admin@nanny.kz',
      receiver: 'anara@nanny.kz',
      body: 'Yes, we can switch it to pickup from the store on Abylai Khan Avenue. I only need you to keep the phone number active for the ready message.',
      created_at: timestampFromNow(-2, 11, 18),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'anara@nanny.kz',
      receiver: 'admin@nanny.kz',
      body: 'Perfect, please keep it as courier for now. If it slips again, I will pick it up after work.',
      created_at: timestampFromNow(-2, 11, 25),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'admin@nanny.kz',
      receiver: 'anara@nanny.kz',
      body: 'Understood. I added that note to your support ticket so the shop team sees it during dispatch.',
      created_at: timestampFromNow(-2, 11, 33),
      is_read: false,
      is_delivered: true,
    },
  ],
  [
    {
      sender: 'zarina@nanny.kz',
      receiver: 'diana@nanny.kz',
      body: 'Hi Diana, Mura will probably stay under the chair for the first visit, but she comes out quickly once the food bowl is down.',
      created_at: timestampFromNow(-15, 15, 5),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'diana@nanny.kz',
      receiver: 'zarina@nanny.kz',
      body: 'That is perfectly fine. I will keep the visit calm and avoid direct eye contact until she approaches on her own.',
      created_at: timestampFromNow(-15, 15, 12),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'zarina@nanny.kz',
      receiver: 'diana@nanny.kz',
      body: 'Thank you. The wand toy is on top of the fridge, and she usually plays after she finishes eating.',
      created_at: timestampFromNow(-15, 15, 20),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'diana@nanny.kz',
      receiver: 'zarina@nanny.kz',
      body: 'Great, I will include a short play note in the update so you know how comfortable she looked.',
      created_at: timestampFromNow(-15, 15, 28),
      is_read: true,
      is_delivered: true,
    },
  ],
  [
    {
      sender: 'aida@nanny.kz',
      receiver: 'timur@nanny.kz',
      body: 'Hi Timur, Richie takes one joint tablet with breakfast and slows down after an hour of activity. Everything else is straightforward.',
      created_at: timestampFromNow(-29, 18, 10),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'timur@nanny.kz',
      receiver: 'aida@nanny.kz',
      body: 'Thank you, I wrote that down. I will also keep his evening walk slightly longer so he can settle for the night.',
      created_at: timestampFromNow(-29, 18, 19),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'aida@nanny.kz',
      receiver: 'timur@nanny.kz',
      body: 'That would be great. He sleeps deeply after a long evening route and a small water break.',
      created_at: timestampFromNow(-29, 18, 27),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'timur@nanny.kz',
      receiver: 'aida@nanny.kz',
      body: 'Perfect, I will keep you updated after the second walk so you know he settled in well.',
      created_at: timestampFromNow(-29, 18, 38),
      is_read: true,
      is_delivered: true,
    },
  ],
  [
    {
      sender: 'nursultan@nanny.kz',
      receiver: 'anna@nanny.kz',
      body: 'Hello Anna, Archie can be noisy during the first two minutes of the walk, but he follows calmly after that.',
      created_at: timestampFromNow(-1, 19, 35),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'anna@nanny.kz',
      receiver: 'nursultan@nanny.kz',
      body: 'Thanks for the heads-up. I will keep the first corner slow and give him a few extra seconds before crossing the main road.',
      created_at: timestampFromNow(-1, 19, 46),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'nursultan@nanny.kz',
      receiver: 'anna@nanny.kz',
      body: 'That is exactly what helps. If the weather is bad, a shorter route is completely fine.',
      created_at: timestampFromNow(-1, 19, 54),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'anna@nanny.kz',
      receiver: 'nursultan@nanny.kz',
      body: 'Understood. I will send one short update after the first morning walk so you know how the handoff went.',
      created_at: timestampFromNow(-1, 20, 1),
      is_read: true,
      is_delivered: true,
    },
  ],
  [
    {
      sender: 'madina@nanny.kz',
      receiver: 'olga@nanny.kz',
      body: 'Hi Olga, Persik usually hides for the first few minutes, but he comes out when the food is placed near the radiator.',
      created_at: timestampFromNow(-23, 17, 15),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'olga@nanny.kz',
      receiver: 'madina@nanny.kz',
      body: 'That makes sense. I will keep the visit slow and leave the room exactly as you described once he settles.',
      created_at: timestampFromNow(-23, 17, 22),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'madina@nanny.kz',
      receiver: 'olga@nanny.kz',
      body: 'Thank you. Please also refresh the water in the ceramic bowl and leave the bedroom door open before you leave.',
      created_at: timestampFromNow(-23, 17, 29),
      is_read: true,
      is_delivered: true,
    },
    {
      sender: 'olga@nanny.kz',
      receiver: 'madina@nanny.kz',
      body: 'Absolutely. I will include all of that in the update so you can compare it against the routine at home.',
      created_at: timestampFromNow(-23, 17, 38),
      is_read: true,
      is_delivered: true,
    },
  ],
  [
    {
      sender: 'admin@nanny.kz',
      receiver: 'arman@nanny.kz',
      body: 'Thanks for submitting your sitter profile. Please replace the current ID scan with a sharper full-page version before we can approve it.',
      created_at: timestampFromNow(-8, 12, 50),
      is_read: false,
      is_delivered: true,
    },
    {
      sender: 'admin@nanny.kz',
      receiver: 'assel@nanny.kz',
      body: 'Your profile is close to approval. We only need a clearer document upload and exact weekday availability in the dashboard.',
      created_at: timestampFromNow(-6, 15, 15),
      is_read: false,
      is_delivered: true,
    },
  ],
];

const SUPPORT_TICKETS = [
  {
    key: 'anara-shop-delay',
    user: 'anara@nanny.kz',
    category: 'shop_order',
    priority: 'high',
    status: 'resolved',
    subject: 'Courier was late for dog food delivery',
    body: 'My courier window moved twice and I wanted to know if pickup from the store could be used as a backup if the route slips again.',
    assigned_admin: 'admin@nanny.kz',
    ai_summary: 'Customer needs a fallback plan for a delayed shop order delivery and wants pickup as a backup option.',
    ai_suggested_category: 'shop_order',
    ai_suggested_priority: 'high',
    ai_first_reply: 'We can keep courier delivery active and switch to pickup if the route changes again.',
    resolution_note: 'Confirmed that the order can be switched to pickup from the store if the courier window changes again.',
    created_at: timestampFromNow(-2, 11, 0),
    updated_at: timestampFromNow(-1, 9, 10),
  },
  {
    key: 'madina-chat-preview',
    user: 'madina@nanny.kz',
    category: 'technical_issue',
    priority: 'normal',
    status: 'in_progress',
    subject: 'Chat attachment preview is blank',
    body: 'When I open a recent chat on mobile width, the attachment preview card stays empty until I refresh the page.',
    assigned_admin: 'admin@nanny.kz',
    ai_summary: 'Possible frontend rendering issue in chat thread preview on mobile layout.',
    ai_suggested_category: 'technical_issue',
    ai_suggested_priority: 'normal',
    ai_first_reply: 'Thanks, we are reviewing the rendering issue and will update you after reproducing it.',
    resolution_note: null,
    created_at: timestampFromNow(-3, 16, 30),
    updated_at: timestampFromNow(-2, 10, 45),
  },
  {
    key: 'aida-boarding-invoice',
    user: 'aida@nanny.kz',
    category: 'booking_issue',
    priority: 'high',
    status: 'open',
    subject: 'Need invoice for completed boarding',
    body: 'The boarding itself went well, but I need a written invoice for work reimbursement and I do not see one attached to the booking history.',
    assigned_admin: 'admin@nanny.kz',
    ai_summary: 'Owner needs a reimbursement invoice linked to a completed boarding booking.',
    ai_suggested_category: 'booking_issue',
    ai_suggested_priority: 'high',
    ai_first_reply: 'We will attach the booking invoice details and confirm what format is accepted.',
    resolution_note: null,
    created_at: timestampFromNow(-1, 13, 5),
    updated_at: timestampFromNow(-1, 13, 5),
  },
  {
    key: 'erlan-first-walk-callback',
    user: 'erlan@nanny.kz',
    category: 'safety_concern',
    priority: 'urgent',
    status: 'resolved',
    subject: 'Need callback before first walk',
    body: 'I wanted direct confirmation that the sitter saw Jerry react badly to motorcycles, so I asked for a manual callback before any outside walk starts.',
    assigned_admin: 'admin@nanny.kz',
    ai_summary: 'Owner requested a manual callback before the first walk because the dog reacts strongly to traffic noise.',
    ai_suggested_category: 'safety_concern',
    ai_suggested_priority: 'urgent',
    ai_first_reply: 'We confirmed the note with the sitter and added it to the booking profile before the walk.',
    resolution_note: 'Safety note was added to the booking and the owner received a direct callback before handoff.',
    created_at: timestampFromNow(-8, 8, 40),
    updated_at: timestampFromNow(-7, 10, 20),
  },
];

const PRODUCTS = [
  {
    title: 'Premium Dog Food 3kg',
    category: 'food',
    description: 'Balanced dry food for adult dogs with steady energy needs.',
    price: 8500,
    image_url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&auto=format&fit=crop',
    stock: 32,
    is_active: true,
  },
  {
    title: 'Cat Food Salmon 2kg',
    category: 'food',
    description: 'Grain-free salmon recipe for indoor and sensitive cats.',
    price: 7200,
    image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&auto=format&fit=crop',
    stock: 27,
    is_active: true,
  },
  {
    title: 'Leather Collar M',
    category: 'collar',
    description: 'Soft leather collar with a secure buckle for daily walks.',
    price: 3500,
    image_url: 'https://images.unsplash.com/photo-1585499193951-b18ab7cde86f?w=400&auto=format&fit=crop',
    stock: 18,
    is_active: true,
  },
  {
    title: 'Reflective Collar L',
    category: 'collar',
    description: 'Night-safe reflective collar with adjustable sizing.',
    price: 2800,
    image_url: 'https://images.unsplash.com/photo-1601758124277-f0086d5ab050?w=400&auto=format&fit=crop',
    stock: 24,
    is_active: true,
  },
  {
    title: 'Rope Ball Toy',
    category: 'toy',
    description: 'Durable rope and ball toy for fetch, tug and chewing.',
    price: 1500,
    image_url: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=400&auto=format&fit=crop',
    stock: 45,
    is_active: true,
  },
  {
    title: 'Plush Mouse (cat)',
    category: 'toy',
    description: 'Catnip-filled plush mouse for short indoor play sessions.',
    price: 900,
    image_url: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&auto=format&fit=crop',
    stock: 64,
    is_active: true,
  },
  {
    title: 'Freeze-Dried Beef Treats 120g',
    category: 'food',
    description: 'Single-protein training treats for dogs with sensitive digestion.',
    price: 3900,
    image_url: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&auto=format&fit=crop',
    stock: 26,
    is_active: true,
  },
  {
    title: 'Orthopedic Pet Bed S',
    category: 'other',
    description: 'Supportive memory-foam bed for small dogs and older cats.',
    price: 12800,
    image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&auto=format&fit=crop',
    stock: 9,
    is_active: true,
  },
  {
    title: 'Silicone Travel Bowl',
    category: 'other',
    description: 'Collapsible bowl for water breaks during city walks and road trips.',
    price: 2200,
    image_url: 'https://images.unsplash.com/photo-1594149929911-78975a43d4f5?w=400&auto=format&fit=crop',
    stock: 22,
    is_active: true,
  },
  {
    title: 'Lavender Cat Litter 5L',
    category: 'other',
    description: 'Clumping litter with a light lavender scent for apartment cats.',
    price: 4100,
    image_url: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400&auto=format&fit=crop',
    stock: 21,
    is_active: true,
  },
  {
    title: 'Sensitive Skin Pet Shampoo',
    category: 'other',
    description: 'Gentle shampoo for pets who need short rinses and mild fragrance.',
    price: 3600,
    image_url: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&auto=format&fit=crop',
    stock: 17,
    is_active: true,
  },
];

const ORDERS = [
  {
    key: 'seed-ord-anara-1',
    user: 'anara@nanny.kz',
    status: 'delivered',
    payment_status: 'paid',
    payment_reference: 'seed-ord-anara-1',
    payment_method: 'card',
    payment_last4: '4242',
    paid_at: timestampFromNow(-15, 10, 35),
    created_at: timestampFromNow(-15, 10, 30),
    customer_name: 'Anara Armankyzy',
    customer_phone: '+7 777 029 6982',
    delivery: 'Courier delivery',
    address: 'Nusupbekov 188, Almaty',
    notes: 'Leave with the concierge if I am on a call.',
    items: [
      { title: 'Premium Dog Food 3kg', quantity: 1 },
      { title: 'Rope Ball Toy', quantity: 2 },
      { title: 'Silicone Travel Bowl', quantity: 1 },
    ],
  },
  {
    key: 'seed-ord-anara-2',
    user: 'anara@nanny.kz',
    status: 'shipped',
    payment_status: 'paid',
    payment_reference: 'seed-ord-anara-2',
    payment_method: 'card',
    payment_last4: '1840',
    paid_at: timestampFromNow(-2, 9, 25),
    created_at: timestampFromNow(-2, 9, 20),
    customer_name: 'Anara Armankyzy',
    customer_phone: '+7 777 029 6982',
    delivery: 'Courier delivery',
    address: 'Nusupbekov 188, Almaty',
    notes: 'Call five minutes before arrival because the intercom is often busy.',
    items: [
      { title: 'Leather Collar M', quantity: 1 },
      { title: 'Freeze-Dried Beef Treats 120g', quantity: 1 },
    ],
  },
  {
    key: 'seed-ord-zarina-1',
    user: 'zarina@nanny.kz',
    status: 'paid',
    payment_status: 'paid',
    payment_reference: 'seed-ord-zarina-1',
    payment_method: 'card',
    payment_last4: '2501',
    paid_at: timestampFromNow(-1, 13, 50),
    created_at: timestampFromNow(-1, 13, 45),
    customer_name: 'Zarina K.',
    customer_phone: '+7 777 111 2233',
    delivery: 'Courier delivery',
    address: 'Abay 52, Almaty',
    notes: 'Please ring once and leave the bag by the door if I am out with Mura at the clinic.',
    items: [
      { title: 'Cat Food Salmon 2kg', quantity: 1 },
      { title: 'Lavender Cat Litter 5L', quantity: 1 },
      { title: 'Plush Mouse (cat)', quantity: 2 },
    ],
  },
  {
    key: 'seed-ord-aida-1',
    user: 'aida@nanny.kz',
    status: 'cancelled',
    payment_status: 'refunded',
    payment_reference: 'seed-ord-aida-1',
    payment_method: 'card',
    payment_last4: '9921',
    paid_at: timestampFromNow(-9, 15, 10),
    created_at: timestampFromNow(-9, 15, 5),
    customer_name: 'Aida Zh.',
    customer_phone: '+7 777 612 4401',
    delivery: 'Courier delivery',
    address: 'Samal-2 67, Almaty',
    notes: 'Refund was requested after I changed the room layout for Richie.',
    items: [
      { title: 'Orthopedic Pet Bed S', quantity: 1 },
      { title: 'Rope Ball Toy', quantity: 1 },
    ],
  },
  {
    key: 'seed-ord-nursultan-1',
    user: 'nursultan@nanny.kz',
    status: 'new',
    payment_status: 'pending',
    payment_reference: 'seed-ord-nursultan-1',
    payment_method: 'card',
    payment_last4: '6104',
    paid_at: null,
    created_at: timestampFromNow(0, 10, 5),
    customer_name: 'Nursultan A.',
    customer_phone: '+7 777 843 1205',
    delivery: 'Store pickup',
    address: 'Nanny Pet Shop, Abylai Khan Avenue 55, Almaty',
    notes: 'Pickup after work, ideally after 18:30.',
    items: [
      { title: 'Reflective Collar L', quantity: 1 },
      { title: 'Freeze-Dried Beef Treats 120g', quantity: 1 },
    ],
  },
  {
    key: 'seed-ord-madina-1',
    user: 'madina@nanny.kz',
    status: 'delivered',
    payment_status: 'paid',
    payment_reference: 'seed-ord-madina-1',
    payment_method: 'card',
    payment_last4: '7811',
    paid_at: timestampFromNow(-22, 12, 45),
    created_at: timestampFromNow(-22, 12, 40),
    customer_name: 'Madina S.',
    customer_phone: '+7 777 921 3011',
    delivery: 'Courier delivery',
    address: 'Al-Farabi Avenue 77/2, Almaty',
    notes: 'Persik food should stay upright, please avoid stacking heavy items on the bag.',
    items: [
      { title: 'Cat Food Salmon 2kg', quantity: 2 },
      { title: 'Sensitive Skin Pet Shampoo', quantity: 1 },
    ],
  },
  {
    key: 'seed-ord-dana-1',
    user: 'dana@nanny.kz',
    status: 'paid',
    payment_status: 'paid',
    payment_reference: 'seed-ord-dana-1',
    payment_method: 'card',
    payment_last4: '3388',
    paid_at: timestampFromNow(-4, 17, 0),
    created_at: timestampFromNow(-4, 16, 55),
    customer_name: 'Dana T.',
    customer_phone: '+7 777 310 7744',
    delivery: 'Store pickup',
    address: 'Nanny Pet Shop, Abylai Khan Avenue 55, Almaty',
    notes: 'Please hold the order until evening pickup.',
    items: [
      { title: 'Silicone Travel Bowl', quantity: 1 },
      { title: 'Sensitive Skin Pet Shampoo', quantity: 1 },
      { title: 'Plush Mouse (cat)', quantity: 1 },
    ],
  },
];

const NOTIFICATIONS = [
  {
    user: 'anara@nanny.kz',
    type: 'booking_confirmed',
    title: 'Booking confirmed',
    body: 'Saule confirmed Bobik boarding and is ready for drop-off tomorrow morning.',
    meta: { booking_key: 'anara-saule-bobik-confirmed' },
    is_read: false,
    created_at: timestampFromNow(-1, 18, 50),
  },
  {
    user: 'anara@nanny.kz',
    type: 'message:new',
    title: 'New message from Saule A.',
    body: 'She prepared Bobik quiet corner and shared the morning plan.',
    meta: { sender_email: 'saule@nanny.kz' },
    is_read: false,
    created_at: timestampFromNow(0, 8, 6),
  },
  {
    user: 'anara@nanny.kz',
    type: 'shop_order_status',
    title: 'Shop order updated',
    body: 'Your latest shop order is now shipped and ready for dispatch coordination.',
    meta: { order_key: 'seed-ord-anara-2' },
    is_read: false,
    created_at: timestampFromNow(-1, 9, 30),
  },
  {
    user: 'anara@nanny.kz',
    type: 'support_update',
    title: 'Support ticket updated',
    body: 'Support added a fallback pickup note to your courier ticket.',
    meta: { support_key: 'anara-shop-delay' },
    is_read: true,
    created_at: timestampFromNow(-1, 9, 12),
  },
  {
    user: 'zarina@nanny.kz',
    type: 'booking_confirmed',
    title: 'Boarding scheduled',
    body: 'Kamila confirmed Mura boarding and requested the feeding routine in chat.',
    meta: { booking_key: 'zarina-kamila-mura-confirmed' },
    is_read: false,
    created_at: timestampFromNow(-2, 18, 10),
  },
  {
    user: 'aida@nanny.kz',
    type: 'support_update',
    title: 'Support request received',
    body: 'Your invoice request for the completed boarding was added to the admin queue.',
    meta: { support_key: 'aida-boarding-invoice' },
    is_read: false,
    created_at: timestampFromNow(-1, 13, 6),
  },
  {
    user: 'madina@nanny.kz',
    type: 'support_update',
    title: 'Technical issue in progress',
    body: 'Support is checking the blank attachment preview reported from your chat screen.',
    meta: { support_key: 'madina-chat-preview' },
    is_read: false,
    created_at: timestampFromNow(-2, 10, 46),
  },
  {
    user: 'nursultan@nanny.kz',
    type: 'booking_confirmed',
    title: 'Morning walks confirmed',
    body: 'Anna confirmed the weekday walk block for Archie.',
    meta: { booking_key: 'nursultan-anna-archie-confirmed' },
    is_read: true,
    created_at: timestampFromNow(-1, 20, 10),
  },
  {
    user: 'admin@nanny.kz',
    type: 'support_ticket',
    title: 'New support ticket',
    body: 'Aida Zh. requested a reimbursement invoice for a completed boarding stay.',
    meta: { support_key: 'aida-boarding-invoice' },
    is_read: false,
    created_at: timestampFromNow(-1, 13, 5),
  },
  {
    user: 'admin@nanny.kz',
    type: 'sitter_review',
    title: 'Sitter profile needs review',
    body: 'Yerkebulan D. submitted documents and is waiting for the next verification step.',
    meta: { sender_email: 'yerkebulan@nanny.kz' },
    is_read: false,
    created_at: timestampFromNow(-9, 14, 16),
  },
];

async function upsertUser(client, user) {
  const { rows } = await client.query(
    `INSERT INTO users (
        full_name, email, phone, password_hash, role, avatar_url, address,
        emergency_contact_name, emergency_contact_phone, emergency_contact_notes, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        avatar_url = EXCLUDED.avatar_url,
        address = EXCLUDED.address,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        emergency_contact_notes = EXCLUDED.emergency_contact_notes,
        is_blocked = FALSE
      RETURNING *`,
    [
      user.full_name,
      user.email,
      user.phone,
      PASSWORD_HASH,
      user.role,
      user.avatar_url,
      user.address,
      user.emergency_contact_name,
      user.emergency_contact_phone,
      user.emergency_contact_notes,
      user.created_at,
    ]
  );

  return rows[0];
}

async function ensurePet(client, pet, ownerId) {
  const existing = await client.query(
    'SELECT id FROM pets WHERE owner_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
    [ownerId, pet.name]
  );

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE pets
          SET pet_type = $1,
              gender = $2,
              age = $3,
              size = $4,
              care_type = $5,
              behavior = $6,
              health = $7,
              description = $8,
              photo_url = $9
        WHERE id = $10
        RETURNING *`,
      [
        pet.pet_type,
        pet.gender,
        pet.age,
        pet.size,
        pet.care_type,
        pet.behavior,
        pet.health,
        pet.description,
        pet.photo_url,
        existing.rows[0].id,
      ]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO pets (
        owner_id, name, pet_type, gender, age, size, care_type,
        behavior, health, description, photo_url, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
    [
      ownerId,
      pet.name,
      pet.pet_type,
      pet.gender,
      pet.age,
      pet.size,
      pet.care_type,
      pet.behavior,
      pet.health,
      pet.description,
      pet.photo_url,
      pet.created_at,
    ]
  );
  return rows[0];
}

async function upsertSitter(client, sitter, userId, reviewedById) {
  const { rows } = await client.query(
    `INSERT INTO sitters (
        user_id, description, experience_yrs, city, district, latitude, longitude, price_per_day,
        rating, rating_count, fraud_score, is_flagged, is_verified, review_status, admin_notes,
        reviewed_by, reviewed_at, rejection_reason, id_document_url, background_check_status,
        service_area_text, service_radius_km, work_days, work_start, work_end,
        auto_reply_templates, is_available, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        0,0,0,FALSE,$9,$10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22::jsonb,$23,$24
      )
      ON CONFLICT (user_id) DO UPDATE SET
        description = EXCLUDED.description,
        experience_yrs = EXCLUDED.experience_yrs,
        city = EXCLUDED.city,
        district = EXCLUDED.district,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        price_per_day = EXCLUDED.price_per_day,
        is_verified = EXCLUDED.is_verified,
        review_status = EXCLUDED.review_status,
        admin_notes = EXCLUDED.admin_notes,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at,
        rejection_reason = EXCLUDED.rejection_reason,
        id_document_url = EXCLUDED.id_document_url,
        background_check_status = EXCLUDED.background_check_status,
        service_area_text = EXCLUDED.service_area_text,
        service_radius_km = EXCLUDED.service_radius_km,
        work_days = EXCLUDED.work_days,
        work_start = EXCLUDED.work_start,
        work_end = EXCLUDED.work_end,
        auto_reply_templates = EXCLUDED.auto_reply_templates,
        is_available = EXCLUDED.is_available
      RETURNING *`,
    [
      userId,
      sitter.description,
      sitter.experience_yrs,
      sitter.city,
      sitter.district,
      sitter.latitude,
      sitter.longitude,
      sitter.price_per_day,
      sitter.is_verified,
      sitter.review_status,
      sitter.admin_notes,
      reviewedById,
      sitter.reviewed_at,
      sitter.rejection_reason,
      sitter.id_document_url,
      sitter.background_check_status,
      sitter.service_area_text,
      sitter.service_radius_km,
      sitter.work_days,
      sitter.work_start,
      sitter.work_end,
      JSON.stringify(sitter.auto_reply_templates || []),
      sitter.is_available,
      sitter.created_at,
    ]
  );

  return rows[0];
}

async function replaceSitterServices(client, sitterId, services) {
  await client.query('DELETE FROM sitter_services WHERE sitter_id = $1', [sitterId]);
  for (const service of services) {
    await client.query(
      'INSERT INTO sitter_services (sitter_id, service, price) VALUES ($1,$2,$3)',
      [sitterId, service.service, service.price]
    );
  }
}

async function ensureFavorite(client, ownerId, sitterId, createdAt) {
  await client.query(
    `INSERT INTO favorite_sitters (owner_id, sitter_id, created_at)
     VALUES ($1,$2,$3)
     ON CONFLICT (owner_id, sitter_id) DO NOTHING`,
    [ownerId, sitterId, createdAt]
  );
}

async function ensureBooking(client, booking, ownerId, sitterId, petId, sitterPrice) {
  const existing = await client.query(
    `SELECT id
       FROM bookings
      WHERE owner_id = $1
        AND sitter_id = $2
        AND pet_id = $3
        AND service = $4
        AND start_date = $5
        AND end_date = $6
      LIMIT 1`,
    [ownerId, sitterId, petId, booking.service, booking.start_date, booking.end_date]
  );

  const days = Math.max(
    1,
    Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000) + 1
  );
  const totalPrice = Number(sitterPrice) * days;

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE bookings
          SET start_time = $1,
              end_time = $2,
              total_price = $3,
              status = $4,
              notes = $5
        WHERE id = $6
        RETURNING *`,
      [
        booking.start_time,
        booking.end_time,
        totalPrice,
        booking.status,
        booking.notes,
        existing.rows[0].id,
      ]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO bookings (
        owner_id, sitter_id, pet_id, service, start_date, end_date,
        start_time, end_time, total_price, status, notes, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
    [
      ownerId,
      sitterId,
      petId,
      booking.service,
      booking.start_date,
      booking.end_date,
      booking.start_time,
      booking.end_time,
      totalPrice,
      booking.status,
      booking.notes,
      booking.created_at,
    ]
  );
  return rows[0];
}

async function ensureBookingUpdate(client, bookingId, senderId, update) {
  const existing = await client.query(
    `SELECT id
       FROM booking_updates
      WHERE booking_id = $1
        AND sender_id = $2
        AND update_type = $3
        AND COALESCE(body, '') = COALESCE($4, '')
        AND created_at = $5::timestamptz
      LIMIT 1`,
    [bookingId, senderId, update.update_type, update.body, update.created_at]
  );

  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await client.query(
    `INSERT INTO booking_updates (
        booking_id, sender_id, update_type, body, photo_url, status_label, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
    [
      bookingId,
      senderId,
      update.update_type,
      update.body,
      update.photo_url,
      update.status_label,
      update.created_at,
    ]
  );
  return rows[0];
}

async function ensureReview(client, bookingId, authorId, sitterId, review) {
  const existing = await client.query('SELECT id FROM reviews WHERE booking_id = $1', [bookingId]);

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE reviews
          SET author_id = $1,
              sitter_id = $2,
              rating = $3,
              body = $4,
              is_hidden = FALSE
        WHERE booking_id = $5
        RETURNING *`,
      [authorId, sitterId, review.rating, review.body, bookingId]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO reviews (
        booking_id, author_id, sitter_id, rating, body, is_hidden, created_at
      ) VALUES ($1,$2,$3,$4,$5,FALSE,$6)
      RETURNING *`,
    [bookingId, authorId, sitterId, review.rating, review.body, review.created_at]
  );
  return rows[0];
}

async function ensureReviewEvent(client, sitterId, actorId, event) {
  const existing = await client.query(
    `SELECT id
       FROM sitter_review_events
      WHERE sitter_id = $1
        AND action = $2
        AND COALESCE(note, '') = COALESCE($3, '')
        AND created_at = $4::timestamptz
      LIMIT 1`,
    [sitterId, event.action, event.note, event.created_at]
  );

  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await client.query(
    `INSERT INTO sitter_review_events (sitter_id, actor_id, action, note, created_at)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [sitterId, actorId, event.action, event.note, event.created_at]
  );
  return rows[0];
}

async function ensureMessage(client, senderId, receiverId, message) {
  const existing = await client.query(
    `SELECT id
       FROM messages
      WHERE sender_id = $1
        AND receiver_id = $2
        AND COALESCE(body, '') = COALESCE($3, '')
        AND COALESCE(audio_url, '') = COALESCE($4, '')
        AND COALESCE(image_url, '') = COALESCE($5, '')
        AND COALESCE(file_url, '') = COALESCE($6, '')
        AND created_at = $7::timestamptz
      LIMIT 1`,
    [
      senderId,
      receiverId,
      message.body || null,
      message.audio_url || null,
      message.image_url || null,
      message.file_url || null,
      message.created_at,
    ]
  );

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE messages
          SET is_read = $1,
              is_delivered = $2,
              is_deleted = FALSE,
              deleted_for_everyone = FALSE
        WHERE id = $3
        RETURNING *`,
      [message.is_read, message.is_delivered, existing.rows[0].id]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO messages (
        sender_id, receiver_id, body, audio_url, image_url, file_url,
        is_read, is_delivered, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
    [
      senderId,
      receiverId,
      message.body || null,
      message.audio_url || null,
      message.image_url || null,
      message.file_url || null,
      message.is_read,
      message.is_delivered,
      message.created_at,
    ]
  );
  return rows[0];
}

async function ensureSupportTicket(client, ticket, userId, assignedAdminId) {
  const existing = await client.query(
    'SELECT id FROM support_tickets WHERE user_id = $1 AND subject = $2 LIMIT 1',
    [userId, ticket.subject]
  );

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE support_tickets
          SET category = $1,
              priority = $2,
              status = $3,
              body = $4,
              assigned_admin_id = $5,
              ai_summary = $6,
              ai_suggested_category = $7,
              ai_suggested_priority = $8,
              ai_first_reply = $9,
              resolution_note = $10,
              updated_at = $11
        WHERE id = $12
        RETURNING *`,
      [
        ticket.category,
        ticket.priority,
        ticket.status,
        ticket.body,
        assignedAdminId,
        ticket.ai_summary,
        ticket.ai_suggested_category,
        ticket.ai_suggested_priority,
        ticket.ai_first_reply,
        ticket.resolution_note,
        ticket.updated_at,
        existing.rows[0].id,
      ]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO support_tickets (
        user_id, category, priority, status, subject, body, assigned_admin_id,
        ai_summary, ai_suggested_category, ai_suggested_priority, ai_first_reply,
        resolution_note, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
    [
      userId,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.subject,
      ticket.body,
      assignedAdminId,
      ticket.ai_summary,
      ticket.ai_suggested_category,
      ticket.ai_suggested_priority,
      ticket.ai_first_reply,
      ticket.resolution_note,
      ticket.created_at,
      ticket.updated_at,
    ]
  );
  return rows[0];
}

async function ensureProduct(client, product) {
  const existing = await client.query('SELECT id FROM products WHERE title = $1 LIMIT 1', [product.title]);

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE products
          SET category = $1,
              description = $2,
              price = $3,
              image_url = $4,
              stock = $5,
              is_active = $6
        WHERE id = $7
        RETURNING *`,
      [
        product.category,
        product.description,
        product.price,
        product.image_url,
        product.stock,
        product.is_active,
        existing.rows[0].id,
      ]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO products (title, category, description, price, image_url, stock, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      product.title,
      product.category,
      product.description,
      product.price,
      product.image_url,
      product.stock,
      product.is_active,
    ]
  );
  return rows[0];
}

async function ensureOrder(client, order, user, total, addressValue) {
  const existing = await client.query(
    'SELECT id FROM orders WHERE payment_reference = $1 LIMIT 1',
    [order.payment_reference]
  );

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE orders
          SET user_id = $1,
              total = $2,
              status = $3,
              address = $4,
              customer_email = $5,
              customer_name = $6,
              customer_phone = $7,
              payment_method = $8,
              payment_status = $9,
              payment_last4 = $10,
              paid_at = $11
        WHERE id = $12
        RETURNING *`,
      [
        user.id,
        total,
        order.status,
        addressValue,
        user.email,
        order.customer_name,
        order.customer_phone,
        order.payment_method,
        order.payment_status,
        order.payment_last4,
        order.paid_at,
        existing.rows[0].id,
      ]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO orders (
        user_id, total, status, address, customer_email, customer_name, customer_phone,
        payment_method, payment_status, payment_reference, payment_last4, paid_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
    [
      user.id,
      total,
      order.status,
      addressValue,
      user.email,
      order.customer_name,
      order.customer_phone,
      order.payment_method,
      order.payment_status,
      order.payment_reference,
      order.payment_last4,
      order.paid_at,
      order.created_at,
    ]
  );
  return rows[0];
}

async function replaceOrderItems(client, orderId, items) {
  await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ($1,$2,$3,$4)`,
      [orderId, item.product_id, item.quantity, item.unit_price]
    );
  }
}

async function ensureNotification(client, userId, notification) {
  const existing = await client.query(
    `SELECT id
       FROM notifications
      WHERE user_id = $1
        AND type = $2
        AND title = $3
        AND created_at = $4::timestamptz
      LIMIT 1`,
    [userId, notification.type, notification.title, notification.created_at]
  );

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE notifications
          SET body = $1,
              meta = $2::jsonb,
              is_read = $3
        WHERE id = $4
        RETURNING *`,
      [notification.body, JSON.stringify(notification.meta || {}), notification.is_read, existing.rows[0].id]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO notifications (user_id, type, title, body, meta, is_read, created_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
     RETURNING *`,
    [
      userId,
      notification.type,
      notification.title,
      notification.body,
      JSON.stringify(notification.meta || {}),
      notification.is_read,
      notification.created_at,
    ]
  );
  return rows[0];
}

async function syncSitterAggregates(client) {
  await client.query(
    `UPDATE sitters s
        SET rating = COALESCE(agg.avg_rating, 0),
            rating_count = COALESCE(agg.review_count, 0)
       FROM (
         SELECT sitter_id,
                ROUND(AVG(rating)::numeric, 2) AS avg_rating,
                COUNT(*)::int AS review_count
           FROM reviews
          WHERE is_hidden = FALSE
          GROUP BY sitter_id
       ) agg
      WHERE s.id = agg.sitter_id`
  );

  await client.query(
    `UPDATE sitters
        SET rating = 0,
            rating_count = 0
      WHERE id NOT IN (
        SELECT DISTINCT sitter_id
          FROM reviews
         WHERE is_hidden = FALSE
      )`
  );
}

async function main() {
  const client = await db.pool.connect();
  const usersByEmail = new Map();
  const petsByKey = new Map();
  const sittersByEmail = new Map();
  const bookingsByKey = new Map();
  const ticketsByKey = new Map();
  const productsByTitle = new Map();
  const ordersByKey = new Map();

  try {
    await client.query('BEGIN');

    for (const user of USERS) {
      const row = await upsertUser(client, user);
      usersByEmail.set(user.email, row);
    }

    for (const pet of PETS) {
      const owner = usersByEmail.get(pet.owner);
      const row = await ensurePet(client, pet, owner.id);
      petsByKey.set(`${pet.owner}:${pet.name}`, row);
    }

    for (const sitter of SITTERS) {
      const user = usersByEmail.get(sitter.email);
      const reviewer = sitter.reviewed_by ? usersByEmail.get(sitter.reviewed_by) : null;
      const row = await upsertSitter(client, sitter, user.id, reviewer?.id || null);
      sittersByEmail.set(sitter.email, row);
    }

    for (const [email, services] of Object.entries(SITTER_SERVICES)) {
      const sitter = sittersByEmail.get(email);
      if (!sitter) continue;
      await replaceSitterServices(client, sitter.id, services);
    }

    for (const favorite of FAVORITES) {
      const owner = usersByEmail.get(favorite.owner);
      const sitter = sittersByEmail.get(favorite.sitter);
      if (!owner || !sitter) continue;
      await ensureFavorite(client, owner.id, sitter.id, favorite.created_at);
    }

    for (const booking of BOOKINGS) {
      const owner = usersByEmail.get(booking.owner);
      const sitter = sittersByEmail.get(booking.sitter);
      const pet = petsByKey.get(`${booking.owner}:${booking.pet}`);
      if (!owner || !sitter || !pet) continue;
      const row = await ensureBooking(client, booking, owner.id, sitter.id, pet.id, sitter.price_per_day);
      bookingsByKey.set(booking.key, row);
    }

    for (const update of BOOKING_UPDATES) {
      const booking = bookingsByKey.get(update.booking);
      const sender = usersByEmail.get(update.sender);
      if (!booking || !sender) continue;
      await ensureBookingUpdate(client, booking.id, sender.id, update);
    }

    for (const review of REVIEWS) {
      const booking = bookingsByKey.get(review.booking);
      const author = usersByEmail.get(review.author);
      const sitter = sittersByEmail.get(review.sitter);
      if (!booking || !author || !sitter) continue;
      await ensureReview(client, booking.id, author.id, sitter.id, review);
    }

    for (const event of REVIEW_EVENTS) {
      const sitter = sittersByEmail.get(event.sitter);
      const actor = usersByEmail.get(event.actor);
      if (!sitter) continue;
      await ensureReviewEvent(client, sitter.id, actor?.id || null, event);
    }

    for (const thread of MESSAGE_THREADS) {
      for (const message of thread) {
        const sender = usersByEmail.get(message.sender);
        const receiver = usersByEmail.get(message.receiver);
        if (!sender || !receiver) continue;
        await ensureMessage(client, sender.id, receiver.id, message);
      }
    }

    for (const ticket of SUPPORT_TICKETS) {
      const user = usersByEmail.get(ticket.user);
      const admin = usersByEmail.get(ticket.assigned_admin);
      if (!user) continue;
      const row = await ensureSupportTicket(client, ticket, user.id, admin?.id || null);
      ticketsByKey.set(ticket.key, row);
    }

    for (const product of PRODUCTS) {
      const row = await ensureProduct(client, product);
      productsByTitle.set(product.title, row);
    }

    for (const order of ORDERS) {
      const user = usersByEmail.get(order.user);
      if (!user) continue;

      const items = order.items.map((item) => {
        const product = productsByTitle.get(item.title);
        if (!product) {
          throw new Error(`Missing product for order item: ${item.title}`);
        }
        return {
          product_id: product.id,
          quantity: item.quantity,
          unit_price: Number(product.price),
        };
      });

      const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const addressValue = buildCheckoutAddress({
        recipient: order.customer_name,
        email: user.email,
        phone: order.customer_phone,
        delivery: order.delivery,
        address: order.address,
        notes: order.notes,
      });

      const row = await ensureOrder(client, order, user, total, addressValue);
      await replaceOrderItems(client, row.id, items);
      ordersByKey.set(order.key, row);
    }

    for (const notification of NOTIFICATIONS) {
      const user = usersByEmail.get(notification.user);
      if (!user) continue;

      const meta = { ...notification.meta };
      if (meta.booking_key) {
        meta.booking_id = bookingsByKey.get(meta.booking_key)?.id || null;
        delete meta.booking_key;
      }
      if (meta.order_key) {
        meta.order_id = ordersByKey.get(meta.order_key)?.id || null;
        delete meta.order_key;
      }
      if (meta.support_key) {
        meta.support_ticket_id = ticketsByKey.get(meta.support_key)?.id || null;
        delete meta.support_key;
      }
      if (meta.sender_email) {
        meta.sender_id = usersByEmail.get(meta.sender_email)?.id || null;
        delete meta.sender_email;
      }

      await ensureNotification(client, user.id, { ...notification, meta });
    }

    await syncSitterAggregates(client);
    for (const sitter of sittersByEmail.values()) {
      await recalculateSitterFraudScore(sitter.id, client);
    }

    await client.query('COMMIT');

    const summary = {
      owners: USERS.filter((user) => user.role === 'owner').map((user) => user.email),
      sitters: USERS.filter((user) => user.role === 'sitter').map((user) => user.email),
      bookings_added: BOOKINGS.length,
      reviews_added: REVIEWS.length,
      messages_added: MESSAGE_THREADS.reduce((sum, thread) => sum + thread.length, 0),
      orders_added: ORDERS.length,
      support_tickets_added: SUPPORT_TICKETS.length,
      password_for_all_demo_accounts: 'password123',
    };

    console.log('Demo activity seeding completed.');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed demo activity:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
}

main();
