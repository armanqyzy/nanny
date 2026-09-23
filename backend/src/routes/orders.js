const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { checkout, myOrders } = require('../controllers/orderController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody } = require('../middleware/validate');
const { orderSchemas } = require('../validation/schemas');

router.use(auth);
router.post('/checkout', validateBody(orderSchemas.checkout), asyncHandler(checkout));
router.get('/mine', asyncHandler(myOrders));

module.exports = router;
