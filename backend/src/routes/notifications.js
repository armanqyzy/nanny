const router = require('express').Router();
const { auth } = require('../middleware/auth');
const c = require('../controllers/notificationController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateParams } = require('../middleware/validate');
const { common } = require('../middleware/validate');

router.use(auth);
router.get('/', asyncHandler(c.list));
router.put('/read-all', asyncHandler(c.markAllRead));
router.put('/:id/read', validateParams(common.idParam), asyncHandler(c.markRead));

module.exports = router;
