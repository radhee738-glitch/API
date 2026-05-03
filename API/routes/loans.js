const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/apply', authenticate, authorize('customer'), async (req, res) => {
  const { amount, purpose } = req.body;
  if (!amount || !purpose) {
    return res.status(400).json({ error: 'Amount and purpose are required' });
  }

  try {
    const customer = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    if (!customer.rows[0]) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    // Get the customer's first account for the loan
    const accountResult = await db.query('SELECT id FROM accounts WHERE customer_id = $1 LIMIT 1', [customer.rows[0].id]);
    if (!accountResult.rows[0]) {
      return res.status(400).json({ error: 'No account found for customer' });
    }

    const loanResult = await db.query(
      'INSERT INTO loans (customer_id, account_id, amount, purpose, term_months, interest_rate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customer.rows[0].id, accountResult.rows[0].id, amount, purpose, 12, 12.0] // Default 12 months term
    );

    return res.status(201).json({ loan: loanResult.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to apply for loan', details: error.message });
  }
});

router.put('/reject/:loanId', authenticate, authorize('customer'), async (req, res) => {
  const { loanId } = req.params;
  const { rejectionReason } = req.body;
  if (!rejectionReason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const customer = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    if (!customer.rows[0]) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const result = await db.query(
      'UPDATE loans SET status = $1, rejection_reason = $2 WHERE id = $3 AND customer_id = $4 AND status = $5 RETURNING *',
      ['rejected', rejectionReason, loanId, customer.rows[0].id, 'pending']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan application not found or cannot be rejected' });
    }
    return res.json({ loan: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to reject loan', details: error.message });
  }
});

router.get('/mine', authenticate, authorize('customer'), async (req, res) => {
  try {
    const customer = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    if (!customer.rows[0]) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    const loans = await db.query('SELECT * FROM loans WHERE customer_id = $1 ORDER BY created_at DESC', [customer.rows[0].id]);
    return res.json({ loans: loans.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch loans', details: error.message });
  }
});

module.exports = router;
