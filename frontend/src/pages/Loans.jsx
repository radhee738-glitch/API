import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getLoans, applyForLoan, rejectLoan } from '../services/api';

const formatCurrency = (amount, currency = 'PKR') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const LoansPage = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [applyForm, setApplyForm] = useState({ amount: '', purpose: '' });
  const [showApplyForm, setShowApplyForm] = useState(false);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const response = await getLoans();
      setLoans(response.data.loans || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load loans');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChange = (event) => {
    setApplyForm({ ...applyForm, [event.target.name]: event.target.value });
  };

  const handleApplySubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await applyForLoan(applyForm);
      setApplyForm({ amount: '', purpose: '' });
      setShowApplyForm(false);
      setSuccess('Loan application submitted successfully!');
      loadLoans();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to apply for loan');
    }
  };

  const handleReject = async (loanId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setError(null);
    setSuccess(null);
    try {
      await rejectLoan(loanId, reason);
      setSuccess('Loan application rejected.');
      loadLoans();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reject loan');
    }
  };

  if (loading) return <div className="page-container"><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">My Loans</h1>

      {error && <div className="alert">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Loan Applications</h2>
          <button
            type="button"
            className="primary"
            onClick={() => setShowApplyForm(!showApplyForm)}
          >
            {showApplyForm ? 'Cancel' : 'Apply for Loan'}
          </button>
        </div>

        {showApplyForm && (
          <form className="form-grid" onSubmit={handleApplySubmit} style={{ marginBottom: 24 }}>
            <label>
              Amount
              <input
                name="amount"
                type="number"
                value={applyForm.amount}
                onChange={handleApplyChange}
                required
                min="1"
              />
            </label>
            <label>
              Purpose
              <textarea
                name="purpose"
                value={applyForm.purpose}
                onChange={handleApplyChange}
                required
                placeholder="Describe the purpose of the loan"
              />
            </label>
            <button type="submit" className="primary">
              Submit Application
            </button>
          </form>
        )}

        {loans.length === 0 ? (
          <p>No loan applications found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Term</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="currency">{formatCurrency(loan.amount)}</td>
                  <td>{loan.purpose || '-'}</td>
                  <td>{loan.term_months} months</td>
                  <td>{loan.interest_rate}%</td>
                  <td>
                    <span className={`status-badge ${loan.status}`}>{loan.status}</span>
                  </td>
                  <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                  <td>
                    {loan.status === 'pending' && (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleReject(loan.id)}
                      >
                        Cancel
                      </button>
                    )}
                    {loan.rejection_reason && (
                      <span className="text-muted" title={loan.rejection_reason} style={{ cursor: 'help' }}>
                        ⓘ {loan.rejection_reason}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LoansPage;