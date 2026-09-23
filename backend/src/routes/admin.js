const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/adminController');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth, requireRole('admin'));

router.get('/stats', asyncHandler(c.stats));
router.get('/users', asyncHandler(c.listUsers));
router.put('/users/:id/block', asyncHandler(c.blockUser));
router.get('/sitters/review-overview', asyncHandler(c.reviewOverview));
router.get('/sitters/pending', asyncHandler(c.listPendingSitters));
router.get('/sitters/:id/review', asyncHandler(c.getSitterReview));
router.put('/sitters/:id/review', asyncHandler(c.updateSitterReview));
router.put('/sitters/:id/verify', asyncHandler(c.verifySitter));
router.get('/bookings', asyncHandler(c.listBookings));
router.get('/products', asyncHandler(c.listProducts));
router.get('/orders', asyncHandler(c.listOrders));
router.put('/orders/:id/status', asyncHandler(c.updateOrderStatus));
router.get('/support/tickets', asyncHandler(c.listSupportTickets));
router.put('/support/tickets/:id', asyncHandler(c.updateSupportTicket));
router.put('/reviews/:id/hide', asyncHandler(c.moderateReview));

module.exports = router;
