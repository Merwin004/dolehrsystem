function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ message: 'Unauthorized' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user || !roles.includes(req.session.user.role))
      return res.status(401).json({ message: 'Unauthorized' });
    next();
  };
}

module.exports = { requireAuth, requireRole };
