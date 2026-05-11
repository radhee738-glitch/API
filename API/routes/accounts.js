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
    const account = await db.account.create({
      data: {
        account_number: accountNumber,
        customer_id: customerId,
        type,
        balance: openingBalance,
        currency
      }
    });
    return res.status(201).json(account);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to open account', details: error.message });
  }
});

router.get('/mine', authenticate, authorize('customer'), async (req, res) => {
  try {
    const customer = await db.customer.findFirst({
      where: { user_id: req.user.id }
    });
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const accounts = await db.account.findMany({
      where: { customer_id: customer.id },
      orderBy: { opened_at: 'desc' }
    });
    return res.json({ accounts });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch accounts', details: error.message });
  }
});

router.get('/:accountNumber', authenticate, async (req, res) => {
  const accountNumber = req.params.accountNumber;
  try {
    const accountData = await db.account.findUnique({
      where: { account_number: accountNumber },
      include: { customer: { select: { user_id: true } } }
    });
    
    if (!accountData) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = { ...accountData, user_id: accountData.customer.user_id };
    delete account.customer;

    if (req.user.role === 'customer' && account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ account });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch account', details: error.message });
  }
});

module.exports = router;
