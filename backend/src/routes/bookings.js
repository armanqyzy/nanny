const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { create, myBookings, updateStatus, rebook } = require('../controllers/bookingController');
const petUpdateController = require('../controllers/petUpdateController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams } = require('../middleware/validate');
const { bookingSchemas } = require('../validation/schemas');

router.use(auth);
router.post('/', requireRole('owner'), validateBody(bookingSchemas.create), asyncHandler(create));
router.get('/mine', asyncHandler(myBookings));
router.post('/:id/rebook', requireRole('owner'), validateParams(require('../middleware/validate').common.idParam), validateBody(bookingSchemas.rebook), asyncHandler(rebook));
router.get('/:id/updates', validateParams(require('../middleware/validate').common.idParam), asyncHandler(petUpdateController.list));
router.post('/:id/updates', validateParams(require('../middleware/validate').common.idParam), asyncHandler(petUpdateController.create));
router.put('/:id/status', validateParams(require('../middleware/validate').common.idParam), validateBody(bookingSchemas.status), asyncHandler(updateStatus));

module.exports = router;
