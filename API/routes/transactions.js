const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const recordTransaction = async (tx, accountId, type, amount, before, after, description) => {
  await tx.transaction.create({
    data: {
      account_id: accountId,
      type,
      amount,
      balance_before: before,
      balance_after: after,
      description
    }
  });
};

const handleTransactionError = (res, error) => {
  const msg = error.message;
  if (msg === 'Account not found' || msg === 'One or both accounts were not found') {
    return res.status(404).json({ error: msg });
  }
  if (msg === 'You can only transfer from your own accounts' || msg === 'You can only deposit to your own accounts' || msg === 'You can only withdraw from your own accounts') {
    return res.status(403).json({ error: msg });
  }
  if (msg === 'Insufficient funds' || msg === 'Invalid or expired OTP') {
    return res.status(400).json({ error: msg });
  }
  return res.status(500).json({ error: 'Transaction failed', details: error.message });
};

router.post('/transfer', authenticate, authorize('customer', 'teller', 'admin'), async (req, res) => {
  const { fromAccount, toAccount, amount, description = 'fund transfer', otp } = req.body;
  const transferAmount = parseFloat(amount);

  if (!fromAccount || !toAccount || !transferAmount || transferAmount <= 0) {
    return res.status(400).json({ error: 'Valid fromAccount, toAccount, and positive amount are required' });
  }

  const user = await db.user.findUnique({ where: { id: req.user.id } });
  if (user.otp_enabled && !otp) {
    return res.status(400).json({ error: 'OTP is required for transfers' });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const fromRow = await tx.account.findUnique({ where: { account_number: fromAccount }, include: { customer: true } });
      const toRow = await tx.account.findUnique({ where: { account_number: toAccount } });

      if (!fromRow || !toRow) throw new Error('One or both accounts were not found');

      if (req.user.role === 'customer' && fromRow.customer.user_id !== req.user.id) {
        throw new Error('You can only transfer from your own accounts');
      }

      if (parseFloat(fromRow.balance) < transferAmount) throw new Error('Insufficient funds');

      if (user.otp_enabled) {
        const otpRecord = await tx.otpCode.findFirst({
          where: { user_id: req.user.id, code: otp, used: false, expires_at: { gt: new Date() } },
          orderBy: { created_at: 'desc' }
        });
        if (!otpRecord) throw new Error('Invalid or expired OTP');
        await tx.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
      }

      const fromAfter = parseFloat(fromRow.balance) - transferAmount;
      const toAfter = parseFloat(toRow.balance) + transferAmount;

      await tx.account.update({ where: { id: fromRow.id }, data: { balance: fromAfter } });
      await tx.account.update({ where: { id: toRow.id }, data: { balance: toAfter } });

      await recordTransaction(tx, fromRow.id, 'transfer-debit', transferAmount, parseFloat(fromRow.balance), fromAfter, description);
      await recordTransaction(tx, toRow.id, 'transfer-credit', transferAmount, parseFloat(toRow.balance), toAfter, description);

      return { fromAfter, toAfter };
    });

    req.audit.action = 'transaction.transfer';
    req.audit.details = JSON.stringify({ fromAccount, toAccount, amount: transferAmount, userId: req.user.id, description });
    return res.json({ message: 'Transfer completed', fromAccount: result.fromAfter, toAccount: result.toAfter });
  } catch (error) {
    return handleTransactionError(res, error);
  }
});

router.post('/deposit', authenticate, authorize('customer', 'teller', 'admin'), async (req, res) => {
  const { accountNumber, amount, description = 'deposit', otp } = req.body;
  const depositAmount = parseFloat(amount);
  if (!accountNumber || !depositAmount || depositAmount <= 0) {
    return res.status(400).json({ error: 'Valid accountNumber and deposit amount are required' });
  }

  const user = await db.user.findUnique({ where: { id: req.user.id } });
  if (user.otp_enabled && !otp) {
    return res.status(400).json({ error: 'OTP is required for deposits' });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { account_number: accountNumber }, include: { customer: true } });
      if (!account) throw new Error('Account not found');

      if (req.user.role === 'customer' && account.customer.user_id !== req.user.id) {
        throw new Error('You can only deposit to your own accounts');
      }

      if (user.otp_enabled) {
        const otpRecord = await tx.otpCode.findFirst({
          where: { user_id: req.user.id, code: otp, used: false, expires_at: { gt: new Date() } },
          orderBy: { created_at: 'desc' }
        });
        if (!otpRecord) throw new Error('Invalid or expired OTP');
        await tx.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
      }

      const after = parseFloat(account.balance) + depositAmount;
      await tx.account.update({ where: { id: account.id }, data: { balance: after } });
      await recordTransaction(tx, account.id, 'deposit', depositAmount, parseFloat(account.balance), after, description);

      return { after };
    });

    req.audit.action = 'transaction.deposit';
    req.audit.details = JSON.stringify({ accountNumber, amount: depositAmount, userId: req.user.id, description });
    return res.json({ message: 'Deposit successful', balance: result.after });
  } catch (error) {
    return handleTransactionError(res, error);
  }
});

router.post('/withdraw', authenticate, authorize('customer', 'teller', 'admin'), async (req, res) => {
  const { accountNumber, amount, description = 'withdrawal', otp } = req.body;
  const withdrawAmount = parseFloat(amount);
  if (!accountNumber || !withdrawAmount || withdrawAmount <= 0) {
    return res.status(400).json({ error: 'Valid accountNumber and withdrawal amount are required' });
  }

  const user = await db.user.findUnique({ where: { id: req.user.id } });
  if (user.otp_enabled && !otp) {
    return res.status(400).json({ error: 'OTP is required for withdrawals' });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { account_number: accountNumber }, include: { customer: true } });
      if (!account) throw new Error('Account not found');

      if (req.user.role === 'customer' && account.customer.user_id !== req.user.id) {
        throw new Error('You can only withdraw from your own accounts');
      }

      if (parseFloat(account.balance) < withdrawAmount) throw new Error('Insufficient funds');

      if (user.otp_enabled) {
        const otpRecord = await tx.otpCode.findFirst({
          where: { user_id: req.user.id, code: otp, used: false, expires_at: { gt: new Date() } },
          orderBy: { created_at: 'desc' }
        });
        if (!otpRecord) throw new Error('Invalid or expired OTP');
        await tx.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });
      }

      const after = parseFloat(account.balance) - withdrawAmount;
      await tx.account.update({ where: { id: account.id }, data: { balance: after } });
      await recordTransaction(tx, account.id, 'withdrawal', withdrawAmount, parseFloat(account.balance), after, description);

      return { after };
    });

    req.audit.action = 'transaction.withdraw';
    req.audit.details = JSON.stringify({ accountNumber, amount: withdrawAmount, userId: req.user.id, description });
    return res.json({ message: 'Withdrawal successful', balance: result.after });
  } catch (error) {
    return handleTransactionError(res, error);
  }
});

router.get('/history/:accountNumber', authenticate, async (req, res) => {
  const { accountNumber } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = (page - 1) * limit;

  try {
    const account = await db.account.findUnique({
      where: { account_number: accountNumber },
      include: { customer: { select: { user_id: true } } }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (req.user.role === 'customer' && account.customer.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where: { account_id: account.id },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      db.transaction.count({ where: { account_id: account.id } })
    ]);

    return res.json({ history: transactions, total, page, limit });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch history', details: error.message });
  }
});

module.exports = router;
