const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { list, getOne, create, update, remove } = require('../controllers/productController');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getOne));
router.post('/', auth, requireRole('admin'), asyncHandler(create));
router.put('/:id', auth, requireRole('admin'), asyncHandler(update));
router.delete('/:id', auth, requireRole('admin'), asyncHandler(remove));

module.exports = router;
