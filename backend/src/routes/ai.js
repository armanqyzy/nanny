const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { petProfileAssistant, bookingNotesAssistant } = require('../controllers/aiController');
const asyncHandler = require('../middleware/asyncHandler');

// Lets the site label the helper buttons honestly: real AI only when a key is set on the server.
router.get('/status', (_req, res) => res.json({ enabled: Boolean(process.env.OPENAI_API_KEY) }));

router.use(auth);
router.post('/pet-profile', asyncHandler(petProfileAssistant));
router.post('/booking-notes', asyncHandler(bookingNotesAssistant));

module.exports = router;
