import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { currentUser, clearSession, api } from '../lib/api';
import { io } from 'socket.io-client';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../lib/i18n';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

function getNotificationHref(notification) {
  const meta = notification?.meta || {};

  if (meta.booking_id) return '/bookings';
  if (meta.order_id) return '/shop/orders';
  if (meta.review_id || notification?.type === 'review:new') return '/dashboard';
  if (meta.support_ticket_id || notification?.type === 'support:reply') return '/support';
  if (meta.sender_id || notification?.type === 'message:new') return '/chat';

  return null;
}

export default function Navbar() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    setUser(currentUser());
    (async () => {
      const sessionUser = currentUser();
      if (!sessionUser) return setNotifications([]);
      const data = await api.get('/api/notifications').catch(() => []);
      setNotifications(data);
    })();
    setOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    const sessionUser = currentUser();
    const token = typeof window !== 'undefined' ? localStorage.getItem('nanny_token') : null;
    if (!sessionUser || !token) return undefined;

    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev.filter((item) => item.id !== notification.id)]);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target)) setOpen(false);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    router.push('/');
  }

  async function markAllRead() {
    await api.put('/api/notifications/read-all', {});
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  }

  async function openNotification(notification) {
    const href = getNotificationHref(notification);
    if (!href) return;

    if (!notification.is_read) {
      try {
        await api.put(`/api/notifications/${notification.id}/read`, {});
        setNotifications((prev) => prev.map((item) => (
          item.id === notification.id ? { ...item, is_read: true } : item
        )));
      } catch (_error) {
        // Keep navigation responsive even if the read request fails.
      }
    }

    setOpen(false);
    router.push(href);
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <>
      <header className="sticky inset-x-0 top-0 z-50 border-b border-nanny-orange/20 bg-nanny-cream/95 backdrop-blur">
        <nav className="w-full px-6 py-4 lg:px-10">
          <div className="flex flex-wrap items-center gap-4 md:grid md:grid-cols-[auto_1fr_auto] md:gap-6">
            <Link href="/" className="justify-self-start flex items-center gap-2 text-nanny-blue font-display text-2xl font-bold whitespace-nowrap">
              <BrandLogo size="sm" priority />
              <span>Nanny</span>
            </Link>

            <div className="hidden md:flex items-center justify-center gap-6 text-sm font-medium">
              <Link href="/sitters" className="hover:text-nanny-blue">{t('shell', 'sitters', 'Sitters')}</Link>
              <Link href="/shop"    className="hover:text-nanny-blue">{t('shell', 'shop', 'Shop')}</Link>
              <Link href="/map"     className="hover:text-nanny-blue">{t('shell', 'map', 'Map')}</Link>
              <Link href="/safety"  className="hover:text-nanny-blue">{t('shell', 'safety', 'Safety')}</Link>
              <Link href="/support" className="hover:text-nanny-blue">{t('shell', 'support', 'Support')}</Link>
              <Link href="/chat"    className="hover:text-nanny-blue">{t('shell', 'messages', 'Messages')}</Link>
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-2 md:justify-self-end md:w-auto md:justify-end">
              <LanguageSwitcher />
              {!user ? (
                <>
                  <Link href="/login"    className="btn-ghost">{t('shell', 'signIn', 'Sign in')}</Link>
                  <Link href="/register" className="btn-secondary">{t('shell', 'register', 'Register')}</Link>
                </>
              ) : (
                <>
                  <div className="relative" ref={notificationsRef}>
                    <button onClick={() => setOpen((prev) => !prev)} className="btn-ghost relative px-3">
                      <Icon name="bell" className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-nanny-orange px-1 text-[11px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    {open && (
                      <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-[28px] border border-nanny-orange/15 bg-white shadow-[0_24px_70px_rgba(122,75,31,0.18)] backdrop-blur">
                        <div className="border-b border-nanny-orange/10 bg-[linear-gradient(135deg,rgba(255,247,234,0.98),rgba(255,255,255,0.98))] px-5 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-nanny-deepOrange">{t('shell', 'notifications', 'Notifications')}</p>
                              <p className="mt-1 text-xs text-nanny-brownish/60">
                                {t('shell', 'notificationsHelp', 'Messages, bookings, support and shop updates')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && (
                                <span className="rounded-full bg-nanny-orange/10 px-2.5 py-1 text-[11px] font-semibold text-nanny-deepOrange">
                                  {unreadCount} new
                                </span>
                              )}
                              <button onClick={markAllRead} className="text-xs font-semibold text-nanny-blue">{t('shell', 'readAll', 'Read all')}</button>
                            </div>
                          </div>
                        </div>
                        <div className="max-h-[min(68vh,520px)] overflow-y-auto px-4 py-4">
                          <div className="space-y-3 pr-1">
                            {notifications.length === 0 && (
                              <div className="rounded-2xl border border-dashed border-nanny-orange/20 bg-nanny-cream/40 p-4 text-sm text-nanny-brownish/70">
                                {t('shell', 'noNotifications', 'No notifications yet. New messages, booking updates and shop order changes will appear here.')}
                              </div>
                            )}
                            {notifications.slice(0, 12).map((notification) => {
                              const href = getNotificationHref(notification);
                              return (
                                <button
                                  key={notification.id}
                                  type="button"
                                  onClick={() => openNotification(notification)}
                                  className={`group block w-full rounded-[24px] border p-4 text-left text-sm transition ${
                                    notification.is_read
                                      ? 'border-nanny-orange/10 bg-white hover:border-nanny-orange/20 hover:bg-[#fffaf4]'
                                      : 'border-nanny-orange/20 bg-[linear-gradient(180deg,#fffaf2_0%,#fffefb_100%)] hover:border-nanny-orange/30'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-nanny-brownish">{notification.title}</p>
                                      {notification.body && (
                                        <p className="mt-1 line-clamp-3 text-[15px] leading-6 text-nanny-brownish/72">
                                          {notification.body}
                                        </p>
                                      )}
                                    </div>
                                    {!notification.is_read && (
                                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-nanny-orange" />
                                    )}
                                  </div>
                                  <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-nanny-brownish/45">
                                      {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                    {href && (
                                      <span className="text-[11px] font-semibold text-nanny-blue transition group-hover:translate-x-0.5">
                                        {t('shell', 'open', 'Open')}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <Link href="/dashboard" className="btn-ghost">{t('shell', 'myAccount', 'My Account')}</Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" className="btn-ghost">{t('shell', 'admin', 'Admin')}</Link>
                  )}
                  <button onClick={logout} className="btn-secondary">{t('shell', 'logout', 'Logout')}</button>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
