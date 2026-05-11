const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [customers, accounts, transactions, loans, securityStaff] = await Promise.all([
      db.customer.count(),
      db.account.count(),
      db.transaction.count(),
      db.loan.count(),
      db.securityStaff.count()
    ]);

    return res.json({ customers, accounts, transactions, loans, securityStaff });
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

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { customers: { some: { cnic: { contains: search, mode: 'insensitive' } } } }
      ];
    }
    if (role) {
      where.role = role;
    }

    const total = await db.user.count({ where });
    const userRecords = await db.user.findMany({
      where,
      include: { customers: true },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    });

    const users = userRecords.map(u => {
      const customer = u.customers[0] || {};
      const { customers, password_hash, ...rest } = u;
      return { ...rest, cnic: customer.cnic || null, phone: customer.phone || null, status: customer.status || null };
    });

    return res.json({ users, total });
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

    const where = {};
    if (search) {
      where.OR = [
        { account: { account_number: { contains: search, mode: 'insensitive' } } },
        { account: { customer: { user: { name: { contains: search, mode: 'insensitive' } } } } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (type) {
      where.type = type;
    }

    const total = await db.transaction.count({ where });
    const transactionRecords = await db.transaction.findMany({
      where,
      include: {
        account: {
          include: { customer: { include: { user: { select: { name: true } } } } }
        }
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    });

    const transactions = transactionRecords.map(t => {
      const customerName = t.account?.customer?.user?.name || 'Unknown';
      const accountNumber = t.account?.account_number || 'Unknown';
      const { account, ...rest } = t;
      return { ...rest, account_number: accountNumber, customer_name: customerName };
    });

    return res.json({ transactions, total });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch transactions', details: error.message });
  }
});

router.put('/users/:userId/ban', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;
  const { banReason } = req.body;
  if (!banReason) return res.status(400).json({ error: 'Ban reason is required' });

  try {
    const id = parseInt(userId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
    if (id === req.user.id) return res.status(400).json({ error: 'You cannot ban your own account' });

    const user = await db.user.update({
      where: { id },
      data: { banned: true, ban_reason: banReason },
      select: { id: true, name: true, email: true, banned: true, ban_reason: true }
    });
    return res.json({ user });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    return res.status(500).json({ error: 'Unable to ban user', details: error.message });
  }
});

router.put('/users/:userId/unban', authenticate, authorize('admin'), async (req, res) => {
  const { userId } = req.params;

  try {
    const id = parseInt(userId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const user = await db.user.update({
      where: { id },
      data: { banned: false, ban_reason: null },
      select: { id: true, name: true, email: true, banned: true, ban_reason: true }
    });
    return res.json({ user });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    return res.status(500).json({ error: 'Unable to unban user', details: error.message });
  }
});

router.get('/staff', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cnic: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const total = await db.securityStaff.count({ where });
    const staff = await db.securityStaff.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    });

    return res.json({ staff, total });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch staff', details: error.message });
  }
});

router.post('/staff', authenticate, authorize('admin'), async (req, res) => {
  const { name, cnic, phone, shift, notes } = req.body;
  if (!name || !cnic) return res.status(400).json({ error: 'Name and CNIC are required' });

  try {
    const staff = await db.securityStaff.create({
      data: { name, cnic, phone, shift, notes }
    });
    return res.status(201).json({ staff });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Security staff CNIC already exists' });
    return res.status(500).json({ error: 'Unable to create staff', details: error.message });
  }
});

router.put('/staff/:staffId', authenticate, authorize('admin'), async (req, res) => {
  const { staffId } = req.params;
  const { name, cnic, phone, shift, notes } = req.body;

  try {
    const id = parseInt(staffId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid staff ID' });

    const staff = await db.securityStaff.update({
      where: { id },
      data: { name, cnic, phone, shift, notes }
    });
    return res.json({ staff });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Staff not found' });
    if (error.code === 'P2002') return res.status(409).json({ error: 'CNIC already exists' });
    return res.status(500).json({ error: 'Unable to update staff', details: error.message });
  }
});

router.delete('/staff/:staffId', authenticate, authorize('admin'), async (req, res) => {
  const { staffId } = req.params;

  try {
    const id = parseInt(staffId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid staff ID' });

    await db.securityStaff.delete({ where: { id } });
    return res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Staff not found' });
    return res.status(500).json({ error: 'Unable to delete staff', details: error.message });
  }
});

module.exports = router;
