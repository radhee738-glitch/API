const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const recordTransaction = async (client, accountId, type, amount, before, after, counterId, ticketNumber, description) => {
  await client.query(
    `INSERT INTO transactions (account_id, type, amount, balance_before, balance_after, counter_id, ticket_number, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [accountId, type, amount, before, after, counterId, ticketNumber, description]
  );
};

router.post('/transfer', authenticate, authorize('customer', 'teller', 'admin'), async (req, res) => {
  const { fromAccount, toAccount, amount, counterId, ticketNumber, description = 'fund transfer', otp } = req.body;
  const transferAmount = parseFloat(amount);

  if (!fromAccount || !toAccount || !transferAmount || transferAmount <= 0) {
    return res.status(400).json({ error: 'Valid fromAccount, toAccount, and positive amount are required' });
  }

  if (!otp) {
    return res.status(400).json({ error: 'OTP is required for transfers' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const fromResult = await client.query('SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE', [fromAccount]);
    const toResult = await client.query('SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE', [toAccount]);

    const fromRow = fromResult.rows[0];
    const toRow = toResult.rows[0];

    if (!fromRow || !toRow) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or both accounts were not found' });
    }

    // Customers can only transfer from their own accounts
    if (req.user.role === 'customer') {
      const ownerCheck = await client.query(
        'SELECT c.user_id FROM customers c WHERE c.id = $1',
        [fromRow.customer_id]
      );
      if (!ownerCheck.rows[0] || ownerCheck.rows[0].user_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You can only transfer from your own accounts' });
      }
    }

    if (parseFloat(fromRow.balance) < transferAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Verify OTP
    const otpResult = await client.query(
      'SELECT id FROM otp_codes WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [req.user.id, otp]
    );
    if (!otpResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const fromAfter = parseFloat(fromRow.balance) - transferAmount;
    const toAfter = parseFloat(toRow.balance) + transferAmount;

    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [fromAfter, fromRow.id]);
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [toAfter, toRow.id]);

    await client.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);

    await recordTransaction(client, fromRow.id, 'transfer-debit', transferAmount, parseFloat(fromRow.balance), fromAfter, counterId, ticketNumber, description);
    await recordTransaction(client, toRow.id, 'transfer-credit', transferAmount, parseFloat(toRow.balance), toAfter, counterId, ticketNumber, description);

    req.audit.action = 'transaction.transfer';
    req.audit.details = JSON.stringify({ fromAccount, toAccount, amount: transferAmount, userId: req.user.id, description });
    await client.query('COMMIT');
    return res.json({ message: 'Transfer completed', fromAccount: fromAfter, toAccount: toAfter });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Transfer failed', details: error.message });
  } finally {
    client.release();
  }
});

router.post('/deposit', authenticate, authorize('customer', 'teller', 'admin'), async (req, res) => {
  const { accountNumber, amount, counterId, ticketNumber, description = 'deposit', otp } = req.body;
  const depositAmount = parseFloat(amount);
  if (!accountNumber || !depositAmount || depositAmount <= 0) {
    return res.status(400).json({ error: 'Valid accountNumber and deposit amount are required' });
  }

  if (!otp) {
    return res.status(400).json({ error: 'OTP is required for deposits' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const accountResult = await client.query('SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE', [accountNumber]);
    const account = accountResult.rows[0];
    if (!account) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }

    if (req.user.role === 'customer') {
      const ownerCheck = await client.query(
        'SELECT c.user_id FROM customers c WHERE c.id = $1',
        [account.customer_id]
      );
      if (!ownerCheck.rows[0] || ownerCheck.rows[0].user_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You can only deposit to your own accounts' });
      }
    }

    // Verify OTP
    const otpResult = await client.query(
      'SELECT id FROM otp_codes WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [req.user.id, otp]
    );
    if (!otpResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const after = parseFloat(account.balance) + depositAmount;
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [after, account.id]);
    await client.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);
    await recordTransaction(client, account.id, 'deposit', depositAmount, parseFloat(account.balance), after, counterId, ticketNumber, description);
    req.audit.action = 'transaction.deposit';
    req.audit.details = JSON.stringify({ accountNumber, amount: depositAmount, userId: req.user.id, description });
    await client.query('COMMIT');
    return res.json({ message: 'Deposit successful', balance: after });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Deposit failed', details: error.message });
  } finally {
    client.release();
  }
});

router.post('/withdraw', authenticate, authorize('customer', 'teller', 'admin'), async (req, res) => {
  const { accountNumber, amount, counterId, ticketNumber, description = 'withdrawal', otp } = req.body;
  const withdrawAmount = parseFloat(amount);
  if (!accountNumber || !withdrawAmount || withdrawAmount <= 0) {
    return res.status(400).json({ error: 'Valid accountNumber and withdrawal amount are required' });
  }

  if (!otp) {
    return res.status(400).json({ error: 'OTP is required for withdrawals' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const accountResult = await client.query('SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE', [accountNumber]);
    const account = accountResult.rows[0];
    if (!account) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }

    if (req.user.role === 'customer') {
      const ownerCheck = await client.query(
        'SELECT c.user_id FROM customers c WHERE c.id = $1',
        [account.customer_id]
      );
      if (!ownerCheck.rows[0] || ownerCheck.rows[0].user_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You can only withdraw from your own accounts' });
      }
    }

    if (parseFloat(account.balance) < withdrawAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Verify OTP
    const otpResult = await client.query(
      'SELECT id FROM otp_codes WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [req.user.id, otp]
    );
    if (!otpResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const after = parseFloat(account.balance) - withdrawAmount;
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [after, account.id]);
    await client.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpResult.rows[0].id]);
    await recordTransaction(client, account.id, 'withdrawal', withdrawAmount, parseFloat(account.balance), after, counterId, ticketNumber, description);
    req.audit.action = 'transaction.withdraw';
    req.audit.details = JSON.stringify({ accountNumber, amount: withdrawAmount, userId: req.user.id, description });
    await client.query('COMMIT');
    return res.json({ message: 'Withdrawal successful', balance: after });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Withdrawal failed', details: error.message });
  } finally {
    client.release();
  }
});

router.get('/history/:accountNumber', authenticate, async (req, res) => {
  const { accountNumber } = req.params;
  try {
    const accountResult = await db.query('SELECT a.id, c.user_id FROM accounts a JOIN customers c ON a.customer_id = c.id WHERE a.account_number = $1', [accountNumber]);
    const account = accountResult.rows[0];
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (req.user.role === 'customer' && account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const transactions = await db.query('SELECT * FROM transactions WHERE account_id = $1 ORDER BY created_at DESC', [account.id]);
    return res.json({ history: transactions.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch history', details: error.message });
  }
});

module.exports = router;
