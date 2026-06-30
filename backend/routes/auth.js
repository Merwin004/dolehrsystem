const express = require('express');
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { db }  = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Avatar uploads
const avatarDir = path.join(__dirname, '../uploads/avatars');
try { if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true }); } catch {}

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar-${req.session.user.id}-${Date.now()}${ext}`);
    }
  }),
  limits:    { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
    cb(null, true);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const r = await db.execute(
      'SELECT id, username, password, role, department, full_name, email, avatar FROM users WHERE username = ?',
      [username]
    );
    const user = r.rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid username or password' });

    req.session.user = {
      id:         Number(user.id),
      username:   user.username,
      role:       user.role,
      department: user.department || null,
      full_name:  user.full_name  || null,
      email:      user.email      || null,
      avatar:     user.avatar     || null,
    };

    res.json({ role: user.role, user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.session.user);
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, email } = req.body;
    await db.execute(
      'UPDATE users SET full_name = ?, email = ? WHERE id = ?',
      [full_name, email, req.session.user.id]
    );
    req.session.user.full_name = full_name;
    req.session.user.email     = email;
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// All admin users (for Productions responsible display — no passwords returned)
router.get('/users', requireAuth, async (req, res) => {
  try {
    const r = await db.execute('SELECT id, username, role, department, full_name, avatar FROM users');
    res.json(r.rows.map(u => ({ ...u, id: Number(u.id) })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Delete old avatar file if it exists
    const old = req.session.user.avatar;
    if (old) {
      const oldPath = path.join(avatarDir, path.basename(old));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await db.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.session.user.id]);
    req.session.user.avatar = avatarUrl;

    res.json({ avatar: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
