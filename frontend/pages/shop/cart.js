import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import PaymentCardForm from '../../components/PaymentCardForm';
import { absoluteAssetUrl, api, currentUser } from '../../lib/api';
import { STORE_INFO, buildCheckoutAddress, handleProductImageError } from '../../lib/shop';
import { useLanguage } from '../../lib/i18n';
import { EMPTY_CARD, friendlyPaymentError, toPaymentPayload, validateCard } from '../../lib/payment';

const EMPTY_CHECKOUT = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  delivery_method: 'courier',
  notes: '',
};

const TEXT = {
  en: {
    title: 'Cart & checkout', emptyTitle: 'Your cart is empty', emptyText: 'Add food, accessories or care items from the shop to place an order.',
    toShop: 'Go to the shop', myOrders: 'My orders', items: 'Items', each: 'each', total: 'Total', remove: 'Remove',
    step1: '1. Your items', step2: '2. Contact and delivery', step3: '3. Payment',
    name: 'Recipient name', phone: 'Phone', phoneHint: 'For the courier, e.g. +7 777 123 45 67', email: 'Email', emailHint: 'The receipt will be sent here',
    courier: 'Courier delivery in Almaty', pickup: 'Pick up from the store', address: 'Delivery address', addressHint: 'Street, house, apartment',
    pickupInfo: (a, h) => `Pick-up point: ${a}. ${h}.`, notes: 'Comment for the courier (optional)',
    pay: (sum) => `Pay ${sum} ₸`, paying: 'Paying...', fixFields: 'Check the fields marked in red.',
    needName: 'Enter the recipient name.', needPhone: 'Enter a phone number, at least 6 digits.', needEmail: 'Enter a valid email.', needAddress: 'Enter the delivery address (at least 5 characters).',
    after: 'After payment the order appears in "My orders" with its status.',
  },
  ru: {
    title: 'Корзина и оплата', emptyTitle: 'Корзина пуста', emptyText: 'Добавьте корм, аксессуары или товары для ухода из магазина, чтобы оформить заказ.',
    toShop: 'Перейти в магазин', myOrders: 'Мои заказы', items: 'Товаров', each: 'за шт.', total: 'Итого', remove: 'Убрать',
    step1: '1. Ваши товары', step2: '2. Контакты и доставка', step3: '3. Оплата',
    name: 'Имя получателя', phone: 'Телефон', phoneHint: 'Для курьера, например +7 777 123 45 67', email: 'Email', emailHint: 'Сюда придёт чек',
    courier: 'Курьером по Алматы', pickup: 'Самовывоз из магазина', address: 'Адрес доставки', addressHint: 'Улица, дом, квартира',
    pickupInfo: (a, h) => `Пункт самовывоза: ${a}. ${h}.`, notes: 'Комментарий для курьера (необязательно)',
    pay: (sum) => `Оплатить ${sum} ₸`, paying: 'Оплачиваем...', fixFields: 'Проверьте поля, отмеченные красным.',
    needName: 'Введите имя получателя.', needPhone: 'Введите номер телефона, минимум 6 цифр.', needEmail: 'Введите корректный email.', needAddress: 'Введите адрес доставки (минимум 5 символов).',
    after: 'После оплаты заказ появится в «Моих заказах» со статусом.',
  },
  kz: {
    title: 'Себет және төлем', emptyTitle: 'Себет бос', emptyText: 'Тапсырыс беру үшін дүкеннен жем, аксессуар немесе күтім тауарларын қосыңыз.',
    toShop: 'Дүкенге өту', myOrders: 'Менің тапсырыстарым', items: 'Тауарлар', each: 'дана', total: 'Барлығы', remove: 'Алу',
    step1: '1. Тауарларыңыз', step2: '2. Байланыс және жеткізу', step3: '3. Төлем',
    name: 'Алушының аты', phone: 'Телефон', phoneHint: 'Курьер үшін, мысалы +7 777 123 45 67', email: 'Email', emailHint: 'Чек осында келеді',
    courier: 'Алматы бойынша курьер', pickup: 'Дүкеннен алып кету', address: 'Жеткізу мекенжайы', addressHint: 'Көше, үй, пәтер',
    pickupInfo: (a, h) => `Алып кету орны: ${a}. ${h}.`, notes: 'Курьерге түсініктеме (міндетті емес)',
    pay: (sum) => `${sum} ₸ төлеу`, paying: 'Төленуде...', fixFields: 'Қызылмен белгіленген өрістерді тексеріңіз.',
    needName: 'Алушының атын енгізіңіз.', needPhone: 'Телефон нөмірін енгізіңіз, кемінде 6 цифр.', needEmail: 'Дұрыс email енгізіңіз.', needAddress: 'Жеткізу мекенжайын енгізіңіз (кемінде 5 таңба).',
    after: 'Төлемнен кейін тапсырыс «Менің тапсырыстарымда» мәртебесімен көрінеді.',
  },
};

function contactErrors(form, t) {
  const errors = {};
  if (form.full_name.trim().length < 2) errors.full_name = t.needName;
  if (form.phone.replace(/\D/g, '').length < 6) errors.phone = t.needPhone;
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = t.needEmail;
  if (form.delivery_method === 'courier' && form.address.trim().length < 5) errors.address = t.needAddress;
  return errors;
}

function friendlyCheckoutError(message, language) {
  const text = String(message || '');
  if (/Not enough stock/i.test(text)) {
    return language === 'ru' ? 'Одного из товаров не хватает на складе. Уменьшите количество.' : language === 'kz' ? 'Тауарлардың бірі қоймада жеткіліксіз. Санын азайтыңыз.' : 'One of the items is out of stock. Reduce the quantity.';
  }
  if (/not found/i.test(text)) {
    return language === 'ru' ? 'Один из товаров больше недоступен.' : language === 'kz' ? 'Тауарлардың бірі енді қолжетімсіз.' : 'One of the products is no longer available.';
  }
  return friendlyPaymentError(text, language);
}

export default function Cart() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = TEXT[language] || TEXT.en;
  const [cart, setCart] = useState({});
  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT);
  const [card, setCard] = useState(EMPTY_CARD);
  const [attempted, setAttempted] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser()) { router.replace('/login'); return; }
    try {
      const raw = localStorage.getItem('nanny_cart');
      if (raw) setCart(JSON.parse(raw));
    } catch { setCart({}); }
    api.get('/api/auth/me').then((me) => {
      setCheckoutForm((prev) => ({
        ...prev,
        full_name: me.full_name || '',
        phone: me.phone || '',
        email: me.email || '',
        address: me.address || '',
      }));
    }).catch(() => {});
  }, [router]);

  const items = Object.values(cart);
  const total = items.reduce((sum, it) => sum + Number(it.product.price) * it.qty, 0);
  const itemCount = items.reduce((sum, it) => sum + it.qty, 0);
  const errors = contactErrors(checkoutForm, t);
  const show = (field) => attempted && errors[field];

  function setQty(id, qty) {
    const next = { ...cart };
    const safe = Math.max(0, Math.min(99, Math.floor(Number(qty) || 0)));
    if (safe <= 0) delete next[id];
    else next[id] = { ...cart[id], qty: safe };
    setCart(next);
    localStorage.setItem('nanny_cart', JSON.stringify(next));
  }

  async function checkout() {
    if (loading) return;
    setAttempted(true);
    const cardErrors = validateCard(card, language);
    if (Object.keys(errors).length || Object.keys(cardErrors).length) {
      setMsg({ type: 'err', text: t.fixFields });
      return;
    }
    setMsg(null);
    setLoading(true);
    try {
      const order = await api.post('/api/orders/checkout', {
        items: items.map((it) => ({ product_id: it.product.id, quantity: it.qty })),
        address: buildCheckoutAddress(checkoutForm),
        customer_email: checkoutForm.email.trim(),
        customer_name: checkoutForm.full_name.trim(),
        customer_phone: checkoutForm.phone.trim(),
        payment: toPaymentPayload(card),
      });
      localStorage.removeItem('nanny_cart');
      setCart({});
      router.push(`/shop/orders?placed=${order.id}`);
    } catch (error) {
      setMsg({ type: 'err', text: friendlyCheckoutError(error.message, language) });
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = (field) => `input ${show(field) ? 'border-red-300 ring-2 ring-red-100' : ''}`;
  const Hint = ({ field, hint }) => (show(field)
    ? <span className="mt-1 block text-xs text-red-600">{errors[field]}</span>
    : hint ? <span className="mt-1 block text-xs text-nanny-brownish/55">{hint}</span> : null);

  return (
    <DashboardLayout title={t.title}>
      {items.length === 0 ? (
        <EmptyState title={t.emptyTitle} text={t.emptyText} actionLabel={t.toShop} actionHref="/shop" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <section className="card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-nanny-deepOrange">{t.step1}</h2>
                <button type="button" onClick={() => router.push('/shop/orders')} className="btn-ghost text-sm">{t.myOrders}</button>
              </div>
              <ul className="divide-y divide-nanny-orange/15">
                {items.map((it) => (
                  <li key={it.product.id} className="flex flex-wrap items-center gap-4 py-3">
                    <img src={absoluteAssetUrl(it.product.image_url)} alt={it.product.title}
                         className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-nanny-cream object-cover text-[0px]" onError={handleProductImageError} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{it.product.title}</div>
                      <div className="text-xs opacity-70">{Number(it.product.price).toLocaleString()} ₸ {t.each}</div>
                    </div>
                    <div className="flex items-center rounded-full border border-nanny-orange/20">
                      <button type="button" className="px-3 py-1 text-lg" onClick={() => setQty(it.product.id, it.qty - 1)} aria-label="-">−</button>
                      <span className="w-8 text-center font-semibold">{it.qty}</span>
                      <button type="button" className="px-3 py-1 text-lg" onClick={() => setQty(it.product.id, it.qty + 1)} aria-label="+">+</button>
                    </div>
                    <span className="w-24 text-right font-semibold">{(Number(it.product.price) * it.qty).toLocaleString()} ₸</span>
                    <button type="button" className="text-xs font-semibold text-red-600" onClick={() => setQty(it.product.id, 0)}>{t.remove}</button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card space-y-4">
              <h2 className="text-lg font-bold text-nanny-deepOrange">{t.step2}</h2>
              <label className="block">
                <span className="text-sm font-semibold">{t.name}</span>
                <input className={`${fieldClass('full_name')} mt-1`} value={checkoutForm.full_name}
                       onChange={(e) => setCheckoutForm({ ...checkoutForm, full_name: e.target.value })} />
                <Hint field="full_name" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold">{t.phone}</span>
                  <input className={`${fieldClass('phone')} mt-1`} type="tel" inputMode="tel" placeholder="+7 777 123 45 67" value={checkoutForm.phone}
                         onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value.replace(/[^\d+()\-\s]/g, '') })} />
                  <Hint field="phone" hint={t.phoneHint} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">{t.email}</span>
                  <input className={`${fieldClass('email')} mt-1`} type="email" value={checkoutForm.email}
                         onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })} />
                  <Hint field="email" hint={t.emailHint} />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {['courier', 'pickup'].map((method) => (
                  <button key={method} type="button"
                          onClick={() => setCheckoutForm({ ...checkoutForm, delivery_method: method })}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${checkoutForm.delivery_method === method ? 'border-nanny-orange bg-[#fff1e2] text-nanny-deepOrange' : 'border-nanny-orange/20 bg-white'}`}>
                    {method === 'courier' ? t.courier : t.pickup}
                  </button>
                ))}
              </div>
              {checkoutForm.delivery_method === 'courier' ? (
                <label className="block">
                  <span className="text-sm font-semibold">{t.address}</span>
                  <input className={`${fieldClass('address')} mt-1`} value={checkoutForm.address}
                         onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })} />
                  <Hint field="address" hint={t.addressHint} />
                </label>
              ) : (
                <p className="rounded-2xl bg-nanny-cream/70 p-3 text-sm">{t.pickupInfo(STORE_INFO.address, STORE_INFO.hours)}</p>
              )}
              <label className="block">
                <span className="text-sm font-semibold">{t.notes}</span>
                <textarea className="input mt-1" rows={2} value={checkoutForm.notes}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })} />
              </label>
            </section>
          </div>

          <section className="card h-max space-y-4 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold text-nanny-deepOrange">{t.step3}</h2>
            <div className="rounded-2xl bg-nanny-cream/60 p-4 text-sm">
              <p className="flex justify-between"><span>{t.items}</span><span>{itemCount}</span></p>
              <p className="mt-2 flex justify-between border-t border-nanny-orange/20 pt-2 text-lg font-bold">
                <span>{t.total}</span><span>{total.toLocaleString()} ₸</span>
              </p>
            </div>
            <PaymentCardForm value={card} onChange={setCard} language={language} showAllErrors={attempted} />
            {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
            <button type="button" onClick={checkout} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
              {loading ? t.paying : t.pay(total.toLocaleString())}
            </button>
            <p className="text-center text-xs opacity-60">{t.after}</p>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
