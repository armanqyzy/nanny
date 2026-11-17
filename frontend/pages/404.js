import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useLanguage } from '../lib/i18n';

const TEXT = {
  title: { en: 'Page not found', ru: 'Страница не найдена', kz: 'Бет табылмады' },
  text: {
    en: 'The link may be old or mistyped. Try finding a sitter or going back to the home page.',
    ru: 'Возможно, ссылка устарела или в ней опечатка. Попробуйте найти ситтера или вернуться на главную.',
    kz: 'Сілтеме ескірген немесе қате жазылған болуы мүмкін. Ситтер іздеп көріңіз немесе басты бетке оралыңыз.',
  },
  home: { en: 'Home page', ru: 'На главную', kz: 'Басты бет' },
  sitters: { en: 'Find a sitter', ru: 'Найти ситтера', kz: 'Ситтер табу' },
};

export default function NotFound() {
  const { language } = useLanguage();
  const tx = (key) => TEXT[key][language] || TEXT[key].en;
  return (
    <>
      <Navbar />
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <img src="/pet-placeholder.png" alt="" className="h-36 w-36 object-contain" />
        <h1 className="mt-6 text-3xl font-bold text-nanny-blue">{tx('title')}</h1>
        <p className="mt-3 max-w-md text-nanny-brownish/80">{tx('text')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-ghost">{tx('home')}</Link>
          <Link href="/sitters" className="btn-secondary">{tx('sitters')}</Link>
        </div>
      </main>
    </>
  );
}
