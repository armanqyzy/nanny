const { generatePetProfileDraft, generateBookingNotesDraft } = require('../services/openaiService');

async function petProfileAssistant(req, res) {
  const draft = await generatePetProfileDraft(req.body || {});
  res.json(draft);
}

async function bookingNotesAssistant(req, res) {
  const draft = await generateBookingNotesDraft(req.body || {});
  res.json(draft);
}

module.exports = {
  petProfileAssistant,
  bookingNotesAssistant,
};
