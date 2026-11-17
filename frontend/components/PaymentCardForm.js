import { useState } from 'react';
import { TEST_CARD, cardBrand, cvcLength, formatCardNumber, formatExpiry, onlyDigits, validateCard } from '../lib/payment';

const TEXT = {
  en: {
    demoTitle: 'Demo payment', demo: 'No money is charged. Do not enter a real card.', fillTest: 'Fill with test card',
    number: 'Card number', numberHint: '16 digits on the front of the card',
    expiry: 'Valid until', expiryHint: 'Month / year, e.g. 08/29',
    cvc: 'CVC / CVV', cvcHint: (n) => `${n} digits on the back`,
    holder: 'Name on card', holderHint: 'In Latin letters, as on the card',
    previewName: 'YOUR NAME', secure: 'Only the last 4 digits are saved',
  },
  ru: {
    demoTitle: 'Демо-оплата', demo: 'Деньги не списываются. Не вводите настоящую карту.', fillTest: 'Заполнить тестовой картой',
    number: 'Номер карты', numberHint: '16 цифр на лицевой стороне карты',
    expiry: 'Срок действия', expiryHint: 'Месяц / год, например 08/29',
    cvc: 'CVC / CVV', cvcHint: (n) => `${n} цифры на обороте карты`,
    holder: 'Имя на карте', holderHint: 'Латиницей, как написано на карте',
    previewName: 'ИМЯ ФАМИЛИЯ', secure: 'Сохраняются только последние 4 цифры',
  },
  kz: {
    demoTitle: 'Демо төлем', demo: 'Ақша алынбайды. Нақты картаны енгізбеңіз.', fillTest: 'Тест картамен толтыру',
    number: 'Карта нөмірі', numberHint: 'Картаның алдындағы 16 цифр',
    expiry: 'Жарамдылық мерзімі', expiryHint: 'Ай / жыл, мысалы 08/29',
    cvc: 'CVC / CVV', cvcHint: (n) => `Картаның артындағы ${n} цифр`,
    holder: 'Картадағы аты', holderHint: 'Латын әріптерімен, картадағыдай',
    previewName: 'АТЫ-ЖӨНІ', secure: 'Тек соңғы 4 цифр сақталады',
  },
};

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-nanny-brownish">{label}</span>
      <div className="mt-1">{children}</div>
      {error
        ? <span className="mt-1 block text-xs text-red-600">{error}</span>
        : <span className="mt-1 block text-xs text-nanny-brownish/55">{hint}</span>}
    </label>
  );
}

// Card form with a live card preview. Field errors appear after the field was left or after "Pay" was pressed.
export default function PaymentCardForm({ value, onChange, language = 'en', showAllErrors = false }) {
  const t = TEXT[language] || TEXT.en;
  const [touched, setTouched] = useState({});
  const errors = validateCard(value, language);
  const visible = (field) => (showAllErrors || touched[field]) && errors[field];
  const brand = cardBrand(value.number);
  const set = (patch) => onChange({ ...value, ...patch });
  const leave = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const inputClass = (field) => `input ${visible(field) ? 'border-red-300 ring-2 ring-red-100' : ''}`;
  const numberDigits = onlyDigits(value.number);
  const previewNumber = (numberDigits + '•'.repeat(16)).slice(0, Math.max(16, numberDigits.length)).replace(/(.{4})(?=.)/g, '$1 ');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-nanny-blue/5 px-4 py-3 text-xs text-nanny-blue">
        <span><span className="font-semibold">{t.demoTitle}.</span> {t.demo}</span>
        <button type="button" className="rounded-full bg-white px-3 py-1 font-semibold shadow-sm" onClick={() => { onChange({ ...TEST_CARD }); setTouched({}); }}>
          {t.fillTest}
        </button>
      </div>

      {/* Live preview, so it is obvious which part of the card each field means. */}
      <div className="relative mx-auto aspect-[1.586] w-full max-w-[340px] overflow-hidden rounded-2xl bg-gradient-to-br from-nanny-blue to-[#7a8fff] p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <span className="h-7 w-10 rounded-md bg-white/70" aria-hidden="true" />
          <span className="text-sm font-bold tracking-wide">{brand}</span>
        </div>
        <p className="mt-6 font-mono text-lg tracking-[0.12em] sm:text-xl">{previewNumber}</p>
        <div className="mt-4 flex items-end justify-between gap-3 text-xs">
          <div className="min-w-0">
            <p className="opacity-70">{t.holder}</p>
            <p className="truncate font-semibold uppercase">{value.holder || t.previewName}</p>
          </div>
          <div className="text-right">
            <p className="opacity-70">{t.expiry}</p>
            <p className="font-semibold">{value.expiry || 'MM/YY'}</p>
          </div>
        </div>
      </div>

      <Field label={t.number} hint={t.numberHint} error={visible('number')}>
        <div className="relative">
          <input className={inputClass('number')} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
                 value={value.number} onBlur={() => leave('number')}
                 onChange={(e) => set({ number: formatCardNumber(e.target.value) })} />
          {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-nanny-cream px-2 py-0.5 text-xs font-bold text-nanny-brownish">{brand}</span>}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.expiry} hint={t.expiryHint} error={visible('expiry')}>
          <input className={inputClass('expiry')} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" maxLength={5}
                 value={value.expiry} onBlur={() => leave('expiry')}
                 onChange={(e) => set({ expiry: formatExpiry(e.target.value, value.expiry) })} />
        </Field>
        <Field label={t.cvc} hint={t.cvcHint(cvcLength(value.number))} error={visible('cvc')}>
          <input className={inputClass('cvc')} type="password" inputMode="numeric" autoComplete="cc-csc" placeholder={'•'.repeat(cvcLength(value.number))}
                 maxLength={cvcLength(value.number)} value={value.cvc} onBlur={() => leave('cvc')}
                 onChange={(e) => set({ cvc: e.target.value.replace(/\D/g, '').slice(0, cvcLength(value.number)) })} />
        </Field>
      </div>

      <Field label={t.holder} hint={t.holderHint} error={visible('holder')}>
        <input className={inputClass('holder')} autoComplete="cc-name" placeholder="IVAN IVANOV"
               value={value.holder} onBlur={() => leave('holder')}
               onChange={(e) => set({ holder: e.target.value.toUpperCase().replace(/[^\p{L}\s'.-]/gu, '').slice(0, 60) })} />
      </Field>

      <p className="text-center text-xs text-nanny-brownish/55">🔒 {t.secure}</p>
    </div>
  );
}
