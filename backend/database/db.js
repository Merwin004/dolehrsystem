const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const path   = require('path');
const session = require('express-session');

const db = createClient(
  process.env.TURSO_DATABASE_URL
    ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: `file:${path.join(__dirname, '../hrtracking.db')}` }
);

// ── Session store backed by SQLite (mirrors HR SYSTEM 3 pattern) ──────────────
class SQLiteStore extends session.Store {
  constructor() {
    super();
    setInterval(() => {
      db.execute('DELETE FROM sessions WHERE expired < ?', [Date.now()]).catch(() => {});
    }, 60_000);
  }
  get(sid, cb) {
    db.execute('SELECT sess FROM sessions WHERE sid = ? AND expired > ?', [sid, Date.now()])
      .then(r => { const row = r.rows[0]; cb(null, row ? JSON.parse(row.sess) : null); })
      .catch(cb);
  }
  set(sid, sess, cb) {
    const ttl = sess.cookie?.maxAge ?? 8 * 60 * 60 * 1000;
    db.execute(
      'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?,?,?)',
      [sid, JSON.stringify(sess), Date.now() + ttl]
    ).then(() => cb(null)).catch(cb);
  }
  destroy(sid, cb) {
    db.execute('DELETE FROM sessions WHERE sid = ?', [sid]).then(() => cb(null)).catch(cb);
  }
  touch(sid, sess, cb) {
    const ttl = sess.cookie?.maxAge ?? 8 * 60 * 60 * 1000;
    db.execute('UPDATE sessions SET expired = ? WHERE sid = ?', [Date.now() + ttl, sid])
      .then(() => cb(null)).catch(cb);
  }
}

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid     TEXT PRIMARY KEY,
      sess    TEXT NOT NULL,
      expired INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS otps (
      key      TEXT PRIMARY KEY,
      code     TEXT NOT NULL,
      expires  INTEGER NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL,
      department TEXT,
      full_name  TEXT,
      email      TEXT,
      avatar     TEXT,
      created_at TEXT DEFAULT (datetime('now','+8 hours'))
    )
  `);
  try { await db.execute('ALTER TABLE users ADD COLUMN avatar TEXT'); } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS publications (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      position            TEXT NOT NULL,
      plantilla_item      TEXT NOT NULL,
      salary_grade        TEXT,
      monthly_salary      TEXT,
      department          TEXT NOT NULL,
      place_of_assignment TEXT,
      education           TEXT,
      training            TEXT,
      experience          TEXT,
      eligibility         TEXT,
      competency          TEXT,
      status              TEXT DEFAULT 'draft',
      created_by          INTEGER,
      created_at          TEXT DEFAULT (datetime('now','+8 hours')),
      updated_at          TEXT DEFAULT (datetime('now','+8 hours')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  // Migrate old schema
  // If the old `title` column still exists the INSERT will fail (NOT NULL).
  // Rebuild publications with the correct schema, preserving rows that can map.
  const colInfo = await db.execute("PRAGMA table_info('publications')");
  const colNames = colInfo.rows.map(r => r.name);
  if (colNames.includes('title')) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS publications_new (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        position            TEXT NOT NULL,
        plantilla_item      TEXT NOT NULL DEFAULT '',
        salary_grade        TEXT,
        monthly_salary      TEXT,
        department          TEXT NOT NULL,
        place_of_assignment TEXT,
        education           TEXT,
        training            TEXT,
        experience          TEXT,
        eligibility         TEXT,
        competency          TEXT,
        status              TEXT DEFAULT 'draft',
        created_by          INTEGER,
        created_at          TEXT DEFAULT (datetime('now','+8 hours')),
        updated_at          TEXT DEFAULT (datetime('now','+8 hours')),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    await db.execute(`
      INSERT INTO publications_new
        (id, position, plantilla_item, salary_grade, department, status, created_by, created_at, updated_at)
      SELECT id, position, '', salary_grade, department, status, created_by, created_at, updated_at
      FROM publications
    `);
    await db.execute('DROP TABLE publications');
    await db.execute('ALTER TABLE publications_new RENAME TO publications');
    console.log('[db] publications table migrated to new schema');
  }
  try { await db.execute('ALTER TABLE publications ADD COLUMN place_of_assignment TEXT'); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN csc_form_id TEXT'); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN competency TEXT'); } catch {}
  try { await db.execute("ALTER TABLE publications ADD COLUMN plantilla_item TEXT NOT NULL DEFAULT ''"); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN monthly_salary TEXT'); } catch {}
  try { await db.execute("ALTER TABLE publications ADD COLUMN pub_status TEXT DEFAULT 'draft'"); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN attachment_name TEXT'); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN attachment_original TEXT'); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN closing_date TEXT'); } catch {}
  try { await db.execute("ALTER TABLE publications ADD COLUMN prod_status TEXT DEFAULT 'eval'"); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN prod_since  TEXT'); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN repub_tag   TEXT'); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN repub_since TEXT'); } catch {}
  try { await db.execute('ALTER TABLE publications ADD COLUMN prod_start  TEXT'); } catch {}
  // Unique index on plantilla_item
  try { await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS uidx_plantilla ON publications(plantilla_item)'); } catch {}

  // Backfill prod_status for existing active/expired publications that never got one
  await db.execute(`
    UPDATE publications
    SET prod_status = 'pending',
        prod_since  = COALESCE(updated_at, created_at, datetime('now','+8 hours'))
    WHERE (prod_status IS NULL OR prod_status = '')
      AND (pub_status = 'active' OR pub_status = 'expired')
  `);

  // Migrate existing 'eval' positions that are at the initial stage (never republished)
  // to 'pending' to match the new workflow
  await db.execute(`
    UPDATE publications
    SET prod_status = 'pending'
    WHERE prod_status = 'eval'
      AND (repub_tag IS NULL AND repub_since IS NULL)
  `);

  // Backfill prod_start — total production start date, set once, never overwritten
  await db.execute(`
    UPDATE publications
    SET prod_start = COALESCE(prod_since, updated_at, created_at, datetime('now','+8 hours'))
    WHERE prod_start IS NULL
      AND (pub_status = 'active' OR pub_status = 'expired' OR prod_status IS NOT NULL)
  `);

  // Fix any publications already at prod_status='complete' that didn't get status='completed'
  await db.execute(`
    UPDATE publications
    SET status = 'completed', pub_status = 'expired'
    WHERE prod_status = 'complete'
      AND status != 'completed'
  `);
  console.log('[db] prod_status backfill done');

  // Add exam_schedule and inter_schedule columns if not present
  try { await db.execute("ALTER TABLE publications ADD COLUMN exam_schedule TEXT"); } catch {}
  try { await db.execute("ALTER TABLE publications ADD COLUMN inter_schedule TEXT"); } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS applicants (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      publication_id INTEGER NOT NULL,
      first_name     TEXT NOT NULL,
      last_name      TEXT NOT NULL,
      middle_name    TEXT,
      email          TEXT,
      phone          TEXT,
      address        TEXT,
      status         TEXT DEFAULT 'pending',
      remarks        TEXT,
      submitted_at   TEXT DEFAULT (datetime('now','+8 hours')),
      FOREIGN KEY (publication_id) REFERENCES publications(id)
    )
  `);

  try { await db.execute('ALTER TABLE applicants ADD COLUMN full_name  TEXT'); } catch {}
  try { await db.execute('ALTER TABLE applicants ADD COLUMN doc_letter TEXT'); } catch {}
  try { await db.execute('ALTER TABLE applicants ADD COLUMN doc_pds    TEXT'); } catch {}
  try { await db.execute('ALTER TABLE applicants ADD COLUMN doc_tor    TEXT'); } catch {}
  try { await db.execute('ALTER TABLE applicants ADD COLUMN doc_cse    TEXT'); } catch {}
  try { await db.execute('ALTER TABLE applicants ADD COLUMN doc_wes      TEXT'); } catch {}
  try { await db.execute('ALTER TABLE applicants ADD COLUMN doc_training TEXT'); } catch {}

  // Relax NOT NULL on first_name/last_name so public applicants using full_name don't fail
  const appColInfo = (await db.execute("PRAGMA table_info('applicants')")).rows;
  const firstNameCol = appColInfo.find(r => r.name === 'first_name');
  if (firstNameCol && Number(firstNameCol.notnull) === 1) {
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS applicants_new (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        publication_id INTEGER NOT NULL,
        full_name      TEXT,
        first_name     TEXT,
        last_name      TEXT,
        middle_name    TEXT,
        email          TEXT,
        phone          TEXT,
        address        TEXT,
        status         TEXT DEFAULT 'pending',
        remarks        TEXT,
        submitted_at   TEXT DEFAULT (datetime('now','+8 hours')),
        doc_letter     TEXT,
        doc_pds        TEXT,
        doc_tor        TEXT,
        doc_cse        TEXT,
        doc_wes        TEXT,
        FOREIGN KEY (publication_id) REFERENCES publications(id)
      )`);
      await db.execute(`INSERT INTO applicants_new
        SELECT id, publication_id, full_name, first_name, last_name, middle_name,
               email, phone, address, status, remarks, submitted_at,
               doc_letter, doc_pds, doc_tor, doc_cse, doc_wes
        FROM applicants`);
      await db.execute('DROP TABLE applicants');
      await db.execute('ALTER TABLE applicants_new RENAME TO applicants');
      console.log('[db] applicants table migrated — nullable name columns');
    } catch (e) { console.error('[db] applicants migration skipped:', e.message); }
  }

  // Ensure all default accounts exist (INSERT OR IGNORE so safe to re-run)
  const hash = await bcrypt.hash('admin123', 10);
  await db.batch([
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['rspu',     hash, 'rspu', null,  'RSPU Administrator',                'rspu@gov.ph']    },
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['hrmo_as',  hash, 'hrmo', 'AS',  'Administrative Service',            'as@gov.ph']      },
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['hrmo_fms', hash, 'hrmo', 'FMS', 'Financial and Management Service',  'fms@gov.ph']     },
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['hrmo_ias', hash, 'hrmo', 'IAS', 'Internal Audit Service',            'ias@gov.ph']     },
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['hrmo_ips', hash, 'hrmo', 'IPS', 'Information and Publication Service','ips@gov.ph']    },
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['hrmo_ls',  hash, 'hrmo', 'LS',  'Legal Service',                     'ls@gov.ph']      },
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['hrmo_ps',   hash, 'hrmo', 'PS',   'Planning Service',                       'ps@gov.ph']   },
    { sql: 'INSERT OR IGNORE INTO users (username,password,role,department,full_name,email) VALUES (?,?,?,?,?,?)',
      args: ['hrmo_hrds', hash, 'hrmo', 'HRDS', 'Human Resource Development Service',     'hrds@gov.ph'] },
  ], 'write');
  console.log('[db] Default accounts verified.');
}

module.exports = { db, initDB, SQLiteStore };
