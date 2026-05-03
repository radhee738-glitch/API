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
    await db.query(
      'UPDATE otp_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [req.user.id]
    );

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.query(
      'INSERT INTO otp_codes (user_id, code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [req.user.id, code, purpose, expiresAt]
    );

    // In production, this would be sent via SMS/email
    // For demo purposes, we return the OTP directly
    return res.json({
      message: 'OTP generated successfully. In production this would be sent via SMS/email.',
      otp: code,
      expiresIn: '5 minutes'
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
    const result = await db.query(
      'SELECT id FROM otp_codes WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [req.user.id, otp]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    return res.json({ valid: true, message: 'OTP is valid' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to verify OTP', details: error.message });
  }
});

module.exports = router;
