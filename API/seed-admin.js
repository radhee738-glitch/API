require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');
const fs = require('fs');
const path = require('path');

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

const createSampleTransactions = async (accountId, balance) => {
  const transactionCount = await db.transaction.count({ where: { account_id: accountId } });
  if (transactionCount > 0) return;

  const depositAmount = Math.min(balance, 2500.0, Math.max(100.0, balance * 0.2));
  const depositBalanceBefore = Math.max(0, balance - depositAmount);
  
  await db.transaction.create({
    data: {
      account_id: accountId,
      type: 'deposit',
      amount: depositAmount,
      balance_before: depositBalanceBefore,
      balance_after: balance,
      description: 'Initial account funding'
    }
  });

  if (balance > 500) {
    const withdrawalAmount = Math.min(500.0, balance * 0.1);
    await db.transaction.create({
      data: {
        account_id: accountId,
        type: 'withdrawal',
        amount: withdrawalAmount,
        balance_before: balance,
        balance_after: Math.max(0, balance - withdrawalAmount),
        description: 'ATM withdrawal'
      }
    });
  }
};

const createSampleLoan = async (customerId, accountId, amount, termMonths, interestRate, status, creditScore) => {
  const loanCount = await db.loan.count({ where: { customer_id: customerId } });
  if (loanCount > 0) return;

  const approvedAt = status === 'approved' ? new Date() : null;
  await db.loan.create({
    data: {
      customer_id: customerId,
      account_id: accountId,
      amount,
      term_months: termMonths,
      interest_rate: interestRate,
      status,
      credit_score: creditScore,
      approved_at: approvedAt
    }
  });
};

(async () => {
  try {
    console.log('Schema managed by Prisma.');

    const adminExisting = await db.user.findFirst({ where: { email: ADMIN_EMAIL } });
    if (adminExisting) {
      await db.user.update({
        where: { id: adminExisting.id },
        data: { role: 'admin', name: ADMIN_NAME }
      });
      console.log(`Admin user already exists with email=${ADMIN_EMAIL}, role updated to admin.`);
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.user.create({
        data: { name: ADMIN_NAME, email: ADMIN_EMAIL, password_hash: passwordHash, role: 'admin' }
      });
      console.log(`Admin user created: ${ADMIN_EMAIL}`);
    }



    for (const customer of sampleCustomers) {
      let user = await db.user.findFirst({ where: { email: customer.email } });
      let userId;
      if (user) {
        userId = user.id;
        console.log(`Customer user already exists: ${customer.email}`);
      } else {
        const passwordHash = await bcrypt.hash(customer.password, 12);
        user = await db.user.create({
          data: { name: customer.name, email: customer.email, password_hash: passwordHash, role: 'customer' }
        });
        userId = user.id;
        console.log(`Created customer user: ${customer.email}`);
      }

      let custRec = await db.customer.findFirst({ where: { user_id: userId } });
      let customerId;
      if (custRec) {
        customerId = custRec.id;
      } else {
        custRec = await db.customer.create({
          data: { user_id: userId, cnic: customer.cnic, phone: customer.phone, address: customer.address, dob: new Date(customer.dob) }
        });
        customerId = custRec.id;
      }

      for (const account of customer.accounts) {
        let accountId;
        const accountExisting = await db.account.findFirst({ where: { customer_id: customerId, type: account.type } });
        if (!accountExisting) {
          const insertAccount = await db.account.create({
            data: { account_number: generateAccountNumber(), customer_id: customerId, type: account.type, balance: account.balance, currency: account.currency }
          });
          accountId = insertAccount.id;
          await createSampleTransactions(accountId, parseFloat(insertAccount.balance));
        } else {
          accountId = accountExisting.id;
          await createSampleTransactions(accountId, parseFloat(accountExisting.balance));
        }
      }

      const accountForLoan = await db.account.findFirst({ where: { customer_id: customerId }, orderBy: { id: 'asc' } });
      if (accountForLoan) {
        const loanAmount = customer.name.includes('Fatima') ? 30000.0 : 18000.0;
        const loanStatus = customer.name.includes('Fatima') ? 'approved' : 'pending';
        const creditScore = customer.name.includes('Fatima') ? 720 : 650;
        await createSampleLoan(customerId, accountForLoan.id, loanAmount, 24, 11.5, loanStatus, creditScore);
      }
    }

    const customersForLoan = await db.customer.findMany({ take: 3, orderBy: { id: 'asc' } });

    for (const guard of securityStaff) {
      const existingGuard = await db.securityStaff.findUnique({ where: { cnic: guard.cnic } });
      if (!existingGuard) {
        await db.securityStaff.create({
          data: { name: guard.name, cnic: guard.cnic, phone: guard.phone, shift: guard.shift, notes: guard.notes }
        });
      }
    }

    console.log('Admin seed completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Admin seed failed:', error);
    process.exit(1);
  }
})();
