import { useEffect, useState } from 'react';
import { api } from './api';

// Whether the server has a real AI key. Without it the helper buttons use built-in templates,
// so the site calls them a "hint" instead of promising AI.
let cached = null;

export function useAiEnabled() {
  const [enabled, setEnabled] = useState(cached ?? false);
  useEffect(() => {
    if (cached !== null) return;
    api.get('/api/ai/status')
      .then((data) => { cached = Boolean(data?.enabled); setEnabled(cached); })
      .catch(() => { cached = false; });
  }, []);
  return enabled;
}

const LABELS = {
  improvePet: {
    ai: { en: 'Improve with AI', ru: 'Улучшить с ИИ', kz: 'ИИ арқылы жақсарту' },
    hint: { en: 'Suggest a text', ru: 'Подсказать текст', kz: 'Мәтін ұсыну' },
  },
  careNotes: {
    ai: { en: 'Generate with AI', ru: 'Сгенерировать с ИИ', kz: 'ИИ арқылы жасау' },
    hint: { en: 'Fill from pet profile', ru: 'Заполнить по профилю питомца', kz: 'Жануар профилінен толтыру' },
  },
  doneAi: { en: 'AI polished the text. You can still edit everything.', ru: 'ИИ улучшил текст. Всё можно отредактировать.', kz: 'ИИ мәтінді жақсартты. Бәрін өзгертуге болады.' },
  doneHint: { en: 'Added a template hint. Edit it to match your pet.', ru: 'Добавили шаблон-подсказку. Отредактируйте его под своего питомца.', kz: 'Үлгі-кеңес қосылды. Оны жануарыңызға сай өзгертіңіз.' },
};

export function aiLabel(key, enabled, language = 'en') {
  const entry = LABELS[key][enabled ? 'ai' : 'hint'];
  return entry[language] || entry.en;
}

export function aiDoneMessage(source, language = 'en') {
  const entry = source === 'openai' ? LABELS.doneAi : LABELS.doneHint;
  return entry[language] || entry.en;
}
