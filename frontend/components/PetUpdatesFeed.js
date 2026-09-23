import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { absoluteAssetUrl, api, uploadFile } from '../lib/api';
import { useLanguage } from '../lib/i18n';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

const UPDATE_STYLES = {
  update: 'bg-blue-50 text-blue-700 border-blue-100',
  photo: 'bg-purple-50 text-purple-700 border-purple-100',
  status: 'bg-green-50 text-green-700 border-green-100',
};

export default function PetUpdatesFeed({ bookingId, role, compact = false }) {
  const { language } = useLanguage();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ body: '', photo_url: '', status_label: 'Walking started' });
  const socketRef = useRef(null);
  const t = {
    en: {
      compactTitle: 'Live pet updates',
      fullTitle: 'Pet updates during booking',
      subtitle: 'Text notes, status changes and photo updates in real time.',
      updatesCount: 'updates',
      emptySend: 'Add text or photo before sending an update.',
      chooseImage: 'Please choose an image file.',
      uploadFailed: 'Failed to upload photo.',
      placeholder: 'Write how the walk or visit is going...',
      photoUploaded: 'Photo uploaded for this booking update',
      uploadPhoto: 'Upload pet photo update',
      uploading: 'Uploading...',
      uploadButton: 'Upload photo',
      statusOptions: ['Walking started', 'Pet fed', 'Medication given', 'Back home safely'],
      sendStatus: 'Send status',
      sendPhoto: 'Send photo',
      sendNote: 'Send note',
      loading: 'Loading updates...',
      noUpdates: 'No live updates yet for this booking.',
      photoAlt: 'Pet update',
      previewAlt: 'Update preview',
    },
    ru: {
      compactTitle: 'Live-обновления по питомцу',
      fullTitle: 'Обновления по питомцу во время бронирования',
      subtitle: 'Текстовые заметки, статусы и фотообновления в реальном времени.',
      updatesCount: 'обновлений',
      emptySend: 'Добавьте текст или фото перед отправкой обновления.',
      chooseImage: 'Пожалуйста, выберите изображение.',
      uploadFailed: 'Не удалось загрузить фото.',
      placeholder: 'Напишите, как проходит прогулка или визит...',
      photoUploaded: 'Фото загружено для этого обновления',
      uploadPhoto: 'Загрузить фото питомца',
      uploading: 'Загрузка...',
      uploadButton: 'Загрузить фото',
      statusOptions: ['Прогулка началась', 'Питомец накормлен', 'Лекарство дано', 'Питомец дома и в безопасности'],
      sendStatus: 'Отправить статус',
      sendPhoto: 'Отправить фото',
      sendNote: 'Отправить заметку',
      loading: 'Загружаем обновления...',
      noUpdates: 'Для этого бронирования пока нет live-обновлений.',
      photoAlt: 'Обновление по питомцу',
      previewAlt: 'Предпросмотр обновления',
    },
    kz: {
      compactTitle: 'Жануар бойынша live жаңартулар',
      fullTitle: 'Бронь кезіндегі жануар жаңартулары',
      subtitle: 'Мәтіндік жазбалар, мәртебе өзгерістері және фото жаңартулар нақты уақытта көрінеді.',
      updatesCount: 'жаңарту',
      emptySend: 'Жаңарту жіберер алдында мәтін не фото қосыңыз.',
      chooseImage: 'Сурет файлын таңдаңыз.',
      uploadFailed: 'Фото жүктеу сәтсіз аяқталды.',
      placeholder: 'Серуен немесе бару қалай өтіп жатқанын жазыңыз...',
      photoUploaded: 'Бұл жаңартуға фото жүктелді',
      uploadPhoto: 'Жануар фотосын жүктеу',
      uploading: 'Жүктелуде...',
      uploadButton: 'Фото жүктеу',
      statusOptions: ['Серуен басталды', 'Жануар тамақтанды', 'Дәрі берілді', 'Жануар үйге аман оралды'],
      sendStatus: 'Мәртебе жіберу',
      sendPhoto: 'Фото жіберу',
      sendNote: 'Жазба жіберу',
      loading: 'Жаңартулар жүктелуде...',
      noUpdates: 'Бұл бронь үшін live жаңартулар әлі жоқ.',
      photoAlt: 'Жануар жаңартуы',
      previewAlt: 'Жаңарту алдын ала көрінісі',
    },
  }[language] || {};

  const canSend = role === 'sitter';
  const title = compact ? (t.compactTitle || 'Live pet updates') : (t.fullTitle || 'Pet updates during booking');

  const sortedUpdates = useMemo(
    () => [...updates].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [updates]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const data = await api.get(`/api/bookings/${bookingId}/updates`);
        if (active) setUpdates(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    const token = typeof window !== 'undefined' ? localStorage.getItem('nanny_token') : null;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit('booking:join', { booking_id: bookingId });

    const handleIncoming = (payload) => {
      if (Number(payload.booking_id) !== Number(bookingId)) return;
      setUpdates((prev) => {
        if (prev.some((item) => item.id === payload.id)) return prev;
        return [...prev, payload];
      });
    };

    socket.on('pet:update', handleIncoming);
    socket.on('pet:photo', handleIncoming);
    socket.on('pet:status', handleIncoming);

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [bookingId]);

  async function sendUpdate(updateType) {
    setError('');
    if (updateType !== 'status' && !form.body.trim() && !form.photo_url.trim()) {
      setError(t.emptySend || 'Add text or photo before sending an update.');
      return;
    }

    try {
      setSending(true);
      await api.post(`/api/bookings/${bookingId}/updates`, {
        update_type: updateType,
        body: form.body.trim(),
        photo_url: form.photo_url.trim(),
        status_label: form.status_label,
      });
      setForm((prev) => ({ ...prev, body: '', photo_url: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t.chooseImage || 'Please choose an image file.');
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadFile('/api/uploads/document?kind=booking-photo', file);
      setForm((prev) => ({ ...prev, photo_url: uploaded.url }));
      setError('');
    } catch (err) {
      setError(err.message || t.uploadFailed || 'Failed to upload photo.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <section className={`mt-4 rounded-2xl border border-nanny-orange/20 bg-nanny-cream/40 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-nanny-deepOrange">{title}</h4>
          <p className="text-xs opacity-70">{t.subtitle || 'Text notes, status changes and photo updates in real time.'}</p>
        </div>
        <span className="badge bg-nanny-yellow/80 text-nanny-brownish">{sortedUpdates.length} {t.updatesCount || 'updates'}</span>
      </div>

      {canSend && (
        <div className="mt-4 space-y-3 rounded-2xl border border-nanny-orange/20 bg-white p-4">
          <textarea
            className="input min-h-[92px]"
            placeholder={t.placeholder || 'Write how the walk or visit is going...'}
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
          />
          <label className="input flex cursor-pointer items-center justify-between gap-3">
            <span className="truncate text-sm opacity-70">
              {form.photo_url ? (t.photoUploaded || 'Photo uploaded for this booking update') : (t.uploadPhoto || 'Upload pet photo update')}
            </span>
            <span className="btn-ghost whitespace-nowrap px-3 py-1 text-sm">{uploading ? (t.uploading || 'Uploading...') : (t.uploadButton || 'Upload photo')}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          {form.photo_url && (
            <img src={absoluteAssetUrl(form.photo_url)} alt={t.previewAlt || 'Update preview'} className="h-40 w-full rounded-2xl object-cover" />
          )}
          <div className="flex flex-wrap gap-2">
            <select
              className="input max-w-xs"
              value={form.status_label}
              onChange={(e) => setForm((prev) => ({ ...prev, status_label: e.target.value }))}
            >
              {t.statusOptions?.map((option) => <option key={option}>{option}</option>)}
            </select>
            <button type="button" className="btn-ghost text-sm" disabled={sending} onClick={() => sendUpdate('status')}>
              {t.sendStatus || 'Send status'}
            </button>
            <button type="button" className="btn-secondary text-sm" disabled={sending} onClick={() => sendUpdate('photo')}>
              {t.sendPhoto || 'Send photo'}
            </button>
            <button type="button" className="btn-primary text-sm" disabled={sending} onClick={() => sendUpdate('update')}>
              {t.sendNote || 'Send note'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm opacity-60">{t.loading || 'Loading updates...'}</p>}
        {!loading && sortedUpdates.length === 0 && (
          <p className="text-sm opacity-60">{t.noUpdates || 'No live updates yet for this booking.'}</p>
        )}
        {sortedUpdates.map((item) => (
          <article key={item.id} className="rounded-2xl border border-nanny-orange/20 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{item.sender_name}</div>
                <div className="text-xs opacity-60">{new Date(item.created_at).toLocaleString()}</div>
              </div>
              <span className={`badge border ${UPDATE_STYLES[item.update_type] || 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                {item.update_type}
              </span>
            </div>
            {item.status_label && (
              <p className="mt-3 text-sm font-semibold text-green-700">{item.status_label}</p>
            )}
            {item.body && <p className="mt-2 text-sm leading-6">{item.body}</p>}
            {item.photo_url && (
              <img
                src={absoluteAssetUrl(item.photo_url)}
                alt={t.photoAlt || 'Pet update'}
                className="mt-3 h-48 w-full rounded-2xl object-cover"
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
