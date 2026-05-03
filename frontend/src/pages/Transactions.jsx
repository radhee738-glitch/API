import { useEffect, useState } from 'react';
import { getAccounts, getTransactions } from '../services/api';

const TransactionsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAccounts()
      .then((response) => {
        setAccounts(response.data.accounts);
        if (response.data.accounts.length > 0) {
          setSelectedAccount(response.data.accounts[0].account_number);
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Unable to load accounts'));
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    getTransactions(selectedAccount)
      .then((response) => setHistory(response.data.history))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load transactions'));
  }, [selectedAccount]);

  return (
    <div className="page-container">
      <div className="navbar">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="text-muted">Browse history for a chosen account.</p>
        </div>
      </div>

      <div className="card">
        <label>
          Select account
          <select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.account_number}>
                {account.account_number} ({account.type})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        {history.length === 0 ? (
          <p>No transaction history available for the selected account.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.created_at).toLocaleString()}</td>
                  <td>{entry.type}</td>
                  <td>{entry.amount}</td>
                  <td>{entry.description || '-'}</td>
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

export default TransactionsPage;
