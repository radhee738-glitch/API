const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await db.query('SELECT id, name, email, role, banned FROM users WHERE id = $1', [payload.id]);
    if (!userResult.rows[0]) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (userResult.rows[0].banned) {
      return res.status(403).json({ error: 'Account banned' });
    }

    const sessionResult = await db.query(
      'SELECT id FROM sessions WHERE jti = $1 AND user_id = $2 AND expires_at > NOW()',
      [payload.jti, payload.id]
    );
    if (!sessionResult.rows[0]) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = { ...userResult.rows[0], jti: payload.jti };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  return next();
};

const audit = (req, res, next) => {
  req.audit = {
    userId: null,
    action: null,
    details: null
  };

  res.on('finish', async () => {
    if (!req.audit || !req.audit.action) return;

    try {
      await db.query(
        'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1, $2, $3, $4)',
        [req.user?.id || null, req.audit.action, req.audit.details || null, req.ip]
      );
    } catch (error) {
      console.error('Audit log failed:', error.message);
    }
  });

  next();
};

module.exports = {
  authenticate,
  authorize,
  audit
};
