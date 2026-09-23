import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { currentUser } from '../lib/api';
import Icon from './Icon';
import { useLanguage } from '../lib/i18n';

const ownerItems = [
  { href: '/dashboard', label: 'Overview', icon: 'home', note: 'Profile & settings' },
  { href: '/chat', label: 'Messages', icon: 'chat', note: 'Conversations' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar', note: 'Care schedule' },
  { href: '/pets', label: 'Pets', icon: 'pet', note: 'Profiles & health' },
  { href: '/bookings', label: 'Bookings', icon: 'booking', note: 'Services & updates' },
  { href: '/shop', label: 'Shop', icon: 'shop', note: 'Products & orders' },
];

const adminItems = [
  { href: '/admin', label: 'Admin panel', icon: 'admin', note: 'Global moderation' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar', note: 'All active bookings' },
  { href: '/chat', label: 'Messages', icon: 'chat', note: 'Support & chats' },
  { href: '/shop/orders', label: 'Shop orders', icon: 'shop', note: 'Store operations' },
  { href: '/dashboard', label: 'Account', icon: 'settings', note: 'Profile settings' },
];

export default function Sidebar() {
  const { t } = useLanguage();
  const { asPath } = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(currentUser());
  }, [asPath]);

  const baseItems = user?.role === 'admin' ? adminItems : ownerItems;
  const items = user?.role === 'admin'
    ? baseItems
    : [
        ...baseItems,
        ...(user?.role === 'sitter'
          ? [{ href: '/verification', label: 'Verification', icon: 'admin', note: 'Docs & trust badge' }]
          : [{ href: '/support', label: 'Support', icon: 'support', note: 'FAQ & escalations' }]),
      ];
  return (
    <aside className="hidden md:flex w-24 lg:w-72 shrink-0 border-r border-nanny-orange/15 bg-white/70 px-4 py-5 backdrop-blur">
      <div className="sticky top-[98px] flex w-full flex-col gap-2">
        <div className="mb-3 rounded-3xl bg-gradient-to-br from-nanny-orange to-[#e88430] p-4 text-white shadow-card">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">
            {user?.role === 'admin' ? t('shell', 'adminWorkspace', 'Admin workspace') : t('shell', 'workspace', 'Workspace')}
          </p>
          <p className="mt-2 text-lg font-bold">
            {user?.role === 'admin' ? t('shell', 'platformControl', 'Platform control') : t('shell', 'petCareHub', 'Pet care hub')}
          </p>
        </div>
      {items.map((it) => {
        const active = asPath === it.href || asPath.startsWith(it.href + '/');
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
              active
                ? 'bg-nanny-orange text-white shadow-sm'
                : 'text-nanny-brownish hover:bg-nanny-orange/8'
            }`}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              active ? 'bg-white/15 text-white' : 'bg-nanny-cream text-nanny-deepOrange'
            }`}>
              <Icon name={it.icon} className="h-5 w-5" />
            </span>
            <span className="hidden lg:block">
              <span className="block font-semibold">
                {(
                  {
                    Overview: t('shell', 'overview', 'Overview'),
                    Messages: t('shell', 'messages', 'Messages'),
                    Calendar: t('shell', 'calendar', 'Calendar'),
                    Pets: t('shell', 'pets', 'Pets'),
                    Bookings: t('shell', 'bookings', 'Bookings'),
                    Shop: t('shell', 'shop', 'Shop'),
                    Support: t('shell', 'support', 'Support'),
                    Verification: t('shell', 'verification', 'Verification'),
                    'Admin panel': t('shell', 'admin', 'Admin'),
                    'Shop orders': t('shell', 'shopOrders', 'Shop orders'),
                    Account: t('shell', 'account', 'Account'),
                  }[it.label] || it.label
                )}
              </span>
              <span className={`text-xs ${active ? 'text-white/75' : 'text-nanny-brownish/60'}`}>
                {(
                  {
                    'Profile & settings': t('shell', 'profileSettings', 'Profile & settings'),
                    Conversations: t('shell', 'conversations', 'Conversations'),
                    'Care schedule': t('shell', 'careSchedule', 'Care schedule'),
                    'Profiles & health': t('shell', 'profilesHealth', 'Profiles & health'),
                    'Services & updates': t('shell', 'servicesUpdates', 'Services & updates'),
                    'Products & orders': t('shell', 'productsOrders', 'Products & orders'),
                    'FAQ & escalations': t('shell', 'faqEscalations', 'FAQ & escalations'),
                    'Docs & trust badge': t('shell', 'docsTrustBadge', 'Docs & trust badge'),
                    'Global moderation': t('shell', 'globalModeration', 'Global moderation'),
                    'All active bookings': t('shell', 'allActiveBookings', 'All active bookings'),
                    'Support & chats': t('shell', 'supportChats', 'Support & chats'),
                    'Store operations': t('shell', 'storeOperations', 'Store operations'),
                    'Profile settings': t('shell', 'profileSettings', 'Profile & settings'),
                  }[it.note] || it.note
                )}
              </span>
            </span>
          </Link>
        );
      })}
      </div>
    </aside>
  );
}
