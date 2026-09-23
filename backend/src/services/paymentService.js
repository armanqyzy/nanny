function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
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

function validatePaymentCard(card = {}) {
  const cardNumber = onlyDigits(card.card_number);
  const cvv = onlyDigits(card.cvc || card.cvv);
  const holder = String(card.cardholder_name || card.card_holder || '').trim();

  if (!holder || holder.length < 3) {
    throw new Error('card holder name is required');
  }
  if (!luhnCheck(cardNumber)) {
    throw new Error('invalid card number');
  }
  if (!isFutureExpiry(card.expiry_month, card.expiry_year)) {
    throw new Error('card expiry date is invalid');
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    throw new Error('invalid security code');
  }

  return {
    brand: detectCardBrand(cardNumber),
    last4: cardNumber.slice(-4),
    cardholder: holder,
  };
}

function detectCardBrand(cardNumber) {
  if (/^4/.test(cardNumber)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return 'mastercard';
  if (/^3[47]/.test(cardNumber)) return 'amex';
  return 'card';
}

async function chargeCard({ amount, orderReference, paymentCard }) {
  const validated = validatePaymentCard(paymentCard);
  const paymentReference = `demo_${orderReference}_${Date.now()}`;

  return {
    approved: true,
    provider: process.env.PAYMENT_PROVIDER || 'demo',
    payment_reference: paymentReference,
    payment_status: 'paid',
    payment_method: 'card',
    payment_last4: validated.last4,
    card_brand: validated.brand,
    amount,
  };
}

module.exports = {
  chargeCard,
  validatePaymentCard,
};
