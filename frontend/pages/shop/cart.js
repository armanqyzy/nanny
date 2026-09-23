import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { absoluteAssetUrl, api, currentUser } from '../../lib/api';
import { STORE_INFO, buildCheckoutAddress, handleProductImageError } from '../../lib/shop';

const EMPTY_CHECKOUT = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  delivery_method: 'courier',
  notes: '',
};

const EMPTY_PAYMENT = {
  card_holder: '',
  card_number: '',
  expiry_month: '',
  expiry_year: '',
  cvv: '',
};

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCardNumber(value) {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function luhnCheck(cardNumber) {
  const digits = onlyDigits(cardNumber);
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
}

function isFutureExpiry(month, year) {
  const normalizedMonth = Number(month);
  const normalizedYear = Number(year);
  if (!normalizedMonth || !normalizedYear || normalizedMonth < 1 || normalizedMonth > 12) return false;

  const fullYear = normalizedYear < 100 ? 2000 + normalizedYear : normalizedYear;
  const now = new Date();
  const expiry = new Date(fullYear, normalizedMonth, 0, 23, 59, 59, 999);
  return expiry >= now;
}

function normalizeCheckoutError(message) {
  const text = String(message || '').trim();

  if (!text) return 'Could not complete payment yet. Please review the checkout details and try again.';
  if (text.includes('payment.cardholder_name')) return 'Card holder name is missing.';
  if (text.includes('payment.cvc')) return 'Security code is missing.';
  if (text.includes('invalid card number')) return 'Card number is invalid. Try a test Visa like 4242 4242 4242 4242.';
  if (text.includes('card expiry date is invalid')) return 'Card expiry date is invalid.';
  if (text.includes('invalid security code')) return 'Security code is invalid.';
  if (text.includes('Not enough stock')) return 'One of the items is out of stock. Update the cart and try again.';
  if (text.includes('Product') && text.includes('not found')) return 'One of the products is no longer available.';

  return text;
}

export default function Cart() {
  const router = useRouter();
  const [cart, setCart] = useState({});
  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!currentUser()) { router.replace('/login'); return; }
    const raw = localStorage.getItem('nanny_cart');
    if (raw) setCart(JSON.parse(raw));
    (async () => {
      try {
        const me = await api.get('/api/auth/me');
        setCheckoutForm((prev) => ({
          ...prev,
          full_name: me.full_name || '',
          phone: me.phone || '',
          email: me.email || '',
          address: me.address || '',
        }));
      } catch {}
    })();
  }, [router]);

  const items = Object.values(cart);
  const total = items.reduce((s, it) => s + Number(it.product.price) * it.qty, 0);

  function setQty(id, qty) {
    const next = { ...cart };
    if (qty <= 0) delete next[id];
    else next[id] = { ...cart[id], qty };
    setCart(next);
    localStorage.setItem('nanny_cart', JSON.stringify(next));
  }

  const missingFields = [
    !checkoutForm.full_name.trim() && 'recipient name',
    !checkoutForm.email.trim() && 'email',
    !checkoutForm.phone.trim() && 'phone number',
    checkoutForm.delivery_method === 'courier' && !checkoutForm.address.trim() && 'delivery address',
    !paymentForm.card_holder.trim() && 'card holder',
    !luhnCheck(paymentForm.card_number) && 'valid card number',
    !isFutureExpiry(paymentForm.expiry_month, paymentForm.expiry_year) && 'valid expiry date',
    paymentForm.cvv.trim().length < 3 && 'security code',
  ].filter(Boolean);

  const canCheckout = items.length > 0 && missingFields.length === 0 && !loading;

  async function checkout() {
    const nextErrors = {};
    if (!checkoutForm.full_name.trim()) nextErrors.full_name = 'Enter the recipient full name.';
    if (!checkoutForm.email.trim()) nextErrors.email = 'Enter the email for the receipt.';
    if (!checkoutForm.phone.trim()) nextErrors.phone = 'Enter the phone number.';
    if (checkoutForm.delivery_method === 'courier' && !checkoutForm.address.trim()) nextErrors.address = 'Enter the delivery address.';
    if (!paymentForm.card_holder.trim()) nextErrors.card_holder = 'Enter the card holder name.';
    if (!luhnCheck(paymentForm.card_number)) nextErrors.card_number = 'Enter a valid card number.';
    if (!isFutureExpiry(paymentForm.expiry_month, paymentForm.expiry_year)) {
      nextErrors.expiry_month = 'Enter a valid future expiry date.';
      nextErrors.expiry_year = 'Enter a valid future expiry date.';
    }
    if (paymentForm.cvv.trim().length < 3) nextErrors.cvv = 'Enter the security code.';

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setMsg({ type: 'err', text: 'Please complete the highlighted checkout fields.' });
      return;
    }

    setMsg(null);
    setLoading(true);
    setFieldErrors({});
    try {
      const order = await api.post('/api/orders/checkout', {
        items: items.map((it) => ({ product_id: it.product.id, quantity: it.qty })),
        address: buildCheckoutAddress(checkoutForm),
        customer_email: checkoutForm.email,
        customer_name: checkoutForm.full_name,
        customer_phone: checkoutForm.phone,
        payment: {
          cardholder_name: paymentForm.card_holder.trim(),
          card_number: onlyDigits(paymentForm.card_number),
          expiry_month: Number(paymentForm.expiry_month),
          expiry_year: Number(paymentForm.expiry_year),
          cvc: paymentForm.cvv.trim(),
        },
      });
      localStorage.removeItem('nanny_cart');
      setCart({});
      router.push(`/shop/orders?placed=${order.id}`);
    } catch (error) {
      setMsg({ type: 'err', text: normalizeCheckoutError(error.message) });
    }
    finally { setLoading(false); }
  }

  return (
    <DashboardLayout title="Cart & Checkout">
      {items.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card bg-white/90">
            <div className="max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-nanny-deepOrange/60">Cart</p>
              <h2 className="mt-2 text-3xl font-bold text-nanny-blue">Your cart is empty</h2>
              <p className="mt-4 text-base leading-7 text-nanny-brownish/80">
                Add food, accessories or care items to continue checkout. Once you place an order, we will keep you updated in notifications and by email.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => router.push('/shop')} className="btn-secondary">
                  Back to shop
                </button>
                <button onClick={() => router.push('/shop/orders')} className="btn-ghost">
                  View my orders
                </button>
              </div>
            </div>
          </div>

          <div className="card h-max bg-nanny-cream/60">
            <p className="font-semibold text-nanny-deepOrange">Need help before ordering?</p>
            <div className="mt-3 space-y-2 text-sm text-nanny-brownish/80">
              <p><span className="font-semibold">Shop:</span> {STORE_INFO.name}</p>
              <p><span className="font-semibold">Address:</span> {STORE_INFO.address}</p>
              <p><span className="font-semibold">Phone:</span> <a className="text-nanny-blue hover:underline" href={`tel:${STORE_INFO.phone}`}>{STORE_INFO.phone}</a></p>
              <p><span className="font-semibold">Hours:</span> {STORE_INFO.hours}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-nanny-orange/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] opacity-45">Checkout flow</p>
                <h2 className="mt-1 text-xl font-bold text-nanny-deepOrange">Review items, pay, then track in My orders</h2>
              </div>
              <button onClick={() => router.push('/shop/orders')} className="btn-ghost text-sm">
                View my orders
              </button>
            </div>
            <ul className="divide-y divide-nanny-orange/20">
              {items.map((it) => (
                <li key={it.product.id} className="flex gap-4 py-3 items-center">
                  <img
                    src={absoluteAssetUrl(it.product.image_url)}
                    alt={it.product.title}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={handleProductImageError}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{it.product.title}</div>
                    <div className="text-xs opacity-70">{Number(it.product.price).toLocaleString()} ₸ each</div>
                  </div>
                  <input type="number" min={0} className="input w-20"
                         value={it.qty} onChange={(e) => setQty(it.product.id, Number(e.target.value))} />
                  <span className="w-24 text-right font-semibold">
                    {(Number(it.product.price) * it.qty).toLocaleString()} ₸
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card h-max">
            <h3 className="font-bold text-nanny-deepOrange mb-3">Summary</h3>
            <p className="flex justify-between text-sm mb-2">
              <span>Items</span>
              <span>{items.reduce((a, b) => a + b.qty, 0)}</span>
            </p>
            <p className="flex justify-between font-bold text-lg border-t border-nanny-orange/20 pt-2 mt-2">
              <span>Total</span>
              <span>{total.toLocaleString()} ₸</span>
            </p>

            <div className="mt-4 space-y-3">
              <input
                className={`input ${fieldErrors.full_name ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                placeholder="Recipient full name"
                value={checkoutForm.full_name}
                onChange={(e) => {
                  setCheckoutForm({ ...checkoutForm, full_name: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, full_name: '' }));
                }}
              />
              <input
                className={`input ${fieldErrors.phone ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                placeholder="Phone number"
                value={checkoutForm.phone}
                onChange={(e) => {
                  setCheckoutForm({ ...checkoutForm, phone: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }}
              />
              <input
                className={`input ${fieldErrors.email ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                type="email"
                placeholder="Email for payment receipt"
                value={checkoutForm.email}
                onChange={(e) => {
                  setCheckoutForm({ ...checkoutForm, email: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
              />
              <select
                className="input"
                value={checkoutForm.delivery_method}
                onChange={(e) => {
                  setCheckoutForm({ ...checkoutForm, delivery_method: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, address: '' }));
                }}
              >
                <option value="courier">Courier delivery</option>
                <option value="pickup">Store pickup</option>
              </select>
              <textarea
                className={`input ${fieldErrors.address ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                rows={3}
                placeholder={checkoutForm.delivery_method === 'pickup' ? 'Pickup note or branch preference (optional)' : 'Delivery address'}
                value={checkoutForm.address}
                onChange={(e) => {
                  setCheckoutForm({ ...checkoutForm, address: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, address: '' }));
                }}
              />
              <textarea
                className="input"
                rows={2}
                placeholder="Notes for delivery or contact"
                value={checkoutForm.notes}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-nanny-blue/15 bg-nanny-blue/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-nanny-blue">Card payment</p>
                  <p className="mt-1 text-sm text-nanny-brownish/75">
                    Enter your card details to pay now and receive an order confirmation by email.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-nanny-blue">
                  Secure
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  className={`input ${fieldErrors.card_holder ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                  placeholder="Card holder name"
                  value={paymentForm.card_holder}
                  onChange={(e) => {
                    setPaymentForm({ ...paymentForm, card_holder: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, card_holder: '' }));
                  }}
                />
                <input
                  className={`input ${fieldErrors.card_number ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                  inputMode="numeric"
                  placeholder="Card number"
                  value={paymentForm.card_number}
                  onChange={(e) => {
                    setPaymentForm({ ...paymentForm, card_number: formatCardNumber(e.target.value) });
                    setFieldErrors((prev) => ({ ...prev, card_number: '' }));
                  }}
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    className={`input ${fieldErrors.expiry_month ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                    inputMode="numeric"
                    placeholder="MM"
                    value={paymentForm.expiry_month}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, expiry_month: e.target.value.replace(/\D/g, '').slice(0, 2) });
                      setFieldErrors((prev) => ({ ...prev, expiry_month: '' }));
                    }}
                  />
                  <input
                    className={`input ${fieldErrors.expiry_year ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                    inputMode="numeric"
                    placeholder="YYYY"
                    value={paymentForm.expiry_year}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, expiry_year: e.target.value.replace(/\D/g, '').slice(0, 4) });
                      setFieldErrors((prev) => ({ ...prev, expiry_year: '' }));
                    }}
                  />
                  <input
                    className={`input ${fieldErrors.cvv ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                    inputMode="numeric"
                    placeholder="CVV"
                    value={paymentForm.cvv}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) });
                      setFieldErrors((prev) => ({ ...prev, cvv: '' }));
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-nanny-orange/10 p-4 text-sm">
              <p className="font-semibold text-nanny-deepOrange">Where is the shop and how to contact us?</p>
              <p className="mt-2"><span className="font-semibold">Address:</span> {STORE_INFO.address}</p>
              <p><span className="font-semibold">Phone:</span> <a className="text-nanny-blue hover:underline" href={`tel:${STORE_INFO.phone}`}>{STORE_INFO.phone}</a></p>
              <p><span className="font-semibold">Hours:</span> {STORE_INFO.hours}</p>
            </div>

            <div className="mt-4 rounded-xl border border-nanny-blue/15 bg-nanny-blue/5 p-4 text-sm">
              <p className="font-semibold text-nanny-blue">Where will I see my order?</p>
              <p className="mt-2 text-nanny-brownish/75">
                Right after payment, the order will appear on the My orders page with status tracking and delivery details.
              </p>
              <button onClick={() => router.push('/shop/orders')} className="btn-ghost mt-3 text-sm">
                Open my orders
              </button>
            </div>

            {missingFields.length > 0 && !msg && (
              <p className="text-sm mt-3 text-red-600">
                Fill in: {missingFields.join(', ')}.
              </p>
            )}
            {msg && <p className={`text-sm mt-2 ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
            <button
              onClick={checkout}
              className="btn-primary w-full mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canCheckout}
            >
              {loading ? 'Processing payment...' : 'Pay & place order'}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
