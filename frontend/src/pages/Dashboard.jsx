import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts, getDashboard } from '../services/api';

const formatCurrency = (amount, currency = 'PKR') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      getAccounts()
        .then((response) => setAccounts(response.data.accounts))
        .catch((err) => setError(err.response?.data?.error || 'Unable to load accounts'));
      setDashboard(null);
      return;
    }

    getDashboard()
      .then((response) => setDashboard(response.data))
      .catch(() => setDashboard(null));
  }, [user]);

  return (
    <div className="page-container">
      <div className="navbar">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}</h1>
          <p className="text-muted">Use the navigation above to explore your accounts, transactions, and more.</p>
        </div>
      </div>

      <div className="row">
        <div className="metric-card">
          <strong>Accounts</strong>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 0' }}>
            {user?.role === 'admin' ? dashboard?.accounts ?? '—' : accounts.length}
          </p>
        </div>
        <div className="metric-card">
          <strong>Transactions</strong>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 0' }}>
            {dashboard?.transactions ?? '—'}
          </p>
        </div>
        <div className="metric-card">
          <strong>Loans</strong>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 0' }}>
            {dashboard?.loans ?? '—'}
          </p>
        </div>
      </div>

      {user?.role === 'admin' ? (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="navbar">
            <div>
              <h2 className="page-title" style={{ marginBottom: 0, fontSize: '1.4rem' }}>
                Admin Summary
              </h2>
              <p className="text-muted">Admin dashboard counts are shown here. Use the admin panel for management tools.</p>
            </div>
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <div className="metric-card">
              <strong>Customers</strong>
              <p>{dashboard?.customers ?? '—'}</p>
            </div>
            <div className="metric-card">
              <strong>Tickets</strong>
              <p>{dashboard?.tickets ?? '—'}</p>
            </div>
            <div className="metric-card">
              <strong>Security staff</strong>
              <p>{dashboard?.securityStaff ?? '—'}</p>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link to="/admin" className="primary">
              Open Admin Panel
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="navbar">
            <div>
              <h2 className="page-title" style={{ marginBottom: 0, fontSize: '1.4rem' }}>
                Accounts
              </h2>
              <p className="text-muted">Your active bank accounts.</p>
            </div>
            <Link to="/accounts" className="secondary">
              View all
            </Link>
          </div>
          {accounts.length === 0 ? (
            <p>No accounts found. Ask an admin or teller to open one for you.</p>
          ) : (
            <div className="row" style={{ marginTop: 16 }}>
              {accounts.slice(0, 3).map((account) => (
                <div key={account.id} className="metric-card">
                  <strong style={{ textTransform: 'capitalize' }}>{account.type}</strong>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{account.account_number}</p>
                  <p className="currency" style={{ fontSize: '1.2rem', margin: '4px 0 0' }}>
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <Link to="/transactions" className="card secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
          <h3>View transaction history</h3>
          <p className="text-muted">Check deposits, withdrawals, and transfers.</p>
        </Link>
        <Link to="/accounts" className="card secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
          <h3>Manage accounts</h3>
          <p className="text-muted">See account details and balances.</p>
        </Link>
        <Link to="/profile" className="card secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
          <h3>My Profile</h3>
          <p className="text-muted">Update your profile and view recent activity.</p>
        </Link>
        {user?.role !== 'admin' && (
          <Link to="/loans" className="card secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
            <h3>My Loans</h3>
            <p className="text-muted">Apply for loans and track applications.</p>
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin" className="card secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
            <h3>Admin panel</h3>
            <p className="text-muted">Manage loans, counters, and staff.</p>
          </Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
    </div>
  );
};

export default DashboardPage;
