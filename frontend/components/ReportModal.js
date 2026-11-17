import { useState } from 'react';
import { api } from '../lib/api';

// Reasons map to support categories and priorities, so the admin queue sorts them correctly.
const REASONS = [
  { key: 'behavior', category: 'sitter_report', priority: 'high', en: 'Inappropriate behavior', ru: 'Неподобающее поведение', kz: 'Орынсыз мінез-құлық' },
  { key: 'fraud', category: 'safety_concern', priority: 'urgent', en: 'Fraud or safety risk', ru: 'Мошенничество или угроза безопасности', kz: 'Алаяқтық немесе қауіп' },
  { key: 'no_show', category: 'booking_issue', priority: 'high', en: 'Service not provided / dispute', ru: 'Услуга не оказана / спор по брони', kz: 'Қызмет көрсетілмеді / дау' },
  { key: 'other', category: 'other', priority: 'normal', en: 'Other', ru: 'Другое', kz: 'Басқа' },
];

const TEXT = {
  en: { title: 'Report a problem', about: 'About', reason: 'Reason', details: 'What happened? (at least 10 characters)', send: 'Send to support', cancel: 'Cancel', sent: 'Thank you. The support team will review it and contact you.' },
  ru: { title: 'Сообщить о проблеме', about: 'О ком', reason: 'Причина', details: 'Что произошло? (минимум 10 символов)', send: 'Отправить в поддержку', cancel: 'Отмена', sent: 'Спасибо. Поддержка рассмотрит жалобу и свяжется с вами.' },
  kz: { title: 'Мәселе туралы хабарлау', about: 'Кім туралы', reason: 'Себеп', details: 'Не болды? (кемінде 10 таңба)', send: 'Қолдауға жіберу', cancel: 'Болдырмау', sent: 'Рақмет. Қолдау қызметі қарап, сізбен байланысады.' },
};

export default function ReportModal({ targetName, bookingId = null, defaultReason = 'behavior', language = 'en', onClose }) {
  const t = TEXT[language] || TEXT.en;
  const [reason, setReason] = useState(defaultReason);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    const chosen = REASONS.find((item) => item.key === reason) || REASONS[3];
    setBusy(true);
    setError('');
    try {
      await api.post('/api/support/tickets', {
        category: chosen.category,
        priority: chosen.priority,
        subject: `${chosen.en}: ${targetName}${bookingId ? ` (booking #${bookingId})` : ''}`.slice(0, 180),
        body: `${bookingId ? `Booking #${bookingId}. ` : ''}${details.trim()}`,
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-nanny-deepOrange">{t.title}</h3>
        <p className="mt-1 text-sm opacity-70">{t.about}: {targetName}{bookingId ? ` • #${bookingId}` : ''}</p>
        {sent ? (
          <>
            <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-700">{t.sent}</p>
            <button type="button" className="btn-primary mt-4 w-full" onClick={onClose}>OK</button>
          </>
        ) : (
          <>
            <label className="mt-4 block text-sm font-semibold">{t.reason}</label>
            <select className="input mt-1" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((item) => <option key={item.key} value={item.key}>{item[language] || item.en}</option>)}
            </select>
            <textarea className="input mt-3 min-h-[110px]" placeholder={t.details} value={details} maxLength={3000}
                      onChange={(e) => setDetails(e.target.value)} />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={onClose}>{t.cancel}</button>
              <button type="button" className="btn-primary flex-1" disabled={busy || details.trim().length < 10} onClick={send}>{t.send}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
