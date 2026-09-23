import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../lib/api';
import { useLanguage } from '../lib/i18n';

const CATEGORIES = ['booking_issue', 'payment_issue', 'safety_concern', 'sitter_report', 'shop_order', 'technical_issue', 'other'];

export default function SupportPage() {
  const { language } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastCreatedTicket, setLastCreatedTicket] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    category: 'booking_issue',
    priority: 'normal',
    subject: '',
    body: '',
  });

  const copy = {
    en: {
      needHelp: 'Need help?',
      openRequest: 'Open a support request',
      intro: 'Choose an issue category, describe the problem and support will pick it up in the admin queue.',
      issueCategory: 'Issue category',
      priority: 'Priority',
      subject: 'Subject',
      subjectPlaceholder: 'Short title, for example: Refund for cancelled toy order',
      subjectHelp: 'Keep it short and specific so support can route the issue faster.',
      whatHappened: 'What happened',
      bodyPlaceholder: 'Explain what happened, which booking or order is affected, when it happened, and what result you expect from support.',
      bodyHelp: 'Helpful details: booking dates, sitter name, order number, payment amount, screenshots or what support should do next.',
      createTicket: 'Create ticket',
      sending: 'Sending...',
      success: 'Support request created.',
      completeFields: 'Please complete the highlighted fields.',
      noTickets: 'No support requests yet.',
      yourTickets: 'Your tickets',
      escalation: 'Escalation flow',
      flow: [
        '1. Open a ticket or message support in chat.',
        '2. Admin assigns status and reviews the details.',
        '3. Safety and dispute issues can be escalated for manual review.',
        '4. Resolution notes stay visible in your support history.',
      ],
      categoryLabels: {
        booking_issue: 'Booking issue',
        payment_issue: 'Payment issue',
        safety_concern: 'Safety concern',
        sitter_report: 'Sitter report',
        shop_order: 'Shop order',
        technical_issue: 'Technical issue',
        other: 'Other',
      },
      categoryHelp: {
        booking_issue: 'Use this for booking confirmation, cancellation, timing or sitter no-show issues.',
        payment_issue: 'Use this for card charges, refunds, duplicate payments or failed checkout.',
        safety_concern: 'Use this if something felt unsafe for you, your pet or the sitter.',
        sitter_report: 'Use this to report unprofessional behavior, incomplete profile details or poor care.',
        shop_order: 'Use this for delivery delays, wrong items, damaged items or address problems.',
        technical_issue: 'Use this for bugs, upload problems, chat issues or pages not working correctly.',
        other: 'Use this if your issue does not fit the other categories.',
      },
      priorityLabels: { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' },
      priorityHelp: {
        low: 'General question, no urgent action needed.',
        normal: 'Standard issue that needs support review soon.',
        high: 'Important issue affecting an active booking or order.',
        urgent: 'Use only for safety-critical or time-sensitive problems.',
      },
      fieldMessages: {
        emptySubject: 'Add a short subject for your request.',
        shortSubject: 'Subject should be at least 3 characters.',
        emptyBody: 'Describe what happened so support can help you.',
        shortBody: 'Please add a little more detail so support can understand the issue.',
      },
    },
    ru: {
      needHelp: 'Нужна помощь?',
      openRequest: 'Открыть запрос в поддержку',
      intro: 'Выберите категорию проблемы, опишите ситуацию, и поддержка возьмёт её в админ-очередь.',
      issueCategory: 'Категория проблемы',
      priority: 'Приоритет',
      subject: 'Тема',
      subjectPlaceholder: 'Коротко, например: Возврат за отменённый заказ игрушки',
      subjectHelp: 'Короткая и точная тема помогает быстрее направить запрос.',
      whatHappened: 'Что произошло',
      bodyPlaceholder: 'Опишите, что случилось, какой заказ или бронирование затронуто, когда это произошло и какой результат вы ожидаете.',
      bodyHelp: 'Полезно указать даты бронирования, имя ситтера, номер заказа, сумму оплаты, скриншоты и что именно должна сделать поддержка.',
      createTicket: 'Создать тикет',
      sending: 'Отправка...',
      success: 'Запрос в поддержку создан.',
      completeFields: 'Пожалуйста, заполните выделенные поля.',
      noTickets: 'Пока нет запросов в поддержку.',
      yourTickets: 'Ваши тикеты',
      escalation: 'Как проходит эскалация',
      flow: [
        '1. Откройте тикет или напишите поддержке в чате.',
        '2. Администратор назначит статус и просмотрит детали.',
        '3. Вопросы безопасности и споры могут быть отправлены на ручную проверку.',
        '4. Итоговые заметки останутся в истории поддержки.',
      ],
      categoryLabels: {
        booking_issue: 'Проблема с бронированием',
        payment_issue: 'Проблема с оплатой',
        safety_concern: 'Вопрос безопасности',
        sitter_report: 'Жалоба на ситтера',
        shop_order: 'Заказ из магазина',
        technical_issue: 'Техническая проблема',
        other: 'Другое',
      },
      categoryHelp: {
        booking_issue: 'Используйте для подтверждения, отмены, времени или невыхода ситтера.',
        payment_issue: 'Используйте для списаний с карты, возвратов, дублей оплаты или неудачной оплаты.',
        safety_concern: 'Используйте, если ситуация показалась небезопасной для вас, питомца или ситтера.',
        sitter_report: 'Используйте для жалобы на непрофессиональное поведение, неполный профиль или плохой уход.',
        shop_order: 'Используйте для задержек доставки, неверного товара, повреждений или проблем с адресом.',
        technical_issue: 'Используйте для багов, проблем с загрузкой, чатом или неработающими страницами.',
        other: 'Используйте, если проблема не подходит ни к одной из категорий.',
      },
      priorityLabels: { low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочный' },
      priorityHelp: {
        low: 'Обычный вопрос, без срочного действия.',
        normal: 'Стандартная проблема, которую поддержке нужно проверить в ближайшее время.',
        high: 'Важная проблема, влияющая на активный заказ или бронирование.',
        urgent: 'Только для критичных по времени или безопасности ситуаций.',
      },
      fieldMessages: {
        emptySubject: 'Добавьте короткую тему запроса.',
        shortSubject: 'Тема должна содержать минимум 3 символа.',
        emptyBody: 'Опишите ситуацию, чтобы поддержка могла помочь.',
        shortBody: 'Добавьте чуть больше деталей, чтобы поддержка поняла проблему.',
      },
    },
    kz: {
      needHelp: 'Көмек керек пе?',
      openRequest: 'Қолдау сұрауын ашу',
      intro: 'Мәселе санатын таңдаңыз, жағдайды сипаттаңыз, сонда қолдау оны әкімші кезегіне алады.',
      issueCategory: 'Мәселе санаты',
      priority: 'Басымдық',
      subject: 'Тақырып',
      subjectPlaceholder: 'Қысқа жазыңыз, мысалы: Бас тартылған ойыншық тапсырысына қайтарым',
      subjectHelp: 'Қысқа әрі нақты тақырып сұрауды тезірек бағыттауға көмектеседі.',
      whatHappened: 'Не болды',
      bodyPlaceholder: 'Не болғанын, қай бронь не тапсырысқа қатысты екенін, қашан болғанын және қандай нәтиже күтетіндігіңізді жазыңыз.',
      bodyHelp: 'Пайдалы мәліметтер: бронь күндері, ситтер аты, тапсырыс нөмірі, төлем сомасы, скриншоттар және қолдаудан не күтетініңіз.',
      createTicket: 'Тикет ашу',
      sending: 'Жіберілуде...',
      success: 'Қолдау сұрауы жасалды.',
      completeFields: 'Белгіленген өрістерді толтырыңыз.',
      noTickets: 'Әзірге қолдау сұраулары жоқ.',
      yourTickets: 'Сіздің тикеттеріңіз',
      escalation: 'Эскалация барысы',
      flow: [
        '1. Тикет ашыңыз немесе қолдауға чатта жазыңыз.',
        '2. Әкімші статус қойып, мәліметтерді қарайды.',
        '3. Қауіпсіздік пен даулы жағдайлар қолмен тексеруге жіберілуі мүмкін.',
        '4. Қорытынды жазбалар қолдау тарихында сақталады.',
      ],
      categoryLabels: {
        booking_issue: 'Бронь мәселесі',
        payment_issue: 'Төлем мәселесі',
        safety_concern: 'Қауіпсіздік мәселесі',
        sitter_report: 'Ситтерге шағым',
        shop_order: 'Дүкен тапсырысы',
        technical_issue: 'Техникалық мәселе',
        other: 'Басқа',
      },
      categoryHelp: {
        booking_issue: 'Броньды растау, болдырмау, уақыт немесе ситтердің келмеуі үшін қолданыңыз.',
        payment_issue: 'Картадан ақша шешілуі, қайтарым, қайталанған төлем не төлем қатесі үшін қолданыңыз.',
        safety_concern: 'Сізге, питомецке немесе ситтерге қауіпті көрінген жағдай болса осыны таңдаңыз.',
        sitter_report: 'Кәсіби емес әрекет, толық емес профиль немесе нашар күтім туралы шағым үшін қолданыңыз.',
        shop_order: 'Жеткізу кешігуі, қате тауар, зақым немесе мекенжай мәселелері үшін қолданыңыз.',
        technical_issue: 'Багтар, жүктеу, чат немесе істемейтін беттер үшін қолданыңыз.',
        other: 'Мәселе басқа санаттарға сәйкес келмесе осыны таңдаңыз.',
      },
      priorityLabels: { low: 'Төмен', normal: 'Қалыпты', high: 'Жоғары', urgent: 'Шұғыл' },
      priorityHelp: {
        low: 'Жай сұрақ, шұғыл әрекет қажет емес.',
        normal: 'Қолдау жақын уақытта қарауы тиіс стандартты мәселе.',
        high: 'Белсенді бронь не тапсырысқа әсер ететін маңызды мәселе.',
        urgent: 'Тек қауіпсіздікке не уақытқа аса сезімтал жағдайларға.',
      },
      fieldMessages: {
        emptySubject: 'Сұраудың қысқа тақырыбын жазыңыз.',
        shortSubject: 'Тақырып кемінде 3 таңбадан тұруы керек.',
        emptyBody: 'Қолдау көмектесе алуы үшін жағдайды сипаттаңыз.',
        shortBody: 'Қолдау мәселені түсінуі үшін сәл көбірек мәлімет қосыңыз.',
      },
    },
  }[language];

  async function loadTickets() {
    const data = await api.get('/api/support/tickets').catch(() => []);
    setTickets(data);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  function clearFieldError(name) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function submitTicket(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setFieldErrors({});

    const nextErrors = {};
    if (!form.subject.trim()) nextErrors.subject = copy.fieldMessages.emptySubject;
    else if (form.subject.trim().length < 3) nextErrors.subject = copy.fieldMessages.shortSubject;

    if (!form.body.trim()) nextErrors.body = copy.fieldMessages.emptyBody;
    else if (form.body.trim().length < 10) nextErrors.body = copy.fieldMessages.shortBody;

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError(copy.completeFields);
      setSaving(false);
      return;
    }

    try {
      const created = await api.post('/api/support/tickets', {
        ...form,
        subject: form.subject.trim(),
        body: form.body.trim(),
      });
      setLastCreatedTicket(created);
      setForm({ category: 'booking_issue', priority: 'normal', subject: '', body: '' });
      setSuccess(copy.success);
      await loadTickets();
    } catch (err) {
      setError(err.message || (language === 'ru' ? 'Не удалось создать тикет поддержки.' : language === 'kz' ? 'Қолдау тикетін жасау сәтсіз аяқталды.' : 'Failed to create support ticket.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout title={language === 'ru' ? 'Центр поддержки' : language === 'kz' ? 'Қолдау орталығы' : 'Support center'}>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="card">
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">{copy.needHelp}</p>
          <h2 className="mt-2 text-3xl font-bold text-nanny-blue">{copy.openRequest}</h2>
          <p className="mt-3 text-sm opacity-75">
            {copy.intro}
          </p>

          {lastCreatedTicket?.ai_triage && (
            <div className="mt-5 rounded-3xl border border-nanny-blue/10 bg-[#f5f7ff] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-nanny-blue/70">{language === 'ru' ? 'ИИ-помощник поддержки' : language === 'kz' ? 'Қолдаудың ЖИ көмекшісі' : 'AI support assistant'}</p>
              <p className="mt-2 text-sm text-nanny-brownish">{lastCreatedTicket.ai_triage.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="badge bg-white text-nanny-brownish">
                  {language === 'ru' ? 'Предложенная категория:' : language === 'kz' ? 'Ұсынылған санат:' : 'Suggested category:'} {copy.categoryLabels[lastCreatedTicket.ai_triage.suggested_category] || lastCreatedTicket.ai_triage.suggested_category.replace('_', ' ')}
                </span>
                <span className="badge bg-white text-nanny-brownish">
                  {language === 'ru' ? 'Предложенный приоритет:' : language === 'kz' ? 'Ұсынылған басымдық:' : 'Suggested priority:'} {copy.priorityLabels[lastCreatedTicket.ai_triage.suggested_priority] || lastCreatedTicket.ai_triage.suggested_priority}
                </span>
              </div>
              {lastCreatedTicket.ai_triage.first_reply && (
                <p className="mt-3 text-sm opacity-75">{lastCreatedTicket.ai_triage.first_reply}</p>
              )}
            </div>
          )}

          <form onSubmit={submitTicket} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{copy.issueCategory}</label>
                <div className="relative">
                  <select
                    className="input appearance-none pr-12"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((value) => (
                      <option key={value} value={value}>{copy.categoryLabels[value]}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-nanny-brownish/45">⌄</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-nanny-brownish/60">{copy.categoryHelp[form.category]}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{copy.priority}</label>
                <div className="relative">
                  <select
                    className="input appearance-none pr-12"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">{copy.priorityLabels.low}</option>
                    <option value="normal">{copy.priorityLabels.normal}</option>
                    <option value="high">{copy.priorityLabels.high}</option>
                    <option value="urgent">{copy.priorityLabels.urgent}</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-nanny-brownish/45">⌄</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-nanny-brownish/60">{copy.priorityHelp[form.priority]}</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{copy.subject}</label>
              <input
                className={`input ${fieldErrors.subject ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                placeholder={copy.subjectPlaceholder}
                value={form.subject}
                onChange={(e) => {
                  setForm({ ...form, subject: e.target.value });
                  clearFieldError('subject');
                }}
              />
              <p className={`mt-2 text-xs leading-5 ${fieldErrors.subject ? 'text-red-600' : 'text-nanny-brownish/60'}`}>
                {fieldErrors.subject || copy.subjectHelp}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-nanny-deepOrange">{copy.whatHappened}</label>
              <textarea
                className={`input min-h-[180px] ${fieldErrors.body ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                placeholder={copy.bodyPlaceholder}
                value={form.body}
                onChange={(e) => {
                  setForm({ ...form, body: e.target.value });
                  clearFieldError('body');
                }}
              />
              <p className={`mt-2 text-xs leading-5 ${fieldErrors.body ? 'text-red-600' : 'text-nanny-brownish/60'}`}>
                {fieldErrors.body || copy.bodyHelp}
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? copy.sending : copy.createTicket}
            </button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="card">
            <p className="text-xs uppercase tracking-[0.22em] opacity-60">{copy.escalation}</p>
            <div className="mt-4 space-y-3 text-sm opacity-80">
              {copy.flow.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-nanny-deepOrange">{copy.yourTickets}</h3>
            <div className="mt-4 space-y-3">
              {tickets.length === 0 && <p className="text-sm opacity-60">{copy.noTickets}</p>}
              {tickets.map((ticket) => (
                <article key={ticket.id} className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{ticket.subject}</p>
                    <span className="badge bg-white text-nanny-brownish capitalize">{ticket.status.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-55">{copy.categoryLabels[ticket.category] || ticket.category.replace('_', ' ')}</p>
                  <p className="mt-3 text-sm opacity-80 whitespace-pre-line">{ticket.body}</p>
                  {(ticket.ai_summary || ticket.ai_first_reply || ticket.ai_suggested_category || ticket.ai_suggested_priority) && (
                    <div className="mt-3 rounded-xl border border-nanny-blue/10 bg-[#f5f7ff] p-3 text-sm">
                      <p className="font-semibold text-nanny-blue">AI triage</p>
                      {ticket.ai_summary && <p className="mt-2 opacity-80">{ticket.ai_summary}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {ticket.ai_suggested_category && (
                          <span className="badge bg-white text-nanny-brownish">
                            {ticket.ai_suggested_category.replace('_', ' ')}
                          </span>
                        )}
                        {ticket.ai_suggested_priority && (
                          <span className="badge bg-white text-nanny-brownish">
                            {ticket.ai_suggested_priority}
                          </span>
                        )}
                      </div>
                      {ticket.ai_first_reply && <p className="mt-3 opacity-75">{ticket.ai_first_reply}</p>}
                    </div>
                  )}
                  {ticket.resolution_note && (
                    <div className="mt-3 rounded-xl bg-nanny-cream/70 p-3 text-sm">
                      <p className="font-semibold">Resolution note</p>
                      <p className="mt-1 opacity-80">{ticket.resolution_note}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
