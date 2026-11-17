const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { list, create, update, remove, listVaccinations, addVaccination, removeVaccination } = require('../controllers/petController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams } = require('../middleware/validate');
const { petSchemas } = require('../validation/schemas');
const { common } = require('../middleware/validate');

router.use(auth);
router.get('/', requireRole('owner'), asyncHandler(list));
router.post('/', requireRole('owner'), validateBody(petSchemas.create), asyncHandler(create));
router.put('/:id', requireRole('owner'), validateParams(common.idParam), validateBody(petSchemas.update), asyncHandler(update));
router.delete('/:id', requireRole('owner'), validateParams(common.idParam), asyncHandler(remove));

router.get('/:id/vaccinations', requireRole('owner'), validateParams(common.idParam), asyncHandler(listVaccinations));
router.post('/:id/vaccinations', requireRole('owner'), validateParams(common.idParam), asyncHandler(addVaccination));
router.delete('/:id/vaccinations/:vaccinationId', requireRole('owner'), validateParams(require('../middleware/validate').z.object({ id: require('../middleware/validate').z.coerce.number().int().positive(), vaccinationId: require('../middleware/validate').z.coerce.number().int().positive() })), asyncHandler(removeVaccination));

module.exports = router;
