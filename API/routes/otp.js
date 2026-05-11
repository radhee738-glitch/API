const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate a 6-digit OTP for transaction verification
router.post('/generate', authenticate, async (req, res) => {
  const { purpose = 'transaction' } = req.body;

  try {
    // Invalidate any existing unused OTPs for this user
    await db.otpCode.updateMany({
      where: { user_id: req.user.id, used: false },
      data: { used: true }
    });

    // Generate 6-digit OTP
    const user = await db.user.findUnique({ where: { id: req.user.id } });
    if (!user.otp_enabled) {
      return res.json({ message: 'OTP is disabled for your account', skipped: true });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.otpCode.create({
      data: {
        user_id: req.user.id,
        code,
        purpose,
        expires_at: expiresAt
      }
    });

    // In production, this would be sent via SMS/email
    // For demo purposes, we return the OTP directly
    return res.json({
      message: 'OTP generated successfully. In production this would be sent via SMS/email.',
      otp: code,
      expiresIn: '10 minutes'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to generate OTP', details: error.message });
  }
});

// Verify an OTP (utility endpoint for checking without consuming)
router.post('/verify', authenticate, async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ error: 'OTP is required' });
  }

  try {
    const otpRecord = await db.otpCode.findFirst({
      where: { user_id: req.user.id, code: otp, used: false, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    return res.json({ valid: true, message: 'OTP is valid' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to verify OTP', details: error.message });
  }
});

module.exports = router;
