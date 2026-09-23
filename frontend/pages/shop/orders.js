import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { absoluteAssetUrl, api, currentUser } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import {
  SHOP_ORDER_STATUSES,
  SHOP_ORDER_STATUS_META,
  STORE_INFO,
  handleProductImageError,
  parseCheckoutAddress,
} from '../../lib/shop';

function StatusRail({ status, t }) {
  const activeIndex = Math.max(SHOP_ORDER_STATUSES.indexOf(status), 0);

  return (
    <div className="grid gap-2 md:grid-cols-4">
      {SHOP_ORDER_STATUSES.slice(0, 4).map((step, index) => {
        const meta = SHOP_ORDER_STATUS_META[step];
        const isActive = index <= activeIndex && status !== 'cancelled';
        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isActive
                ? 'border-nanny-orange/25 bg-nanny-cream/60'
                : 'border-nanny-orange/10 bg-white'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-55">{t.statusMeta?.[step]?.label || meta.label}</p>
            <p className="mt-1 text-xs opacity-70">{t.statusMeta?.[step]?.description || meta.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, isAdmin = false, onStatusChange, t }) {
  const details = parseCheckoutAddress(order.address);

  return (
    <div className="card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-bold">{t.order} #{order.id}</div>
          <div className="text-xs opacity-70">{new Date(order.created_at).toLocaleString()}</div>
          {isAdmin && (
            <div className="mt-2 text-sm opacity-80">
              {order.full_name} • {order.phone || t.noPhone} • {order.email}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-bold">{Number(order.total).toLocaleString()} ₸</div>
          {!isAdmin ? (
            <span className={`badge ${SHOP_ORDER_STATUS_META[order.status]?.tone || 'bg-nanny-yellow/80'}`}>
              {t.statusMeta?.[order.status]?.label || SHOP_ORDER_STATUS_META[order.status]?.label || order.status}
            </span>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <span className={`badge ${SHOP_ORDER_STATUS_META[order.status]?.tone || 'bg-nanny-yellow/80'}`}>
                {t.statusMeta?.[order.status]?.label || SHOP_ORDER_STATUS_META[order.status]?.label || order.status}
              </span>
              <select
                className="input min-w-[180px]"
                value={order.status}
                onChange={(e) => onStatusChange(order.id, e.target.value)}
              >
                {SHOP_ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{t.statusMeta?.[status]?.label || status}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {order.status !== 'cancelled' ? (
        <div className="mt-4">
          <StatusRail status={order.status} t={t} />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.cancelledHelp}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-nanny-orange/15 bg-nanny-cream/40 p-3 text-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-nanny-brownish/50">{t.payment}</p>
          <p className="mt-1 font-semibold">{order.payment_status || t.pending}</p>
          <p className="mt-1 text-nanny-brownish/70">{order.payment_method || t.card}</p>
        </div>
        <div className="rounded-xl border border-nanny-orange/15 bg-nanny-cream/40 p-3 text-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-nanny-brownish/50">{t.receiptEmail}</p>
          <p className="mt-1 font-semibold">{order.customer_email || order.email || t.notSpecified}</p>
        </div>
        <div className="rounded-xl border border-nanny-orange/15 bg-nanny-cream/40 p-3 text-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-nanny-brownish/50">{t.cardLabel}</p>
          <p className="mt-1 font-semibold">{order.payment_last4 ? `•••• ${order.payment_last4}` : t.hidden}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-nanny-orange/15 bg-white p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] opacity-55">
                {isAdmin ? t.destinationRecipient : t.whereOrderWillGo}
              </p>
              <h3 className="mt-1 text-lg font-bold text-nanny-deepOrange">
                {details.delivery || t.deliveryDetails}
              </h3>
            </div>
            <span className="badge bg-white text-nanny-brownish">
              {details.address || (details.delivery?.toLowerCase().includes('pickup') ? t.pickupFromShop : t.addressWillBeConfirmed)}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-xl bg-nanny-cream/45 p-3">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.recipient}</p>
              <p className="mt-1 font-semibold">{details.recipient || order.customer_name || order.full_name || t.notSpecified}</p>
            </div>
            <div className="rounded-xl bg-nanny-cream/45 p-3">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">{t.phone}</p>
              <p className="mt-1 font-semibold">{details.phone || order.customer_phone || order.phone || t.notSpecified}</p>
            </div>
            <div className="rounded-xl bg-nanny-cream/45 p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">
                {details.delivery?.toLowerCase().includes('pickup') ? t.pickupDetails : t.deliveryAddress}
              </p>
              <p className="mt-1 font-semibold">{details.address || t.shopTeamWillConfirm}</p>
              {details.notes && <p className="mt-2 text-nanny-brownish/70">{t.notes}: {details.notes}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-nanny-orange/15 bg-nanny-cream/45 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.22em] opacity-55">{t.needHelp}</p>
          <h3 className="mt-1 text-lg font-bold text-nanny-deepOrange">
            {isAdmin ? t.shopOperationsContact : t.shopContact}
          </h3>
          <div className="mt-3 space-y-2">
            <p><span className="font-semibold">{t.store}</span> {STORE_INFO.name}</p>
            <p><span className="font-semibold">{t.phone}</span> <a className="text-nanny-blue hover:underline" href={`tel:${STORE_INFO.phone}`}>{STORE_INFO.phone}</a></p>
            <p><span className="font-semibold">{t.address}</span> {STORE_INFO.address}</p>
            <p><span className="font-semibold">{t.hours}</span> {STORE_INFO.hours}</p>
          </div>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-nanny-orange/10">
        {order.items?.map((item) => (
          <li key={item.id} className="flex gap-3 py-2 items-center">
            <img
              src={absoluteAssetUrl(item.image_url)}
              alt={item.title}
              className="w-10 h-10 rounded object-cover"
              onError={handleProductImageError}
            />
            <span className="flex-1 text-sm">{item.title}</span>
            <span className="text-sm opacity-70">× {item.quantity}</span>
            <span className="text-sm font-semibold">
              {(Number(item.unit_price) * item.quantity).toLocaleString()} ₸
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Orders() {
  const { language } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [viewerRole, setViewerRole] = useState(null);
  const t = {
    en: {
      order: 'Order',
      noPhone: 'no phone',
      cancelledHelp: 'This order was cancelled. Contact the shop if you need help placing a new one.',
      payment: 'Payment',
      pending: 'pending',
      card: 'card',
      receiptEmail: 'Receipt email',
      cardLabel: 'Card',
      hidden: 'Hidden',
      destinationRecipient: 'Destination / recipient',
      whereOrderWillGo: 'Where your order will go',
      deliveryDetails: 'Delivery details',
      pickupFromShop: 'Pickup from shop',
      addressWillBeConfirmed: 'Address will be confirmed',
      recipient: 'Recipient',
      phone: 'Phone:',
      deliveryAddress: 'Delivery address',
      pickupDetails: 'Pickup details',
      shopTeamWillConfirm: 'The shop team will confirm the exact destination with you.',
      notes: 'Notes',
      needHelp: 'Need help?',
      shopOperationsContact: 'Shop operations contact',
      shopContact: 'Shop contact',
      store: 'Store:',
      address: 'Address:',
      hours: 'Hours:',
      paidSuccess: 'has been paid successfully.',
      trackOrderText: `You can track it on this page. A payment confirmation was sent to your email, and the shop team will contact you at ${STORE_INFO.phone} if delivery details need clarification.`,
      monitoring: 'Order monitoring',
      whereSeeOrder: 'Where to see your order',
      allCustomerOrders: 'All customer shop orders are shown on this page',
      allYourOrders: 'All your shop orders are shown on this page',
      adminDesc: 'As admin, you monitor all orders here: payment state, recipient details, delivery destination, item list and order status progression.',
      ownerDesc: 'After payment, the order appears here with its full status, recipient details, delivery destination or pickup method, payment info and shop contact details.',
      shop: 'Shop:',
      backToShop: 'Back to shop',
      contactSupport: 'Contact support',
      openAdmin: 'Open admin panel',
      noPlatformOrders: 'No platform orders yet',
      noOrdersYet: 'No orders yet',
      noPlatformOrdersText: 'When customers place shop orders, they will appear here for monitoring and status updates.',
      noOrdersText: 'When you place a shop order, it will appear here with delivery and payment details.',
      notSpecified: 'Not specified',
      statusMeta: {},
    },
    ru: {
      order: 'Заказ',
      noPhone: 'нет телефона',
      cancelledHelp: 'Этот заказ был отменён. Свяжитесь с магазином, если нужна помощь с новым заказом.',
      payment: 'Оплата',
      pending: 'ожидается',
      card: 'карта',
      receiptEmail: 'Email для чека',
      cardLabel: 'Карта',
      hidden: 'Скрыто',
      destinationRecipient: 'Назначение / получатель',
      whereOrderWillGo: 'Куда будет отправлен заказ',
      deliveryDetails: 'Детали доставки',
      pickupFromShop: 'Самовывоз из магазина',
      addressWillBeConfirmed: 'Адрес будет подтверждён',
      recipient: 'Получатель',
      phone: 'Телефон:',
      deliveryAddress: 'Адрес доставки',
      pickupDetails: 'Детали самовывоза',
      shopTeamWillConfirm: 'Команда магазина уточнит точное место назначения вместе с вами.',
      notes: 'Заметки',
      needHelp: 'Нужна помощь?',
      shopOperationsContact: 'Контакт по операциям магазина',
      shopContact: 'Контакт магазина',
      store: 'Магазин:',
      address: 'Адрес:',
      hours: 'Часы:',
      paidSuccess: 'успешно оплачен.',
      trackOrderText: `Вы можете отслеживать его на этой странице. Подтверждение оплаты отправлено на email, а команда магазина свяжется с вами по номеру ${STORE_INFO.phone}, если нужно уточнить доставку.`,
      monitoring: 'Мониторинг заказов',
      whereSeeOrder: 'Где смотреть заказ',
      allCustomerOrders: 'Все заказы клиентов магазина показаны на этой странице',
      allYourOrders: 'Все ваши заказы магазина показаны на этой странице',
      adminDesc: 'Как администратор, вы видите здесь все заказы: оплату, получателя, точку доставки, состав заказа и движение по статусам.',
      ownerDesc: 'После оплаты заказ появится здесь со статусом, получателем, адресом доставки или самовывозом, данными оплаты и контактами магазина.',
      shop: 'Магазин:',
      backToShop: 'Назад в магазин',
      contactSupport: 'Связаться с поддержкой',
      openAdmin: 'Открыть админ-панель',
      noPlatformOrders: 'Пока нет заказов по платформе',
      noOrdersYet: 'Пока нет заказов',
      noPlatformOrdersText: 'Когда клиенты начнут оформлять заказы, они появятся здесь для мониторинга и обновления статусов.',
      noOrdersText: 'Когда вы оформите заказ в магазине, он появится здесь с доставкой и данными оплаты.',
      notSpecified: 'Не указано',
      statusMeta: {
        pending: { label: 'Ожидает', description: 'Заказ создан и ждёт обработки магазином.' },
        paid: { label: 'Оплачен', description: 'Оплата подтверждена, заказ готовится.' },
        shipped: { label: 'Отправлен', description: 'Заказ передан в доставку или готов к выдаче.' },
        delivered: { label: 'Доставлен', description: 'Заказ успешно завершён.' },
        cancelled: { label: 'Отменён', description: 'Заказ был отменён.' },
      },
    },
    kz: {
      order: 'Тапсырыс',
      noPhone: 'телефон жоқ',
      cancelledHelp: 'Бұл тапсырыс тоқтатылды. Жаңа тапсырыс беру үшін дүкенге хабарласыңыз.',
      payment: 'Төлем',
      pending: 'күтілуде',
      card: 'карта',
      receiptEmail: 'Чекке арналған email',
      cardLabel: 'Карта',
      hidden: 'Жасырылған',
      destinationRecipient: 'Жеткізу / алушы',
      whereOrderWillGo: 'Тапсырыс қайда жеткізіледі',
      deliveryDetails: 'Жеткізу деректері',
      pickupFromShop: 'Дүкеннен алып кету',
      addressWillBeConfirmed: 'Мекенжай нақтыланады',
      recipient: 'Алушы',
      phone: 'Телефон:',
      deliveryAddress: 'Жеткізу мекенжайы',
      pickupDetails: 'Алып кету деректері',
      shopTeamWillConfirm: 'Дүкен командасы нақты бағытты сізбен бірге растайды.',
      notes: 'Ескертпелер',
      needHelp: 'Көмек керек пе?',
      shopOperationsContact: 'Дүкен операцияларының байланысы',
      shopContact: 'Дүкен байланысы',
      store: 'Дүкен:',
      address: 'Мекенжай:',
      hours: 'Сағаттар:',
      paidSuccess: 'сәтті төленді.',
      trackOrderText: `Оны осы беттен бақылай аласыз. Төлем растауы email-ге жіберілді, ал жеткізу деректерін нақтылау керек болса, дүкен командасы сізге ${STORE_INFO.phone} арқылы хабарласады.`,
      monitoring: 'Тапсырыстарды бақылау',
      whereSeeOrder: 'Тапсырысты қайдан көруге болады',
      allCustomerOrders: 'Бұл бетте дүкеннің барлық клиенттік тапсырыстары көрсетіледі',
      allYourOrders: 'Бұл бетте сіздің барлық дүкен тапсырыстарыңыз көрсетіледі',
      adminDesc: 'Әкімші ретінде сіз мұнда барлық тапсырысты көресіз: төлем күйі, алушы, жеткізу нүктесі, тауарлар тізімі және мәртебе қозғалысы.',
      ownerDesc: 'Төлемнен кейін тапсырыс осы жерде мәртебесімен, алушымен, жеткізу не алып кету тәсілімен, төлем ақпаратымен және дүкен байланыстарымен көрінеді.',
      shop: 'Дүкен:',
      backToShop: 'Дүкенге оралу',
      contactSupport: 'Қолдауға жазу',
      openAdmin: 'Әкімші панелін ашу',
      noPlatformOrders: 'Әзірге платформа тапсырыстары жоқ',
      noOrdersYet: 'Әзірге тапсырыс жоқ',
      noPlatformOrdersText: 'Клиенттер дүкен тапсырыстарын рәсімдей бастағанда, олар осы жерде бақылау және мәртебе жаңарту үшін көрінеді.',
      noOrdersText: 'Дүкеннен тапсырыс бергенде, ол осы жерде жеткізу және төлем деректерімен бірге көрінеді.',
      notSpecified: 'Көрсетілмеген',
      statusMeta: {
        pending: { label: 'Күтілуде', description: 'Тапсырыс жасалды және дүкен өңдеуін күтуде.' },
        paid: { label: 'Төленді', description: 'Төлем расталды, тапсырыс дайындалуда.' },
        shipped: { label: 'Жөнелтілді', description: 'Тапсырыс жеткізуге берілді не беруге дайын.' },
        delivered: { label: 'Жеткізілді', description: 'Тапсырыс сәтті аяқталды.' },
        cancelled: { label: 'Тоқтатылды', description: 'Тапсырыс тоқтатылды.' },
      },
    },
  }[language];

  async function loadOrders(role) {
    if (role === 'admin') {
      setOrders(await api.get('/api/admin/orders'));
      return;
    }
    setOrders(await api.get('/api/orders/mine'));
  }

  useEffect(() => {
    const user = currentUser();
    if (!user) { router.replace('/login'); return; }
    setViewerRole(user.role);
    loadOrders(user.role);
  }, [router]);

  async function updateAdminOrderStatus(orderId, status) {
    await api.put(`/api/admin/orders/${orderId}/status`, { status });
    await loadOrders('admin');
  }

  const isAdmin = viewerRole === 'admin';

  return (
    <DashboardLayout title={isAdmin ? 'Shop orders' : 'My orders'}>
      {!isAdmin && router.query.placed && (
        <div className="card mb-4 bg-green-50 border border-green-200">
          <p className="font-semibold text-green-800">{t.order} #{router.query.placed} {t.paidSuccess}</p>
          <p className="text-sm text-green-700 mt-1">
            {t.trackOrderText}
          </p>
        </div>
      )}

      <section className="card mb-5 bg-white/90">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-nanny-deepOrange/60">
              {isAdmin ? t.monitoring : t.whereSeeOrder}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-nanny-blue">
              {isAdmin ? t.allCustomerOrders : t.allYourOrders}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-nanny-brownish/80">
              {isAdmin ? t.adminDesc : t.ownerDesc}
            </p>
          </div>
          <div className="rounded-2xl bg-nanny-cream/60 px-4 py-3 text-sm">
            <p><span className="font-semibold">{t.shop}</span> {STORE_INFO.name}</p>
            <p><span className="font-semibold">{t.phone}</span> <a className="text-nanny-blue hover:underline" href={`tel:${STORE_INFO.phone}`}>{STORE_INFO.phone}</a></p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {!isAdmin && <button onClick={() => router.push('/shop')} className="btn-ghost">{t.backToShop}</button>}
          <button onClick={() => router.push(isAdmin ? '/admin' : '/support')} className="btn-ghost">
            {isAdmin ? t.openAdmin : t.contactSupport}
          </button>
        </div>
      </section>

      {orders.length === 0 && (
        <div className="card">
          <p className="font-semibold text-nanny-deepOrange">{isAdmin ? t.noPlatformOrders : t.noOrdersYet}</p>
          <p className="mt-1 text-sm opacity-70">
            {isAdmin ? t.noPlatformOrdersText : t.noOrdersText}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isAdmin={isAdmin}
            onStatusChange={updateAdminOrderStatus}
            t={t}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}
