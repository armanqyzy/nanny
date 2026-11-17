const router = require('express').Router();
const { auth, optionalAuth, requireRole } = require('../middleware/auth');
const {
  search,
  mapSearch,
  getOne,
  getAvailability,
  listFavorites,
  addFavorite,
  removeFavorite,
  updateMe,
  setServices,
  getMyVerification,
  updateMyVerification,
  getMyDashboard,
  getDaysOff,
  setMyDaysOff,
} = require('../controllers/sitterController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams, validateQuery, z } = require('../middleware/validate');
const { sitterSchemas, bookingSchemas } = require('../validation/schemas');
const { common } = require('../middleware/validate');

router.get('/', optionalAuth, validateQuery(sitterSchemas.searchQuery), asyncHandler(search));
router.get('/map', optionalAuth, validateQuery(sitterSchemas.mapQuery), asyncHandler(mapSearch));
router.get('/favorites', auth, requireRole('owner'), asyncHandler(listFavorites));
router.get('/me/dashboard', auth, requireRole('sitter'), asyncHandler(getMyDashboard));
router.get('/:id/availability', validateParams(common.idParam), validateQuery(bookingSchemas.availabilityQuery), asyncHandler(getAvailability));
router.post('/:id/favorite', auth, requireRole('owner'), validateParams(common.idParam), asyncHandler(addFavorite));
router.delete('/:id/favorite', auth, requireRole('owner'), validateParams(common.idParam), asyncHandler(removeFavorite));
router.get('/me/verification', auth, requireRole('sitter'), asyncHandler(getMyVerification));
router.put('/me/verification', auth, requireRole('sitter'), validateBody(sitterSchemas.verification), asyncHandler(updateMyVerification));
router.put('/me/days-off', auth, requireRole('sitter'), asyncHandler(setMyDaysOff));
router.get('/:id/days-off', validateParams(common.idParam), asyncHandler(getDaysOff));
router.get('/:id', optionalAuth, validateParams(common.idParam), asyncHandler(getOne));
router.put('/me', auth, requireRole('sitter'), validateBody(sitterSchemas.updateMe), asyncHandler(updateMe));
router.put('/me/services', auth, requireRole('sitter'), validateBody(sitterSchemas.services), asyncHandler(setServices));

module.exports = router;
