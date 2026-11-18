const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { create, myBookings, updateStatus, rebook, pay, cancelPreview, reschedule } = require('../controllers/bookingController');
const petUpdateController = require('../controllers/petUpdateController');
const checklistController = require('../controllers/checklistController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams } = require('../middleware/validate');
const { bookingSchemas } = require('../validation/schemas');

router.use(auth);
router.post('/', requireRole('owner'), validateBody(bookingSchemas.create), asyncHandler(create));
router.get('/mine', asyncHandler(myBookings));
router.post('/:id/pay', requireRole('owner'), validateParams(require('../middleware/validate').common.idParam), asyncHandler(pay));
router.post('/:id/rebook', requireRole('owner'), validateParams(require('../middleware/validate').common.idParam), validateBody(bookingSchemas.rebook), asyncHandler(rebook));
router.get('/:id/updates', validateParams(require('../middleware/validate').common.idParam), asyncHandler(petUpdateController.list));
router.post('/:id/updates', validateParams(require('../middleware/validate').common.idParam), asyncHandler(petUpdateController.create));
router.get('/:id/checklist', validateParams(require('../middleware/validate').common.idParam), asyncHandler(checklistController.list));
router.post('/:id/checklist', requireRole('owner'), validateParams(require('../middleware/validate').common.idParam), asyncHandler(checklistController.add));
router.put('/:id/checklist/:itemId', requireRole('sitter'), asyncHandler(checklistController.toggle));
router.delete('/:id/checklist/:itemId', requireRole('owner'), asyncHandler(checklistController.remove));
router.post('/:id/reschedule', requireRole('owner'), validateParams(require('../middleware/validate').common.idParam), validateBody(bookingSchemas.reschedule), asyncHandler(reschedule));
router.get('/:id/cancel-preview', validateParams(require('../middleware/validate').common.idParam), asyncHandler(cancelPreview));
router.put('/:id/status', validateParams(require('../middleware/validate').common.idParam), validateBody(bookingSchemas.status), asyncHandler(updateStatus));

module.exports = router;
