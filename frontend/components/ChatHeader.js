import { useEffect, useRef } from 'react';
import { resolveAvatar } from '../lib/avatars';
import Icon from '../components/Icon';
import { useLanguage } from '../lib/i18n';

export default function ChatHeader({
  active,
  online,
  onProfileOpen,
  onDeleteChat,
  messageSearchOpen,
  messageSearch,
  onMessageSearchToggle,
  onMessageSearchChange,
  onMessageSearchClose,
  messageSearchInputRef,
}) {
  const { language } = useLanguage();
  const t = {
    en: {
      supportOnline: '● Support is online',
      supportSoon: 'Support will reply soon',
      onlineNow: '● Online now',
      lastSeen: 'Last seen recently',
      clearChat: 'Clear chat',
      searchConversation: 'Search in conversation',
      searchInChat: 'Search in chat',
      closeSearch: 'Close search',
    },
    ru: {
      supportOnline: '● Поддержка онлайн',
      supportSoon: 'Поддержка скоро ответит',
      onlineNow: '● Сейчас онлайн',
      lastSeen: 'Недавно был(а) в сети',
      clearChat: 'Очистить чат',
      searchConversation: 'Поиск по переписке',
      searchInChat: 'Поиск в чате',
      closeSearch: 'Закрыть поиск',
    },
    kz: {
      supportOnline: '● Қолдау желіде',
      supportSoon: 'Қолдау жақында жауап береді',
      onlineNow: '● Қазір желіде',
      lastSeen: 'Жақында желіде болды',
      clearChat: 'Чатты тазалау',
      searchConversation: 'Хат алмасудан іздеу',
      searchInChat: 'Чат ішінен іздеу',
      closeSearch: 'Іздеуді жабу',
    },
  }[language] || {};
  const searchWrapRef = useRef(null);

  useEffect(() => {
    if (!messageSearchOpen) return undefined;

    function handlePointerDown(event) {
      if (!searchWrapRef.current?.contains(event.target)) {
        onMessageSearchClose?.();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [messageSearchOpen, onMessageSearchClose]);

  return (
    <header className="border-b border-nanny-orange/20 bg-white/90 px-5 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={onProfileOpen}>
          <div className="relative">
            <img
              src={resolveAvatar(active)}
              alt={active.full_name}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-nanny-orange/20"
            />
            <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          </div>
          <div>
            <div className="font-semibold">{active.display_name || active.full_name}</div>
            <div className={`text-xs ${online ? 'text-green-600' : 'opacity-60'}`}>
              {active.is_support
                ? (online ? (t.supportOnline || '● Support is online') : (t.supportSoon || 'Support will reply soon'))
                : (online ? (t.onlineNow || '● Online now') : (t.lastSeen || 'Last seen recently'))}
            </div>
          </div>
        </button>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            className={`btn-ghost px-3 py-2 text-sm ${messageSearchOpen ? 'border-nanny-blue text-nanny-blue' : ''}`}
            onClick={onMessageSearchToggle}
            aria-label={t.searchConversation || 'Search in conversation'}
          >
            <Icon name="search" className="h-4 w-4" />
          </button>
          <button type="button" className="btn-ghost gap-2 px-3 py-2 text-sm" onClick={onDeleteChat}>
            <Icon name="chat" className="h-4 w-4" />
            {t.clearChat || 'Clear chat'}
          </button>
        </div>
      </div>

      {messageSearchOpen && (
        <div className="pt-4" onClick={(event) => event.stopPropagation()}>
          <div ref={searchWrapRef} className="relative max-w-md">
            <input
              ref={messageSearchInputRef}
              className="input rounded-2xl pl-5 pr-14"
              placeholder={t.searchInChat || 'Search in chat'}
              value={messageSearch}
              onChange={(e) => onMessageSearchChange?.(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-4 flex items-center text-nanny-brownish/45 hover:text-nanny-brownish"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onMessageSearchClose}
              aria-label={t.closeSearch || 'Close search'}
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
