const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { create, listForSitter } = require('../controllers/reviewController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateParams, z } = require('../middleware/validate');

router.post('/', auth, asyncHandler(create));
router.get('/sitter/:sitterId', validateParams(z.object({ sitterId: z.coerce.number().int().positive() })), asyncHandler(listForSitter));

module.exports = router;
