const router = require('express').Router();
const { auth } = require('../middleware/auth');
const {
  threads,
  history,
  send,
  markDelivered,
  removeMessage,
  removeConversation,
  supportContact,
} = require('../controllers/messageController');
const asyncHandler = require('../middleware/asyncHandler');
const { validateBody, validateParams } = require('../middleware/validate');
const { messageSchemas } = require('../validation/schemas');
const { common } = require('../middleware/validate');

router.use(auth);
router.get('/support', asyncHandler(supportContact));
router.get('/threads', asyncHandler(threads));
router.post('/delivered', validateBody(messageSchemas.delivered), asyncHandler(markDelivered));
router.delete('/conversation/:otherId', validateParams(require('../middleware/validate').z.object({ otherId: require('../middleware/validate').z.coerce.number().int().positive() })), asyncHandler(removeConversation));
router.delete('/:id', validateParams(common.idParam), validateBody(messageSchemas.deleteMessage.partial().optional().or(require('../middleware/validate').z.object({}).passthrough())), asyncHandler(removeMessage));
router.get('/:otherId', validateParams(require('../middleware/validate').z.object({ otherId: require('../middleware/validate').z.coerce.number().int().positive() })), asyncHandler(history));
router.post('/', validateBody(messageSchemas.send), asyncHandler(send));

module.exports = router;
