const { initDB } = require('../backend/database/db');
const app = require('../backend/server');

// Tell Vercel not to pre-parse the request body — multer needs the raw stream
module.exports.config = {
  api: { bodyParser: false },
};

// Single shared promise — resolved once DB is ready, reused for all requests
const dbReady = initDB().catch(err => {
  console.error('[serverless] DB init failed:', err);
});

module.exports = async (req, res) => {
  await dbReady;
  await new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
    app(req, res);
  });
};
