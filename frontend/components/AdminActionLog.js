import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const LABELS = {
  user_blocked: { en: 'Blocked user', ru: 'Заблокировал пользователя', kz: 'Пайдаланушыны бұғаттады' },
  user_unblocked: { en: 'Unblocked user', ru: 'Разблокировал пользователя', kz: 'Бұғаттан шығарды' },
  sitter_verified: { en: 'Verified sitter', ru: 'Подтвердил ситтера', kz: 'Ситтерді растады' },
  sitter_unverified: { en: 'Removed sitter badge', ru: 'Снял бейдж ситтера', kz: 'Ситтер белгісін алды' },
  review_hidden: { en: 'Hid review', ru: 'Скрыл отзыв', kz: 'Пікірді жасырды' },
  review_shown: { en: 'Showed review', ru: 'Показал отзыв', kz: 'Пікірді көрсетті' },
};

// Admin tab: who did what and when (latest 200 actions).
export default function AdminActionLog({ language = 'en' }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const locale = language === 'ru' ? 'ru-RU' : language === 'kz' ? 'kk-KZ' : 'en-US';

  useEffect(() => {
    api.get('/api/admin/actions').then(setRows).catch((err) => setError(err.message));
  }, []);

  const label = (action) => LABELS[action]?.[language] || LABELS[action]?.en || action.replace(/_/g, ' ');

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!rows) return <p className="text-sm opacity-60">...</p>;
  if (!rows.length) {
    return <p className="text-sm opacity-60">{language === 'ru' ? 'Действий пока нет.' : language === 'kz' ? 'Әрекеттер әлі жоқ.' : 'No actions yet.'}</p>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] opacity-50">
          <tr>
            <th className="pb-3 pr-4">{language === 'ru' ? 'Когда' : language === 'kz' ? 'Қашан' : 'When'}</th>
            <th className="pb-3 pr-4">{language === 'ru' ? 'Админ' : language === 'kz' ? 'Әкімші' : 'Admin'}</th>
            <th className="pb-3 pr-4">{language === 'ru' ? 'Действие' : language === 'kz' ? 'Әрекет' : 'Action'}</th>
            <th className="pb-3">{language === 'ru' ? 'Объект' : language === 'kz' ? 'Нысан' : 'Target'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-nanny-orange/10">
              <td className="py-2 pr-4 whitespace-nowrap">{new Date(row.created_at).toLocaleString(locale)}</td>
              <td className="py-2 pr-4">{row.admin_name || '—'}</td>
              <td className="py-2 pr-4">{label(row.action)}</td>
              <td className="py-2">
                {row.target_name || (row.target_type ? `${row.target_type} #${row.target_id}` : '—')}
                {row.details?.admin_notes && <span className="block text-xs opacity-60">{row.details.admin_notes}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
