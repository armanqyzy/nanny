// Shared helpers for the card form (booking payment and shop checkout).

export const EMPTY_CARD = { holder: '', number: '', expiry: '', cvc: '' };

// Demo values that pass the server checks (no real money is charged).
export const TEST_CARD = { holder: 'TEST USER', number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' };

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function cardBrand(number) {
  const digits = onlyDigits(number);
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^220[0-4]/.test(digits)) return 'Mir';
  return '';
}

// "4242424242424242" -> "4242 4242 4242 4242"
export function formatCardNumber(value) {
  return onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Typing "12" becomes "12/", "5" becomes "05/", and deleting the slash also deletes the digit before it.
export function formatExpiry(nextRaw, prevValue = '') {
  const raw = String(nextRaw || '');
  const deleting = raw.length < prevValue.length;
  // Backspace over the slash: just remove the slash, keep the month.
  if (deleting && prevValue.endsWith('/') && !raw.endsWith('/')) return onlyDigits(raw).slice(0, 2);
  // "1/" typed by hand means January: "01/".
  const manual = raw.match(/^(\d)\/(\d{0,2})/);
  if (manual) return `0${manual[1]}/${manual[2]}`;
  let digits = onlyDigits(raw).slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`; // "5" -> "05"
  if (digits.length < 2) return digits;
  const month = digits.slice(0, 2);
  const year = digits.slice(2);
  if (year) return `${month}/${year}`;
  return deleting && !raw.endsWith('/') ? month : `${month}/`;
}

export function cvcLength(number) {
  return cardBrand(number) === 'Amex' ? 4 : 3;
}

function luhnOk(number) {
  const digits = onlyDigits(number);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function parseExpiry(expiry) {
  const match = String(expiry || '').match(/^(\d{2})\/(\d{2})$/);
  if (!match) return null;
  return { month: Number(match[1]), year: 2000 + Number(match[2]) };
}

const MESSAGES = {
  en: {
    holder: 'Enter the name as it is written on the card.',
    number: 'Enter the 16-digit card number.',
    numberBad: 'This card number has a mistake. Check the digits.',
    expiry: 'Enter month and year, for example 08/29.',
    expiryMonth: 'Month must be from 01 to 12.',
    expiryPast: 'This card has expired.',
    cvc: (n) => `Enter the ${n} digits from the back of the card.`,
  },
  ru: {
    holder: 'Введите имя так, как оно написано на карте.',
    number: 'Введите 16 цифр номера карты.',
    numberBad: 'В номере карты ошибка. Проверьте цифры.',
    expiry: 'Введите месяц и год, например 08/29.',
    expiryMonth: 'Месяц должен быть от 01 до 12.',
    expiryPast: 'Срок действия карты истёк.',
    cvc: (n) => `Введите ${n} цифры с обратной стороны карты.`,
  },
  kz: {
    holder: 'Картада жазылғандай атыңызды енгізіңіз.',
    number: 'Карта нөмірінің 16 цифрын енгізіңіз.',
    numberBad: 'Карта нөмірінде қате бар. Цифрларды тексеріңіз.',
    expiry: 'Ай мен жылды енгізіңіз, мысалы 08/29.',
    expiryMonth: 'Ай 01-ден 12-ге дейін болуы керек.',
    expiryPast: 'Картаның мерзімі өтіп кеткен.',
    cvc: (n) => `Картаның артындағы ${n} цифрды енгізіңіз.`,
  },
};

// Returns { field: message } for every field that is not valid yet.
export function validateCard(card, language = 'en') {
  const m = MESSAGES[language] || MESSAGES.en;
  const errors = {};
  if (String(card.holder || '').trim().length < 2) errors.holder = m.holder;
  const digits = onlyDigits(card.number);
  if (digits.length < 13) errors.number = m.number;
  else if (!luhnOk(digits)) errors.number = m.numberBad;
  const exp = parseExpiry(card.expiry);
  if (!exp) errors.expiry = m.expiry;
  else if (exp.month < 1 || exp.month > 12) errors.expiry = m.expiryMonth;
  else if (new Date(exp.year, exp.month, 0, 23, 59, 59) < new Date()) errors.expiry = m.expiryPast;
  const needed = cvcLength(card.number);
  if (onlyDigits(card.cvc).length !== needed) errors.cvc = m.cvc(needed);
  return errors;
}

// Shape the server expects.
export function toPaymentPayload(card) {
  const exp = parseExpiry(card.expiry) || { month: 0, year: 0 };
  return {
    cardholder_name: String(card.holder || '').trim(),
    card_number: onlyDigits(card.number),
    expiry_month: exp.month,
    expiry_year: exp.year,
    cvc: onlyDigits(card.cvc),
  };
}

// Server messages in plain words.
export function friendlyPaymentError(message, language = 'en') {
  const m = MESSAGES[language] || MESSAGES.en;
  const text = String(message || '');
  if (/invalid card number|card_number/i.test(text)) return m.numberBad;
  if (/expiry/i.test(text)) return m.expiryPast;
  if (/security code|cvc/i.test(text)) return m.cvc(3);
  if (/holder/i.test(text)) return m.holder;
  return text;
}
