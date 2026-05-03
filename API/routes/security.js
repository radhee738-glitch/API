const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/staff', authenticate, authorize('admin'), async (req, res) => {
  const { name, cnic, phone, shift, notes } = req.body;
  if (!name || !cnic) {
    return res.status(400).json({ error: 'Name and CNIC are required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO security_staff (name, cnic, phone, shift, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, cnic, phone, shift, notes]
    );
    return res.status(201).json({ staff: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Security staff CNIC already exists' });
    }
    return res.status(500).json({ error: 'Unable to create security staff record', details: error.message });
  }
});

router.get('/staff', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, cnic, phone, shift, notes, created_at FROM security_staff ORDER BY created_at DESC');
    return res.json({ staff: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch security staff', details: error.message });
  }
});

module.exports = router;
