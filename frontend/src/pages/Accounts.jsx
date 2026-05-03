import { useEffect, useState } from 'react';
import { getAccounts } from '../services/api';

const formatCurrency = (amount, currency = 'PKR') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAccounts()
      .then((response) => setAccounts(response.data.accounts))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load accounts'));
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

  return (
    <div className="page-container">
      <div className="navbar">
        <div>
          <h1 className="page-title">My Accounts</h1>
          <p className="text-muted">View your bank accounts and balances.</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <strong>Total Accounts</strong>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 0' }}>{accounts.length}</p>
        </div>
        <div className="metric-card">
          <strong>Combined Balance</strong>
          <p className="currency" style={{ fontSize: '1.5rem', margin: '8px 0 0' }}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      <div className="card">
        {accounts.length === 0 ? (
          <p>No accounts available yet. Ask an admin or teller to open one for you.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Type</th>
                <th>Currency</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td style={{ fontFamily: 'monospace' }}>{account.account_number}</td>
                  <td style={{ textTransform: 'capitalize' }}>{account.type}</td>
                  <td>{account.currency}</td>
                  <td className="currency">{formatCurrency(account.balance, account.currency)}</td>
                  <td>
                    <span className={`status-badge ${account.status}`}>{account.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {error && <div className="alert">{error}</div>}
    </div>
  );
};

export default AccountsPage;
