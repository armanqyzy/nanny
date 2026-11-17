const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { updateMe, getById } = require('../controllers/userController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams } = require('../middleware/validate');
const { userSchemas } = require('../validation/schemas');
const { common } = require('../middleware/validate');

router.put('/me', auth, validateBody(userSchemas.updateMe), asyncHandler(updateMe));
// Login required: profiles contain contact details.
router.get('/:id', auth, validateParams(common.idParam), asyncHandler(getById));

module.exports = router;
