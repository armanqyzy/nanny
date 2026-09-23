const router = require('express').Router();
const { register, login, logout, me, forgotPassword, resetPassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { authRateLimit } = require('../middleware/rateLimit');
const { validateBody } = require('../middleware/validate');
const { authSchemas } = require('../validation/schemas');

router.post('/register', authRateLimit, validateBody(authSchemas.register), asyncHandler(register));
router.post('/login', authRateLimit, validateBody(authSchemas.login), asyncHandler(login));
router.post('/forgot-password', authRateLimit, validateBody(authSchemas.forgotPassword), asyncHandler(forgotPassword));
router.post('/reset-password', authRateLimit, validateBody(authSchemas.resetPassword), asyncHandler(resetPassword));
router.post('/logout', asyncHandler(logout));
router.get('/me', auth, asyncHandler(me));

module.exports = router;
