const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/apply', authenticate, authorize('customer'), async (req, res) => {
  const { amount, purpose, questionnaire } = req.body;
  if (!amount || !purpose) {
    return res.status(400).json({ error: 'Amount and purpose are required' });
  }

  try {
    const customer = await db.customer.findFirst({ where: { user_id: req.user.id } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const account = await db.account.findFirst({ where: { customer_id: customer.id } });
    if (!account) {
      return res.status(400).json({ error: 'No account found for customer' });
    }

    const loan = await db.loan.create({
      data: {
        customer_id: customer.id,
        account_id: account.id,
        amount,
        purpose,
        term_months: 12,
        interest_rate: 12.0,
        questionnaire: questionnaire || null
      }
    });

    return res.status(201).json({ loan });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to apply for loan', details: error.message });
  }
});

router.put('/reject/:loanId', authenticate, authorize('admin'), async (req, res) => {
  const { loanId } = req.params;
  const { rejectionReason } = req.body;
  if (!rejectionReason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const loanIdInt = parseInt(loanId);
    if (isNaN(loanIdInt)) return res.status(400).json({ error: 'Invalid loan ID' });

    const result = await db.loan.updateMany({
      where: { id: loanIdInt, status: 'pending' },
      data: { status: 'rejected', rejection_reason: rejectionReason }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Loan application not found or cannot be rejected' });
    }
    const loan = await db.loan.findUnique({ where: { id: loanIdInt } });
    req.audit.action = 'loan.reject';
    req.audit.details = JSON.stringify({ loanId, rejectionReason, userId: req.user.id });
    return res.json({ loan });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to reject loan', details: error.message });
  }
});


router.get('/mine', authenticate, authorize('customer'), async (req, res) => {
  try {
    const customer = await db.customer.findFirst({ where: { user_id: req.user.id } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    const loans = await db.loan.findMany({
      where: { customer_id: customer.id },
      orderBy: { created_at: 'desc' }
    });
    return res.json({ loans });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch loans', details: error.message });
  }
});

router.put('/approve/:loanId', authenticate, authorize('admin', 'teller'), async (req, res) => {
  const { loanId } = req.params;
  try {
    const loanIdInt = parseInt(loanId);
    if (isNaN(loanIdInt)) return res.status(400).json({ error: 'Invalid loan ID' });

    const result = await db.loan.updateMany({
      where: { id: loanIdInt, status: 'pending' },
      data: { status: 'approved', approved_at: new Date() }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Loan not found or already processed' });
    }

    const loan = await db.loan.findUnique({ where: { id: loanIdInt } });
    req.audit.action = 'loan.approve';
    req.audit.details = JSON.stringify({ loanId, userId: req.user.id });
    return res.json({ loan });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to approve loan', details: error.message });
  }
});

router.get('/all', authenticate, authorize('admin', 'teller'), async (req, res) => {
  try {
    const loans = await db.loan.findMany({
      include: {
        customer: { include: { user: true } },
        account: true
      },
      orderBy: { created_at: 'desc' }
    });
    
    const formatted = loans.map(l => {
      const flattened = { ...l, customer_name: l.customer?.user?.name, account_number: l.account?.account_number };
      delete flattened.customer;
      delete flattened.account;
      return flattened;
    });

    return res.json({ loans: formatted });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch loans', details: error.message });
  }
});

module.exports = router;
