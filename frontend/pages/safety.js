import DashboardLayout from '../components/DashboardLayout';
import { useLanguage } from '../lib/i18n';

export default function SafetyPage() {
  const { language } = useLanguage();
  const copy = {
    en: {
      trustEyebrow: 'Trust & safety',
      title: 'How verification works',
      docsTitle: '1. Documents',
      docsText: 'Sitters upload ID details and profile information for review.',
      reviewTitle: '2. Manual review',
      reviewText: 'Admin checks profile completeness, pricing, contact details and identity.',
      badgeTitle: '3. Verified badge',
      badgeText: 'Approved sitters show a verified signal and review history across the platform.',
      supportEyebrow: 'Support',
      supportTitle: 'How support works',
      supportItems: [
        'Support chat is available directly inside Messages.',
        'You can also open a categorized ticket in the Support center.',
        'Admins can move a case from open to in progress, resolved or closed.',
        'For safety concerns, cases can be escalated before a booking ends.',
      ],
      disputeTitle: 'Dispute situation',
      disputeItems: [
        'Keep all important communication inside the platform chat.',
        'Save booking notes, pet instructions and timing in one place.',
        'Use support chat or a support ticket as soon as something feels wrong.',
        'Admins can review booking history, sitter approval history and support logs.',
      ],
      emergencyTitle: 'Emergency contacts',
      emergencyItems: [
        'Owners and sitters should keep one backup contact in their account.',
        'Include the contact name, phone number and any useful note for support.',
        'This makes urgent walk and boarding situations easier to coordinate.',
      ],
      updateContacts: 'Update my contacts',
      openSupport: 'Open support center',
    },
    ru: {
      trustEyebrow: 'Доверие и безопасность',
      title: 'Как работает верификация',
      docsTitle: '1. Документы',
      docsText: 'Ситтер загружает документы и информацию профиля для проверки.',
      reviewTitle: '2. Ручная проверка',
      reviewText: 'Администратор проверяет полноту профиля, цены, контакты и личность.',
      badgeTitle: '3. Бейдж верификации',
      badgeText: 'Одобренные ситтеры получают знак проверки и историю отзывов по всей платформе.',
      supportEyebrow: 'Поддержка',
      supportTitle: 'Как работает поддержка',
      supportItems: [
        'Чат поддержки доступен прямо внутри раздела сообщений.',
        'Также можно открыть тикет с категорией в центре поддержки.',
        'Администраторы могут переводить кейс из open в in progress, resolved или closed.',
        'По вопросам безопасности кейсы можно эскалировать ещё до завершения бронирования.',
      ],
      disputeTitle: 'Спорная ситуация',
      disputeItems: [
        'Держите всю важную коммуникацию внутри чата платформы.',
        'Храните заметки по бронированию, инструкции по питомцу и время в одном месте.',
        'Используйте чат поддержки или тикет сразу, как только что-то кажется неправильным.',
        'Администраторы могут проверить историю бронирований, одобрения ситтера и логи поддержки.',
      ],
      emergencyTitle: 'Экстренные контакты',
      emergencyItems: [
        'У владельца и ситтера должен быть хотя бы один резервный контакт в аккаунте.',
        'Добавьте имя контакта, номер телефона и полезную заметку для поддержки.',
        'Так проще координировать срочные прогулки и передержку.',
      ],
      updateContacts: 'Обновить контакты',
      openSupport: 'Открыть центр поддержки',
    },
    kz: {
      trustEyebrow: 'Сенім және қауіпсіздік',
      title: 'Тексеру қалай жұмыс істейді',
      docsTitle: '1. Құжаттар',
      docsText: 'Ситтер тексеру үшін құжаттары мен профиль ақпаратын жүктейді.',
      reviewTitle: '2. Қолмен тексеру',
      reviewText: 'Әкімші профиль толықтығын, бағаны, байланыс мәліметтерін және жеке басын тексереді.',
      badgeTitle: '3. Тексеру бейджі',
      badgeText: 'Мақұлданған ситтерлер платформада тексерілген белгісі мен пікір тарихын көрсетеді.',
      supportEyebrow: 'Қолдау',
      supportTitle: 'Қолдау қалай жұмыс істейді',
      supportItems: [
        'Қолдау чаты хабарламалар бөлімінің ішінде қолжетімді.',
        'Сонымен қатар қолдау орталығында санатталған тикет ашуға болады.',
        'Әкімшілер істі open, in progress, resolved немесе closed күйіне ауыстыра алады.',
        'Қауіпсіздікке қатысты жағдайлар бронь аяқталмай тұрып эскалациялануы мүмкін.',
      ],
      disputeTitle: 'Даулы жағдай',
      disputeItems: [
        'Барлық маңызды байланысты платформа чатының ішінде жүргізіңіз.',
        'Бронь жазбаларын, жануар нұсқауларын және уақытты бір жерде сақтаңыз.',
        'Бірдеңе дұрыс емес болып көрінсе, бірден қолдау чатын не тикетті пайдаланыңыз.',
        'Әкімшілер бронь тарихын, ситтерді мақұлдау тарихын және қолдау журналдарын тексере алады.',
      ],
      emergencyTitle: 'Шұғыл байланыстар',
      emergencyItems: [
        'Ие мен ситтер аккаунтында кемінде бір резервтік байланыс болуы керек.',
        'Қолдау үшін контакт аты, телефон нөмірі және пайдалы ескертпені қосыңыз.',
        'Бұл шұғыл серуен мен уақытша күтім жағдайларын үйлестіруді жеңілдетеді.',
      ],
      updateContacts: 'Контактілерді жаңарту',
      openSupport: 'Қолдау орталығын ашу',
    },
  }[language] || {
    trustEyebrow: 'Trust & safety',
    title: 'How verification works',
    docsTitle: '1. Documents',
    docsText: 'Sitters upload ID details and profile information for review.',
    reviewTitle: '2. Manual review',
    reviewText: 'Admin checks profile completeness, pricing, contact details and identity.',
    badgeTitle: '3. Verified badge',
    badgeText: 'Approved sitters show a verified signal and review history across the platform.',
    supportEyebrow: 'Support',
    supportTitle: 'How support works',
    supportItems: [],
    disputeTitle: 'Dispute situation',
    disputeItems: [],
    emergencyTitle: 'Emergency contacts',
    emergencyItems: [],
    updateContacts: 'Update my contacts',
    openSupport: 'Open support center',
  };

  return (
    <DashboardLayout title="Safety center">
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
        <section className="card">
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">{copy.trustEyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold text-nanny-blue">{copy.title}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
              <p className="font-semibold text-nanny-deepOrange">{copy.docsTitle}</p>
              <p className="mt-2 text-sm opacity-75">{copy.docsText}</p>
            </div>
            <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
              <p className="font-semibold text-nanny-deepOrange">{copy.reviewTitle}</p>
              <p className="mt-2 text-sm opacity-75">{copy.reviewText}</p>
            </div>
            <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
              <p className="font-semibold text-nanny-deepOrange">{copy.badgeTitle}</p>
              <p className="mt-2 text-sm opacity-75">{copy.badgeText}</p>
            </div>
          </div>
        </section>

        <section className="card">
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">{copy.supportEyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-nanny-deepOrange">{copy.supportTitle}</h2>
          <div className="mt-4 space-y-3 text-sm opacity-80">
            {copy.supportItems.map((item) => <p key={item}>{item}</p>)}
          </div>
        </section>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-bold text-nanny-deepOrange">{copy.disputeTitle}</h3>
          <div className="mt-4 space-y-3 text-sm opacity-80">
            {copy.disputeItems.map((item) => <p key={item}>{item}</p>)}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-nanny-deepOrange">{copy.emergencyTitle}</h3>
          <div className="mt-4 space-y-3 text-sm opacity-80">
            {copy.emergencyItems.map((item) => <p key={item}>{item}</p>)}
          </div>
          <div className="mt-4 flex gap-3">
            <a href="/dashboard" className="btn-secondary">{copy.updateContacts}</a>
            <a href="/support" className="btn-ghost">{copy.openSupport}</a>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
