export const STORE_INFO = {
  name: 'Nanny Pet Shop',
  city: 'Almaty',
  address: 'Abylai Khan Avenue 55, Almaty',
  phone: '+7 777 555 1122',
  hours: 'Daily, 10:00 - 20:00',
  deliveryNote: 'Courier delivery across Almaty or self-pickup from the store.',
};

export const PRODUCT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&auto=format&fit=crop';

export const SHOP_ORDER_STATUSES = ['new', 'paid', 'shipped', 'delivered', 'cancelled'];

export const SHOP_ORDER_STATUS_META = {
  new: {
    label: 'New',
    tone: 'bg-slate-100 text-slate-700',
    description: 'Order created and waiting for payment or admin processing.',
  },
  paid: {
    label: 'Paid',
    tone: 'bg-blue-100 text-nanny-blue',
    description: 'Payment was accepted. The shop team is preparing your order.',
  },
  shipped: {
    label: 'Shipped',
    tone: 'bg-amber-100 text-amber-700',
    description: 'The order is on the way or ready for pickup coordination.',
  },
  delivered: {
    label: 'Delivered',
    tone: 'bg-green-100 text-green-700',
    description: 'The order has been completed successfully.',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'bg-red-100 text-red-700',
    description: 'The order was cancelled and will not be fulfilled.',
  },
};

export function formatDeliveryMethod(method) {
  return method === 'pickup' ? 'Store pickup' : 'Courier delivery';
}

export function handleProductImageError(event) {
  if (event.currentTarget.dataset.fallbackApplied === 'true') return;
  event.currentTarget.dataset.fallbackApplied = 'true';
  event.currentTarget.src = PRODUCT_FALLBACK_IMAGE;
}

export function buildCheckoutAddress(form) {
  const lines = [
    `Recipient: ${form.full_name.trim()}`,
    `Email: ${form.email.trim()}`,
    `Phone: ${form.phone.trim()}`,
    `Delivery: ${formatDeliveryMethod(form.delivery_method)}`,
    `Address: ${form.address.trim()}`,
  ];

  if (form.notes.trim()) lines.push(`Notes: ${form.notes.trim()}`);

  return lines.join('\n');
}

export function parseCheckoutAddress(value) {
  const result = {
    recipient: '',
    email: '',
    phone: '',
    delivery: '',
    address: '',
    notes: '',
  };

  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawKey, ...rest] = line.split(':');
      const key = String(rawKey || '').trim().toLowerCase();
      const parsedValue = rest.join(':').trim();
      if (!parsedValue) return;

      if (key === 'recipient') result.recipient = parsedValue;
      if (key === 'email') result.email = parsedValue;
      if (key === 'phone') result.phone = parsedValue;
      if (key === 'delivery') result.delivery = parsedValue;
      if (key === 'address') result.address = parsedValue;
      if (key === 'notes') result.notes = parsedValue;
    });

  return result;
}
