const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { db }  = require('../database/db');
const { requireAuth } = require('../middleware/auth');
let blobPut;
try { blobPut = require('@vercel/blob').put; } catch {}

const router = express.Router();

const uploadsDir = path.join(__dirname, '../uploads');
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function storeAttachment(file, pubId) {
  if (!file) return { name: null, original: null };
  const ext      = path.extname(file.originalname);
  const name     = `pub-${pubId}-${Date.now()}${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN && blobPut) {
    const blob = await blobPut(`publications/${name}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    return { name: blob.url, original: file.originalname };
  } else {
    fs.writeFileSync(path.join(uploadsDir, name), file.buffer);
    return { name, original: file.originalname };
  }
}

// CSC Form — assign csc_form_id to selected publications — must be before /:id
router.post('/csc-form', requireAuth, async (req, res) => {
  try {
    const { ids, csc_form_id } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !csc_form_id)
      return res.status(400).json({ message: 'ids and csc_form_id are required' });
    for (const id of ids) {
      // Clear old applicants when re-publishing from expired or no_qualified
      const cur = await db.execute("SELECT pub_status FROM publications WHERE id=?", [id]);
      if (['expired', 'no_qualified'].includes(cur.rows[0]?.pub_status)) {
        await db.execute("DELETE FROM applicants WHERE publication_id=?", [id]);
      }
      await db.execute("UPDATE publications SET csc_form_id=?, pub_status='for_csc_approval', closing_date=NULL, updated_at=datetime('now','+8 hours') WHERE id=?", [csc_form_id, id]);
    }
    res.json({ ok: true, csc_form_id });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// Stats — must be before /:id
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const count = async (where) => {
      const r = await db.execute(`SELECT COUNT(*) as c FROM publications${where ? ' WHERE ' + where : ''}`);
      return Number(r.rows[0].c);
    };
    const role = req.session.user?.role;
    const dept = req.session.user?.department;
    const rspu_turn = `('eval','delib','rprep','assume')`;
    const hrmo_turn = `('pending','rse','exam','inter','ree','appt')`;
    const myTurnStatuses = role === 'rspu' ? rspu_turn : hrmo_turn;
    // HRMO: only count items from their own department
    const deptClause = (role === 'hrmo' && dept) ? ` AND department LIKE '%${dept}%'` : '';
    const my_turn = await count(`status = 'in_production' AND prod_status IN ${myTurnStatuses}${deptClause}`);
    res.json({
      total:           await count(''),
      draft:           await count("status = 'draft'"),
      for_publication: await count("status = 'for_publication'"),
      in_production:   await count("status = 'in_production'"),
      completed:       await count("status = 'completed'"),
      my_turn,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// Auto-expire positions whose closing_date has passed and route them correctly
async function expireOverdue() {
  // Step 1 — mark active positions past their closing date as expired
  await db.execute(
    `UPDATE publications
     SET pub_status = 'expired', updated_at = datetime('now','+8 hours')
     WHERE pub_status = 'active'
       AND closing_date IS NOT NULL
       AND closing_date != ''
       AND date(closing_date) < date('now','+8 hours')`
  );

  // Step 2 — expired WITH applicants → move to In Process flow (hide from For Publication)
  await db.execute(
    `UPDATE publications
     SET status = 'in_production', prod_since = datetime('now','+8 hours'), updated_at = datetime('now','+8 hours')
     WHERE pub_status = 'expired'
       AND prod_status != 'complete'
       AND status != 'in_production'
       AND (SELECT COUNT(*) FROM applicants WHERE publication_id = publications.id) > 0`
  );

  // Step 3 — expired WITHOUT applicants → return to For Publication with Expired badge
  await db.execute(
    `UPDATE publications
     SET status = 'for_publication', updated_at = datetime('now','+8 hours')
     WHERE pub_status = 'expired'
       AND prod_status != 'complete'
       AND status != 'for_publication'
       AND (SELECT COUNT(*) FROM applicants WHERE publication_id = publications.id) = 0`
  );
}

router.get('/public', async (req, res) => {
  try {
    await expireOverdue();
    const r = await db.execute(`
      SELECT id, position, plantilla_item, salary_grade, monthly_salary,
             department, education, training, experience, eligibility, competency,
             attachment_name, attachment_original, closing_date, updated_at
      FROM publications WHERE pub_status = 'active' ORDER BY updated_at DESC
    `);
    res.json(r.rows.map(row => ({ ...row, id: Number(row.id) })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    await expireOverdue();
    const { status } = req.query;
    const user = req.session.user;
    let sql = `
      SELECT p.*, u.full_name as created_by_name,
             (SELECT COUNT(*) FROM applicants a WHERE a.publication_id = p.id) as applicant_count
      FROM publications p LEFT JOIN users u ON p.created_by = u.id
    `;
    const args = [];
    const conditions = [];
    if (status) { conditions.push('p.status = ?'); args.push(status); }
    // HRMO users only see publications from their own department
    if (user.role === 'hrmo' && user.department) {
      conditions.push('(p.department LIKE ? OR p.department LIKE ?)');
      args.push(`%${user.department}%`);
      args.push(`%${user.full_name || user.department}%`);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY p.created_at DESC';
    const r = await db.execute(sql, args);
    res.json(r.rows.map(row => ({ ...row, id: Number(row.id), applicant_count: Number(row.applicant_count) })));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const r = await db.execute(`
      SELECT p.*, u.full_name as created_by_name
      FROM publications p LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Not found' });
    const row = r.rows[0];
    res.json({ ...row, id: Number(row.id) });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      position, plantilla_item, salary_grade, monthly_salary,
      department, place_of_assignment,
      education, training, experience, eligibility, competency,
      status
    } = req.body;

    if (!position || !plantilla_item || !department)
      return res.status(400).json({ message: 'Position Title, Plantilla Item No., and Office are required' });

    const result = await db.execute(`
      INSERT INTO publications (
        position, plantilla_item, salary_grade, monthly_salary,
        department, place_of_assignment,
        education, training, experience, eligibility, competency,
        status, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      position, plantilla_item, salary_grade || null, monthly_salary || null,
      department, place_of_assignment || null,
      education || null, training || null, experience || null,
      eligibility || null, competency || null,
      status || 'draft', req.session.user.id
    ]);

    const r = await db.execute('SELECT * FROM publications WHERE id = ?', [result.lastInsertRowid]);
    const row = r.rows[0];
    res.status(201).json({ ...row, id: Number(row.id) });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed: publications.plantilla_item'))
      return res.status(409).json({ message: 'Plantilla Item No. already exists. Please use a unique number.' });
    console.error(err); res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      position, plantilla_item, salary_grade, monthly_salary,
      department, place_of_assignment,
      education, training, experience, eligibility, competency,
      status
    } = req.body;

    await db.execute(`
      UPDATE publications SET
        position=?, plantilla_item=?, salary_grade=?, monthly_salary=?,
        department=?, place_of_assignment=?,
        education=?, training=?, experience=?, eligibility=?, competency=?,
        status=?, updated_at=datetime('now','+8 hours')
      WHERE id=?
    `, [
      position, plantilla_item, salary_grade || null, monthly_salary || null,
      department, place_of_assignment || null,
      education || null, training || null, experience || null,
      eligibility || null, competency || null,
      status, req.params.id
    ]);

    const r = await db.execute('SELECT * FROM publications WHERE id = ?', [req.params.id]);
    const row = r.rows[0];
    res.json({ ...row, id: Number(row.id) });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed: publications.plantilla_item'))
      return res.status(409).json({ message: 'Plantilla Item No. already exists. Please use a unique number.' });
    console.error(err); res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['draft', 'for_publication', 'in_production', 'completed'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    await db.execute(
      "UPDATE publications SET status=?, updated_at=datetime('now','+8 hours') WHERE id=?",
      [status, req.params.id]
    );
    res.json({ message: 'Status updated' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.patch('/:id/closing-date', requireAuth, async (req, res) => {
  try {
    const { closing_date } = req.body;
    await db.execute(
      "UPDATE publications SET closing_date=?, updated_at=datetime('now','+8 hours') WHERE id=?",
      [closing_date || null, req.params.id]
    );
    res.json({ message: 'Closing date updated' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.patch('/:id/pub-status', requireAuth, async (req, res) => {
  try {
    const { pub_status } = req.body;
    const valid = ['draft', 'for_csc_approval', 'active', 'expired', 'no_qualified'];
    if (!valid.includes(pub_status)) return res.status(400).json({ message: 'Invalid pub_status' });
    await db.execute(
      "UPDATE publications SET pub_status=?, updated_at=datetime('now','+8 hours') WHERE id=?",
      [pub_status, req.params.id]
    );
    res.json({ message: 'Publication status updated' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/:id/publish', requireAuth, upload.single('attachment'), async (req, res) => {
  try {
    const { name: attachName, original: attachOriginal } = await storeAttachment(req.file, req.params.id);
    await db.execute(
      "UPDATE publications SET pub_status='active', prod_status='pending', prod_since=datetime('now','+8 hours'), prod_start=COALESCE(prod_start,datetime('now','+8 hours')), attachment_name=?, attachment_original=?, updated_at=datetime('now','+8 hours') WHERE id=?",
      [attachName, attachOriginal, req.params.id]
    );
    res.json({ message: 'Published successfully', attachment_name: attachName, attachment_original: attachOriginal });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// Batch publish — all positions sharing a CSC form batch
router.post('/publish-batch', requireAuth, upload.single('attachment'), async (req, res) => {
  try {
    const ids = JSON.parse(req.body.ids || '[]');
    const { name: attachName, original: attachOriginal } = await storeAttachment(req.file, `batch-${Date.now()}`);
    for (const id of ids) {
      await db.execute(
        `UPDATE publications
         SET pub_status = 'active',
             prod_status = 'pending',
             prod_since  = datetime('now','+8 hours'),
             prod_start  = COALESCE(prod_start, datetime('now','+8 hours')),
             attachment_name = ?,
             attachment_original = ?,
             closing_date = CASE
               WHEN (closing_date IS NULL OR closing_date = '')
               THEN date('now','+10 days','+8 hours')
               ELSE closing_date
             END,
             updated_at = datetime('now','+8 hours')
         WHERE id = ?`,
        [attachName, attachOriginal, id]
      );
    }
    res.json({ message: `${ids.length} position(s) published successfully` });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// Role-based production status transitions
// canRepublish = both hrmo (office-matched) and rspu can send to Republication
const STATUS_TRANSITIONS = {
  pending:{ next: 'eval',     roles: ['hrmo'] },
  eval:   { next: 'rse',     roles: ['rspu'] },
  rse:    { next: 'exam',    roles: ['hrmo'] },
  exam:   { next: 'inter',   roles: ['hrmo'] },
  inter:  { next: 'delib',   roles: ['hrmo'] },
  delib:  { next: 'ree',     roles: ['rspu'], canRepublish: true },
  ree:    { next: 'rprep',   roles: ['hrmo'], canRepublish: true },
  rprep:  { next: 'appt',    roles: ['rspu'] },
  appt:   { next: 'assume',  roles: ['hrmo'] },
  assume: { next: 'complete',roles: ['rspu'] },
  repub:  { next: 'eval',    roles: ['hrmo', 'rspu'] },
};

// Check if HRMO user's office matches publication's department
function hrmoOfficeMatch(user, pubDept) {
  const dept    = (pubDept || '').toLowerCase();
  const abbr    = (user.department || '').toLowerCase();
  const name    = (user.full_name  || '').toLowerCase();
  return dept.includes(abbr) || dept.includes(name);
}

router.patch('/:id/prod-status', requireAuth, async (req, res) => {
  try {
    const user     = req.session.user;
    const userRole = user?.role;
    const pub      = await db.execute('SELECT prod_status, department FROM publications WHERE id=?', [req.params.id]);
    const row      = pub.rows[0];
    if (!row) return res.status(404).json({ message: 'Publication not found.' });

    const current = row.prod_status || 'pending';
    const tx      = STATUS_TRANSITIONS[current];

    if (!tx) return res.status(400).json({ message: 'No transition available from this stage.' });
    if (!tx.roles.includes(userRole))
      return res.status(403).json({ message: `Only ${tx.roles.join(' or ').toUpperCase()} can advance this stage.` });

    // HRMO must match the publication's office
    if (userRole === 'hrmo' && !hrmoOfficeMatch(user, row.department))
      return res.status(403).json({ message: `Only the ${row.department} HRMO account can perform this action.` });

    const next     = tx.next;
    const schedule = req.body.schedule || null; // datetime string for exam/inter

    if (next === 'eval' && current === 'repub') {
      await db.execute("DELETE FROM applicants WHERE publication_id=?", [req.params.id]);
      await db.execute(
        "UPDATE publications SET prod_status='eval', prod_since=datetime('now','+8 hours'), repub_tag=NULL, repub_since=NULL, pub_status='active', closing_date=date('now','+10 days','+8 hours'), updated_at=datetime('now','+8 hours') WHERE id=?",
        [req.params.id]
      );
      res.json({ message: 'Production status advanced.', prod_status: 'eval', pub_status: 'active' });
    } else if (next === 'complete') {
      await db.execute(
        "UPDATE publications SET prod_status='complete', status='completed', pub_status='expired', prod_since=datetime('now','+8 hours'), updated_at=datetime('now','+8 hours') WHERE id=?",
        [req.params.id]
      );
      res.json({ message: 'Production status advanced.', prod_status: 'complete', status: 'completed', pub_status: 'expired' });
    } else {
      // Save rse/exam/inter schedule if provided
      if (next === 'rse' && schedule) {
        await db.execute(
          "UPDATE publications SET prod_status=?, rse_schedule=?, prod_since=datetime('now','+8 hours'), updated_at=datetime('now','+8 hours') WHERE id=?",
          [next, schedule, req.params.id]
        );
      } else if (next === 'exam' && schedule) {
        await db.execute(
          "UPDATE publications SET prod_status=?, exam_schedule=?, prod_since=datetime('now','+8 hours'), updated_at=datetime('now','+8 hours') WHERE id=?",
          [next, schedule, req.params.id]
        );
      } else if (next === 'inter' && schedule) {
        await db.execute(
          "UPDATE publications SET prod_status=?, inter_schedule=?, prod_since=datetime('now','+8 hours'), updated_at=datetime('now','+8 hours') WHERE id=?",
          [next, schedule, req.params.id]
        );
      } else {
        await db.execute(
          "UPDATE publications SET prod_status=?, prod_since=datetime('now','+8 hours'), updated_at=datetime('now','+8 hours') WHERE id=?",
          [next, req.params.id]
        );
      }
      res.json({ message: 'Production status advanced.', prod_status: next, schedule });
    }
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// Set exam/inter schedule without advancing status
router.patch('/:id/set-schedule', requireAuth, async (req, res) => {
  try {
    const { col, schedule } = req.body
    if (!['rse_schedule', 'exam_schedule', 'inter_schedule'].includes(col) || !schedule)
      return res.status(400).json({ message: 'Invalid request.' })
    await db.execute(
      `UPDATE publications SET ${col}=?, updated_at=datetime('now','+8 hours') WHERE id=?`,
      [schedule, req.params.id]
    )
    res.json({ message: 'Schedule saved.', col, schedule })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }) }
})

// Republication — allowed from delib or ree by HRMO (office-matched) or RSPU
router.patch('/:id/prod-republish', requireAuth, async (req, res) => {
  try {
    const user     = req.session.user;
    const userRole = user?.role;
    if (!['hrmo', 'rspu'].includes(userRole))
      return res.status(403).json({ message: 'Not authorized.' });

    const pub = await db.execute('SELECT prod_status, department FROM publications WHERE id=?', [req.params.id]);
    const row = pub.rows[0];
    if (!row) return res.status(404).json({ message: 'Publication not found.' });

    const tx = STATUS_TRANSITIONS[row.prod_status];
    if (!tx?.canRepublish)
      return res.status(400).json({ message: 'Republication is only allowed at Deliberation or Resolution (E&E) stage.' });

    if (userRole === 'hrmo' && !hrmoOfficeMatch(user, row.department))
      return res.status(403).json({ message: `Only the ${row.department} HRMO account can perform this action.` });

    await db.execute("DELETE FROM applicants WHERE publication_id=?", [req.params.id]);
    await db.execute(
      "UPDATE publications SET prod_status='repub', repub_tag='No Qualified', repub_since=datetime('now','+8 hours'), prod_since=datetime('now','+8 hours'), updated_at=datetime('now','+8 hours') WHERE id=?",
      [req.params.id]
    );
    res.json({ message: 'Marked as Republication.' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// Update published position details + optional file replacement
router.post('/:id/update', requireAuth, upload.single('attachment'), async (req, res) => {
  try {
    const {
      position, plantilla_item, salary_grade, monthly_salary,
      department, closing_date,
      education, training, experience, eligibility, competency,
    } = req.body;

    let attachName     = undefined;
    let attachOriginal = undefined;
    if (req.file) {
      const stored   = await storeAttachment(req.file, req.params.id);
      attachName     = stored.name;
      attachOriginal = stored.original;
    }

    const setClauses = [
      'position=?', 'plantilla_item=?', 'salary_grade=?', 'monthly_salary=?',
      'department=?', 'closing_date=?',
      'education=?', 'training=?', 'experience=?', 'eligibility=?', 'competency=?',
      "updated_at=datetime('now','+8 hours')",
    ];
    const args = [
      position, plantilla_item, salary_grade || null, monthly_salary || null,
      department, closing_date || null,
      education || null, training || null, experience || null,
      eligibility || null, competency || null,
    ];

    if (req.file) {
      setClauses.push('attachment_name=?', 'attachment_original=?');
      args.push(attachName, attachOriginal);
    }

    args.push(req.params.id);
    await db.execute(
      `UPDATE publications SET ${setClauses.join(', ')} WHERE id=?`,
      args
    );

    const r = await db.execute('SELECT * FROM publications WHERE id=?', [req.params.id]);
    res.json({ ...r.rows[0], id: Number(r.rows[0].id) });
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed: publications.plantilla_item'))
      return res.status(409).json({ message: 'Plantilla Item No. already exists.' });
    console.error(err); res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM applicants WHERE publication_id = ?', [req.params.id]);
    await db.execute('DELETE FROM publications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Publication deleted' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

// Send position back to For Publication with No Qualified status — RSPU only
router.patch('/:id/no-qualified', requireAuth, async (req, res) => {
  try {
    if (req.session.user?.role !== 'rspu')
      return res.status(403).json({ message: 'Only RSPU can mark a position as No Qualified.' });
    await db.execute('DELETE FROM applicants WHERE publication_id = ?', [req.params.id]);
    await db.execute(
      `UPDATE publications
       SET pub_status = 'no_qualified',
           status     = 'for_publication',
           prod_status = NULL,
           closing_date = NULL,
           updated_at = datetime('now','+8 hours')
       WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Position returned to For Publication as No Qualified.' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Internal server error' }); }
});

module.exports = router;
module.exports.expireOverdue = expireOverdue;
