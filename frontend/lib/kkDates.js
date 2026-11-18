// Kazakh dates for browsers that ship without Kazakh calendar data.
//
// Chrome on macOS (and some other builds) has no "kk" locale data, so
// Intl.DateTimeFormat('kk-KZ', { month: 'long' }) prints "2026 M11" instead of "қараша 2026".
// When that happens we format the date with the Russian locale (same day/month/year order)
// and swap the Russian month and weekday names for Kazakh ones. Browsers that do know
// Kazakh are left alone.

const WORDS = [
  // months, genitive ("18 ноября")
  ['января', 'қаңтар'], ['февраля', 'ақпан'], ['марта', 'наурыз'], ['апреля', 'сәуір'],
  ['мая', 'мамыр'], ['июня', 'маусым'], ['июля', 'шілде'], ['августа', 'тамыз'],
  ['сентября', 'қыркүйек'], ['октября', 'қазан'], ['ноября', 'қараша'], ['декабря', 'желтоқсан'],
  // months, nominative ("ноябрь 2026")
  ['январь', 'қаңтар'], ['февраль', 'ақпан'], ['март', 'наурыз'], ['апрель', 'сәуір'],
  ['май', 'мамыр'], ['июнь', 'маусым'], ['июль', 'шілде'], ['август', 'тамыз'],
  ['сентябрь', 'қыркүйек'], ['октябрь', 'қазан'], ['ноябрь', 'қараша'], ['декабрь', 'желтоқсан'],
  // months, short ("18 нояб.")
  ['янв.', 'қаң.'], ['февр.', 'ақп.'], ['мар.', 'нау.'], ['апр.', 'сәу.'], ['июн.', 'мау.'],
  ['июл.', 'шіл.'], ['авг.', 'там.'], ['сент.', 'қыр.'], ['окт.', 'қаз.'], ['нояб.', 'қар.'], ['дек.', 'жел.'],
  // weekdays
  ['понедельник', 'дүйсенбі'], ['вторник', 'сейсенбі'], ['среда', 'сәрсенбі'], ['четверг', 'бейсенбі'],
  ['пятница', 'жұма'], ['суббота', 'сенбі'], ['воскресенье', 'жексенбі'],
  ['пн', 'дс'], ['вт', 'сс'], ['ср', 'ср'], ['чт', 'бс'], ['пт', 'жм'], ['сб', 'сн'], ['вс', 'жс'],
  // "2026 г." -> "2026 ж."
  ['г.', 'ж.'],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest first so "нояб." wins over shorter matches.
const SORTED = [...WORDS].sort((a, b) => b[0].length - a[0].length);
const PATTERN = new RegExp(`(?<![а-яёА-ЯЁ])(${SORTED.map(([ru]) => escape(ru)).join('|')})(?![а-яёА-ЯЁ])`, 'giu');
const MAP = Object.fromEntries(WORDS.map(([ru, kz]) => [ru.toLowerCase(), kz]));

export function russianToKazakh(text) {
  if (typeof text !== 'string') return text;
  return text.replace(PATTERN, (match) => {
    const kz = MAP[match.toLowerCase()];
    if (!kz) return match;
    return match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
      ? kz.charAt(0).toUpperCase() + kz.slice(1)
      : kz;
  });
}

function isKazakh(locales) {
  const first = Array.isArray(locales) ? locales[0] : locales;
  return typeof first === 'string' && /^kk\b/i.test(first);
}

function browserLacksKazakh(Native) {
  try {
    const out = new Native('kk-KZ', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 15)));
    return !/қараша/i.test(out);
  } catch (_) {
    return true;
  }
}

function install() {
  if (typeof window === 'undefined' || window.__nannyKkDates) return;
  window.__nannyKkDates = true;

  const Native = Intl.DateTimeFormat;
  if (!browserLacksKazakh(Native)) return;

  function KazakhDateTimeFormat(locales, options) {
    if (!isKazakh(locales)) return new Native(locales, options);
    const inner = new Native('ru-RU', options);
    const wrapper = Object.create(Native.prototype);
    Object.defineProperties(wrapper, {
      format: { value: (date) => russianToKazakh(inner.format(date)) },
      formatToParts: { value: (date) => inner.formatToParts(date).map((p) => ({ ...p, value: russianToKazakh(p.value) })) },
      resolvedOptions: { value: () => ({ ...inner.resolvedOptions(), locale: 'kk-KZ' }) },
    });
    if (typeof inner.formatRange === 'function') {
      Object.defineProperty(wrapper, 'formatRange', { value: (a, b) => russianToKazakh(inner.formatRange(a, b)) });
    }
    return wrapper;
  }
  KazakhDateTimeFormat.prototype = Native.prototype;
  KazakhDateTimeFormat.supportedLocalesOf = Native.supportedLocalesOf.bind(Native);
  Intl.DateTimeFormat = KazakhDateTimeFormat;

  ['toLocaleDateString', 'toLocaleString', 'toLocaleTimeString'].forEach((method) => {
    const original = Date.prototype[method];
    // eslint-disable-next-line no-extend-native
    Date.prototype[method] = function patched(locales, options) {
      if (!isKazakh(locales)) return original.call(this, locales, options);
      return russianToKazakh(original.call(this, 'ru-RU', options));
    };
  });
}

install();
