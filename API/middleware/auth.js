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
    const user = await db.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true, banned: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (user.banned) {
      return res.status(403).json({ error: 'Account banned' });
    }

    const session = await db.session.findFirst({
      where: {
        jti: payload.jti,
        user_id: payload.id,
        expires_at: { gt: new Date() }
      }
    });
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = { ...user, jti: payload.jti };
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
      await db.auditLog.create({
        data: {
          user_id: req.user?.id || null,
          action: req.audit.action,
          description: req.audit.details || null,
          ip_address: req.ip
        }
      });
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
