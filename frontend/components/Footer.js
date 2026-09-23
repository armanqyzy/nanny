import Link from 'next/link';
import BrandLogo from './BrandLogo';
import { useLanguage } from '../lib/i18n';

export default function Footer() {
  const { language, t } = useLanguage();
  const copy = {
    en: {
      intro: 'Pet care platform for bookings, shop orders and reliable sitter communication in Almaty.',
      navigation: 'Navigation',
      home: 'Home',
      mapSearch: 'Map search',
      supportCenter: 'Support center',
      contact: 'Contact',
      city: 'Almaty, Kazakhstan',
      hours: 'Mon–Sun, 10:00–20:00',
      platform: 'Nanny Platform',
    },
    ru: {
      intro: 'Платформа для ухода за питомцами: бронирования, заказы магазина и надёжное общение с ситтерами в Алматы.',
      navigation: 'Навигация',
      home: 'Главная',
      mapSearch: 'Поиск на карте',
      supportCenter: 'Центр поддержки',
      contact: 'Контакты',
      city: 'Алматы, Казахстан',
      hours: 'Пн–Вс, 10:00–20:00',
      platform: 'Платформа Nanny',
    },
    kz: {
      intro: 'Алматыдағы питомец күтімі платформасы: броньдар, дүкен тапсырыстары және ситтерлермен сенімді байланыс.',
      navigation: 'Навигация',
      home: 'Басты бет',
      mapSearch: 'Картадан іздеу',
      supportCenter: 'Қолдау орталығы',
      contact: 'Байланыс',
      city: 'Алматы, Қазақстан',
      hours: 'Дс–Жс, 10:00–20:00',
      platform: 'Nanny платформасы',
    },
  }[language];

  return (
    <footer className="border-t border-nanny-orange/20 bg-white/80 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3 text-nanny-blue">
            <BrandLogo size="sm" />
            <span className="font-display text-2xl font-bold">Nanny</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-nanny-brownish/80">
            {copy.intro}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-nanny-deepOrange">{copy.navigation}</h3>
          <div className="mt-3 space-y-2 text-sm">
            <Link href="/" className="block hover:text-nanny-blue">{copy.home}</Link>
            <Link href="/sitters" className="block hover:text-nanny-blue">{t('shell', 'sitters', 'Sitters')}</Link>
            <Link href="/shop" className="block hover:text-nanny-blue">{t('shell', 'shop', 'Shop')}</Link>
            <Link href="/map" className="block hover:text-nanny-blue">{copy.mapSearch}</Link>
            <Link href="/safety" className="block hover:text-nanny-blue">{t('shell', 'safety', 'Safety')}</Link>
            <Link href="/support" className="block hover:text-nanny-blue">{copy.supportCenter}</Link>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-nanny-deepOrange">{copy.contact}</h3>
          <div className="mt-3 space-y-2 text-sm text-nanny-brownish/80">
            <p>{copy.city}</p>
            <a href="mailto:a_armankyzy@kbtu.kz" className="block text-nanny-blue hover:underline">
              a_armankyzy@kbtu.kz
            </a>
            <p>{copy.hours}</p>
          </div>
        </div>

        <div className="md:col-span-3 border-t border-nanny-orange/10 pt-5 text-sm text-nanny-brownish/70">
          © {new Date().getFullYear()} {copy.platform}
        </div>
      </div>
    </footer>
  );
}
