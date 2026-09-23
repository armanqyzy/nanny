const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { list, create, update, remove } = require('../controllers/petController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams } = require('../middleware/validate');
const { petSchemas } = require('../validation/schemas');
const { common } = require('../middleware/validate');

router.use(auth);
router.get('/', requireRole('owner'), asyncHandler(list));
router.post('/', requireRole('owner'), validateBody(petSchemas.create), asyncHandler(create));
router.put('/:id', requireRole('owner'), validateParams(common.idParam), validateBody(petSchemas.update), asyncHandler(update));
router.delete('/:id', requireRole('owner'), validateParams(common.idParam), asyncHandler(remove));

module.exports = router;
