import { useEffect, useState } from 'react';
import { getAccounts } from '../services/api';

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAccounts()
      .then((response) => setAccounts(response.data.accounts))
      .catch((err) => setError(err.response?.data?.error || 'Unable to load accounts'));
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">Accounts</h1>
      <div className="card">
        {accounts.length === 0 ? (
          <p>No accounts available yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.account_number}</td>
                  <td>{account.type}</td>
                  <td>{account.balance}</td>
                  <td>{account.status}</td>
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
