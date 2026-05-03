const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const userResult = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (user.role === 'customer') {
      const customerResult = await db.query('SELECT cnic, phone, address, dob, status FROM customers WHERE user_id = $1', [user.id]);
      return res.json({ user, profile: customerResult.rows[0] || null });
    }

    return res.json({ user, profile: null });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load profile', details: error.message });
  }
});

router.put('/', authenticate, async (req, res) => {
  const { name, email, password, phone, address, dob } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (email) {
      fields.push(`email = $${idx++}`);
      values.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      fields.push(`password_hash = $${idx++}`);
      values.push(hashedPassword);
    }

    if (fields.length > 0) {
      values.push(req.user.id);
      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }

    if (req.user.role === 'customer') {
      const profileFields = [];
      const profileValues = [];
      let profileIdx = 1;

      if (phone) {
        profileFields.push(`phone = $${profileIdx++}`);
        profileValues.push(phone);
      }
      if (address) {
        profileFields.push(`address = $${profileIdx++}`);
        profileValues.push(address);
      }
      if (dob) {
        profileFields.push(`dob = $${profileIdx++}`);
        profileValues.push(dob);
      }

      if (profileFields.length > 0) {
        profileValues.push(req.user.id);
        await db.query(`UPDATE customers SET ${profileFields.join(', ')} WHERE user_id = $${profileIdx}`, profileValues);
      }
    }

    req.audit.action = 'profile.update';
    req.audit.details = JSON.stringify({ email, name, phone, address, dob });

    const userResult = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    const customerResult = await db.query('SELECT cnic, phone, address, dob, status FROM customers WHERE user_id = $1', [req.user.id]);

    return res.json({ user, profile: customerResult.rows[0] || null });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update profile', details: error.message });
  }
});

router.get('/activity', authenticate, async (req, res) => {
  try {
    const historyResult = await db.query(
      'SELECT id, action, description, ip_address, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    return res.json({ activity: historyResult.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load activity', details: error.message });
  }
});

module.exports = router;
