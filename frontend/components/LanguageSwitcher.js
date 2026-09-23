import { availableLanguages, useLanguage } from '../lib/i18n';

const labels = {
  en: 'EN',
  ru: 'RU',
  kz: 'KZ',
};

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-nanny-orange/20 bg-white/80 p-1">
      {availableLanguages.map((code) => {
        const active = language === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
              active ? 'bg-nanny-blue text-white shadow-sm' : 'text-nanny-brownish/70 hover:bg-nanny-cream'
            }`}
          >
            {labels[code]}
          </button>
        );
      })}
    </div>
  );
}
