export const APP_TIME_ZONE = 'Asia/Almaty';

const LANGUAGE_TO_LOCALE = {
  en: 'en-US',
  ru: 'ru-RU',
  kz: 'kk-KZ',
};

function toDate(value) {
  if (value instanceof Date) return value;
  return new Date(value);
}

export function getLocale(language = 'en') {
  return LANGUAGE_TO_LOCALE[language] || LANGUAGE_TO_LOCALE.en;
}

export function getDateInAppTimeZone(value = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(toDate(value))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

export function formatDate(value, language = 'en', options = {}) {
  if (!value) return '';
  return new Intl.DateTimeFormat(getLocale(language), {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(toDate(value));
}

export function formatDateTime(value, language = 'en', options = {}) {
  return formatDate(value, language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatDateRange(startDate, endDate, language = 'en', options = {}) {
  return `${formatDate(startDate, language, options)} → ${formatDate(endDate, language, options)}`;
}

export function getWeekdayLabels(language = 'en') {
  return Array.from({ length: 7 }, (_, index) => (
    formatDate(new Date(Date.UTC(2024, 0, 7 + index)), language, { weekday: 'short' })
  ));
}
