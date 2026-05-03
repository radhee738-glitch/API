const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const generateAccountNumber = () => {
  const timestamp = Date.now();
  const suffix = Math.floor(100 + Math.random() * 900);
  return `AC${timestamp}${suffix}`;
};

router.post('/open', authenticate, authorize('admin', 'teller'), async (req, res) => {
  const { customerId, type = 'savings', currency = 'PKR', openingBalance = 0 } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: 'customerId is required to open an account' });
  }

  try {
    const accountNumber = generateAccountNumber();
    const result = await db.query(
      'INSERT INTO accounts (account_number, customer_id, type, balance, currency) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [accountNumber, customerId, type, openingBalance, currency]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to open account', details: error.message });
  }
});

router.get('/mine', authenticate, authorize('customer'), async (req, res) => {
  try {
    const customerResult = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    const customer = customerResult.rows[0];
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const accounts = await db.query('SELECT * FROM accounts WHERE customer_id = $1 ORDER BY opened_at DESC', [customer.id]);
    return res.json({ accounts: accounts.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch accounts', details: error.message });
  }
});

router.get('/:accountNumber', authenticate, async (req, res) => {
  const accountNumber = req.params.accountNumber;
  try {
    const accountResult = await db.query('SELECT a.*, c.user_id FROM accounts a JOIN customers c ON a.customer_id = c.id WHERE a.account_number = $1', [accountNumber]);
    const account = accountResult.rows[0];
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (req.user.role === 'customer' && account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ account });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch account', details: error.message });
  }
});

module.exports = router;
