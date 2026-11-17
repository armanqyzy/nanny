// "New" instead of "0.0" for sitters that have no reviews yet.
export function formatRating(rating, count, language = 'en') {
  const reviews = count == null ? (Number(rating) > 0 ? 1 : 0) : Number(count);
  if (!reviews) {
    if (language === 'ru') return 'Новый';
    if (language === 'kz') return 'Жаңа';
    return 'New';
  }
  return Number(rating || 0).toFixed(1);
}
