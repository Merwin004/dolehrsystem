const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const nodemailer = require('nodemailer');
const { db }     = require('../database/db');
const { requireAuth } = require('../middleware/auth');
let blobPut;
try { blobPut = require('@vercel/blob').put; } catch {}

const router = express.Router();

// ── Gmail transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test connection on startup
console.log('[email] Using account:', process.env.EMAIL_USER, '| Pass set:', !!process.env.EMAIL_PASS);
transporter.verify((err) => {
  if (err) console.error('[email] SMTP FAILED:', err.message);
  else     console.log('[email] SMTP ready');
});

// ── Document upload storage ──────────────────────────────────────────────────
// Always buffer in memory — on Vercel we upload to Blob, locally we write to disk
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const docsDir = path.join(__dirname, '../uploads/applicants');
try { if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true }); } catch {}

// Returns a permanent URL for the file (Blob when token is available, local disk otherwise)
async function storeFile(file) {
  if (!file) return null;
  const ext  = path.extname(file.originalname);
  const name = `${file.fieldname}-${Date.now()}${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN && blobPut) {
    console.log('[blob] uploading', name);
    const blob = await blobPut(`applicants/${name}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    console.log('[blob] stored at', blob.url);
    return blob.url;
  } else {
    const dest = path.join(docsDir, name);
    fs.writeFileSync(dest, file.buffer);
    return name;
  }
}

const docFields = [
  { name: 'doc_letter',   maxCount: 1 },
  { name: 'doc_pds',      maxCount: 1 },
  { name: 'doc_tor',      maxCount: 1 },
  { name: 'doc_cse',      maxCount: 1 },
  { name: 'doc_wes',      maxCount: 1 },
  { name: 'doc_training', maxCount: 1 },
];

function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// OTP helpers — backed by DB so they survive serverless cold starts
async function otpSet(key, code, expires) {
  await db.execute(
    'INSERT OR REPLACE INTO otps (key, code, expires, verified) VALUES (?,?,?,0)',
    [key, code, expires]
  );
}
async function otpGet(key) {
  const r = await db.execute('SELECT * FROM otps WHERE key=?', [key]);
  return r.rows[0] || null;
}
async function otpMarkVerified(key) {
  await db.execute('UPDATE otps SET verified=1 WHERE key=?', [key]);
}
async function otpDelete(key) {
  await db.execute('DELETE FROM otps WHERE key=?', [key]);
}
db.execute('DELETE FROM otps WHERE expires < ?', [Date.now()]).catch(() => {});

async function sendConfirmationEmail(to, { full_name, position, plantilla_item, department, submitted_at, docs }) {
  const docLabels = {
    doc_letter:   'Letter of Intent',
    doc_pds:      'Personal Data Sheet',
    doc_tor:      'Transcript of Records',
    doc_cse:      'Civil Service Eligibility',
    doc_wes:      'Work Experience Sheet',
    doc_training: 'Training Certificates',
  };

  const attachments = Object.entries(docs)
    .filter(([, val]) => val)
    .map(([field, val]) => {
      const ext = val.split('.').pop().split('?')[0];
      const isUrl = val.startsWith('http');
      return {
        filename: `${docLabels[field]}.${ext}`,
        ...(isUrl ? { path: val } : { path: path.join(docsDir, val) }),
      };
    })
    .filter(a => a.filename.split('.').pop().length < 6);

  const docRows = Object.entries(docLabels).map(([field, label]) => {
    const attached = !!docs[field];
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">
        ${attached
          ? '<span style="color:#16a34a;font-weight:600;font-size:12px;">✓ Attached</span>'
          : '<span style="color:#94a3b8;font-size:12px;">Not submitted</span>'}
      </td>
    </tr>`;
  }).join('');

  // submitted_at is already in local time from SQLite — format directly to avoid UTC shift
  const [datePart, timePart] = (submitted_at || '').split(' ');
  const [year, month, day]   = (datePart || '').split('-').map(Number);
  const [hour, minute]       = (timePart || '').split(':').map(Number);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const h12    = hour % 12 || 12;
  const ampm   = hour < 12 ? 'AM' : 'PM';
  const date   = `${months[month - 1]} ${day}, ${year} at ${h12}:${String(minute).padStart(2,'0')} ${ampm}`;

  await transporter.sendMail({
    from: `"DOLE Automated Email" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Application Received — ${position}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <div style="background:#1d4ed8;padding:28px 24px;text-align:center;">
          <div style="color:#fff;font-size:19px;font-weight:800;">Department of Labor and Employment</div>
          <div style="color:#bfdbfe;font-size:13px;margin-top:4px;">HR Tracking System — Application Confirmation</div>
        </div>

        <!-- Body -->
        <div style="padding:28px 24px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#1e293b;">Dear ${full_name},</p>
          <p style="margin:0 0 20px;font-size:13px;color:#475569;line-height:1.6;">
            Your application has been <strong style="color:#16a34a;">successfully received</strong> by the DOLE HR Tracking System.
            Please keep this email for your reference.
          </p>

          <!-- Summary card -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <div style="padding:10px 16px;background:#eff6ff;border-bottom:1px solid #dbeafe;">
              <span style="font-size:11px;font-weight:700;letter-spacing:.6px;color:#2563eb;text-transform:uppercase;">Application Summary</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:40%;">Full Name</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;">${full_name}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Email</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${to}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Position Applied</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#2563eb;">${plantilla_item} — ${position}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">Office / Department</td>
                <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${department}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#64748b;">Date Submitted</td>
                <td style="padding:10px 16px;font-size:13px;color:#1e293b;">${date}</td>
              </tr>
            </table>
          </div>

          <!-- Documents -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <div style="padding:10px 16px;background:#eff6ff;border-bottom:1px solid #dbeafe;">
              <span style="font-size:11px;font-weight:700;letter-spacing:.6px;color:#2563eb;text-transform:uppercase;">Submitted Documents</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">${docRows}</table>
          </div>

          <!-- Notice -->
          <div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
            <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px;">📢 What happens next?</div>
            <p style="margin:0;font-size:13px;color:#b45309;line-height:1.7;">
              The <strong>${department}</strong> office will review your application and submitted documents.
              You will be contacted through this email address if you are shortlisted for further evaluation or interview.
              Please ensure your inbox is active and check your spam/junk folder regularly.
            </p>
          </div>

          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            If you have any concerns, please contact the DOLE Human Resource Management Office directly.
            Do not reply to this automated email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;text-align:center;font-size:11px;color:#94a3b8;">
          This is an automated message from DOLE HR Tracking System &mdash; Official Use Only
        </div>
      </div>
    `,
    attachments,
  });
}

async function sendOTPEmail(to, code, positionTitle) {
  await transporter.sendMail({
    from: `"DOLE Automated Email" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your OTP Code — DOLE Job Application',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#1d4ed8;padding:24px;text-align:center">
          <div style="color:#fff;font-size:18px;font-weight:700">Department of Labor and Employment</div>
          <div style="color:#bfdbfe;font-size:13px;margin-top:4px">HR Tracking System</div>
        </div>
        <div style="padding:32px 24px">
          <p style="margin:0 0 8px;font-size:14px;color:#475569">You requested to apply for:</p>
          <p style="margin:0 0 24px;font-size:16px;font-weight:600;color:#1e293b">${positionTitle}</p>
          <p style="margin:0 0 12px;font-size:14px;color:#475569">Your One-Time Password (OTP) is:</p>
          <div style="background:#f0f7ff;border:2px dashed #2563eb;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
            <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1d4ed8">${code}</span>
          </div>
          <p style="margin:0 0 6px;font-size:13px;color:#64748b">This code is valid for <strong>10 minutes</strong>.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8">If you did not request this, you can safely ignore this email.</p>
        </div>
        <div style="background:#f8fafc;padding:14px 24px;text-align:center;font-size:11px;color:#94a3b8">
          DOLE HR Tracking System &mdash; Official Use Only
        </div>
      </div>
    `,
  });
}

// ── Send OTP ─────────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email, publication_id } = req.body;
    if (!email || !publication_id)
      return res.status(400).json({ message: 'Email and publication_id are required' });

    // Duplicate check before sending OTP
    const dup = await db.execute(
      'SELECT id FROM applicants WHERE publication_id=? AND email=?',
      [publication_id, email]
    );
    if (dup.rows.length > 0)
      return res.status(409).json({ message: 'This email has already been used to apply for this position.' });

    // Get position title for the email
    const pub = await db.execute('SELECT position FROM publications WHERE id=?', [publication_id]);
    const positionTitle = pub.rows[0]?.position || 'Position';

    const code    = genOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    const key     = `${email}::${publication_id}`;
    await otpSet(key, code, expires);

    console.log(`\n=============================`);
    console.log(`[OTP] To: ${email}`);
    console.log(`[OTP] Code: ${code}`);
    console.log(`[OTP] Position ID: ${publication_id}`);
    console.log(`=============================\n`);

    try {
      await sendOTPEmail(email, code, positionTitle);
      res.json({ message: 'OTP sent to your email. Please check your inbox.' });
    } catch (mailErr) {
      console.error('[email send failed]', mailErr.message);
      // Still allow flow — admin can read OTP from console
      res.json({ message: `OTP generated (email failed: ${mailErr.message}). Check backend console for the code.` });
    }
  } catch (err) {
    console.error('[send-otp error]', err.message || err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// ── Verify OTP ───────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, publication_id, otp } = req.body;
    const key    = `${email}::${publication_id}`;
    const record = await otpGet(key);

    if (!record)
      return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    if (Date.now() > Number(record.expires))
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    if (record.code !== String(otp))
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });

    await otpMarkVerified(key);
    res.json({ message: 'OTP verified.' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// ── Get applicants (admin) ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { publication_id } = req.query;
    let sql = `
      SELECT a.*, p.position as pub_position
      FROM applicants a LEFT JOIN publications p ON a.publication_id = p.id
    `;
    const args = [];
    if (publication_id) { sql += ' WHERE a.publication_id = ?'; args.push(publication_id); }
    sql += ' ORDER BY a.submitted_at DESC';
    const r = await db.execute(sql, args);
    res.json(r.rows.map(row => ({ ...row, id: Number(row.id), publication_id: Number(row.publication_id) })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// ── Submit application (public) ───────────────────────────────────────────────
router.post('/', upload.fields(docFields), async (req, res) => {
  try {
    const { publication_id, full_name, email } = req.body;

    if (!publication_id || !full_name || !email)
      return res.status(400).json({ message: 'Full name and email are required.' });

    // Verify OTP
    const key    = `${email}::${publication_id}`;
    const record = await otpGet(key);
    if (!record || !record.verified)
      return res.status(400).json({ message: 'Email not verified. Please verify your OTP first.' });
    if (Date.now() > Number(record.expires))
      return res.status(400).json({ message: 'OTP session expired. Please restart.' });

    // Duplicate check
    const dup = await db.execute(
      'SELECT id FROM applicants WHERE publication_id=? AND email=?',
      [publication_id, email]
    );
    if (dup.rows.length > 0)
      return res.status(409).json({ message: 'You have already applied for this position. Duplicate applications are not allowed.' });

    // Store uploaded files (Blob on Vercel, local disk otherwise)
    const files = req.files || {};
    const [docLetter, docPds, docTor, docCse, docWes, docTraining] = await Promise.all([
      storeFile(files.doc_letter?.[0]),
      storeFile(files.doc_pds?.[0]),
      storeFile(files.doc_tor?.[0]),
      storeFile(files.doc_cse?.[0]),
      storeFile(files.doc_wes?.[0]),
      storeFile(files.doc_training?.[0]),
    ]);

    const result = await db.execute(`
      INSERT INTO applicants
        (publication_id, full_name, first_name, last_name, email, doc_letter, doc_pds, doc_tor, doc_cse, doc_wes, doc_training)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [
      publication_id, full_name,
      full_name, '',
      email,
      docLetter, docPds, docTor, docCse, docWes, docTraining,
    ]);

    // Consume OTP
    await otpDelete(key);

    const r = await db.execute('SELECT * FROM applicants WHERE id=?', [result.lastInsertRowid]);

    // Send confirmation email — awaited so Vercel doesn't kill the function before it sends
    const pub2 = await db.execute(
      'SELECT position, plantilla_item, department FROM publications WHERE id=?',
      [publication_id]
    );
    const pubData = pub2.rows[0] || {};
    try {
      await sendConfirmationEmail(email, {
        full_name,
        position:       pubData.position       || '',
        plantilla_item: pubData.plantilla_item || '',
        department:     pubData.department     || '',
        submitted_at:   r.rows[0].submitted_at,
        docs: { doc_letter: docLetter, doc_pds: docPds, doc_tor: docTor, doc_cse: docCse, doc_wes: docWes, doc_training: docTraining },
      });
    } catch (e) {
      console.error('[confirmation email failed]', e.message);
    }

    res.status(201).json({ ...r.rows[0], id: Number(r.rows[0].id) });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// ── Update status (admin) ─────────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    await db.execute('UPDATE applicants SET status=?, remarks=? WHERE id=?', [status, remarks || null, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM applicants WHERE id=?', [req.params.id]);
    res.json({ message: 'Applicant deleted' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

module.exports = router;
