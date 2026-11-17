import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TEXT = {
  title: { en: 'Telegram notifications', ru: 'Уведомления в Telegram', kz: 'Telegram хабарламалары' },
  text: {
    en: 'Get new requests, confirmations, cancellations and messages straight to Telegram.',
    ru: 'Новые заявки, подтверждения, отмены и сообщения будут приходить прямо в Telegram.',
    kz: 'Жаңа өтінімдер, растаулар, бас тартулар мен хабарламалар тікелей Telegram-ға келеді.',
  },
  connect: { en: 'Connect Telegram', ru: 'Подключить Telegram', kz: 'Telegram қосу' },
  waiting: {
    en: 'Telegram opened in a new tab. Press "Start" in the bot, then come back here.',
    ru: 'Telegram открылся в новой вкладке. Нажмите «Start» (Запустить) в боте и вернитесь сюда.',
    kz: 'Telegram жаңа бетте ашылды. Боттағы «Start» батырмасын басып, осында оралыңыз.',
  },
  connected: { en: 'Connected', ru: 'Подключено', kz: 'Қосылды' },
  test: { en: 'Send a test', ru: 'Отправить тест', kz: 'Тест жіберу' },
  testSent: { en: 'Test sent, check Telegram.', ru: 'Тест отправлен, проверьте Telegram.', kz: 'Тест жіберілді, Telegram-ды тексеріңіз.' },
  disconnect: { en: 'Disconnect', ru: 'Отключить', kz: 'Ажырату' },
  check: { en: 'I pressed Start', ru: 'Я нажал(а) Start', kz: 'Start бастым' },
  notYet: { en: 'Not connected yet. Press Start in the bot and try again.', ru: 'Пока не подключено. Нажмите Start в боте и попробуйте ещё раз.', kz: 'Әлі қосылмады. Боттағы Start басып, қайталап көріңіз.' },
};
const tx = (key, language) => TEXT[key]?.[language] || TEXT[key]?.en || key;

export default function TelegramConnectCard({ language }) {
  const [status, setStatus] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    try {
      const data = await api.get('/api/telegram/status');
      setStatus(data);
      return data;
    } catch {
      setStatus({ enabled: false });
      return null;
    }
  }

  useEffect(() => { loadStatus(); }, []);

  // While waiting for the user to press Start, check every few seconds.
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(async () => {
      const data = await loadStatus();
      if (data?.connected) { setWaiting(false); setNote(''); }
    }, 4000);
    return () => clearInterval(timer);
  }, [waiting]);

  if (!status || !status.enabled) return null;

  async function connect() {
    // Open the tab right away (browsers block popups opened after an await), then point it at the bot.
    const tab = window.open('', '_blank');
    setBusy(true);
    setNote('');
    try {
      const { url } = await api.post('/api/telegram/link', {});
      if (tab) tab.location.href = url; else window.location.href = url;
      setWaiting(true);
    } catch (err) {
      if (tab) tab.close();
      setNote(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    const data = await loadStatus();
    if (data?.connected) { setWaiting(false); setNote(''); } else setNote(tx('notYet', language));
  }

  async function sendTest() {
    setBusy(true);
    try { await api.post('/api/telegram/test', {}); setNote(tx('testSent', language)); }
    catch (err) { setNote(err.message); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true);
    try { await api.delete('/api/telegram/link'); await loadStatus(); setNote(''); }
    catch (err) { setNote(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-nanny-deepOrange">{tx('title', language)}</h3>
          <p className="mt-2 text-sm opacity-75">{tx('text', language)}</p>
        </div>
        {status.connected && (
          <span className="badge shrink-0 bg-green-100 text-green-700">✓ {tx('connected', language)}</span>
        )}
      </div>

      {status.connected ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn-ghost" disabled={busy} onClick={sendTest}>{tx('test', language)}</button>
          <button type="button" className="btn-ghost text-red-600" disabled={busy} onClick={disconnect}>{tx('disconnect', language)}</button>
        </div>
      ) : (
        <div className="mt-4">
          <button type="button" className="btn-primary" disabled={busy} onClick={connect}>{tx('connect', language)}</button>
          {waiting && (
            <div className="mt-3 rounded-2xl border border-nanny-orange/15 bg-nanny-cream/45 px-4 py-3 text-sm">
              <p>{tx('waiting', language)}</p>
              <button type="button" className="btn-ghost mt-3 text-sm" onClick={checkNow}>{tx('check', language)}</button>
            </div>
          )}
        </div>
      )}
      {note && <p className="mt-3 text-sm opacity-80">{note}</p>}
      {status.bot_username && <p className="mt-3 text-xs opacity-50">@{status.bot_username}</p>}
    </div>
  );
}
