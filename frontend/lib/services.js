// Human-readable service names. The database keeps short codes such as "home_visit".
const SERVICE_NAMES = {
  en: { walking: 'Walking', daycare: 'Daycare', boarding: 'Boarding', grooming: 'Grooming', home_visit: 'Home visit', medication_care: 'Medication care' },
  ru: { walking: 'Прогулка', daycare: 'Дневной присмотр', boarding: 'Передержка', grooming: 'Груминг', home_visit: 'Визит на дом', medication_care: 'Помощь с лекарствами' },
  kz: { walking: 'Серуен', daycare: 'Күндізгі күтім', boarding: 'Түнеумен күтім', grooming: 'Груминг', home_visit: 'Үйге бару', medication_care: 'Дәрі-дәрмек көмегі' },
};

export function serviceName(service, language = 'en') {
  return (SERVICE_NAMES[language] || SERVICE_NAMES.en)[service] || String(service || '').replace(/_/g, ' ');
}

export function localeFor(language) {
  return language === 'ru' ? 'ru-RU' : language === 'kz' ? 'kk-KZ' : 'en-US';
}
