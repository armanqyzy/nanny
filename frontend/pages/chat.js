import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import ChatHeader from '../components/ChatHeader';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';
import UserProfilePopup from '../components/UserProfilePopup';
import Icon from '../components/Icon';
import { api, currentUser } from '../lib/api';
import { resolveAvatar } from '../lib/avatars';
import { useLanguage } from '../lib/i18n';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

function upsertMessage(list, message) {
  if (list.some((item) => item.id === message.id)) {
    return list.map((item) => (item.id === message.id ? { ...item, ...message } : item));
  }
  return [...list, message];
}

function asSupportThread(thread) {
  return {
    ...thread,
    display_name: 'Support',
    display_role: 'support',
    short_description: 'Official help chat with the Nanny support team.',
    is_support: true,
  };
}

function formatDayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildTimeline(messages) {
  const items = [];
  let previousDay = null;

  messages.forEach((message) => {
    const currentDay = new Date(message.created_at).toDateString();

    if (currentDay !== previousDay) {
      items.push({
        type: 'day',
        key: `day-${currentDay}`,
        label: formatDayLabel(message.created_at),
      });
      previousDay = currentDay;
    }

    items.push({
      type: 'message',
      key: `message-${message.id}`,
      message,
    });
  });

  return items;
}

export default function Chat() {
  const { language } = useLanguage();
  const router = useRouter();
  const t = {
    en: { support:'Support', startConversation:'Start the conversation', chatWithSupport:'Chat with Support', openingSupport:'Opening support...', priorityHelp:'Priority help from the Nanny team', messagesHub:'Messages hub', inbox:'Inbox', fastChat:'Fast chat with sitters, owners and support.', search:'Search', pinnedSupport:'Pinned support', platformPriority:'Priority help from the platform team', noConversations:'No conversations match your search.', supportBadge:'Support', noMessagesFound:'No messages found for this search.', typing:'is typing...', chooseConversation:'Choose a conversation', chooseConversationText:'Open any owner or sitter chat to start messaging in real time.', deleteConversation:'Delete conversation', areYouSure:'Are you sure?', deletePrefix:'This will clear the chat with', deleteSuffix:'from your inbox. The action affects your conversation view and should not happen by accident.', cancel:'Cancel', deleting:'Deleting...', deleteChat:'Delete chat' },
    ru: { support:'Поддержка', startConversation:'Начните диалог', chatWithSupport:'Чат с поддержкой', openingSupport:'Открываем поддержку...', priorityHelp:'Приоритетная помощь от команды Nanny', messagesHub:'Центр сообщений', inbox:'Входящие', fastChat:'Быстрый чат с ситтерами, владельцами и поддержкой.', search:'Поиск', pinnedSupport:'Закреплённая поддержка', platformPriority:'Приоритетная помощь от команды платформы', noConversations:'По вашему запросу диалоги не найдены.', supportBadge:'Поддержка', noMessagesFound:'По этому поиску сообщения не найдены.', typing:'печатает...', chooseConversation:'Выберите диалог', chooseConversationText:'Откройте любой чат с владельцем или ситтером, чтобы начать переписку в реальном времени.', deleteConversation:'Удалить диалог', areYouSure:'Вы уверены?', deletePrefix:'Это очистит чат с', deleteSuffix:'из ваших входящих. Действие влияет на видимость диалога и не должно происходить случайно.', cancel:'Отмена', deleting:'Удаление...', deleteChat:'Удалить чат' },
    kz: { support:'Қолдау', startConversation:'Диалогты бастаңыз', chatWithSupport:'Қолдаумен чат', openingSupport:'Қолдауды ашып жатырмыз...', priorityHelp:'Nanny командасынан басым көмек', messagesHub:'Хабарламалар орталығы', inbox:'Кіріс', fastChat:'Ситтерлермен, иелермен және қолдаумен жылдам чат.', search:'Іздеу', pinnedSupport:'Бекітілген қолдау', platformPriority:'Платформа командасынан басым көмек', noConversations:'Іздеуіңізге сай диалогтар табылмады.', supportBadge:'Қолдау', noMessagesFound:'Бұл іздеу бойынша хабарлама табылмады.', typing:'жазып жатыр...', chooseConversation:'Диалогты таңдаңыз', chooseConversationText:'Нақты уақытта хат алмасу үшін кез келген иемен немесе ситтермен чатты ашыңыз.', deleteConversation:'Диалогты жою', areYouSure:'Сенімдісіз бе?', deletePrefix:'Бұл чатты', deleteSuffix:'сіздің кіріс жәшігіңізден тазартады. Бұл әрекет диалог көрінісіне әсер етеді және кездейсоқ болмауы керек.', cancel:'Болдырмау', deleting:'Жойылуда...', deleteChat:'Чатты жою' },
  }[language] || {};
  const [me, setMe] = useState(null);
  const [supportAdminId, setSupportAdminId] = useState(null);
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [onlineMap, setOnlineMap] = useState({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [threadSearch, setThreadSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const socketRef = useRef(null);
  const activeRef = useRef(null);
  const meRef = useRef(null);
  const supportAdminIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const endRef = useRef(null);
  const messageSearchInputRef = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  useEffect(() => {
    supportAdminIdRef.current = supportAdminId;
  }, [supportAdminId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('nanny_support_admin_id');
    if (saved) setSupportAdminId(Number(saved));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !supportAdminId) return;
    window.localStorage.setItem('nanny_support_admin_id', String(supportAdminId));
  }, [supportAdminId]);

  useEffect(() => {
    const user = currentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setMe(user);
  }, [router]);

  useEffect(() => {
    if (!me) return;
    const token = localStorage.getItem('nanny_token');
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('message:new', (message) => {
      setMessages((prev) => {
        const currentActive = activeRef.current;
        if (!currentActive) return prev;
        if (![message.sender_id, message.receiver_id].includes(currentActive.id)) return prev;
        return upsertMessage(prev, message);
      });

      if (message.sender_id === activeRef.current?.id) {
        socket.emit('message:delivered', { message_id: message.id });
      }

      loadThreads();
    });

    socket.on('message:typing', ({ from, is_typing }) => {
      if (from !== activeRef.current?.id) return;
      setTyping(Boolean(is_typing));
    });

    socket.on('message:delivered', ({ message_id }) => {
      setMessages((prev) => prev.map((item) => (
        item.id === message_id ? { ...item, is_delivered: true } : item
      )));
    });

    socket.on('message:deleted', ({ message_id, scope, message, user_id }) => {
      if (scope === 'everyone' && message) {
        setMessages((prev) => prev.map((item) => (item.id === message_id ? { ...item, ...message } : item)));
      }

      if (scope === 'self' && user_id === meRef.current?.id) {
        setMessages((prev) => prev.filter((item) => item.id !== message_id));
      }

      loadThreads();
    });

    socket.on('presence:update', ({ user_id, online }) => {
      setOnlineMap((prev) => ({ ...prev, [user_id]: online }));
    });

    loadThreads();
    ensureSupportThread();

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    if (!active) return;
    loadHistory(active.id);
    loadProfile(active.id);
    socketRef.current?.emit('presence:check', { user_id: active.id }, (payload) => {
      if (!payload) return;
      setOnlineMap((prev) => ({ ...prev, [payload.user_id]: payload.online }));
    });
  }, [active]);

  useEffect(() => {
    const targetUser = Number(router.query.user);
    if (!targetUser || !me) return;
    if (targetUser === me.id) return;

    const existing = threads.find((thread) => thread.id === targetUser);
    if (existing) {
      if (!active || active.id !== existing.id) setActive(existing);
      return;
    }

    (async () => {
      const profileData = await api.get(`/api/users/${targetUser}`).catch(() => null);
      if (!profileData) return;
      const starterThread = {
        id: profileData.id,
        full_name: profileData.full_name,
        avatar_url: profileData.avatar_url,
        role: profileData.role,
        phone: profileData.phone,
        address: profileData.address,
        last_message: t.startConversation || 'Start the conversation',
      };
      setThreads((prev) => [starterThread, ...prev.filter((thread) => thread.id !== starterThread.id)]);
      setActive(starterThread);
    })();
  }, [router.query.user, threads, me, active]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (!messageSearchOpen) return;
    messageSearchInputRef.current?.focus();
  }, [messageSearchOpen]);

  async function loadThreads() {
    const data = await api.get('/api/messages/threads').catch(() => []);
    let normalized = data.map((thread) => (
      supportAdminIdRef.current && thread.id === supportAdminIdRef.current ? asSupportThread(thread) : thread
    ));
    if (supportAdminIdRef.current && !normalized.some((thread) => thread.id === supportAdminIdRef.current)) {
      normalized = [
        asSupportThread({
          id: supportAdminIdRef.current,
          full_name: t.support || 'Support',
          last_message: t.chatWithSupport || 'Chat with Support',
          avatar_url: resolveAvatar({ is_support: true, display_name: 'Support', display_role: 'support' }),
        }),
        ...normalized,
      ];
    }
    setThreads(normalized);
    if (!activeRef.current && normalized[0]) setActive(normalized[0]);
  }

  async function ensureSupportThread() {
    const admin = await api.get('/api/messages/support').catch(() => null);
    if (!admin) return;

    const supportThread = asSupportThread({
      id: admin.id,
      full_name: admin.full_name,
      avatar_url: resolveAvatar({ ...admin, is_support: true, display_name: 'Support', display_role: 'support' }),
      role: admin.role,
      address: admin.address,
      phone: admin.phone,
      last_message: t.chatWithSupport || 'Chat with Support',
    });

    setSupportAdminId(admin.id);
    setThreads((prev) => {
      const exists = prev.some((item) => item.id === admin.id);
      if (!exists) return [supportThread, ...prev];
      return prev.map((item) => (item.id === admin.id ? { ...item, ...supportThread } : item));
    });
  }

  async function loadHistory(otherId) {
    const data = await api.get(`/api/messages/${otherId}`).catch(() => []);
    setMessages(data);
    data
      .filter((message) => message.sender_id === otherId && !message.is_delivered)
      .forEach((message) => socketRef.current?.emit('message:delivered', { message_id: message.id }));
  }

  async function loadProfile(userId) {
    const data = await api.get(`/api/users/${userId}`).catch(() => null);
    if (activeRef.current?.is_support && data) {
      setSupportAdminId(data.id);
      setProfile(asSupportThread(data));
      return;
    }
    setProfile(data);
  }

  function notifyTyping() {
    if (!active || !socketRef.current) return;
    socketRef.current.emit('message:typing', { receiver_id: active.id, is_typing: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('message:typing', { receiver_id: active.id, is_typing: false });
    }, 900);
  }

  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
      if (!active || !socketRef.current) {
        reject(new Error(language === 'ru' ? 'Сначала выберите диалог.' : language === 'kz' ? 'Алдымен диалогты таңдаңыз.' : 'Choose a conversation first.'));
        return;
      }

      socketRef.current.emit(
        'message:send',
        { receiver_id: active.id, ...payload },
        (response) => {
          if (!response?.ok) {
            reject(new Error(response?.error || 'Could not send message.'));
            return;
          }
          resolve(response.message);
          loadThreads();
        }
      );
    });
  }

  async function deleteForSelf(messageId) {
    await api.delete(`/api/messages/${messageId}`, { scope: 'self' });
    setMessages((prev) => prev.filter((item) => item.id !== messageId));
    loadThreads();
  }

  async function deleteForEveryone(messageId) {
    const response = await api.delete(`/api/messages/${messageId}`, { scope: 'everyone' });
    if (response?.message) {
      setMessages((prev) => prev.map((item) => (
        item.id === messageId ? { ...item, ...response.message } : item
      )));
    }
    loadThreads();
  }

  async function deleteChat() {
    if (!active) return;
    setDeleteChatOpen(true);
  }

  async function confirmDeleteChat() {
    if (!active) return;
    try {
      setDeletingChat(true);
      await api.delete(`/api/messages/conversation/${active.id}`);
      setMessages([]);
      const nextThreads = threads.filter((thread) => thread.id !== active.id);
      setThreads(nextThreads);
      setActive(nextThreads[0] || null);
      setDeleteChatOpen(false);
    } finally {
      setDeletingChat(false);
    }
  }

  async function openSupportChat() {
    try {
      setSupportLoading(true);
      const admin = await api.get('/api/messages/support');
      const supportThread = asSupportThread({
        id: admin.id,
        full_name: admin.full_name,
        avatar_url: resolveAvatar({ ...admin, is_support: true, display_name: 'Support', display_role: 'support' }),
        role: admin.role,
        address: admin.address,
        phone: admin.phone,
        last_message: t.chatWithSupport || 'Chat with Support',
      });
      setSupportAdminId(admin.id);
      setActive(supportThread);
      setThreads((prev) => {
        const exists = prev.some((item) => item.id === admin.id);
        if (!exists) return [supportThread, ...prev];
        return prev.map((item) => (item.id === admin.id ? { ...item, ...supportThread } : item));
      });
    } finally {
      setSupportLoading(false);
    }
  }

  const filteredThreads = threads.filter((thread) => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return true;
    return [thread.full_name, thread.phone, thread.address, thread.last_message]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const visibleMessages = messages.filter((message) => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return true;
    return [message.body, message.preview]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const timeline = buildTimeline(visibleMessages);
  const pinnedSupportThread = threads.find((thread) => thread.is_support || thread.display_role === 'support');

  return (
    <DashboardLayout>
      <div className="grid h-[calc(100vh-150px)] grid-cols-1 overflow-hidden rounded-[34px] border border-nanny-orange/10 bg-white shadow-[0_35px_80px_rgba(130,93,47,0.12)] md:grid-cols-[340px_1fr] xl:h-[calc(100vh-132px)]">
        <aside className="flex min-h-0 flex-col border-r border-nanny-orange/15 bg-[linear-gradient(180deg,#fffdf8_0%,#fff8ee_100%)]">
          <div className="border-b border-nanny-orange/15 px-5 py-5">
            <div className="rounded-[28px] border border-nanny-orange/15 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-nanny-deepOrange/55">{t.messagesHub || 'Messages hub'}</p>
                  <h2 className="mt-2 text-3xl font-bold text-nanny-blue">{t.inbox || 'Inbox'}</h2>
                  <p className="mt-1 text-sm opacity-70">{t.fastChat || 'Fast chat with sitters, owners and support.'}</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nanny-orange/10 text-nanny-deepOrange">
                  <Icon name="chat" className="h-5 w-5" />
                </span>
              </div>

              <div className="relative mt-4">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-nanny-brownish/45">
                </span>
                <input
                  className="input pl-12"
                  placeholder={t.search || 'Search'}
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                />
              </div>

              <button
                onClick={openSupportChat}
                className="mt-4 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-nanny-blue to-[#6282ff] px-4 py-3 text-left text-white shadow-sm transition hover:translate-y-[-1px]"
                disabled={supportLoading}
              >
                <span>
                  <span className="block text-sm font-semibold">{supportLoading ? (t.openingSupport || 'Opening support...') : (t.chatWithSupport || 'Chat with Support')}</span>
                  <span className="block text-xs text-white/75">{t.priorityHelp || 'Priority help from the Nanny team'}</span>
                </span>
                <Icon name="support" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {pinnedSupportThread && (
              <button
                type="button"
                onClick={() => setActive(pinnedSupportThread)}
                className={`mb-3 w-full rounded-[24px] border p-3 text-left transition ${
                  active?.id === pinnedSupportThread.id
                    ? 'border-nanny-blue bg-white shadow-[0_16px_40px_rgba(74,108,255,0.12)]'
                    : 'border-nanny-blue/10 bg-nanny-blue/5 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={resolveAvatar(pinnedSupportThread)}
                    alt={pinnedSupportThread.display_name || pinnedSupportThread.full_name}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-nanny-blue/60">{t.pinnedSupport || 'Pinned support'}</p>
                    <p className="truncate font-semibold text-nanny-blue">{pinnedSupportThread.display_name || pinnedSupportThread.full_name}</p>
                    <p className="truncate text-xs text-nanny-brownish/70">{t.platformPriority || 'Priority help from the platform team'}</p>
                  </div>
                </div>
              </button>
            )}

            {filteredThreads.length === 0 && <p className="p-4 text-sm opacity-60">{t.noConversations || 'No conversations match your search.'}</p>}
            <div className="space-y-2">
              {filteredThreads
                .filter((thread) => !pinnedSupportThread || thread.id !== pinnedSupportThread.id)
                .map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActive(thread)}
                  className={`w-full rounded-[24px] border px-3 py-3 text-left transition ${
                    active?.id === thread.id
                      ? 'border-nanny-blue bg-white shadow-[0_16px_40px_rgba(74,108,255,0.12)]'
                      : 'border-transparent hover:border-nanny-orange/20 hover:bg-white/85'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={resolveAvatar(thread)}
                        alt={thread.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      {onlineMap[thread.id] && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">
                          {thread.display_name || thread.full_name}
                        </span>
                        {thread.last_at && (
                          <span className="text-[11px] opacity-50">
                            {new Date(thread.last_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs opacity-70">{thread.last_message}</p>
                        {thread.unread && <span className="h-2.5 w-2.5 rounded-full bg-nanny-blue" />}
                      </div>
                      {(thread.is_support || thread.display_role === 'support') && (
                        <span className="mt-2 inline-flex rounded-full bg-nanny-blue/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-nanny-blue">
                          {t.supportBadge || 'Support'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(250,243,227,0.82)_65%,rgba(249,236,213,0.92)_100%)]">
          {active ? (
            <>
              <ChatHeader
                active={active}
                online={Boolean(onlineMap[active.id])}
                onProfileOpen={() => setProfileOpen(true)}
                onDeleteChat={deleteChat}
                messageSearchOpen={messageSearchOpen}
                messageSearch={messageSearch}
                onMessageSearchToggle={() => {
                  if (messageSearchOpen) {
                    setMessageSearchOpen(false);
                    setMessageSearch('');
                    return;
                  }
                  setMessageSearchOpen(true);
                }}
                onMessageSearchChange={setMessageSearch}
                onMessageSearchClose={() => {
                  setMessageSearchOpen(false);
                  setMessageSearch('');
                }}
                messageSearchInputRef={messageSearchInputRef}
              />

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  {timeline.map((item) => (
                    item.type === 'day' ? (
                      <div key={item.key} className="flex justify-center py-1">
                        <span className="rounded-full border border-nanny-orange/15 bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-nanny-brownish/55 shadow-sm">
                          {item.label}
                        </span>
                      </div>
                    ) : (
                      <MessageBubble
                        key={item.key}
                        message={item.message}
                        mine={item.message.sender_id === me?.id}
                        onDeleteSelf={deleteForSelf}
                        onDeleteEveryone={deleteForEveryone}
                      />
                    )
                  ))}
                  {!timeline.length && (
                    <div className="rounded-2xl border border-dashed border-nanny-orange/20 bg-white/70 p-5 text-sm opacity-60">
                      {t.noMessagesFound || 'No messages found for this search.'}
                    </div>
                  )}
                  {typing && (
                    <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-sm font-medium text-nanny-brownish/70 shadow-sm">
                      {(active.display_name || active.full_name)} {t.typing || 'is typing...'}
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              </div>

              <ChatInput disabled={!active} onSend={sendMessage} onTyping={notifyTyping} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <h3 className="text-2xl font-bold text-nanny-blue">{t.chooseConversation || 'Choose a conversation'}</h3>
                <p className="mt-2 text-sm opacity-70">{t.chooseConversationText || 'Open any owner or sitter chat to start messaging in real time.'}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <UserProfilePopup open={profileOpen} profile={profile} onClose={() => setProfileOpen(false)} />

      {deleteChatOpen && active && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4" onClick={() => !deletingChat && setDeleteChatOpen(false)}>
          <div
            className="w-full max-w-md rounded-[30px] border border-nanny-orange/15 bg-white p-6 shadow-[0_30px_90px_rgba(38,28,15,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <Icon name="chat" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-500/70">{t.deleteConversation || 'Delete conversation'}</p>
                <h3 className="mt-2 text-2xl font-bold text-nanny-deepOrange">{t.areYouSure || 'Are you sure?'}</h3>
                <p className="mt-3 text-sm leading-6 text-nanny-brownish/80">
                  {t.deletePrefix || 'This will clear the chat with'} <span className="font-semibold">{active.display_name || active.full_name}</span> {t.deleteSuffix || 'from your inbox. The action affects your conversation view and should not happen by accident.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDeleteChatOpen(false)}
                disabled={deletingChat}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={confirmDeleteChat}
                disabled={deletingChat}
              >
                {deletingChat ? (t.deleting || 'Deleting...') : (t.deleteChat || 'Delete chat')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
