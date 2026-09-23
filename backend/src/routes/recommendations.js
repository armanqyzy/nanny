const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { recommendations } = require('../controllers/recommendationController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateQuery } = require('../middleware/validate');
const { recommendationSchemas } = require('../validation/schemas');

router.get('/', auth, requireRole('owner'), validateQuery(recommendationSchemas.query), asyncHandler(recommendations));

module.exports = router;
