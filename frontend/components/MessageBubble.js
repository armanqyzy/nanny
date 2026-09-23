import { useLanguage } from '../lib/i18n';

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, mine, onDeleteSelf, onDeleteEveryone }) {
  const { language } = useLanguage();
  const t = {
    en: { delivered: 'Delivered', sent: 'Sent', deleted: 'Message deleted for everyone', openFile: 'Open file', deleteMe: 'Delete for me', deleteEveryone: 'Delete for everyone' },
    ru: { delivered: 'Доставлено', sent: 'Отправлено', deleted: 'Сообщение удалено для всех', openFile: 'Открыть файл', deleteMe: 'Удалить у себя', deleteEveryone: 'Удалить у всех' },
    kz: { delivered: 'Жеткізілді', sent: 'Жіберілді', deleted: 'Хабарлама барлығы үшін жойылды', openFile: 'Файлды ашу', deleteMe: 'Өзімде жою', deleteEveryone: 'Барлығы үшін жою' },
  }[language] || {};
  const deleted = message.deleted_for_everyone;
  const status = mine ? (message.is_delivered ? (t.delivered || 'Delivered') : (t.sent || 'Sent')) : null;

  return (
    <div className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-[26px] px-4 py-3 shadow-sm ${
            mine
              ? 'bg-[linear-gradient(135deg,#4A6CFF,#6F89FF)] text-white shadow-[0_18px_36px_rgba(74,108,255,0.18)]'
              : 'border border-nanny-orange/20 bg-white/95 text-nanny-brownish shadow-[0_14px_30px_rgba(130,93,47,0.08)]'
          }`}
        >
          {deleted ? (
            <p className={`text-sm italic ${mine ? 'text-white/80' : 'text-nanny-brownish/70'}`}>
              {message.body || t.deleted || 'Message deleted for everyone'}
            </p>
          ) : (
            <div className="space-y-3">
              {message.body && <p className="text-sm leading-6 whitespace-pre-wrap">{message.body}</p>}
              {message.image_url && (
                <img src={message.image_url} alt="Shared" className="max-h-72 rounded-2xl object-cover" />
              )}
              {message.audio_url && (
                <audio controls src={message.audio_url} className="max-w-full" />
              )}
              {message.file_url && (
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex rounded-xl px-3 py-2 text-sm font-semibold ${
                    mine ? 'bg-white/15 text-white' : 'bg-nanny-cream text-nanny-blue'
                  }`}
                >
                  {t.openFile || 'Open file'}
                </a>
              )}
            </div>
          )}
        </div>

        <div className={`mt-1 flex items-center gap-2 px-2 text-[11px] opacity-70 ${mine ? 'justify-end' : 'justify-start'}`}>
          <span>{formatTime(message.created_at)}</span>
          {status && <span className="font-medium">{status}</span>}
        </div>

        {!deleted && (
          <div className={`mt-1 flex gap-2 px-2 opacity-0 transition group-hover:opacity-100 ${mine ? 'justify-end' : 'justify-start'}`}>
            <button type="button" className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-red-600 shadow-sm" onClick={() => onDeleteSelf?.(message.id)}>
              {t.deleteMe || 'Delete for me'}
            </button>
            {mine && (
              <button type="button" className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-red-600 shadow-sm" onClick={() => onDeleteEveryone?.(message.id)}>
                {t.deleteEveryone || 'Delete for everyone'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
