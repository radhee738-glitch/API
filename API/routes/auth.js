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
  await db.session.create({
    data: { user_id: userId, token, jti, expires_at: expiresAt }
  });
};

router.post('/register', async (req, res) => {
  const { name, email, password, cnic, phone, address, dob } = req.body;
  // Role is always 'customer' for public registration — admin creates staff via admin routes
  const role = 'customer';

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (!cnic) {
    return res.status(400).json({ error: 'CNIC is required for customer registration' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    let user;
    if (role === 'customer') {
      user = await db.user.create({
        data: {
          name, email, password_hash: hashedPassword, role,
          customers: {
            create: { cnic, phone, address, dob: dob ? new Date(dob) : null }
          }
        },
        include: { customers: true }
      });

      // Auto-create a default savings account for the new customer
      const customer = user.customers[0];
      const accountNumber = `AC${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
      await db.account.create({
        data: {
          account_number: accountNumber,
          customer_id: customer.id,
          type: 'savings',
          balance: 0,
          currency: 'PKR'
        }
      });

      // Clean up user object for response
      user = { id: user.id, name: user.name, email: user.email, role: user.role };
    } else {
      user = await db.user.create({
        data: { name, email, password_hash: hashedPassword, role },
        select: { id: true, name: true, email: true, role: true }
      });
    }

    const jti = crypto.randomUUID();
    const token = signToken(user, jti);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await storeSession(user.id, token, jti, expiresAt);

    return res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === 'P2002') {
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
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.banned) {
      return res.status(403).json({ error: 'Your account has been banned. Contact support for assistance.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jti = crypto.randomUUID();
    const token = signToken(user, jti);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    // Clean up expired sessions for this user
    await db.session.deleteMany({
      where: { user_id: user.id, expires_at: { lt: new Date() } }
    });

    await storeSession(user.id, token, jti, expiresAt);

    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to login', details: error.message });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    await db.session.deleteMany({
      where: { jti: req.user.jti, user_id: req.user.id }
    });
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to logout', details: error.message });
  }
});

module.exports = router;
