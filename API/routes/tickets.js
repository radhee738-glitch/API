const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/counters', authenticate, authorize('admin', 'teller', 'security'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM counters ORDER BY id');
    return res.json({ counters: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch counters', details: error.message });
  }
});

router.post('/request', authenticate, authorize('customer'), async (req, res) => {
  const { counterId } = req.body;
  if (!counterId) {
    return res.status(400).json({ error: 'counterId is required' });
  }

  try {
    const customerResult = await db.query('SELECT id FROM customers WHERE user_id = $1', [req.user.id]);
    const customer = customerResult.rows[0];
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const counterResult = await db.query(
      'UPDATE counters SET current_ticket = current_ticket + 1 WHERE id = $1 RETURNING current_ticket',
      [counterId]
    );
    if (!counterResult.rows[0]) {
      return res.status(404).json({ error: 'Counter not found' });
    }
    const nextTicket = counterResult.rows[0].current_ticket;

    const ticket = await db.query(
      'INSERT INTO tickets (counter_id, customer_id, ticket_number) VALUES ($1, $2, $3) RETURNING *',
      [counterId, customer.id, nextTicket]
    );

    return res.status(201).json({ ticket: ticket.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create ticket', details: error.message });
  }
});

router.post('/:ticketId/call', authenticate, authorize('teller', 'admin'), async (req, res) => {
  const { ticketId } = req.params;
  try {
    const result = await db.query(
      'UPDATE tickets SET status = $1, called_at = NOW() WHERE id = $2 RETURNING *',
      ['called', ticketId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    return res.json({ ticket: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to call ticket', details: error.message });
  }
});

module.exports = router;
