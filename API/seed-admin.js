require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@bank.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'AdminPass1!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'System Admin';

const sampleCustomers = [
  {
    name: 'Fatima Khan',
    email: 'fatima.khan@bank.com',
    password: 'CustomerPass1!',
    cnic: '4210123456789',
    phone: '+92 300 1234567',
    address: 'Karachi, Pakistan',
    dob: '1992-08-17',
    accounts: [
      { type: 'savings', balance: 12500.0, currency: 'PKR' },
      { type: 'checking', balance: 4200.5, currency: 'PKR' }
    ]
  },
  {
    name: 'Ali Ahmed',
    email: 'ali.ahmed@bank.com',
    password: 'CustomerPass2!',
    cnic: '4210198765432',
    phone: '+92 301 7654321',
    address: 'Lahore, Pakistan',
    dob: '1988-03-09',
    accounts: [{ type: 'savings', balance: 8800.0, currency: 'PKR' }]
  }
];

const securityStaff = [
  { name: 'Shoaib Malik', cnic: '4210187654321', phone: '+92 321 1122334', shift: 'Day', notes: 'Main gate security' },
  { name: 'Ayesha Tariq', cnic: '4210165432109', phone: '+92 322 5566778', shift: 'Night', notes: 'Lobby and access control' }
];

const generateAccountNumber = () => {
  return `AC${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
};

const createSampleTransactions = async (accountId, balance, counterId) => {
  const transactionCount = await db.query('SELECT COUNT(*) FROM transactions WHERE account_id = $1', [accountId]);
  if (parseInt(transactionCount.rows[0].count, 10) > 0) return;

  const depositAmount = Math.min(balance, 2500.0, Math.max(100.0, balance * 0.2));
  const depositBalanceBefore = Math.max(0, balance - depositAmount);
  await db.query(
    `INSERT INTO transactions (account_id, type, amount, balance_before, balance_after, counter_id, ticket_number, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [accountId, 'deposit', depositAmount, depositBalanceBefore, balance, counterId, null, 'Initial account funding']
  );

  if (balance > 500) {
    const withdrawalAmount = Math.min(500.0, balance * 0.1);
    await db.query(
      `INSERT INTO transactions (account_id, type, amount, balance_before, balance_after, counter_id, ticket_number, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [accountId, 'withdrawal', withdrawalAmount, balance, Math.max(0, balance - withdrawalAmount), counterId, null, 'ATM withdrawal']
    );
  }
};

const createSampleLoan = async (customerId, accountId, amount, termMonths, interestRate, status, creditScore) => {
  const loanCount = await db.query('SELECT COUNT(*) FROM loans WHERE customer_id = $1', [customerId]);
  if (parseInt(loanCount.rows[0].count, 10) > 0) return;

  const approvedAt = status === 'approved' ? new Date() : null;
  await db.query(
    `INSERT INTO loans (customer_id, account_id, amount, term_months, interest_rate, status, credit_score, approved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [customerId, accountId, amount, termMonths, interestRate, status, creditScore, approvedAt]
  );
};

(async () => {
  try {
    const adminExisting = await db.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
    if (adminExisting.rows.length > 0) {
      const admin = adminExisting.rows[0];
      await db.query('UPDATE users SET role = $1, name = $2 WHERE id = $3', ['admin', ADMIN_NAME, admin.id]);
      console.log(`Admin user already exists with email=${ADMIN_EMAIL}, role updated to admin.`);
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [ADMIN_NAME, ADMIN_EMAIL, passwordHash, 'admin']
      );
      console.log(`Admin user created: ${ADMIN_EMAIL}`);
    }

    const counterCount = await db.query('SELECT COUNT(*) FROM counters');
    if (parseInt(counterCount.rows[0].count, 10) === 0) {
      await db.query(
        "INSERT INTO counters (name, status) VALUES ('Counter 1', 'open'), ('Counter 2', 'open'), ('Counter 3', 'open'), ('Counter 4', 'open'), ('Counter 5', 'open')"
      );
      console.log('Created default counters.');
    } else {
      console.log('Counters already seeded.');
    }

    const defaultCounterRes = await db.query('SELECT id FROM counters ORDER BY id LIMIT 1');
    const defaultCounterId = defaultCounterRes.rows[0]?.id || null;

    for (const customer of sampleCustomers) {
      const userExisting = await db.query('SELECT id FROM users WHERE email = $1', [customer.email]);
      let userId;
      if (userExisting.rows.length > 0) {
        userId = userExisting.rows[0].id;
        console.log(`Customer user already exists: ${customer.email}`);
      } else {
        const passwordHash = await bcrypt.hash(customer.password, 12);
        const insertUser = await db.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [customer.name, customer.email, passwordHash, 'customer']
        );
        userId = insertUser.rows[0].id;
        console.log(`Created customer user: ${customer.email}`);
      }

      const customerExisting = await db.query('SELECT id FROM customers WHERE user_id = $1', [userId]);
      let customerId;
      if (customerExisting.rows.length > 0) {
        customerId = customerExisting.rows[0].id;
      } else {
        const insertCustomer = await db.query(
          'INSERT INTO customers (user_id, cnic, phone, address, dob) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [userId, customer.cnic, customer.phone, customer.address, customer.dob]
        );
        customerId = insertCustomer.rows[0].id;
      }

      for (const account of customer.accounts) {
        let accountId;
        const accountExisting = await db.query('SELECT id, balance FROM accounts WHERE customer_id = $1 AND type = $2', [customerId, account.type]);
        if (accountExisting.rows.length === 0) {
          const insertAccount = await db.query(
            'INSERT INTO accounts (account_number, customer_id, type, balance, currency) VALUES ($1, $2, $3, $4, $5) RETURNING id, balance',
            [generateAccountNumber(), customerId, account.type, account.balance, account.currency]
          );
          accountId = insertAccount.rows[0].id;
          await createSampleTransactions(accountId, insertAccount.rows[0].balance, defaultCounterId);
        } else {
          accountId = accountExisting.rows[0].id;
          await createSampleTransactions(accountId, accountExisting.rows[0].balance, defaultCounterId);
        }
      }

      const accountForLoan = await db.query('SELECT id FROM accounts WHERE customer_id = $1 ORDER BY id LIMIT 1', [customerId]);
      if (accountForLoan.rows.length > 0) {
        const loanAmount = customer.name.includes('Fatima') ? 30000.0 : 18000.0;
        const loanStatus = customer.name.includes('Fatima') ? 'approved' : 'pending';
        const creditScore = customer.name.includes('Fatima') ? 720 : 650;
        await createSampleLoan(customerId, accountForLoan.rows[0].id, loanAmount, 24, 11.5, loanStatus, creditScore);
      }
    }

    const ticketCount = await db.query('SELECT COUNT(*) FROM tickets');
    if (parseInt(ticketCount.rows[0].count, 10) === 0) {
      const counters = await db.query('SELECT id FROM counters ORDER BY id LIMIT 3');
      const customers = await db.query('SELECT id FROM customers ORDER BY id LIMIT 3');
      for (let i = 0; i < customers.rows.length; i += 1) {
        const counterId = counters.rows[i % counters.rows.length].id;
        await db.query(
          'INSERT INTO tickets (counter_id, customer_id, ticket_number, status) VALUES ($1, $2, $3, $4)',
          [counterId, customers.rows[i].id, i + 1, i === 0 ? 'called' : 'waiting']
        );
      }
      console.log('Created sample tickets.');
    } else {
      console.log('Tickets already seeded.');
    }

    for (const guard of securityStaff) {
      const existingGuard = await db.query('SELECT id FROM security_staff WHERE cnic = $1', [guard.cnic]);
      if (existingGuard.rows.length === 0) {
        await db.query(
          'INSERT INTO security_staff (name, cnic, phone, shift, notes) VALUES ($1, $2, $3, $4, $5)',
          [guard.name, guard.cnic, guard.phone, guard.shift, guard.notes]
        );
      }
    }

    console.log('Admin seed completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Admin seed failed:', error.message);
    process.exit(1);
  }
})();
