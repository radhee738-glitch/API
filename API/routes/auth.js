const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (user, jti) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      jti
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
};

const storeSession = async (userId, token, jti, expiresAt) => {
  await db.query(
    'INSERT INTO sessions (user_id, token, jti, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, token, jti, expiresAt]
  );
};

router.post('/register', async (req, res) => {
  const { name, email, password, role = 'customer', cnic, phone, address, dob } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const insertUser = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );

    const user = insertUser.rows[0];

    if (role === 'customer') {
      await db.query(
        'INSERT INTO customers (user_id, cnic, phone, address, dob) VALUES ($1, $2, $3, $4, $5)',
        [user.id, cnic, phone, address, dob]
      );
    }

    const jti = crypto.randomUUID();
    const token = signToken(user, jti);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await storeSession(user.id, token, jti, expiresAt);

    return res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email or CNIC already exists' });
    }
    return res.status(500).json({ error: 'Unable to register user', details: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await db.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jti = crypto.randomUUID();
    const token = signToken(user, jti);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await storeSession(user.id, token, jti, expiresAt);

    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to login', details: error.message });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM sessions WHERE jti = $1 AND user_id = $2', [req.user.jti, req.user.id]);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to logout', details: error.message });
  }
});

module.exports = router;
