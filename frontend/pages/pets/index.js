import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { absoluteAssetUrl, api, currentUser, uploadFile } from '../../lib/api';
import Icon from '../../components/Icon';
import ConfirmModal from '../../components/ConfirmModal';
import { useLanguage } from '../../lib/i18n';
import { formatDateTime } from '../../lib/date';

const EMPTY = {
  name: '', pet_type: 'dog', gender: 'boy', age: '',
  size: 'medium', care_type: 'easy', behavior: '', health: '',
  description: '', photo_url: '', custom_pet_type: '',
};

const PET_TYPE_OPTIONS = [
  { value: 'dog', label: 'Dog', hint: 'Most common walks and boarding' },
  { value: 'cat', label: 'Cat', hint: 'Home visits and calm routines' },
  { value: 'other', label: 'Other', hint: 'Rabbit, hamster, turtle and more' },
];

const GENDER_OPTIONS = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const CARE_OPTIONS = [
  { value: 'easy', label: 'Easy care' },
  { value: 'medium', label: 'Medium care' },
  { value: 'difficult', label: 'Difficult care' },
];

function extractCustomPetType(description = '') {
  const match = description.match(/^\[pet-type:([^\]]+)\]\s*/i);
  return match ? match[1].trim() : '';
}

function stripCustomPetType(description = '') {
  return description.replace(/^\[pet-type:[^\]]+\]\s*/i, '').trim();
}

function buildDescriptionPayload(form) {
  const cleanDescription = (form.description || '').trim();
  if (form.pet_type === 'other' && form.custom_pet_type.trim()) {
    return `[pet-type:${form.custom_pet_type.trim()}] ${cleanDescription}`.trim();
  }
  return cleanDescription;
}

export default function Pets() {
  const { language } = useLanguage();
  const router = useRouter();
  const [pets, setPets]       = useState([]);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [petToDelete, setPetToDelete] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const t = {
    en: { petProfiles:'Pet profiles', petProfilesText:'Keep each pet card updated with care and health details.', healthNotes:'Health notes', healthNotesText:'Visible reminders for medicines, allergies and vaccinations.', quickAction:'Quick action', quickTitle:'Pet care stays clearer', quickText:'Photos from the media library, health reminders and behavior notes help sitters prepare faster.', noNotes:'No notes yet.', behavior:'Behavior:', health:'Health:', notSpecified:'Not specified', noHealth:'No health notes', edit:'Edit', delete:'Delete', addAnother:'Add another pet', createFirst:'Create first pet profile', addCardText:'Create a profile with photo, health notes and care preferences.', editor:'Pet profile editor', newProfile:'New pet profile', editTitle:'Edit pet profile', addPet:'Add my pet', addPetText:'Add the details a sitter needs before the first walk, stay or update.', close:'Close', profileCompletion:'Profile completion', completionText:'Photos, health details and behavior notes help sitters prepare faster.', general:'General information', generalText:'Start with the basics so bookings and recommendations stay accurate.', required:'Required', petType:'Pet type', gender:'Gender', age:'Age (years)', size:'Size', careLevel:'Care level', photoSection:'Photo from media library', photoText:'A real photo helps sitters recognize your pet right away.', replacePhoto:'Replace pet photo', choosePhoto:'Choose photo from media library', photoHint:'JPG, PNG or WEBP up to 5 MB. Clean, well-lit photos work best.', uploadPhoto:'Upload photo', selectedPhoto:'Photo selected from media library', previewPlaceholder:'Preview placeholder until you upload a photo', remove:'Remove', sitterNotes:'Care notes for sitters', sitterNotesText:'Describe temperament, health and any routines that matter during a booking.', aiWriting:'AI is writing...', improveAi:'Improve with AI', extraNotes:'Extra notes', livePreview:'Live preview', yourPetName:'Your pet name', defaultPreview:'Add a short sitter-facing note so care feels easier from the first booking.', addTemperament:'Add temperament notes', addHealth:'Add health notes', strongProfile:'What makes a strong pet profile', guide1:'Clear photo from your media library', guide2:'Real behavior notes, not just “good dog”', guide3:'Medication, allergies and feeding reminders', guide4:'Short sitter-facing description with routines', cancel:'Cancel', saveChanges:'Save changes', createProfile:'Create pet profile', deleteTitle:'Delete this pet profile?', deleteConfirm:'Delete pet', keepProfile:'Keep profile', customTypePlaceholder:'What kind of animal is it? Example: rabbit, hamster, turtle' },
    ru: { petProfiles:'Профили питомцев', petProfilesText:'Поддерживайте каждую карточку питомца актуальной по уходу и здоровью.', healthNotes:'Заметки о здоровье', healthNotesText:'Видимые напоминания о лекарствах, аллергиях и вакцинации.', quickAction:'Быстрое действие', quickTitle:'Уход за питомцем становится понятнее', quickText:'Фото из медиатеки, напоминания о здоровье и заметки о поведении помогают ситтерам подготовиться быстрее.', noNotes:'Пока нет заметок.', behavior:'Поведение:', health:'Здоровье:', notSpecified:'Не указано', noHealth:'Нет заметок о здоровье', edit:'Изменить', delete:'Удалить', addAnother:'Добавить ещё питомца', createFirst:'Создать первый профиль питомца', addCardText:'Создайте профиль с фото, заметками о здоровье и предпочтениями по уходу.', editor:'Редактор профиля питомца', newProfile:'Новый профиль питомца', editTitle:'Редактировать профиль питомца', addPet:'Добавить питомца', addPetText:'Добавьте детали, которые нужны ситтеру до первой прогулки, передержки или обновления.', close:'Закрыть', profileCompletion:'Заполнение профиля', completionText:'Фото, данные о здоровье и заметки о поведении помогают ситтерам подготовиться быстрее.', general:'Основная информация', generalText:'Начните с базы, чтобы бронирования и рекомендации были точнее.', required:'Обязательно', petType:'Тип питомца', gender:'Пол', age:'Возраст (лет)', size:'Размер', careLevel:'Уровень ухода', photoSection:'Фото из медиатеки', photoText:'Настоящее фото помогает ситтерам сразу узнать вашего питомца.', replacePhoto:'Заменить фото питомца', choosePhoto:'Выбрать фото из медиатеки', photoHint:'JPG, PNG или WEBP до 5 МБ. Лучше всего подходят чистые и хорошо освещённые фото.', uploadPhoto:'Загрузить фото', selectedPhoto:'Фото выбрано из медиатеки', previewPlaceholder:'Временный превью-блок до загрузки фото', remove:'Убрать', sitterNotes:'Заметки для ситтеров', sitterNotesText:'Опишите характер, здоровье и важные рутины, которые влияют на бронирование.', aiWriting:'ИИ пишет...', improveAi:'Улучшить с ИИ', extraNotes:'Дополнительные заметки', livePreview:'Живой превью', yourPetName:'Имя питомца', defaultPreview:'Добавьте короткую заметку для ситтера, чтобы уход был понятнее с первого бронирования.', addTemperament:'Добавьте заметки о характере', addHealth:'Добавьте заметки о здоровье', strongProfile:'Что делает профиль питомца сильным', guide1:'Чёткое фото из вашей медиатеки', guide2:'Реальные заметки о поведении, а не просто “хорошая собака”', guide3:'Напоминания о лекарствах, аллергиях и кормлении', guide4:'Короткое описание для ситтера с рутинами', cancel:'Отмена', saveChanges:'Сохранить изменения', createProfile:'Создать профиль питомца', deleteTitle:'Удалить этот профиль питомца?', deleteConfirm:'Удалить питомца', keepProfile:'Оставить профиль', customTypePlaceholder:'Что это за животное? Например: кролик, хомяк, черепаха' },
    kz: { petProfiles:'Үй жануары профильдері', petProfilesText:'Әр жануар картасын күтім және денсаулық мәліметтерімен жаңартып отырыңыз.', healthNotes:'Денсаулық жазбалары', healthNotesText:'Дәрілер, аллергия және вакцинация туралы көрінетін еске салғыштар.', quickAction:'Жылдам әрекет', quickTitle:'Жануар күтімі анығырақ болады', quickText:'Медиатекадағы фото, денсаулық еске салғыштары және мінез-құлық жазбалары ситтерлерге тезірек дайындалуға көмектеседі.', noNotes:'Әзірге жазба жоқ.', behavior:'Мінезі:', health:'Денсаулық:', notSpecified:'Көрсетілмеген', noHealth:'Денсаулық жазбасы жоқ', edit:'Өңдеу', delete:'Жою', addAnother:'Тағы бір жануар қосу', createFirst:'Алғашқы жануар профилін жасау', addCardText:'Фото, денсаулық жазбалары және күтім таңдаулары бар профиль жасаңыз.', editor:'Жануар профилін өңдеу', newProfile:'Жаңа жануар профилі', editTitle:'Жануар профилін өңдеу', addPet:'Жануарымды қосу', addPetText:'Алғашқы серуен, уақытша күту немесе жаңарту алдында ситтерге қажет деректерді қосыңыз.', close:'Жабу', profileCompletion:'Профильдің толуы', completionText:'Фото, денсаулық деректері және мінез-құлық жазбалары ситтерлерге тезірек дайындалуға көмектеседі.', general:'Жалпы ақпарат', generalText:'Бронь мен ұсынымдар дәлірек болу үшін негізден бастаңыз.', required:'Міндетті', petType:'Жануар түрі', gender:'Жынысы', age:'Жасы (жыл)', size:'Өлшемі', careLevel:'Күтім деңгейі', photoSection:'Медиатекадан фото', photoText:'Нақты фото ситтерге жануарыңызды бірден тануға көмектеседі.', replacePhoto:'Жануар фотосын ауыстыру', choosePhoto:'Медиатекадан фото таңдау', photoHint:'JPG, PNG немесе WEBP, 5 МБ-қа дейін. Жарық әрі таза фото жақсырақ.', uploadPhoto:'Фото жүктеу', selectedPhoto:'Фото медиатекадан таңдалды', previewPlaceholder:'Фото жүктегенге дейінгі алдын ала көрініс', remove:'Алу', sitterNotes:'Ситтерге арналған жазбалар', sitterNotesText:'Мінезді, денсаулықты және бронь кезінде маңызды болатын әдеттерді сипаттаңыз.', aiWriting:'ИИ жазып жатыр...', improveAi:'ИИ арқылы жақсарту', extraNotes:'Қосымша жазбалар', livePreview:'Тірі алдын ала қарау', yourPetName:'Жануар аты', defaultPreview:'Алғашқы броньдан бастап күтім оңай болу үшін ситтерге қысқа жазба қосыңыз.', addTemperament:'Мінез-құлық жазбаларын қосыңыз', addHealth:'Денсаулық жазбаларын қосыңыз', strongProfile:'Күшті жануар профилін не құрайды', guide1:'Медиатекадан анық фото', guide2:'“Жақсы ит” емес, нақты мінез жазбалары', guide3:'Дәрі, аллергия және тамақтандыру еске салғыштары', guide4:'Ситтерге арналған қысқа сипаттама мен рутиналар', cancel:'Болдырмау', saveChanges:'Өзгерістерді сақтау', createProfile:'Жануар профилін жасау', deleteTitle:'Осы жануар профилін жою керек пе?', deleteConfirm:'Жануарды жою', keepProfile:'Профильді сақтау', customTypePlaceholder:'Бұл қандай жануар? Мысалы: қоян, хомяк, тасбақа' },
  }[language] || {};
  const dbCopy = {
    en: {
      title: 'Database-backed CRUD',
      text: 'Every pet profile here is read from and written to the Docker PostgreSQL database. Create, edit and delete actions update these rows.',
      rows: 'rows in pets table',
      record: 'PostgreSQL record',
      ownerId: 'Owner ID',
      createdAt: 'Created at',
      updatedAt: 'Updated at',
      notUpdated: 'Not updated yet',
      snapshot: 'Live database snapshot',
      snapshotText: 'These are the exact pet rows currently returned by the API for your account.',
      noRows: 'No pet rows yet. Create one and it will appear here immediately.',
      name: 'Name',
      petType: 'Pet type',
    },
    ru: {
      title: 'CRUD с реальной базой данных',
      text: 'Каждый профиль питомца здесь читается из Docker PostgreSQL и записывается туда же. Создание, редактирование и удаление сразу меняют эти строки.',
      rows: 'строк в таблице pets',
      record: 'Запись PostgreSQL',
      ownerId: 'ID владельца',
      createdAt: 'Создано',
      updatedAt: 'Обновлено',
      notUpdated: 'Пока не обновлялось',
      snapshot: 'Живой снимок базы',
      snapshotText: 'Это те же строки питомцев, которые сейчас вернул API для вашего аккаунта.',
      noRows: 'Записей о питомцах пока нет. Создай питомца, и строка сразу появится здесь.',
      name: 'Имя',
      petType: 'Тип питомца',
    },
    kz: {
      title: 'Нақты дерекқормен CRUD',
      text: 'Әр жануар профилі Docker PostgreSQL дерекқорынан оқылады және сол жерге жазылады. Қосу, өзгерту және жою осы жолдарды бірден жаңартады.',
      rows: 'pets кестесіндегі жолдар',
      record: 'PostgreSQL жазбасы',
      ownerId: 'Иесінің ID-і',
      createdAt: 'Құрылған уақыты',
      updatedAt: 'Жаңартылған уақыты',
      notUpdated: 'Әлі жаңартылған жоқ',
      snapshot: 'Дерекқордың тірі көрінісі',
      snapshotText: 'Бұл дәл қазір API сенің аккаунтың үшін қайтарған жануар жолдары.',
      noRows: 'Әзірге жануар жазбалары жоқ. Жаңасын қоссан, ол бірден осында шығады.',
      name: 'Аты',
      petType: 'Жануар түрі',
    },
  }[language] || {};

  useEffect(() => {
    if (!currentUser()) { router.replace('/login'); return; }
    reload();
  }, [router]);

  useEffect(() => {
    if (!adding) return undefined;

    function handleEscape(event) {
      if (event.key === 'Escape') resetModalState();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [adding]);

  async function reload() {
    const data = await api.get('/api/pets');
    setPets(data.map((pet) => ({
      ...pet,
      custom_pet_type: extractCustomPetType(pet.description || ''),
      description: stripCustomPetType(pet.description || ''),
    })));
  }

  function resetModalState() {
    setAdding(false);
    setEditing(null);
    setForm(EMPTY);
    setPhotoError('');
    setAiMessage('');
    setFormError('');
    setFieldErrors({});
  }

  function clearFieldError(name) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function save() {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Add your pet name.';
    if (form.pet_type === 'other' && !form.custom_pet_type.trim()) nextErrors.pet_type = 'Tell us what type of pet you have.';
    if (form.age === '') nextErrors.age = 'Add your pet age.';
    if (form.age !== '' && (Number(form.age) < 0 || Number(form.age) > 100)) nextErrors.age = 'Age should be between 0 and 100.';
    if (!form.photo_url) nextErrors.photo_url = 'Upload a pet photo from your media library.';

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setFormError('Please complete the highlighted fields.');
      return;
    }

    const payload = {
      ...form,
      description: buildDescriptionPayload(form),
      age: Number(form.age) || null,
      photo_url: form.photo_url || null,
    };

    try {
      if (editing) {
        await api.put(`/api/pets/${editing}`, payload);
      } else {
        await api.post('/api/pets', payload);
      }
      resetModalState();
      reload();
    } catch (err) {
      setFormError(err.message || 'Could not save this pet profile.');
    }
  }

  async function removeConfirmed() {
    if (!petToDelete) return;
    await api.delete(`/api/pets/${petToDelete.id}`);
    setPetToDelete(null);
    reload();
  }

  function editPet(p) {
    setForm({
      ...EMPTY,
      ...p,
      description: stripCustomPetType(p.description || ''),
      custom_pet_type: p.custom_pet_type || extractCustomPetType(p.description || ''),
    });
    setEditing(p.id);
    setAdding(true);
    setPhotoError('');
    setAiMessage('');
    setFormError('');
    setFieldErrors({});
  }

  function openCreateModal() {
    setAdding(true);
    setEditing(null);
    setForm(EMPTY);
    setPhotoError('');
    setAiMessage('');
    setFormError('');
    setFieldErrors({});
  }

  async function improveWithAi() {
    try {
      setAiLoading(true);
      setAiMessage('');
      const draft = await api.post('/api/ai/pet-profile', form);
      setForm((prev) => ({
        ...prev,
        behavior: draft.behavior || prev.behavior,
        health: draft.health || prev.health,
        description: draft.description || prev.description,
      }));
      setFormError('');
      setAiMessage(
        draft.source === 'openai'
          ? 'AI polished the pet profile for sitters.'
          : 'Smart helper draft added. You can still edit everything.'
      );
    } catch (err) {
      setAiMessage(err.message || 'AI helper failed.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    try {
      const uploaded = await uploadFile('/api/uploads/document?kind=pet-photo', file);
      setForm((prev) => ({ ...prev, photo_url: uploaded.url }));
      setPhotoError('');
      setFormError('');
      clearFieldError('photo_url');
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo.');
    } finally {
      event.target.value = '';
    }
  }

  const completedFields = [
    Boolean(form.name.trim()),
    Boolean(form.photo_url),
    Boolean(form.behavior.trim()),
    Boolean(form.health.trim()),
    Boolean(form.description.trim()),
  ].filter(Boolean).length;
  const completionPercent = Math.round((completedFields / 5) * 100);

  const petTypeLabel = form.pet_type === 'other'
    ? (form.custom_pet_type.trim() || 'custom pet')
    : form.pet_type;
  const previewNotes = form.description || form.behavior || 'Add a short sitter-facing note so care feels easier from the first booking.';

  return (
    <DashboardLayout title="My pets">
      <section className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="card">
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.petProfiles || 'Pet profiles'}</p>
          <p className="mt-2 text-3xl font-bold text-nanny-blue">{pets.length}</p>
          <p className="mt-2 text-sm opacity-70">{t.petProfilesText || 'Keep each pet card updated with care and health details.'}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">{t.healthNotes || 'Health notes'}</p>
          <p className="mt-2 text-3xl font-bold text-nanny-blue">{pets.filter((pet) => pet.health).length}</p>
          <p className="mt-2 text-sm opacity-70">{t.healthNotesText || 'Visible reminders for medicines, allergies and vaccinations.'}</p>
        </div>
        <div className="card bg-gradient-to-br from-nanny-orange to-[#e88430] text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">{t.quickAction || 'Quick action'}</p>
          <p className="mt-2 text-2xl font-bold">{t.quickTitle || 'Pet care stays clearer'}</p>
          <p className="mt-3 max-w-[260px] text-sm text-white/80">
            {t.quickText || 'Photos from the media library, health reminders and behavior notes help sitters prepare faster.'}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-[32px] border border-nanny-blue/15 bg-gradient-to-r from-[#f6f8ff] to-white px-6 py-5 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-nanny-blue/70">{dbCopy.title || 'Database-backed CRUD'}</p>
            <p className="mt-2 text-sm leading-6 text-nanny-brownish/75">
              {dbCopy.text || 'Every pet profile here is read from and written to the Docker PostgreSQL database. Create, edit and delete actions update these rows.'}
            </p>
          </div>
          <span className="rounded-full border border-nanny-blue/15 bg-white px-4 py-2 text-sm font-semibold text-nanny-blue">
            {pets.length} {dbCopy.rows || 'rows in pets table'}
          </span>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {pets.map((p) => (
          <div key={p.id} className="card p-0 overflow-hidden">
            <img src={(p.photo_url && absoluteAssetUrl(p.photo_url)) || 'https://placedog.net/400/300'} alt={p.name}
                 className="w-full h-40 object-cover" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-xs opacity-70">
                    {p.pet_type} • {p.gender} • {p.age || '?'}y • {p.size}
                  </p>
                </div>
                <span className="badge bg-nanny-yellow/80 text-nanny-brownish capitalize">{p.care_type}</span>
              </div>
              <p className="text-sm mt-3 line-clamp-2">{p.description || p.behavior || (t.noNotes || 'No notes yet.')}</p>
              <div className="mt-4 space-y-2 text-xs text-nanny-brownish/70">
                <p><span className="font-semibold text-nanny-brownish">{t.behavior || 'Behavior:'}</span> {p.behavior || (t.notSpecified || 'Not specified')}</p>
                <p><span className="font-semibold text-nanny-brownish">{t.health || 'Health:'}</span> {p.health || (t.noHealth || 'No health notes')}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-nanny-blue/12 bg-[#f7f9ff] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-nanny-blue/70">
                  {dbCopy.record || 'PostgreSQL record'}
                </p>
                <div className="mt-2 space-y-1.5 text-xs text-nanny-brownish/75">
                  <p><span className="font-semibold text-nanny-brownish">ID:</span> #{p.id}</p>
                  <p><span className="font-semibold text-nanny-brownish">{dbCopy.ownerId || 'Owner ID'}:</span> {p.owner_id}</p>
                  <p><span className="font-semibold text-nanny-brownish">{dbCopy.createdAt || 'Created at'}:</span> {formatDateTime(p.created_at, language)}</p>
                  <p><span className="font-semibold text-nanny-brownish">{dbCopy.updatedAt || 'Updated at'}:</span> {p.updated_at ? formatDateTime(p.updated_at, language) : (dbCopy.notUpdated || 'Not updated yet')}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => editPet(p)} className="btn-ghost text-sm">{t.edit || 'Edit'}</button>
                <button onClick={() => setPetToDelete(p)} className="btn-ghost text-sm text-red-600">{t.delete || 'Delete'}</button>
              </div>
            </div>
          </div>
        ))}

        <button onClick={openCreateModal}
                className="card border-2 border-dashed border-nanny-orange/60 bg-white/40
                           flex min-h-[280px] flex-col items-center justify-center text-center hover:bg-white/70">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-nanny-orange/10 text-nanny-orange">
            <Icon name="pet" className="h-8 w-8" />
          </span>
          <p className="mt-4 text-lg font-bold text-nanny-deepOrange">{pets.length ? (t.addAnother || 'Add another pet') : (t.createFirst || 'Create first pet profile')}</p>
          <p className="mt-1 max-w-[220px] text-sm opacity-70">{t.addCardText || 'Create a profile with photo, health notes and care preferences.'}</p>
        </button>
      </div>

      <section className="mt-8 overflow-hidden rounded-[32px] border border-nanny-blue/12 bg-white shadow-card">
        <div className="border-b border-nanny-blue/10 bg-gradient-to-r from-white to-[#f7f9ff] px-6 py-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-nanny-blue/70">{dbCopy.snapshot || 'Live database snapshot'}</p>
              <p className="mt-2 text-sm text-nanny-brownish/70">
                {dbCopy.snapshotText || 'These are the exact pet rows currently returned by the API for your account.'}
              </p>
            </div>
            <span className="badge bg-nanny-yellow/70 text-nanny-brownish">{pets.length} {dbCopy.rows || 'rows in pets table'}</span>
          </div>
        </div>

        <div className="overflow-x-auto px-6 py-5">
          {pets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-nanny-orange/18 bg-[#fffaf4] p-5 text-sm leading-6 text-nanny-brownish/70">
              {dbCopy.noRows || 'No pet rows yet. Create one and it will appear here immediately.'}
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-nanny-brownish/50">
                <tr>
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">{dbCopy.name || 'Name'}</th>
                  <th className="pb-3 pr-4">{dbCopy.petType || 'Pet type'}</th>
                  <th className="pb-3 pr-4">{dbCopy.ownerId || 'Owner ID'}</th>
                  <th className="pb-3 pr-4">{dbCopy.createdAt || 'Created at'}</th>
                  <th className="pb-3">{dbCopy.updatedAt || 'Updated at'}</th>
                </tr>
              </thead>
              <tbody>
                {pets.map((pet) => (
                  <tr key={`db-row-${pet.id}`} className="border-t border-nanny-orange/10 text-nanny-brownish">
                    <td className="py-3 pr-4 font-semibold">#{pet.id}</td>
                    <td className="py-3 pr-4">{pet.name}</td>
                    <td className="py-3 pr-4 capitalize">{pet.pet_type}</td>
                    <td className="py-3 pr-4">{pet.owner_id}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDateTime(pet.created_at, language)}</td>
                    <td className="py-3 whitespace-nowrap">
                      {pet.updated_at ? formatDateTime(pet.updated_at, language) : (dbCopy.notUpdated || 'Not updated yet')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {adding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
             onClick={resetModalState}>
          <div onClick={(e) => e.stopPropagation()}
               className="bg-white text-nanny-brownish rounded-[32px] w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="max-h-[92vh] overflow-y-auto p-6 lg:p-7">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] opacity-55">
                      {editing ? (t.editor || 'Pet profile editor') : (t.newProfile || 'New pet profile')}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-nanny-deepOrange">
                      {editing ? (t.editTitle || 'Edit pet profile') : (t.addPet || 'Add my pet')}
                    </h2>
                    <p className="text-sm opacity-70 mt-2">
                      {t.addPetText || 'Add the details a sitter needs before the first walk, stay or update.'}
                    </p>
                  </div>
                  <button onClick={resetModalState} className="btn-ghost shrink-0">{t.close || 'Close'}</button>
                </div>

                <div className="mb-6 rounded-3xl border border-nanny-orange/15 bg-gradient-to-r from-[#fff5e8] to-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] opacity-55">{t.profileCompletion || 'Profile completion'}</p>
                      <p className="mt-1 text-sm opacity-75">{t.completionText || 'Photos, health details and behavior notes help sitters prepare faster.'}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-nanny-deepOrange">
                      {completionPercent}%
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/80">
                    <div
                      className="h-2 rounded-full bg-nanny-orange transition-all"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <section className={`rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,247,234,0.9)_0%,rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_18px_40px_rgba(233,122,31,0.06)] ${fieldErrors.name || fieldErrors.pet_type || fieldErrors.age ? 'border-red-300 ring-2 ring-red-100' : 'border-nanny-orange/15'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-nanny-deepOrange">{t.general || 'General information'}</h3>
                        <p className="mt-1 text-sm opacity-70">{t.generalText || 'Start with the basics so bookings and recommendations stay accurate.'}</p>
                      </div>
                      <span className="badge bg-white text-nanny-brownish">{t.required || 'Required'}</span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <input
                        className={`input md:col-span-2 ${fieldErrors.name ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                        placeholder="Name of your pet"
                        value={form.name}
                        onChange={(e) => {
                          setForm({ ...form, name: e.target.value });
                          if (formError) setFormError('');
                          clearFieldError('name');
                        }}
                      />
                      <div className="md:col-span-2">
                        <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.petType || 'Pet type'}</p>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {PET_TYPE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setForm({
                                ...form,
                                pet_type: option.value,
                                custom_pet_type: option.value === 'other' ? form.custom_pet_type : '',
                              })}
                              className={`min-h-[108px] rounded-[22px] border px-4 py-4 text-left transition ${
                                form.pet_type === option.value
                                  ? 'border-nanny-orange bg-[linear-gradient(180deg,#fff1df_0%,#fff8ef_100%)] text-nanny-deepOrange shadow-[0_12px_24px_rgba(233,122,31,0.12)]'
                                  : `${fieldErrors.pet_type ? 'border-red-300 bg-red-50/40' : 'border-nanny-orange/20 bg-white'} text-nanny-brownish hover:border-nanny-orange/35 hover:bg-[#fff8ef]`
                              }`}
                            >
                              <div className="flex h-full items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold">{option.label}</p>
                                  <p className="mt-2 text-sm leading-5 font-medium text-nanny-brownish/55">{option.hint}</p>
                                </div>
                                {form.pet_type === option.value && (
                                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nanny-orange text-white">
                                    <Icon name="check" className="h-4 w-4" />
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {form.pet_type === 'other' && (
                          <input
                            className="input mt-3"
                            placeholder={t.customTypePlaceholder || 'What kind of animal is it? Example: rabbit, hamster, turtle'}
                            value={form.custom_pet_type}
                            onChange={(e) => {
                              setForm({ ...form, custom_pet_type: e.target.value });
                              if (formError) setFormError('');
                              clearFieldError('pet_type');
                            }}
                          />
                        )}
                        {fieldErrors.pet_type && <p className="mt-2 text-sm text-red-600">{fieldErrors.pet_type}</p>}
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.gender || 'Gender'}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {GENDER_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setForm({ ...form, gender: option.value })}
                              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                form.gender === option.value
                                  ? 'border-nanny-orange bg-[#fff1e2] text-nanny-deepOrange shadow-sm'
                                  : 'border-nanny-orange/20 bg-white text-nanny-brownish hover:bg-[#fff8ef]'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <input className={`input ${fieldErrors.age ? 'border-red-300 ring-2 ring-red-100' : ''}`} type="number" min="0" max="100" placeholder={t.age || 'Age (years)'}
                               value={form.age} onChange={(e) => {
                                 setForm({ ...form, age: e.target.value });
                                 clearFieldError('age');
                               }} />
                        {fieldErrors.age && <p className="mt-2 text-sm text-red-600">{fieldErrors.age}</p>}
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.size || 'Size'}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {SIZE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setForm({ ...form, size: option.value })}
                              className={`min-w-0 rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition ${
                                form.size === option.value
                                  ? 'border-nanny-orange bg-[#fff1e2] text-nanny-deepOrange shadow-sm'
                                  : 'border-nanny-orange/20 bg-white text-nanny-brownish hover:bg-[#fff8ef]'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.careLevel || 'Care level'}</p>
                        <div className="grid gap-2 md:grid-cols-3">
                          {CARE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setForm({ ...form, care_type: option.value })}
                              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                form.care_type === option.value
                                  ? 'border-nanny-orange bg-[#fff1e2] text-nanny-deepOrange shadow-sm'
                                  : 'border-nanny-orange/20 bg-white text-nanny-brownish hover:bg-[#fff8ef]'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={`rounded-[30px] border bg-white p-5 shadow-[0_18px_40px_rgba(79,107,237,0.05)] ${fieldErrors.photo_url ? 'border-red-300 ring-2 ring-red-100' : 'border-nanny-orange/15'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-nanny-deepOrange">{t.photoSection || 'Photo from media library'}</h3>
                        <p className="mt-1 text-sm opacity-70">{t.photoText || 'A real photo helps sitters recognize your pet right away.'}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                      <label className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-5 text-center transition-colors hover:bg-white ${fieldErrors.photo_url ? 'border-red-300 bg-red-50/40' : 'border-nanny-orange/35 bg-[#fff8ef]'}`}>
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-nanny-orange/10 text-nanny-orange">
                          <Icon name="pet" className="h-7 w-7" />
                        </span>
                        <p className="mt-4 text-base font-semibold text-nanny-deepOrange">
                          {form.photo_url ? (t.replacePhoto || 'Replace pet photo') : (t.choosePhoto || 'Choose photo from media library')}
                        </p>
                        <p className="mt-2 max-w-[260px] text-sm opacity-70">
                          {t.photoHint || 'JPG, PNG or WEBP up to 5 MB. Clean, well-lit photos work best.'}
                        </p>
                        <span className="btn-ghost mt-4 whitespace-nowrap px-4 py-2 text-sm">{t.uploadPhoto || 'Upload photo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>

                      <div className="rounded-3xl border border-nanny-orange/15 bg-nanny-cream/35 p-3">
                        <img
                          src={(form.photo_url && absoluteAssetUrl(form.photo_url)) || 'https://placedog.net/600/400'}
                          alt={form.name || 'Pet preview'}
                          className="h-[220px] w-full rounded-2xl object-cover"
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-sm opacity-70">
                            {form.photo_url ? (t.selectedPhoto || 'Photo selected from media library') : (t.previewPlaceholder || 'Preview placeholder until you upload a photo')}
                          </p>
                          {form.photo_url && (
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, photo_url: '' })}
                              className="btn-ghost shrink-0 text-sm"
                            >
                              {t.remove || 'Remove'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {(photoError || fieldErrors.photo_url) && <p className="mt-3 text-sm text-red-600">{photoError || fieldErrors.photo_url}</p>}
                  </section>

                  <section className="rounded-[30px] border border-nanny-orange/15 bg-white p-5 shadow-[0_18px_40px_rgba(122,75,31,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-nanny-deepOrange">{t.sitterNotes || 'Care notes for sitters'}</h3>
                        <p className="mt-1 text-sm opacity-70">{t.sitterNotesText || 'Describe temperament, health and any routines that matter during a booking.'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={improveWithAi}
                        className="btn-ghost text-sm shrink-0"
                        disabled={aiLoading}
                      >
                        {aiLoading ? (t.aiWriting || 'AI is writing...') : (t.improveAi || 'Improve with AI')}
                      </button>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.behavior || 'Behavior:'}</p>
                        <textarea className="input min-h-[92px]" placeholder="Friendly, calm, energetic, shy with strangers, loves long walks..."
                                  value={form.behavior}
                                  onChange={(e) => setForm({ ...form, behavior: e.target.value })} />
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.health || 'Health:'}</p>
                        <textarea className="input min-h-[92px]" placeholder="Vaccinations, allergies, medication schedule, food restrictions..."
                                  value={form.health}
                                  onChange={(e) => setForm({ ...form, health: e.target.value })} />
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold text-nanny-deepOrange">{t.extraNotes || 'Extra notes'}</p>
                        <textarea className="input min-h-[120px]" placeholder="Share routines, favorite toys, sleeping habits or anything that helps a sitter care well."
                                  value={form.description}
                                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
                      </div>
                    </div>

                    {aiMessage && (
                      <p className={`mt-4 text-sm ${aiMessage.toLowerCase().includes('failed') ? 'text-red-600' : 'text-nanny-blue'}`}>
                        {aiMessage}
                      </p>
                    )}
                    {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
                  </section>
                </div>
              </div>

              <aside className="max-h-[92vh] overflow-y-auto border-t lg:border-t-0 lg:border-l border-nanny-orange/10 bg-gradient-to-b from-[#fff8ef] to-white p-6 lg:p-7">
                <p className="text-xs uppercase tracking-[0.22em] opacity-55">{t.livePreview || 'Live preview'}</p>
                <div className="mt-4 overflow-hidden rounded-[28px] border border-nanny-orange/15 bg-white shadow-card">
                  <img
                    src={(form.photo_url && absoluteAssetUrl(form.photo_url)) || 'https://placedog.net/600/420'}
                    alt={form.name || 'Preview'}
                    className="h-56 w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold">{form.name.trim() || (t.yourPetName || 'Your pet name')}</h3>
                        <p className="mt-1 text-sm opacity-70 capitalize">
                          {petTypeLabel} • {form.gender} • {form.age || '?'}y • {form.size}
                        </p>
                      </div>
                      <span className="badge bg-nanny-yellow/80 text-nanny-brownish capitalize">{form.care_type}</span>
                    </div>

                    <p className="mt-4 text-sm leading-6 opacity-80">{previewNotes === 'Add a short sitter-facing note so care feels easier from the first booking.' ? (t.defaultPreview || previewNotes) : previewNotes}</p>

                    <div className="mt-5 space-y-2 text-sm">
                      <p><span className="font-semibold text-nanny-deepOrange">{t.behavior || 'Behavior:'}</span> {form.behavior || (t.addTemperament || 'Add temperament notes')}</p>
                      <p><span className="font-semibold text-nanny-deepOrange">{t.health || 'Health:'}</span> {form.health || (t.addHealth || 'Add health notes')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-nanny-orange/15 bg-white p-5">
                  <p className="text-sm font-semibold text-nanny-deepOrange">{t.strongProfile || 'What makes a strong pet profile'}</p>
                  <div className="mt-3 grid gap-3 text-sm opacity-75">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-nanny-orange/10 text-nanny-orange">
                        <Icon name="pet" className="h-4 w-4" />
                      </span>
                      <p className="leading-6">{t.guide1 || 'Clear photo from your media library'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-nanny-blue/10 text-nanny-blue">
                        <Icon name="chat" className="h-4 w-4" />
                      </span>
                      <p className="leading-6">{t.guide2 || 'Real behavior notes, not just “good dog”'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-nanny-yellow/20 text-nanny-deepOrange">
                        <Icon name="booking" className="h-4 w-4" />
                      </span>
                      <p className="leading-6">{t.guide3 || 'Medication, allergies and feeding reminders'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-nanny-orange/10 text-nanny-orange">
                        <Icon name="check" className="h-4 w-4" />
                      </span>
                      <p className="leading-6">{t.guide4 || 'Short sitter-facing description with routines'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button onClick={resetModalState} className="btn-ghost flex-1">{t.cancel || 'Cancel'}</button>
                  <button onClick={save} className="btn-primary flex-1">
                    {editing ? (t.saveChanges || 'Save changes') : (t.createProfile || 'Create pet profile')}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(petToDelete)}
        title={t.deleteTitle || 'Delete this pet profile?'}
        description={petToDelete ? `This will remove ${petToDelete.name} from your pet list and future sitter selection.` : ''}
        confirmLabel={t.deleteConfirm || 'Delete pet'}
        cancelLabel={t.keepProfile || 'Keep profile'}
        tone="danger"
        onClose={() => setPetToDelete(null)}
        onConfirm={removeConfirmed}
      />
    </DashboardLayout>
  );
}
