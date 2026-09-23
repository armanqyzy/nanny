const express = require('express');
const { auth } = require('../middleware/auth');
const { uploadDocument } = require('../controllers/uploadController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateQuery } = require('../middleware/validate');
const { uploadSchemas } = require('../validation/schemas');

const router = express.Router();

router.post(
  '/document',
  auth,
  validateQuery(uploadSchemas.query),
  express.raw({ type: '*/*', limit: '12mb' }),
  asyncHandler(uploadDocument)
);

module.exports = router;
