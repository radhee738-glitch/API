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
    const staff = await db.securityStaff.create({
      data: { name, cnic, phone, shift, notes }
    });
    return res.status(201).json({ staff });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Security staff CNIC already exists' });
    }
    return res.status(500).json({ error: 'Unable to create security staff record', details: error.message });
  }
});

router.get('/staff', authenticate, authorize('admin', 'security'), async (req, res) => {
  try {
    const staff = await db.securityStaff.findMany({
      select: { id: true, name: true, cnic: true, phone: true, shift: true, notes: true, created_at: true },
      orderBy: { created_at: 'desc' }
    });
    return res.json({ staff });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch security staff', details: error.message });
  }
});

module.exports = router;
