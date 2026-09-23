const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

function formatPetProfileFallback(payload = {}) {
  const {
    name,
    pet_type,
    age,
    size,
    care_type,
    behavior,
    health,
    description,
  } = payload;

  const summary = [
    name ? `${name} is a ${pet_type || 'pet'}` : `This ${pet_type || 'pet'}`,
    age ? `${age} year${Number(age) === 1 ? '' : 's'} old` : null,
    size || null,
  ].filter(Boolean).join(', ');

  return {
    behavior: behavior?.trim() || 'Friendly and easy to approach.',
    health: health?.trim() || 'No special medical notes provided yet.',
    description: description?.trim()
      || `${summary}. ${behavior ? `Behavior: ${behavior}. ` : ''}${health ? `Health notes: ${health}. ` : ''}Best cared for with clear instructions, regular updates and a calm approach.`,
  };
}

function formatBookingNotesFallback(payload = {}) {
  const {
    petName,
    petType,
    service,
    behavior,
    health,
    existingNotes,
  } = payload;

  const lines = [];
  lines.push(`Please take care of ${petName || 'my pet'} during ${service || 'the booking'}.`);
  if (petType) lines.push(`${petName || 'The pet'} is a ${petType}.`);
  if (behavior) lines.push(`Behavior and temperament: ${behavior}.`);
  if (health) lines.push(`Health details: ${health}.`);
  if (existingNotes) lines.push(`Additional owner note: ${existingNotes}.`);
  lines.push('Please send updates if anything unusual happens and keep the routine calm and consistent.');
  return { notes: lines.join(' ') };
}

async function createOpenAIResponse({ system, prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI request failed');
  }

  return data.output_text || null;
}

async function generatePetProfileDraft(payload) {
  const fallback = formatPetProfileFallback(payload);
  const result = await createOpenAIResponse({
    system: 'You are a pet care assistant for a pet-sitting marketplace. Rewrite owner pet notes into clear, warm, practical sitter-facing text. Return strict JSON with keys behavior, health, description.',
    prompt:
      `Create sitter-facing fields for a pet profile.\n` +
      `Return valid JSON only.\n\n` +
      `Pet name: ${payload.name || ''}\n` +
      `Pet type: ${payload.pet_type || ''}\n` +
      `Age: ${payload.age || ''}\n` +
      `Size: ${payload.size || ''}\n` +
      `Care type: ${payload.care_type || ''}\n` +
      `Behavior notes: ${payload.behavior || ''}\n` +
      `Health notes: ${payload.health || ''}\n` +
      `Current description: ${payload.description || ''}`,
  }).catch(() => null);

  let parsed = null;
  if (result) {
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = null;
    }
  }

  return {
    ...fallback,
    ...(parsed || {}),
    source: parsed ? 'openai' : 'fallback',
  };
}

async function generateBookingNotesDraft(payload) {
  const fallback = formatBookingNotesFallback(payload);
  const result = await createOpenAIResponse({
    system: 'You are a booking assistant for a pet care platform. Turn rough owner notes into clear booking instructions for a sitter. Return strict JSON with key notes.',
    prompt:
      `Return valid JSON only.\n\n` +
      `Pet name: ${payload.petName || ''}\n` +
      `Pet type: ${payload.petType || ''}\n` +
      `Service: ${payload.service || ''}\n` +
      `Behavior: ${payload.behavior || ''}\n` +
      `Health: ${payload.health || ''}\n` +
      `Owner note: ${payload.existingNotes || ''}`,
  }).catch(() => null);

  let parsed = null;
  if (result) {
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = null;
    }
  }

  return {
    ...fallback,
    ...(parsed || {}),
    source: parsed ? 'openai' : 'fallback',
  };
}

function formatRecommendationExplanationFallback(payload = {}) {
  const reasons = Array.isArray(payload.reasons) ? payload.reasons.filter(Boolean) : [];
  const serviceList = Array.isArray(payload.services)
    ? payload.services.filter(Boolean).join(', ')
    : String(payload.services || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');

  const parts = [];
  parts.push(`${payload.sitterName || 'This sitter'} looks like a strong match for ${payload.petName || 'your pet'}.`);
  if (reasons.length) parts.push(reasons.join('. ') + '.');
  if (serviceList) parts.push(`Relevant services: ${serviceList}.`);
  if (payload.distanceKm !== undefined && payload.distanceKm !== null) {
    parts.push(`Estimated distance is about ${payload.distanceKm} km.`);
  }

  return { explanation: parts.join(' ').trim() };
}

function formatSupportTriageFallback(payload = {}) {
  const text = `${payload.subject || ''} ${payload.body || ''}`.toLowerCase();

  let suggestedCategory = payload.category || 'other';
  if (/payment|card|checkout|refund|charge/.test(text)) suggestedCategory = 'payment_issue';
  else if (/booking|walk|daycare|boarding|cancel|reschedule/.test(text)) suggestedCategory = 'booking_issue';
  else if (/safety|danger|aggressive|injury|emergency/.test(text)) suggestedCategory = 'safety_concern';
  else if (/shop|order|delivery|product/.test(text)) suggestedCategory = 'shop_order';
  else if (/bug|error|failed|login|upload|map|chat/.test(text)) suggestedCategory = 'technical_issue';

  let suggestedPriority = payload.priority || 'normal';
  if (/urgent|asap|immediately|emergency|danger|injury/.test(text)) suggestedPriority = 'urgent';
  else if (/today|now|cancel|refund|payment failed|not working/.test(text)) suggestedPriority = 'high';

  return {
    suggested_category: suggestedCategory,
    suggested_priority: suggestedPriority,
    summary: `${payload.subject || 'Support ticket'} needs review under ${suggestedCategory.replace('_', ' ')}.`,
    first_reply:
      suggestedCategory === 'safety_concern'
        ? 'Support has flagged this as a safety-related issue and an admin should review it as soon as possible.'
        : `Support has received your request and will review the ${suggestedCategory.replace('_', ' ')} details shortly.`,
  };
}

async function generateRecommendationExplanation(payload) {
  const fallback = formatRecommendationExplanationFallback(payload);
  const result = await createOpenAIResponse({
    system: 'You are a matchmaking assistant for a pet care marketplace. Explain in 2 short sentences why a sitter is a good fit. Return strict JSON with key explanation.',
    prompt:
      `Return valid JSON only.\n\n` +
      `Pet name: ${payload.petName || ''}\n` +
      `Pet type: ${payload.petType || ''}\n` +
      `Sitter name: ${payload.sitterName || ''}\n` +
      `Rating: ${payload.rating || ''}\n` +
      `Distance km: ${payload.distanceKm || ''}\n` +
      `Previous bookings: ${payload.previousBookings || ''}\n` +
      `Services: ${Array.isArray(payload.services) ? payload.services.join(', ') : payload.services || ''}\n` +
      `Reasons: ${Array.isArray(payload.reasons) ? payload.reasons.join('; ') : payload.reasons || ''}`,
  }).catch(() => null);

  let parsed = null;
  if (result) {
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = null;
    }
  }

  return {
    ...fallback,
    ...(parsed || {}),
    source: parsed ? 'openai' : 'fallback',
  };
}

async function triageSupportTicket(payload) {
  const fallback = formatSupportTriageFallback(payload);
  const result = await createOpenAIResponse({
    system: 'You are a support triage assistant for a pet care marketplace. Classify tickets and draft a brief admin-facing summary plus first reply. Return strict JSON with keys suggested_category, suggested_priority, summary, first_reply.',
    prompt:
      `Return valid JSON only.\n\n` +
      `Chosen category: ${payload.category || ''}\n` +
      `Chosen priority: ${payload.priority || ''}\n` +
      `Subject: ${payload.subject || ''}\n` +
      `Message: ${payload.body || ''}\n` +
      `Allowed categories: booking_issue, payment_issue, safety_concern, sitter_report, shop_order, technical_issue, other\n` +
      `Allowed priorities: low, normal, high, urgent`,
  }).catch(() => null);

  let parsed = null;
  if (result) {
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = null;
    }
  }

  return {
    ...fallback,
    ...(parsed || {}),
    source: parsed ? 'openai' : 'fallback',
  };
}

module.exports = {
  generatePetProfileDraft,
  generateBookingNotesDraft,
  generateRecommendationExplanation,
  triageSupportTicket,
};
