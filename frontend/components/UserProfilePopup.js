import { resolveAvatar } from '../lib/avatars';
import { useLanguage } from '../lib/i18n';

export default function UserProfilePopup({ open, profile, onClose }) {
  const { language } = useLanguage();
  const t = {
    en: { rating: 'Rating:', close: 'Close', about: 'About', noDescription: 'No short description yet.', contact: 'Contact', noPhone: 'Phone not shared yet', noAddress: 'Address not shared yet', services: 'Sitter services' },
    ru: { rating: 'Рейтинг:', close: 'Закрыть', about: 'О профиле', noDescription: 'Короткое описание пока не добавлено.', contact: 'Контакты', noPhone: 'Телефон пока не указан', noAddress: 'Адрес пока не указан', services: 'Услуги ситтера' },
    kz: { rating: 'Рейтинг:', close: 'Жабу', about: 'Профиль туралы', noDescription: 'Қысқа сипаттама әлі қосылмаған.', contact: 'Байланыс', noPhone: 'Телефон әлі көрсетілмеген', noAddress: 'Мекенжай әлі көрсетілмеген', services: 'Ситтер қызметтері' },
  }[language] || {};
  if (!open || !profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={resolveAvatar(profile)}
              alt={profile.full_name}
              className="h-20 w-20 rounded-full object-cover"
            />
            <div>
              <h3 className="text-xl font-bold text-nanny-deepOrange">{profile.display_name || profile.full_name}</h3>
              <p className="text-sm capitalize opacity-70">{profile.display_role || profile.role}</p>
              {profile.rating && <p className="mt-1 text-sm text-nanny-blue">{t.rating || 'Rating:'} {Number(profile.rating).toFixed(1)}</p>}
            </div>
          </div>
          <button type="button" className="text-sm font-semibold" onClick={onClose}>{t.close || 'Close'}</button>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <div>
            <div className="font-semibold text-nanny-brownish">{t.about || 'About'}</div>
            <p className="mt-1 opacity-80">{profile.short_description || t.noDescription || 'No short description yet.'}</p>
          </div>

          <div>
            <div className="font-semibold text-nanny-brownish">{t.contact || 'Contact'}</div>
            <p className="mt-1 opacity-80">{profile.phone || t.noPhone || 'Phone not shared yet'}</p>
            <p className="opacity-80">{profile.address || t.noAddress || 'Address not shared yet'}</p>
          </div>

          {profile.services?.length > 0 && (
            <div>
              <div className="font-semibold text-nanny-brownish">{t.services || 'Sitter services'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.services.map((service) => (
                  <span key={`${service.service}-${service.price}`} className="badge bg-nanny-yellow/80 text-nanny-brownish">
                    {service.service} · {Number(service.price).toLocaleString()} ₸
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
