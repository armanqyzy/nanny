import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import { absoluteAssetUrl, api, currentUser, uploadFile } from '../lib/api';
import { useLanguage } from '../lib/i18n';

export default function VerificationPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ id_document_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const t = {
    en: {
      pageTitle: 'Verification center',
      loadError: 'Failed to load verification center.',
      updateError: 'Failed to update verification.',
      chooseDocument: 'Please choose an image or PDF document.',
      documentTooLarge: 'Document must be smaller than 8 MB.',
      uploadFailed: 'Failed to upload document.',
      uploadedPrefix: 'Uploaded:',
      sitterTrust: 'Sitter trust',
      verifiedBadge: 'Verified badge and manual review',
      reviewStatus: 'Review status',
      backgroundCheck: 'Background check',
      badge: 'Badge',
      notVerified: 'Not verified yet',
      documentSelected: 'Document selected from media library',
      chooseFromLibrary: 'Choose verification document from media library',
      uploading: 'Uploading...',
      uploadFile: 'Upload file',
      uploadHint: 'Upload your document directly from your device for manual review. Once submitted, your profile moves into verification flow.',
      readyForReview: 'Document ready for review',
      previewAlt: 'Verification preview',
      openPdf: 'Open uploaded PDF document',
      saving: 'Saving...',
      submit: 'Submit verification',
      adminNotes: 'Admin notes',
      noAdminNotes: 'No admin notes yet.',
      approvalHistory: 'Approval history',
      timeline: 'Timeline',
      system: 'System',
      noHistory: 'No history yet. Submit your document to start the review trail.',
    },
    ru: {
      pageTitle: 'Центр верификации',
      loadError: 'Не удалось загрузить центр верификации.',
      updateError: 'Не удалось обновить верификацию.',
      chooseDocument: 'Пожалуйста, выберите изображение или PDF-документ.',
      documentTooLarge: 'Документ должен быть меньше 8 МБ.',
      uploadFailed: 'Не удалось загрузить документ.',
      uploadedPrefix: 'Загружено:',
      sitterTrust: 'Доверие к ситтеру',
      verifiedBadge: 'Значок проверки и ручная модерация',
      reviewStatus: 'Статус проверки',
      backgroundCheck: 'Проверка благонадёжности',
      badge: 'Бейдж',
      notVerified: 'Пока не подтверждён',
      documentSelected: 'Документ выбран из медиатеки',
      chooseFromLibrary: 'Выберите документ для верификации из медиатеки',
      uploading: 'Загрузка...',
      uploadFile: 'Загрузить файл',
      uploadHint: 'Загрузите документ напрямую с устройства для ручной проверки. После отправки профиль перейдёт в поток верификации.',
      readyForReview: 'Документ готов к проверке',
      previewAlt: 'Предпросмотр верификации',
      openPdf: 'Открыть загруженный PDF-документ',
      saving: 'Сохранение...',
      submit: 'Отправить на проверку',
      adminNotes: 'Заметки администратора',
      noAdminNotes: 'Заметок администратора пока нет.',
      approvalHistory: 'История одобрения',
      timeline: 'Таймлайн',
      system: 'Система',
      noHistory: 'Истории пока нет. Отправьте документ, чтобы начать путь проверки.',
    },
    kz: {
      pageTitle: 'Тексеру орталығы',
      loadError: 'Тексеру орталығын жүктеу сәтсіз аяқталды.',
      updateError: 'Тексеруді жаңарту сәтсіз аяқталды.',
      chooseDocument: 'Сурет немесе PDF құжатын таңдаңыз.',
      documentTooLarge: 'Құжат 8 МБ-тан кіші болуы керек.',
      uploadFailed: 'Құжатты жүктеу сәтсіз аяқталды.',
      uploadedPrefix: 'Жүктелді:',
      sitterTrust: 'Ситтерге сенім',
      verifiedBadge: 'Тексеру белгісі және қолмен модерация',
      reviewStatus: 'Тексеру күйі',
      backgroundCheck: 'Қауіпсіздік тексеруі',
      badge: 'Белгі',
      notVerified: 'Әлі расталмаған',
      documentSelected: 'Құжат медиатекадан таңдалды',
      chooseFromLibrary: 'Медиатекадан тексеру құжатын таңдаңыз',
      uploading: 'Жүктелуде...',
      uploadFile: 'Файл жүктеу',
      uploadHint: 'Құжатты құрылғыдан тікелей қолмен тексеру үшін жүктеңіз. Жіберілгеннен кейін профиліңіз тексеру ағынына өтеді.',
      readyForReview: 'Құжат тексеруге дайын',
      previewAlt: 'Тексеру алдын ала көрінісі',
      openPdf: 'Жүктелген PDF құжатын ашу',
      saving: 'Сақталуда...',
      submit: 'Тексеруге жіберу',
      adminNotes: 'Әкімші жазбалары',
      noAdminNotes: 'Әкімші жазбалары әлі жоқ.',
      approvalHistory: 'Мақұлдау тарихы',
      timeline: 'Хронология',
      system: 'Жүйе',
      noHistory: 'Тарих әлі жоқ. Тексеру жолын бастау үшін құжат жіберіңіз.',
    },
  }[language] || {};

  async function loadVerification() {
    const result = await api.get('/api/sitters/me/verification');
    setData(result);
    setForm({ id_document_url: result.id_document_url || '' });
  }

  useEffect(() => {
    const user = currentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'sitter') {
      router.replace('/dashboard');
      return;
    }
    loadVerification().catch(() => setError(t.loadError || 'Failed to load verification center.'));
  }, [router, t.loadError]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put('/api/sitters/me/verification', form);
      await loadVerification();
    } catch (err) {
      setError(err.message || t.updateError || 'Failed to update verification.');
    } finally {
      setSaving(false);
    }
  }

  function handleDocumentChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError(t.chooseDocument || 'Please choose an image or PDF document.');
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError(t.documentTooLarge || 'Document must be smaller than 8 MB.');
      event.target.value = '';
      return;
    }

    (async () => {
      try {
        setUploading(true);
        const uploaded = await uploadFile('/api/uploads/document?kind=document', file);
        setForm({ id_document_url: uploaded.url });
        setUploadMessage(`${t.uploadedPrefix || 'Uploaded:'} ${file.name}`);
        setError('');
      } catch (err) {
        setError(err.message || t.uploadFailed || 'Failed to upload document.');
      } finally {
        setUploading(false);
        event.target.value = '';
      }
    })();
  }

  return (
    <DashboardLayout title={t.pageTitle || 'Verification center'}>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="card">
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.sitterTrust || 'Sitter trust'}</p>
          <h2 className="mt-2 text-3xl font-bold text-nanny-blue">{t.verifiedBadge || 'Verified badge and manual review'}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.reviewStatus || 'Review status'}</p>
              <p className="mt-2 text-lg font-bold capitalize">{data?.review_status || 'new'}</p>
            </div>
            <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.backgroundCheck || 'Background check'}</p>
              <p className="mt-2 text-lg font-bold capitalize">{data?.background_check_status || 'pending'}</p>
            </div>
            <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.badge || 'Badge'}</p>
              <p className="mt-2 text-lg font-bold">{data?.is_verified ? (language === 'ru' ? 'Проверен' : language === 'kz' ? 'Тексерілген' : 'Verified') : (t.notVerified || 'Not verified yet')}</p>
            </div>
          </div>

          <form onSubmit={save} className="mt-6 space-y-4">
            <label className="input flex cursor-pointer items-center justify-between gap-3">
              <span className="truncate text-sm opacity-70">
                {uploadMessage || (form.id_document_url ? (t.documentSelected || 'Document selected from media library') : (t.chooseFromLibrary || 'Choose verification document from media library'))}
              </span>
              <span className="btn-ghost whitespace-nowrap px-3 py-1 text-sm">{uploading ? (t.uploading || 'Uploading...') : (t.uploadFile || 'Upload file')}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleDocumentChange}
              />
            </label>
            <p className="text-sm opacity-70">
              {t.uploadHint || 'Upload your document directly from your device for manual review. Once submitted, your profile moves into verification flow.'}
            </p>
            {form.id_document_url && (
              <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                <p className="text-sm font-semibold">{t.readyForReview || 'Document ready for review'}</p>
                {/\.(png|jpg|jpeg|webp)$/i.test(String(form.id_document_url)) ? (
                  <img src={absoluteAssetUrl(form.id_document_url)} alt={t.previewAlt || 'Verification preview'} className="mt-3 max-h-64 rounded-2xl object-contain" />
                ) : (
                  <a href={absoluteAssetUrl(form.id_document_url)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-nanny-blue hover:underline">
                    {t.openPdf || 'Open uploaded PDF document'}
                  </a>
                )}
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving || uploading} className="btn-primary">
              {saving ? (t.saving || 'Saving...') : (t.submit || 'Submit verification')}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-nanny-cream/70 p-4 text-sm">
            <p className="font-semibold">{t.adminNotes || 'Admin notes'}</p>
            <p className="mt-2 opacity-80">{data?.admin_notes || data?.rejection_reason || t.noAdminNotes || 'No admin notes yet.'}</p>
          </div>
        </section>

        <section className="card">
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">{t.approvalHistory || 'Approval history'}</p>
          <h3 className="mt-2 text-2xl font-bold text-nanny-deepOrange">{t.timeline || 'Timeline'}</h3>
          <div className="mt-5 space-y-4">
            {data?.history?.length ? data.history.map((event) => (
              <div key={event.id} className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold capitalize">{String(event.action || '').replace('_', ' ')}</p>
                  <span className="text-xs opacity-60">{new Date(event.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm opacity-75">{event.actor_name || t.system || 'System'}</p>
                {event.note && <p className="mt-2 text-sm opacity-80">{event.note}</p>}
              </div>
            )) : (
              <p className="text-sm opacity-60">{t.noHistory || 'No history yet. Submit your document to start the review trail.'}</p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
