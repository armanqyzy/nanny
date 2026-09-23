const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { petProfileAssistant, bookingNotesAssistant } = require('../controllers/aiController');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.post('/pet-profile', asyncHandler(petProfileAssistant));
router.post('/booking-notes', asyncHandler(bookingNotesAssistant));

module.exports = router;
