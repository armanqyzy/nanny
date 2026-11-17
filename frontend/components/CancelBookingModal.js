import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { POLICY_TEXT, cancelReasonLabel } from '../lib/cancellation';

const TEXT = {
  title: { en: 'Cancel booking', ru: 'Отмена бронирования', kz: 'Брондаудан бас тарту' },
  why: { en: 'Why are you cancelling?', ru: 'Почему вы отменяете?', kz: 'Неге бас тартасыз?' },
  comment: { en: 'Comment (optional)', ru: 'Комментарий (необязательно)', kz: 'Пікір (міндетті емес)' },
  commentRequired: { en: 'Describe the reason', ru: 'Опишите причину', kz: 'Себебін жазыңыз' },
  commentHint: { en: 'The other side will see this message.', ru: 'Другая сторона увидит это сообщение.', kz: 'Екінші тарап бұл хабарды көреді.' },
  notPaid: { en: 'This booking is not paid, so nothing will be charged.', ru: 'Бронирование не оплачено, поэтому ничего не списывается.', kz: 'Брондау төленбеген, ештеңе алынбайды.' },
  refund: { en: 'You will get back', ru: 'Вам вернётся', kz: 'Сізге қайтарылады' },
  ownerRefund: { en: 'The owner will get back', ru: 'Владельцу вернётся', kz: 'Иесіне қайтарылады' },
  noRefund: { en: 'No refund: the booking starts today or has already started.', ru: 'Без возврата: бронирование начинается сегодня или уже началось.', kz: 'Қайтарылмайды: брондау бүгін басталады немесе басталып кетті.' },
  policy: { en: 'Cancellation policy', ru: 'Правила отмены', kz: 'Бас тарту ережелері' },
  keep: { en: 'Keep booking', ru: 'Не отменять', kz: 'Қалдыру' },
  confirm: { en: 'Cancel booking', ru: 'Отменить бронирование', kz: 'Бас тарту' },
  saving: { en: 'Cancelling...', ru: 'Отменяем...', kz: 'Бас тартылуда...' },
  chooseReason: { en: 'Choose a reason.', ru: 'Выберите причину.', kz: 'Себебін таңдаңыз.' },
  loading: { en: 'Loading...', ru: 'Загрузка...', kz: 'Жүктелуде...' },
};
const tx = (key, language) => TEXT[key]?.[language] || TEXT[key]?.en || key;

export default function CancelBookingModal({ booking, language, onClose, onCancelled }) {
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/api/bookings/${booking.id}/cancel-preview`)
      .then((data) => { if (alive) setPreview(data); })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [booking.id]);

  async function submit() {
    if (!reason) { setError(tx('chooseReason', language)); return; }
    if (reason === 'other' && comment.trim().length < 3) { setError(tx('commentRequired', language)); return; }
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/bookings/${booking.id}/status`, { status: 'cancelled', reason, comment: comment.trim() });
      onCancelled();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const isOwner = preview?.actor === 'owner';
  const money = (value) => `${Number(value || 0).toLocaleString()} ₸`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => !saving && onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-nanny-deepOrange">{tx('title', language)}</h3>
        {!preview && !error && <p className="mt-4 text-sm opacity-70">{tx('loading', language)}</p>}

        {preview && (
          <>
            <p className="mt-4 text-sm font-semibold text-nanny-brownish">{tx('why', language)}</p>
            <div className="mt-2 grid gap-2">
              {preview.reasons.map((code) => (
                <label
                  key={code}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    reason === code ? 'border-nanny-orange bg-[#fff1e2]' : 'border-nanny-orange/20 hover:bg-[#fff8ef]'
                  }`}
                >
                  <input type="radio" name="cancel-reason" value={code} checked={reason === code} onChange={() => { setReason(code); setError(''); }} className="accent-nanny-orange" />
                  {cancelReasonLabel(code, language)}
                </label>
              ))}
            </div>

            <label className="mt-4 block text-sm font-semibold text-nanny-brownish">
              {reason === 'other' ? tx('commentRequired', language) : tx('comment', language)}
              <textarea
                className="input mt-2 min-h-[80px]"
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <p className="mt-1 text-xs opacity-60">{tx('commentHint', language)}</p>

            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              !preview.paid ? 'border-nanny-orange/15 bg-nanny-cream/45'
                : preview.refund_percent > 0 ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {!preview.paid && tx('notPaid', language)}
              {preview.paid && preview.refund_percent > 0 && (
                <span>
                  {isOwner ? tx('refund', language) : tx('ownerRefund', language)}:{' '}
                  <b>{money(preview.refund_amount)}</b> ({preview.refund_percent}% {language === 'ru' ? 'из' : language === 'kz' ? '/' : 'of'} {money(preview.total_price)})
                </span>
              )}
              {preview.paid && preview.refund_percent === 0 && tx('noRefund', language)}
            </div>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-nanny-blue">{tx('policy', language)}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 opacity-80">
                {(POLICY_TEXT[language] || POLICY_TEXT.en).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </details>
          </>
        )}

        {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" className="btn-ghost flex-1" disabled={saving} onClick={onClose}>{tx('keep', language)}</button>
          <button type="button" className="btn-secondary flex-1 !bg-red-500 hover:!bg-red-600" disabled={saving || !preview} onClick={submit}>
            {saving ? tx('saving', language) : tx('confirm', language)}
          </button>
        </div>
      </div>
    </div>
  );
}
