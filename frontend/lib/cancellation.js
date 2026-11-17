// Labels for cancellation reasons and the refund policy text. Codes match the backend list.
export const CANCEL_REASONS = {
  plans_changed: { en: 'My plans changed', ru: 'Изменились планы', kz: 'Жоспарым өзгерді' },
  found_other_sitter: { en: 'I found another sitter', ru: 'Нашёл(ла) другого ситтера', kz: 'Басқа ситтер таптым' },
  sitter_not_responding: { en: 'The sitter does not respond', ru: 'Ситтер не отвечает', kz: 'Ситтер жауап бермейді' },
  pet_health: { en: 'My pet is unwell', ru: 'Питомец заболел', kz: 'Жануарым ауырып қалды' },
  not_available: { en: 'I am not available on these dates', ru: 'Я занят(а) в эти даты', kz: 'Бұл күндері бос емеспін' },
  cannot_handle_pet: { en: 'I cannot care for this pet', ru: 'Не смогу ухаживать за этим питомцем', kz: 'Бұл жануарға күтім жасай алмаймын' },
  emergency: { en: 'Personal emergency', ru: 'Непредвиденные обстоятельства', kz: 'Күтпеген жағдай' },
  owner_not_responding: { en: 'The owner does not respond', ru: 'Владелец не отвечает', kz: 'Иесі жауап бермейді' },
  expired: { en: 'Nobody confirmed it in time', ru: 'Не подтверждено вовремя', kz: 'Уақытында расталмады' },
  other: { en: 'Other', ru: 'Другое', kz: 'Басқа' },
};

export function cancelReasonLabel(code, language = 'en') {
  return CANCEL_REASONS[code]?.[language] || CANCEL_REASONS[code]?.en || String(code || '').replace(/_/g, ' ');
}

export const POLICY_TEXT = {
  en: [
    'Free cancellation 2 or more days before the start date: 100% back.',
    'The day before the start: 50% back.',
    'On the start day or later: no refund.',
    'If the sitter cancels, you always get 100% back.',
  ],
  ru: [
    'Отмена за 2 дня и больше до начала: возврат 100%.',
    'Отмена за день до начала: возврат 50%.',
    'В день начала и позже: без возврата.',
    'Если отменяет ситтер, деньги возвращаются полностью.',
  ],
  kz: [
    'Басталуына 2 күн немесе одан көп қалғанда: 100% қайтарылады.',
    'Басталуына бір күн қалғанда: 50% қайтарылады.',
    'Басталған күні немесе кейін: қайтарылмайды.',
    'Ситтер бас тартса, ақша толық қайтарылады.',
  ],
};
