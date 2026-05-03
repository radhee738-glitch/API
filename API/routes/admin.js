const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [customerCount, accountCount, transactionCount, loanCount, ticketCount, securityCount] = await Promise.all([
      db.query('SELECT COUNT(*) FROM customers'),
      db.query('SELECT COUNT(*) FROM accounts'),
      db.query('SELECT COUNT(*) FROM transactions'),
      db.query('SELECT COUNT(*) FROM loans'),
      db.query('SELECT COUNT(*) FROM tickets'),
      db.query('SELECT COUNT(*) FROM security_staff')
    ]);

    return res.json({
      customers: parseInt(customerCount.rows[0].count, 10),
      accounts: parseInt(accountCount.rows[0].count, 10),
      transactions: parseInt(transactionCount.rows[0].count, 10),
      loans: parseInt(loanCount.rows[0].count, 10),
      tickets: parseInt(ticketCount.rows[0].count, 10),
      securityStaff: parseInt(securityCount.rows[0].count, 10)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load dashboard data', details: error.message });
  }
});

router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR c.cnic ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM users u LEFT JOIN customers c ON u.id = c.user_id WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const users = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, u.banned, u.ban_reason, c.cnic, c.phone, c.status
       FROM users u
       LEFT JOIN customers c ON u.id = c.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ users: users.rows, total });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch user list', details: error.message });
  }
});

router.get('/transactions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(a.account_number ILIKE $${params.length} OR u.name ILIKE $${params.length} OR t.description ILIKE $${params.length})`
      );
    }
    if (type) {
      params.push(type);
      conditions.push(`t.type = $${params.length}`);
    }

    const countResult = await db.query(
      `SELECT COUNT(*)
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN customers c ON a.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const transactions = await db.query(
      `SELECT t.id, t.type, t.amount, t.balance_before, t.balance_after, t.description, t.created_at,
              a.account_number, u.name AS customer_name
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN customers c ON a.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ transactions: transactions.rows, total });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch transactions', details: error.message });
  }
});

router.put('/users/:userId/ban', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const { banReason } = req.body;
  if (!banReason) {
    return res.status(400).json({ error: 'Ban reason is required' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET banned = $1, ban_reason = $2 WHERE id = $3 RETURNING id, name, email, banned, ban_reason',
      [true, banReason, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to ban user', details: error.message });
  }
});

router.put('/users/:userId/unban', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      'UPDATE users SET banned = $1, ban_reason = NULL WHERE id = $2 RETURNING id, name, email, banned, ban_reason',
      [false, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to unban user', details: error.message });
  }
});

router.get('/staff', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM security_staff WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const staff = await db.query(
      `SELECT id, name, email, role, created_at
       FROM security_staff
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ staff: staff.rows, total });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch staff', details: error.message });
  }
});

router.post('/staff', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO security_staff (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );
    return res.json({ staff: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create staff', details: error.message });
  }
});

router.put('/staff/:staffId', authenticate, authorize('admin'), async (req, res) => {
  const { staffId } = req.params;
  const { name, email, role } = req.body;

  try {
    const result = await db.query(
      'UPDATE security_staff SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role',
      [name, email, role, staffId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    return res.json({ staff: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update staff', details: error.message });
  }
});

router.delete('/staff/:staffId', authenticate, authorize('admin'), async (req, res) => {
  const { staffId } = req.params;

  try {
    const result = await db.query('DELETE FROM security_staff WHERE id = $1 RETURNING id', [staffId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    return res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete staff', details: error.message });
  }
});

module.exports = router;
