require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const morgan = require('morgan');

const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const petRoutes      = require('./routes/pets');
const sitterRoutes   = require('./routes/sitters');
const bookingRoutes  = require('./routes/bookings');
const messageRoutes  = require('./routes/messages');
const reviewRoutes   = require('./routes/reviews');
const productRoutes  = require('./routes/products');
const orderRoutes    = require('./routes/orders');
const adminRoutes    = require('./routes/admin');
const recommendationRoutes = require('./routes/recommendations');
const notificationRoutes = require('./routes/notifications');
const supportRoutes  = require('./routes/support');
const uploadRoutes   = require('./routes/uploads');
const aiRoutes       = require('./routes/ai');
const registerChat   = require('./sockets/chat');
const { startNotificationWorker } = require('./services/alertService');
const { apiRateLimit } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render and other hosts put a proxy in front of the app; trust it so req.ip is the real client IP
app.set('trust proxy', 1);
const server = http.createServer(app);

const localDevOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean)
  : ['https://nanny.app'];
const allowedOrigins = Array.from(new Set([
  ...configuredOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : localDevOrigins),
]));

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Chat photos, files and voice notes are sent as data URLs, so allow up to ~8 MB per event
  // (the default 1 MB silently dropped bigger attachments).
  maxHttpBufferSize: 8 * 1024 * 1024,
});

// Expose io to controllers via req.app.get('io')
app.set('io', io);

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', ...allowedOrigins],
      connectSrc: ["'self'", ...allowedOrigins],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", ...allowedOrigins],
    },
  },
}));
app.use(cors(corsOptions));
app.use(morgan(':method :url :status :response-time ms'));
app.use(apiRateLimit);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'nanny-api' }));

app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/pets',     petRoutes);
app.use('/api/sitters',  sitterRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/public', require('./routes/public'));
app.use('/api/telegram', require('./routes/telegram'));

app.use(notFound);
app.use(errorHandler);

registerChat(io);
startNotificationWorker(io);

const PORT = process.env.PORT || 4000;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Another Nanny API process may already be running on http://localhost:${PORT}.`);
    console.error('Stop the existing process or start this server with a different PORT value.');
    process.exit(1);
  }

  throw error;
});

const { ensureSchema } = require('./config/ensureSchema');

ensureSchema().finally(() => {
  server.listen(PORT, () => {
    console.log(`Nanny API listening on http://localhost:${PORT}`);
    require('./services/telegramService').setupTelegramWebhook();
    // Unanswered requests starting today or tomorrow: remind the sitter once.
    const { remindPendingRequests } = require('./controllers/bookingController');
    const runReminders = () => remindPendingRequests(io).catch((err) => console.error('[reminder]', err.message));
    setTimeout(runReminders, 20 * 1000);
    setInterval(runReminders, 15 * 60 * 1000);
  });
});

// A stray failed promise (for example an email or notification) must not crash the whole API,
// otherwise every open request fails with "Failed to fetch" while the server restarts.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
