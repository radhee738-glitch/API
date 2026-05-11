const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, created_at: true }
    });

    if (user.role === 'customer') {
      const customer = await db.customer.findFirst({
        where: { user_id: user.id },
        select: { cnic: true, phone: true, address: true, dob: true, status: true }
      });
      return res.json({ user, profile: customer || null });
    }

    return res.json({ user, profile: null });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load profile', details: error.message });
  }
});

router.put('/', authenticate, async (req, res) => {
  const { name, email, password, phone, address, dob } = req.body;

  try {
    const userData = {
      name,
      email,
      otp_enabled: typeof req.body.otp_enabled === 'boolean' ? req.body.otp_enabled : undefined
    };
    if (password) {
      userData.password_hash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await db.user.update({
      where: { id: req.user.id },
      data: userData,
      select: { id: true, name: true, email: true, role: true, otp_enabled: true, created_at: true }
    });

    if (req.user.role === 'customer') {
      const profileData = {};
      if (phone) profileData.phone = phone;
      if (address) profileData.address = address;
      if (dob) profileData.dob = new Date(dob);

      if (Object.keys(profileData).length > 0) {
        await db.customer.updateMany({
          where: { user_id: req.user.id },
          data: profileData
        });
      }
    }

    req.audit.action = 'profile.update';
    req.audit.details = JSON.stringify({ email, name, phone, address, dob });

    let updatedProfile = null;
    if (req.user.role === 'customer') {
      updatedProfile = await db.customer.findFirst({
        where: { user_id: req.user.id },
        select: { cnic: true, phone: true, address: true, dob: true, status: true }
      });
    }

    return res.json({ user: updatedUser, profile: updatedProfile });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update profile', details: error.message });
  }
});

router.get('/activity', authenticate, async (req, res) => {
  try {
    const activity = await db.auditLog.findMany({
      where: { user_id: req.user.id },
      select: { id: true, action: true, description: true, ip_address: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    return res.json({ activity });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load activity', details: error.message });
  }
});

module.exports = router;
