require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const session     = require('express-session');
const path        = require('path');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { initDB, SQLiteStore } = require('./database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow blob/upload URLs
  contentSecurityPolicy: false, // SPA handles its own CSP needs
}));

// ── Gzip compression ──────────────────────────────────────────────────────────
app.use(compression());

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { message: 'Too many OTP requests. Please wait 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const isProd = process.env.NODE_ENV === 'production';

app.use(session({
  store: new SQLiteStore(),
  secret: process.env.SESSION_SECRET || 'hrtracking-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure:   isProd,
  }
}));

const uploadsDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

const publicationsRouter = require('./routes/publications');
app.use('/api/auth',                    authLimiter, require('./routes/auth'));
app.use('/api/publications',            publicationsRouter);
app.use('/api/applicants/send-otp',     otpLimiter);
app.use('/api/applicants',              require('./routes/applicants'));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[error]', err.message || err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// Boot — only listen when running directly (not on Vercel serverless)
if (require.main === module) {
  initDB()
    .then(() => {
      const { expireOverdue } = publicationsRouter;
      expireOverdue().catch(err => console.error('[expiry] initial check failed:', err));
      setInterval(() => {
        expireOverdue().catch(err => console.error('[expiry] scheduled check failed:', err));
      }, 60 * 1000);
      app.listen(PORT, () => console.log(`HR Tracking backend running on http://localhost:${PORT}`));
    })
    .catch(err => { console.error('Failed to initialise database:', err); process.exit(1); });
}

module.exports = app;
