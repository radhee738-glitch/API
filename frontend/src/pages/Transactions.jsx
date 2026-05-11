import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts, getTransactions, transfer, deposit, withdraw, generateOtp } from '../services/api';

const formatCurrency = (amount, currency = 'PKR') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const TransactionsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('history');

  // Form states
  const [transferForm, setTransferForm] = useState({ fromAccount: '', toAccount: '', amount: '', description: '' });
  const [depositForm, setDepositForm] = useState({ accountNumber: '', amount: '', description: '' });
  const [withdrawForm, setWithdrawForm] = useState({ accountNumber: '', amount: '', description: '' });
  
  const [loading, setLoading] = useState(false);

  // OTP State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [currentAction, setCurrentAction] = useState(null); // 'transfer', 'deposit', 'withdraw'

  useEffect(() => {
    getAccounts()
      .then((response) => {
        setAccounts(response.data.accounts);
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load accounts'));
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    getTransactions(selectedAccount)
      .then((response) => setHistory(response.data.history))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load transactions'));
  }, [selectedAccount]);

  const initiateTransaction = async (actionType) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await generateOtp({ purpose: actionType });
      
      if (response.data.skipped) {
        // OTP disabled — proceed directly
        setCurrentAction(actionType);
        finalizeTransaction(actionType, '');
      } else {
        // Store OTP and open the custom verification modal
        setGeneratedOtp(response.data.otp);
        setOtpCode('');
        setOtpError(null);
        setCurrentAction(actionType);
        setOtpModalOpen(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const finalizeTransaction = async (action, otp) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (action === 'transfer') {
        await transfer({ ...transferForm, otp });
        setSuccess('Transfer completed successfully!');
        setTransferForm({ ...transferForm, toAccount: '', amount: '', description: '' });
      } else if (action === 'deposit') {
        await deposit({ ...depositForm, otp });
        setSuccess('Deposit completed successfully!');
        setDepositForm({ ...depositForm, amount: '', description: '' });
      } else if (action === 'withdraw') {
        await withdraw({ ...withdrawForm, otp });
        setSuccess('Withdrawal completed successfully!');
        setWithdrawForm({ ...withdrawForm, amount: '', description: '' });
      }

      setOtpModalOpen(false);
      setOtpCode('');
      setCurrentAction(null);

      // Refresh history and accounts
      const [txRes, accRes] = await Promise.all([
        selectedAccount ? getTransactions(selectedAccount) : Promise.resolve(null),
        getAccounts()
      ]);
      if (txRes) setHistory(txRes.data.history);
      setAccounts(accRes.data.accounts);
    } catch (err) {
      setError(err.response?.data?.error || `${action} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleActionSubmit = (event, actionType) => {
    event.preventDefault();
    initiateTransaction(actionType);
  };

  const handleVerifyAndSubmit = async (event) => {
    event.preventDefault();
    setOtpError(null);

    // Client-side match first for instant feedback
    if (generatedOtp && otpCode !== generatedOtp) {
      setOtpError('OTP does not match. Please check and try again.');
      return;
    }

    finalizeTransaction(currentAction, otpCode);
  };

  const handleCloseOtpModal = () => {
    setOtpModalOpen(false);
    setOtpCode('');
    setOtpError(null);
    setGeneratedOtp(null);
    setCurrentAction(null);
  };

  return (
    <div className="page-container">
      <div className="navbar">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="text-muted">Manage your funds and view transaction history.</p>
        </div>
      </div>

      <div className="tab-bar">
        <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          History
        </button>
        {user?.role === 'customer' && (
          <>
            <button type="button" className={activeTab === 'transfer' ? 'active' : ''} onClick={() => setActiveTab('transfer')}>
              Transfer
            </button>
            <button type="button" className={activeTab === 'deposit' ? 'active' : ''} onClick={() => setActiveTab('deposit')}>
              Deposit
            </button>
            <button type="button" className={activeTab === 'withdraw' ? 'active' : ''} onClick={() => setActiveTab('withdraw')}>
              Withdraw
            </button>
          </>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* OTP Modal */}
      {otpModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2>Verify Transaction</h2>
            <p className="text-muted">Please enter the 6-digit OTP sent to you.</p>
            <form onSubmit={handleVerifyAndSubmit} className="form-grid">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength="6"
                required
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.2em' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => { setOtpModalOpen(false); setOtpCode(''); setCurrentAction(null); }}>
                  Cancel
                </button>
                <button type="submit" className="primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'transfer' && user?.role === 'customer' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.3rem' }}>Fund Transfer</h2>
          <form className="form-grid" onSubmit={(e) => handleActionSubmit(e, 'transfer')}>
            <label>
              From account
              <select
                value={transferForm.fromAccount}
                onChange={(e) => setTransferForm({ ...transferForm, fromAccount: e.target.value })}
                required
              >
                <option value="" disabled>Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.account_number}>
                    {acc.account_number} ({acc.type}) — {formatCurrency(acc.balance, acc.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              To account number
              <input
                value={transferForm.toAccount}
                onChange={(e) => setTransferForm({ ...transferForm, toAccount: e.target.value })}
                placeholder="Enter recipient account number"
                required
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                placeholder="0.00"
                min="1"
                step="0.01"
                required
              />
            </label>
            <label>
              Description (optional)
              <input
                value={transferForm.description}
                onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                placeholder="e.g. Rent payment"
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              Send Transfer
            </button>
          </form>
        </div>
      )}

      {activeTab === 'deposit' && user?.role === 'customer' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.3rem' }}>Deposit Funds (Dummy Money)</h2>
          <form className="form-grid" onSubmit={(e) => handleActionSubmit(e, 'deposit')}>
            <label>
              To account
              <select
                value={depositForm.accountNumber}
                onChange={(e) => setDepositForm({ ...depositForm, accountNumber: e.target.value })}
                required
              >
                <option value="" disabled>Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.account_number}>
                    {acc.account_number} ({acc.type}) — {formatCurrency(acc.balance, acc.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                placeholder="0.00"
                min="1"
                step="0.01"
                required
              />
            </label>
            <label>
              Description (optional)
              <input
                value={depositForm.description}
                onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
                placeholder="e.g. Salary"
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              Deposit
            </button>
          </form>
        </div>
      )}

      {activeTab === 'withdraw' && user?.role === 'customer' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '1.3rem' }}>Withdraw Funds</h2>
          <form className="form-grid" onSubmit={(e) => handleActionSubmit(e, 'withdraw')}>
            <label>
              From account
              <select
                value={withdrawForm.accountNumber}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                required
              >
                <option value="" disabled>Select account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.account_number}>
                    {acc.account_number} ({acc.type}) — {formatCurrency(acc.balance, acc.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                placeholder="0.00"
                min="1"
                step="0.01"
                required
              />
            </label>
            <label>
              Description (optional)
              <input
                value={withdrawForm.description}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, description: e.target.value })}
                placeholder="e.g. ATM Withdrawal"
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              Withdraw
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <label>
              Select account
              <select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)} required>
                <option value="" disabled>Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.account_number}>
                    {account.account_number} ({account.type}) — {formatCurrency(account.balance, account.currency)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="card">
            {history.length === 0 ? (
              <p>No transaction history available for the selected account.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => {
                    const isCredit = entry.type === 'deposit' || entry.type === 'transfer-credit';
                    return (
                      <tr key={entry.id}>
                        <td>{new Date(entry.created_at).toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${isCredit ? 'approved' : 'rejected'}`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className={`currency ${isCredit ? 'positive' : 'negative'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(entry.amount)}
                        </td>
                        <td className="currency">{formatCurrency(entry.balance_after)}</td>
                        <td>{entry.description || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionsPage;
