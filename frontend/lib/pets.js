// Shared, translated labels for pet cards ("Dog • Boy • 3 y • Medium").

const LABELS = {
  en: {
    dog: 'Dog', cat: 'Cat', other: 'Other', boy: 'Boy', girl: 'Girl',
    small: 'Small', medium: 'Medium', large: 'Large',
    years: (n) => `${n} y`, underOne: 'under 1 y',
  },
  ru: {
    dog: 'Собака', cat: 'Кошка', other: 'Другое', boy: 'Мальчик', girl: 'Девочка',
    small: 'Маленький', medium: 'Средний', large: 'Большой',
    years: (n) => `${n} г.`, underOne: 'до 1 года',
  },
  kz: {
    dog: 'Ит', cat: 'Мысық', other: 'Басқа', boy: 'Ұл', girl: 'Қыз',
    small: 'Кішкентай', medium: 'Орташа', large: 'Үлкен',
    years: (n) => `${n} жас`, underOne: '1 жасқа дейін',
  },
};

// "Other" pets keep their real kind (rabbit, hamster...) in the description as [pet-type:...].
export function customPetType(pet) {
  if (pet?.custom_pet_type) return pet.custom_pet_type;
  const match = String(pet?.description || '').match(/^\[pet-type:([^\]]+)\]/i);
  return match ? match[1].trim() : '';
}

export function petTypeLabel(pet, language = 'en') {
  const l = LABELS[language] || LABELS.en;
  if (pet?.pet_type === 'other') return customPetType(pet) || l.other;
  return l[pet?.pet_type] || pet?.pet_type || '';
}

export function petAgeLabel(age, language = 'en') {
  const l = LABELS[language] || LABELS.en;
  if (age === null || age === undefined || age === '') return '';
  const n = Number(age);
  if (n === 0) return l.underOne;
  return l.years(n);
}

export function petSummaryLine(pet, language = 'en') {
  const l = LABELS[language] || LABELS.en;
  return [
    petTypeLabel(pet, language),
    l[pet?.gender] || pet?.gender,
    petAgeLabel(pet?.age, language),
    l[pet?.size] || pet?.size,
  ].filter(Boolean).join(' • ');
}
