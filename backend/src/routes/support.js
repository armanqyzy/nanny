const router = require('express').Router();
const { auth } = require('../middleware/auth');
const c = require('../controllers/supportController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody } = require('../middleware/validate');
const { supportSchemas } = require('../validation/schemas');

router.use(auth);

router.get('/tickets', asyncHandler(c.myTickets));
router.post('/tickets', validateBody(supportSchemas.createTicket), asyncHandler(c.createTicket));

module.exports = router;
